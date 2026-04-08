import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FlowNode {
  id: string
  type: string
  data: {
    subtype: string
    label: string
    config?: Record<string, unknown>
  }
  position: { x: number, y: number }
}

interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
}

interface FlowData {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

interface EnginePayload {
  execution_id: string
  workflow_id: string
  flow_data: FlowData
  trigger_data: Record<string, unknown>
  current_node_id?: string
}

// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const payload: EnginePayload = await req.json()
    const { execution_id, workflow_id, flow_data, trigger_data, current_node_id } = payload

    console.log(`Processing execution ${execution_id} for workflow ${workflow_id}`)

    // Atualizar status para running
    await supabase
      .from('automation_workflow_executions')
      .update({ status: 'running', started_at: new Date().toISOString() })
      .eq('id', execution_id)

    const { data: executionRow } = await supabase
      .from('automation_workflow_executions')
      .select('execution_path')
      .eq('id', execution_id)
      .maybeSingle()

    // Encontrar o nó inicial (trigger) ou o nó atual
    const nodes = flow_data.nodes || []
    const edges = flow_data.edges || []

    let currentNode: FlowNode | undefined
    
    if (current_node_id) {
      currentNode = nodes.find(n => n.id === current_node_id)
    } else {
      // Começar pelo trigger
      currentNode = nodes.find(n => n.type === 'trigger')
    }

    if (!currentNode) {
      throw new Error('No starting node found')
    }

    // Processar a sequência de nós
    const existingExecutionPath = Array.isArray(executionRow?.execution_path)
      ? executionRow.execution_path.map((item: unknown) => String(item))
      : []
    const executionPath: string[] = [...existingExecutionPath]
    let context = { ...trigger_data, workflow_id, execution_id }
    
    // Se estamos começando pelo trigger, ir para o próximo nó
    if (currentNode.type === 'trigger') {
      executionPath.push(currentNode.id)
      await logNodeExecution(supabase as AnySupabaseClient, execution_id, currentNode, 'completed', context)
      
      const nextEdge = edges.find(e => e.source === currentNode!.id)
      currentNode = nextEdge ? nodes.find(n => n.id === nextEdge.target) : undefined
    }

    while (currentNode) {
      console.log(`Processing node: ${currentNode.id} (${currentNode.type}/${currentNode.data?.subtype})`)
      executionPath.push(currentNode.id)

      // Verificar condição de saída global antes de processar
      const exitCheck = await checkExitCondition(supabase as AnySupabaseClient, context)
      if (exitCheck.shouldExit) {
        console.log(`Exit condition met: ${exitCheck.reason}`)
        await supabase
          .from('automation_workflow_executions')
          .update({ 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            execution_path: executionPath,
            error_message: `Fluxo encerrado: ${exitCheck.reason}`
          })
          .eq('id', execution_id)
        
        return new Response(
          JSON.stringify({ success: true, status: 'exited', reason: exitCheck.reason }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      const startTime = Date.now()
      let nodeResult: { success: boolean; output?: Record<string, unknown>; nextHandle?: string; scheduleDelay?: number; waitForEvent?: Record<string, unknown> }

      try {
        nodeResult = await processNode(supabase as AnySupabaseClient, currentNode, context, supabaseUrl, supabaseServiceKey)
        
        // Incluir condition_result para nós de condição
        const conditionResult = currentNode.type === 'condition' ? nodeResult.nextHandle : undefined
        await logNodeExecution(supabase as AnySupabaseClient, execution_id, currentNode, 'completed', context, nodeResult.output, Date.now() - startTime, undefined, conditionResult)
      } catch (nodeError: unknown) {
        const errorMessage = nodeError instanceof Error ? nodeError.message : 'Unknown error'
        console.error(`Error processing node ${currentNode.id}:`, nodeError)
        await logNodeExecution(supabase as AnySupabaseClient, execution_id, currentNode, 'failed', context, null, Date.now() - startTime, errorMessage)
        
        // Marcar execução como falha
        await supabase
          .from('automation_workflow_executions')
          .update({ 
            status: 'failed', 
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
            execution_path: executionPath
          })
          .eq('id', execution_id)
        
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // Se o nó requer agendamento (delay), parar aqui e agendar continuação
      if (nodeResult.scheduleDelay) {
        const scheduledFor = new Date(Date.now() + nodeResult.scheduleDelay)
        
        // Encontrar o próximo nó para agendar
        const nextEdge = edges.find(e => e.source === currentNode!.id)
        const nextNodeId = nextEdge?.target
        
        await supabase.from('automation_scheduled_actions').insert({
          execution_id,
          workflow_id,
          node_id: nextNodeId || currentNode.id, // Próximo nó a ser executado
          scheduled_for: scheduledFor.toISOString(),
          status: 'pending',
          payload: { flow_data, trigger_data: context }
        })

        await supabase
          .from('automation_workflow_executions')
          .update({ 
            status: 'paused', 
            current_node_id: nextNodeId || currentNode.id,
            execution_path: executionPath
          })
          .eq('id', execution_id)

        console.log(`Execution ${execution_id} paused, scheduled for ${scheduledFor.toISOString()}`)
        
        return new Response(
          JSON.stringify({ success: true, status: 'waiting', scheduled_for: scheduledFor }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // Se o nó requer aguardar um evento (wait_for_status, wait_for_stage)
      if (nodeResult.waitForEvent) {
        await supabase.from('automation_scheduled_actions').insert({
          execution_id,
          workflow_id,
          node_id: currentNode.id,
          scheduled_for: new Date().toISOString(), // Será processado pelo verificador de eventos
          status: 'waiting_event',
          payload: { 
            flow_data, 
            trigger_data: context,
            wait_for: nodeResult.waitForEvent
          }
        })

        await supabase
          .from('automation_workflow_executions')
          .update({ 
            status: 'paused', 
            current_node_id: currentNode.id,
            execution_path: executionPath
          })
          .eq('id', execution_id)

        console.log(`Execution ${execution_id} waiting for event:`, nodeResult.waitForEvent)
        
        return new Response(
          JSON.stringify({ success: true, status: 'waiting_event', wait_for: nodeResult.waitForEvent }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      // Atualizar contexto com output do nó
      if (nodeResult.output) {
        context = { ...context, ...nodeResult.output }
      }

      // Encontrar próximo nó - suportar tanto 'yes/no' quanto 'true/false'
      let nextEdge: FlowEdge | undefined
      
      if (nodeResult.nextHandle) {
        // Normalizar handle: aceitar yes/no ou true/false
        const normalizedHandle = normalizeHandle(nodeResult.nextHandle)
        nextEdge = edges.find(e => {
          if (e.source !== currentNode!.id) return false
          const edgeHandle = normalizeHandle(e.sourceHandle || '')
          return edgeHandle === normalizedHandle
        })
      } else {
        nextEdge = edges.find(e => e.source === currentNode!.id)
      }

      if (nextEdge) {
        currentNode = nodes.find(n => n.id === nextEdge!.target)
      } else {
        currentNode = undefined
      }
    }

    // Execução completa
    await supabase
      .from('automation_workflow_executions')
      .update({ 
        status: 'completed', 
        completed_at: new Date().toISOString(),
        execution_path: executionPath
      })
      .eq('id', execution_id)

    console.log(`Execution ${execution_id} completed successfully`)

    return new Response(
      JSON.stringify({ success: true, status: 'completed', path: executionPath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Automation engine error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Normaliza handles: converte yes/no para true/false e vice-versa
function normalizeHandle(handle: string): string {
  const lowerHandle = handle.toLowerCase()
  if (lowerHandle === 'yes' || lowerHandle === 'true') return 'yes'
  if (lowerHandle === 'no' || lowerHandle === 'false') return 'no'
  return lowerHandle
}

// Verifica se a execução deve ser encerrada por mudança de status
async function checkExitCondition(
  supabase: AnySupabaseClient,
  context: Record<string, unknown>
): Promise<{ shouldExit: boolean; reason?: string }> {
  const entityType = context.entity_type as string
  const entityId = context.entity_id as string
  
  if (!entityType || !entityId) return { shouldExit: false }
  
  // Buscar status atual da entidade
  const tableName = entityType === 'order' ? 'orders' : 
                   entityType === 'lead' ? 'leads' : 
                   entityType === 'pedido' ? 'pedidos' : null
  
  if (!tableName) return { shouldExit: false }
  
  const { data: entity } = await supabase
    .from(tableName)
    .select('status')
    .eq('id', entityId)
    .single()
  
  if (!entity) return { shouldExit: false }
  
  // Verificar se status mudou para um que encerra fluxos
  const exitStatuses = ['cancelado', 'cancelled', 'finalizado', 'completed', 'convertido']
  if (exitStatuses.includes(String(entity.status).toLowerCase())) {
    return { shouldExit: true, reason: `Status alterado para ${entity.status}` }
  }
  
  return { shouldExit: false }
}

async function processNode(
  supabase: AnySupabaseClient,
  node: FlowNode,
  context: Record<string, unknown>,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ success: boolean; output?: Record<string, unknown>; nextHandle?: string; scheduleDelay?: number; waitForEvent?: Record<string, unknown> }> {
  const { type, data } = node
  const { subtype, config } = data

  switch (type) {
    case 'action':
      return processAction(supabase, subtype, config || {}, context, supabaseUrl, supabaseServiceKey)
    
    case 'condition':
      return processCondition(supabase, subtype, config || {}, context)
    
    case 'control':
      return processControl(subtype, config || {}, context)
    
    default:
      return { success: true }
  }
}

async function processAction(
  supabase: AnySupabaseClient,
  subtype: string,
  config: Record<string, unknown>,
  context: Record<string, unknown>,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<{ success: boolean; output?: Record<string, unknown> }> {
  
  switch (subtype) {
    case 'send_whatsapp': {
      const templateContext = await enrichTemplateContext(supabase, context)
      const explicitRemoteJid = resolveVariable(config.remote_jid as string, context)
      const explicitPhone = resolveVariable(config.phone as string, context)
      const fallbackPhone = String(
        context.contact_phone || context.customer_phone || context.whatsapp || context.telefone || '',
      )
      const remoteJid = explicitRemoteJid ||
        (String(context.remote_jid || '').includes('@') ? String(context.remote_jid) : '') ||
        formatPhoneAsJid(explicitPhone || fallbackPhone)
      const instanceId = String(
        config.instance_id || context.instance_id || context.conversation_instance_id || '',
      )
      const conversationId = String(context.conversation_id || context.entity_id || '')

      let message = ''
      if (config.randomMessages && Array.isArray(config.messages) && config.messages.length > 0) {
        // Ignora alternativas vazias no sorteio.
        const candidateMessages = config.messages
          .map((item) => resolveTemplate(String(item || ''), templateContext).trim())
          .filter(Boolean)

        if (candidateMessages.length > 0) {
          const randomIndex = Math.floor(Math.random() * candidateMessages.length)
          message = candidateMessages[randomIndex]
        }
      }

      if (!message) {
        message = resolveTemplate(String(config.message || ''), templateContext).trim()
      }

      if (!remoteJid || !message || !instanceId) {
        throw new Error('WhatsApp: remoteJid, message or instance_id missing')
      }

      const splitMessagesEnabled = toBoolean(config.split_messages)
      const splitDelaySecondsRaw = Number(config.split_delay_seconds ?? 2)
      const splitDelaySeconds = Number.isFinite(splitDelaySecondsRaw)
        ? Math.min(30, Math.max(0, splitDelaySecondsRaw))
        : 2

      // Mantem compatibilidade: mesmo sem flag, separadores explicitos (|| ou linha em branco) viram mensagens em sequencia.
      const shouldSplitBySeparator = hasSplitSeparator(message)
      const shouldSplit = splitMessagesEnabled || shouldSplitBySeparator
      const messagesToSend = shouldSplit ? splitAutoReplyMessage(message) : [message]

      if (messagesToSend.length === 0) {
        throw new Error('WhatsApp: empty message after split')
      }

      const sentMessages: string[] = []
      let lastSendResult: Record<string, unknown> = {}

      for (let index = 0; index < messagesToSend.length; index++) {
        const messagePart = String(messagesToSend[index] || '').trim()
        if (!messagePart) continue

        const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            instanceId,
            remoteJid,
            content: messagePart,
            messageType: 'text',
            conversationId: conversationId || undefined,
            senderName: 'Automacao',
            keepUnread: true,
          }),
        })

        if (!response.ok) {
          const error = await response.text()
          throw new Error(`WhatsApp send failed: ${error}`)
        }

        const sendResult = await response.json().catch(() => ({}))
        if (sendResult && sendResult.success === false) {
          throw new Error(`WhatsApp send failed: ${sendResult.error || 'unknown error'}`)
        }

        sentMessages.push(messagePart)
        lastSendResult = { ...lastSendResult, ...(sendResult || {}) }

        if (index < messagesToSend.length - 1 && splitDelaySeconds > 0) {
          await waitMs(splitDelaySeconds * 1000)
        }
      }

      if (sentMessages.length === 0) {
        throw new Error('WhatsApp: empty message after split')
      }

      return {
        success: true,
        output: {
          whatsapp_sent: true,
          message_sent: sentMessages[sentMessages.length - 1],
          messages_sent: sentMessages,
          messages_sent_count: sentMessages.length,
          message_sequence_enabled: shouldSplit,
          remote_jid: remoteJid,
          ...lastSendResult,
        },
      }
    }

    case 'send_email': {
      const templateContext = await enrichTemplateContext(supabase, context)
      const to = resolveVariable(config.to as string, context) || context.customer_email || context.email
      const subject = resolveTemplate(config.subject as string, templateContext)
      const body = resolveTemplate(config.body as string, templateContext)
      
      if (!to || !subject || !body) {
        throw new Error('Email: to, subject, or body missing')
      }

      // TODO: Integrar com Resend quando configurado
      console.log(`Email would be sent to ${to}: ${subject}`)
      
      return { success: true, output: { email_sent: true } }
    }

    case 'create_notification': {
      const templateContext = await enrichTemplateContext(supabase, context)
      const userId = config.user_id as string || context.vendedor_id as string
      const message = resolveTemplate(config.message as string || config.title as string, templateContext)
      const tipo = config.tipo as string || 'automacao'
      const link = resolveTemplate(config.link as string, templateContext)
      
      if (!userId || !message) {
        throw new Error('Notification: user_id or message missing')
      }

      await supabase.from('notificacoes').insert({
        user_id: userId,
        mensagem: message,
        tipo,
        link: link || null
      })

      return { success: true, output: { notification_created: true } }
    }

    case 'update_status': {
      const entityTable = context.entity_type === 'order' ? 'orders' : 
                         context.entity_type === 'lead' ? 'leads' : 
                         context.entity_type === 'pedido' ? 'pedidos' : null
      const entityId = context.entity_id as string
      const newStatus = config.status as string || config.newStatus as string
      
      if (!entityTable || !entityId || !newStatus) {
        throw new Error('Update status: missing entity info or status')
      }

      await supabase
        .from(entityTable)
        .update({ status: newStatus })
        .eq('id', entityId)

      return { success: true, output: { status_updated: true, new_status: newStatus } }
    }

    case 'add_tag': {
      const pedidoId = context.entity_id as string
      const tagName = config.tag_name as string || config.tag as string
      const tagColor = config.tag_color as string || config.color as string || '#6366f1'
      
      if (!pedidoId || !tagName) {
        throw new Error('Add tag: missing pedido_id or tag_name')
      }

      // Verificar se a tag já existe
      const { data: existingTag } = await supabase
        .from('pedido_tags')
        .select('id')
        .eq('pedido_id', pedidoId)
        .eq('nome', tagName)
        .single()
      
      if (!existingTag) {
        await supabase.from('pedido_tags').insert({
          pedido_id: pedidoId,
          nome: tagName,
          cor: tagColor
        })
      }

      return { success: true, output: { tag_added: true } }
    }

    case 'ai_agent': {
      const explicitAgentKey = resolveVariable(
        (config.agent_key as string) || (config.agentKey as string),
        context,
      )
      const webhookUrl = (config.url as string) || (config.webhookUrl as string) || ''
      const agentKeyFromWebhook = extractAgentKeyFromWebhookUrl(webhookUrl)
      const agentKey = String(explicitAgentKey || agentKeyFromWebhook || '').trim()

      if (!agentKey) {
        throw new Error('AI agent: missing agent_key')
      }

      const url = `/functions/v1/whatsapp-ai-router?agent_key=${encodeURIComponent(agentKey)}`
      const response = await executeWebhookRequest({
        url,
        method: 'POST',
        body: JSON.stringify({ ...context, agent_key: agentKey }),
        supabaseUrl,
        supabaseServiceKey,
      })

      return {
        success: response.ok,
        output: {
          ai_agent_called: true,
          agent_key: agentKey,
          response_status: response.status,
        },
      }
    }

    case 'call_webhook': {
      const url = (config.url as string) || (config.webhookUrl as string)
      const method = ((config.method as string) || 'POST').toUpperCase()
      const bodyTemplate = config.body as string
      
      if (!url) {
        throw new Error('Webhook: URL missing')
      }

      const body = bodyTemplate ? resolveTemplate(bodyTemplate, context) : JSON.stringify(context)
      const response = await executeWebhookRequest({
        url,
        method,
        body: method !== 'GET' ? body : undefined,
        supabaseUrl,
        supabaseServiceKey,
      })

      return {
        success: response.ok,
        output: {
          webhook_called: true,
          response_status: response.status,
        },
      }
    }

    case 'assign_to_user': {
      const conversationId = String(context.conversation_id || context.entity_id || '')
      const userId = String(resolveVariable(config.user_id as string, context) || '')
      const markInProgress = config.mark_in_progress !== false

      if (!conversationId || !userId) {
        throw new Error('Assign to user: conversation_id or user_id missing')
      }

      const patch: Record<string, unknown> = { assigned_to: userId }
      if (markInProgress) patch.status = 'in_progress'

      await supabase
        .from('whatsapp_conversations')
        .update(patch)
        .eq('id', conversationId)

      const { data: assignedProfile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', userId)
        .maybeSingle()
      const assignedName = String(assignedProfile?.nome || '').trim()

      return {
        success: true,
        output: {
          assigned_to: userId,
          conversation_id: conversationId,
          assigned_user_name: assignedName || null,
          attendant_name: assignedName || null,
          nome_atendente: assignedName || null,
        },
      }
    }

    case 'assign_round_robin': {
      const workflowId = String(context.workflow_id || '')
      const conversationId = String(context.conversation_id || context.entity_id || '')
      const instanceId = String(context.instance_id || '')
      const isGroup = Boolean(context.is_group)
      const onlyUnassigned = config.only_unassigned !== false
      const skipGroups = config.skip_groups !== false
      const markInProgress = config.mark_in_progress !== false

      if (!workflowId || !conversationId || !instanceId) {
        throw new Error('Round robin: workflow_id, conversation_id or instance_id missing')
      }
      if (skipGroups && isGroup) {
        return { success: true, output: { skipped: 'group_conversation' } }
      }

      let eligibleUserIds = normalizeUuidArray(config.eligible_user_ids)
      if (eligibleUserIds.length === 0) {
        const { data: links, error: linksError } = await supabase
          .from('whatsapp_instance_users')
          .select('user_id')
          .eq('instance_id', instanceId)
        if (linksError) throw linksError
        eligibleUserIds = Array.from(new Set((links || []).map((item: any) => String(item.user_id)).filter(Boolean)))
      }

      if (eligibleUserIds.length === 0) {
        return { success: true, output: { skipped: 'no_eligible_users' } }
      }

      const { data: pickedUserId, error: pickError } = await supabase.rpc('automation_pick_round_robin_user', {
        p_workflow_id: workflowId,
        p_instance_id: instanceId,
        p_user_ids: eligibleUserIds,
      })
      if (pickError) throw pickError
      if (!pickedUserId) {
        return { success: true, output: { skipped: 'round_robin_no_pick' } }
      }

      const patch: Record<string, unknown> = { assigned_to: pickedUserId }
      if (markInProgress) patch.status = 'in_progress'

      let updateQuery = supabase
        .from('whatsapp_conversations')
        .update(patch)
        .eq('id', conversationId)
      if (onlyUnassigned) {
        updateQuery = updateQuery.is('assigned_to', null)
      }

      const { data: updatedRows, error: updateError } = await updateQuery.select('id')
      if (updateError) throw updateError
      if (!updatedRows || updatedRows.length === 0) {
        return { success: true, output: { skipped: 'already_assigned', picked_user_id: pickedUserId } }
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', pickedUserId)
        .maybeSingle()
      const assignedName = String(userProfile?.nome || '').trim()

      if (config.create_system_message !== false) {
        await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationId,
          instance_id: instanceId,
          from_me: true,
          message_type: 'system',
          content: `Atendimento distribuido automaticamente para ${assignedName || 'atendente'}.`,
          status: 'delivered',
        })
      }

      return {
        success: true,
        output: {
          assigned_to: pickedUserId,
          conversation_id: conversationId,
          assigned_user_name: assignedName || null,
          attendant_name: assignedName || null,
          nome_atendente: assignedName || null,
        },
      }
    }

    case 'set_followup_flag': {
      const templateContext = await enrichTemplateContext(supabase, context)
      const conversationId = String(context.conversation_id || context.entity_id || '')
      if (!conversationId) {
        throw new Error('Follow-up flag: conversation_id missing')
      }

      const color = String(config.color || '#f59e0b')
      const reason = resolveTemplate(String(config.reason || 'Conversa sem interacao recente'), templateContext)
      const notifyAssignedUser = config.notify_assigned_user === true

      const { data: updatedConversation, error: updateError } = await supabase
        .from('whatsapp_conversations')
        .update({
          needs_followup: true,
          followup_color: color,
          followup_reason: reason,
          followup_flagged_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .select('assigned_to')
        .single()

      if (updateError) throw updateError

      if (notifyAssignedUser && updatedConversation?.assigned_to) {
        await supabase.from('notificacoes').insert({
          user_id: updatedConversation.assigned_to,
          tipo: 'whatsapp_followup',
          mensagem: reason,
          link: '/ecommerce/whatsapp/atendimento',
        })
      }

      return { success: true, output: { followup_flagged: true, conversation_id: conversationId } }
    }

    case 'keyword_auto_reply': {
      if (context.from_me === true) {
        return { success: true, output: { skipped: 'outbound_message' } }
      }

      const workflowId = String(context.workflow_id || '')
      const executionId = String(context.execution_id || '')
      const conversationId = String(context.conversation_id || context.entity_id || '')
      const incomingText = String(context.message_text || context.content || '').trim()
      const cooldownMinutes = Number(config.cooldown_minutes || 60)
      const rules = Array.isArray(config.rules) ? config.rules : []

      if (!workflowId || !conversationId || !incomingText || rules.length === 0) {
        return { success: true, output: { skipped: 'missing_keyword_context' } }
      }

      if (Number.isFinite(cooldownMinutes) && cooldownMinutes > 0) {
        const cooldownStart = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString()
        const { data: lastReply } = await supabase
          .from('automation_whatsapp_reply_logs')
          .select('id')
          .eq('workflow_id', workflowId)
          .eq('conversation_id', conversationId)
          .gte('created_at', cooldownStart)
          .limit(1)
          .maybeSingle()
        if (lastReply) {
          return { success: true, output: { skipped: 'cooldown_active' } }
        }
      }

      const caseSensitive = config.case_sensitive === true
      const defaultMatchType = String(config.match_type || 'contains')
      const matchedRule = (rules as Record<string, unknown>[]).find((rule) => {
        const keyword = String(rule.keyword || '').trim()
        if (!keyword) return false
        const matchType = String(rule.match_type || defaultMatchType)
        return matchKeyword(incomingText, keyword, matchType, caseSensitive)
      })

      if (!matchedRule) {
        return { success: true, output: { skipped: 'no_keyword_match' } }
      }

      const possibleResponses = getKeywordRuleResponses(matchedRule)
      if (possibleResponses.length === 0) {
        return { success: true, output: { skipped: 'empty_keyword_response' } }
      }

      const pickedResponseTemplate = pickRandomItem(possibleResponses) || ''
      const templateContext = await enrichTemplateContext(supabase, context)
      const responseMessage = resolveTemplate(pickedResponseTemplate, templateContext)
      if (!responseMessage) {
        return { success: true, output: { skipped: 'empty_keyword_response' } }
      }

      const splitMessages = toBoolean(config.split_messages) || hasSplitSeparator(responseMessage)
      const splitDelaySecondsRaw = Number(config.split_delay_seconds ?? 2)
      const splitDelaySeconds = Number.isFinite(splitDelaySecondsRaw)
        ? Math.min(30, Math.max(0, splitDelaySecondsRaw))
        : 2
      const messagesToSend = splitMessages
        ? splitAutoReplyMessage(responseMessage)
        : [responseMessage]

      if (messagesToSend.length === 0) {
        return { success: true, output: { skipped: 'empty_keyword_response' } }
      }

      const sentMessages: string[] = []
      let lastSendOutput: Record<string, unknown> = {}

      for (let index = 0; index < messagesToSend.length; index++) {
        const messagePart = String(messagesToSend[index] || '').trim()
        if (!messagePart) continue

        const sendResult = await processAction(
          supabase,
          'send_whatsapp',
          {
            instance_id: context.instance_id,
            remote_jid: context.remote_jid,
            phone: context.contact_phone,
            message: messagePart,
          },
          context,
          supabaseUrl,
          supabaseServiceKey,
        )

        sentMessages.push(messagePart)
        lastSendOutput = { ...lastSendOutput, ...(sendResult.output || {}) }

        if (index < messagesToSend.length - 1 && splitDelaySeconds > 0) {
          await waitMs(splitDelaySeconds * 1000)
        }
      }

      if (sentMessages.length === 0) {
        return { success: true, output: { skipped: 'empty_keyword_response' } }
      }

      await supabase.from('automation_whatsapp_reply_logs').insert({
        workflow_id: workflowId,
        execution_id: executionId || null,
        conversation_id: conversationId,
        keyword: String(matchedRule.keyword || ''),
      })

      return {
        success: true,
        output: {
          ...lastSendOutput,
          keyword_matched: String(matchedRule.keyword || ''),
          keyword_response_variant: pickedResponseTemplate,
          keyword_messages_sent: sentMessages.length,
          keyword_messages: sentMessages,
          keyword_sequence_enabled: splitMessages,
          auto_replied: true,
        },
      }
    }

    default:
      console.log(`Unknown action subtype: ${subtype}`)
      return { success: true }
  }
}

function extractAgentKeyFromWebhookUrl(rawUrl: string): string {
  const url = String(rawUrl || '').trim()
  if (!url || !/whatsapp-ai-router/i.test(url)) return ''

  try {
    const parsed = url.startsWith('http')
      ? new URL(url)
      : new URL(url, 'https://local.invalid')
    return String(parsed.searchParams.get('agent_key') || '').trim()
  } catch {
    const match = url.match(/[?&]agent_key=([^&]+)/i)
    if (!match?.[1]) return ''
    try {
      return decodeURIComponent(match[1]).trim()
    } catch {
      return String(match[1] || '').trim()
    }
  }
}

async function executeWebhookRequest(params: {
  url: string
  method: string
  body?: string
  supabaseUrl: string
  supabaseServiceKey: string
}): Promise<Response> {
  const baseFunctionUrl = `${params.supabaseUrl}/functions/v1/`
  let resolvedUrl = params.url
  let isInternalFunctionCall = false
  let isAiRouterCall = false

  if (/^\/?functions\/v1\//i.test(params.url)) {
    resolvedUrl = `${params.supabaseUrl.replace(/\/+$/, '')}/${params.url.replace(/^\/+/, '')}`
    isInternalFunctionCall = true
    isAiRouterCall = /\/functions\/v1\/whatsapp-ai-router(?:\?|$)/i.test(resolvedUrl)
  } else {
    try {
      const target = new URL(params.url)
      const base = new URL(baseFunctionUrl)
      isInternalFunctionCall = target.origin === base.origin && target.pathname.startsWith('/functions/v1/')
      isAiRouterCall = /\/functions\/v1\/whatsapp-ai-router$/i.test(target.pathname)
    } catch {
      isInternalFunctionCall = false
      isAiRouterCall = false
    }
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (isInternalFunctionCall && isAiRouterCall) {
    headers.Authorization = `Bearer ${params.supabaseServiceKey}`
    const internalSecret = Deno.env.get('WHATSAPP_AI_WEBHOOK_SECRET')
    if (internalSecret) {
      headers['x-webhook-secret'] = internalSecret
    }
  }

  return fetch(resolvedUrl, {
    method: params.method,
    headers,
    body: params.method !== 'GET' ? params.body : undefined,
  })
}

async function processCondition(
  supabase: AnySupabaseClient,
  subtype: string,
  config: Record<string, unknown>,
  context: Record<string, unknown>
): Promise<{ success: boolean; nextHandle?: string; waitForEvent?: Record<string, unknown> }> {
  
  // Tipos especiais de condições
  switch (subtype) {
    case 'exit_condition': {
      // Condição de saída: verifica se status está em lista de saída
      const exitStatuses = config.exitOnStatus as string[] || []
      const entityType = context.entity_type as string
      const entityId = context.entity_id as string
      
      if (!entityType || !entityId || exitStatuses.length === 0) {
        return { success: true, nextHandle: 'no' }
      }
      
      const tableName = entityType === 'order' ? 'orders' : 
                       entityType === 'lead' ? 'leads' : 
                       entityType === 'pedido' ? 'pedidos' : null
      
      if (!tableName) return { success: true, nextHandle: 'no' }
      
      const { data: entity } = await supabase
        .from(tableName)
        .select('status')
        .eq('id', entityId)
        .single()
      
      if (entity && exitStatuses.includes(String(entity.status).toLowerCase())) {
        return { success: true, nextHandle: 'yes' }
      }
      
      return { success: true, nextHandle: 'no' }
    }
    
    case 'wait_for_status': {
      // Aguarda até o status mudar para o esperado
      const targetStatus = config.targetStatus as string
      const timeout = config.timeout as number || 24
      const timeoutUnit = config.timeoutUnit as string || 'hours'
      
      return { 
        success: true, 
        waitForEvent: {
          type: 'status_change',
          targetStatus,
          timeout,
          timeoutUnit
        }
      }
    }
    
    case 'wait_for_stage': {
      // Aguarda até etapa de produção específica
      const targetStage = config.targetStage as string
      const timeout = config.timeout as number || 48
      const timeoutUnit = config.timeoutUnit as string || 'hours'
      
      return { 
        success: true, 
        waitForEvent: {
          type: 'stage_change',
          targetStage,
          timeout,
          timeoutUnit
        }
      }
    }
    
    case 'has_interaction': {
      // Verifica se houve interação (reply no WhatsApp, etc)
      const interactionType = config.interactionType as string
      const withinHours = config.withinHours as number || 24
      
      // Por enquanto, retornar false (não implementado)
      // TODO: Implementar verificação de interações
      console.log(`Checking for ${interactionType} within ${withinHours} hours`)
      return { success: true, nextHandle: 'no' }
    }
    case 'time_condition': {
      // Horário + dias da semana
      const timezone = getSafeTimezone(
        config.timezone || context.timezone || context.fuso_horario || Deno.env.get('AUTOMATION_TIMEZONE'),
      )
      const { day: currentDay, minutes: currentMinutes } = getCurrentDayAndMinutesForTimezone(new Date(), timezone)

      const startMinutes = parseTimeToMinutes(config.startTime, 8 * 60)
      const endMinutes = parseTimeToMinutes(config.endTime, 18 * 60)
      const days = normalizeDaysList(config.days, ['mon', 'tue', 'wed', 'thu', 'fri'])

      const isWithinTime = isMinutesInRange(currentMinutes, startMinutes, endMinutes)
      const isWithinDays = days.includes(currentDay)

      return { success: true, nextHandle: (isWithinTime && isWithinDays) ? 'yes' : 'no' }
    }

    case 'business_hours': {
      const timezone = getSafeTimezone(
        config.timezone || context.timezone || context.fuso_horario || Deno.env.get('AUTOMATION_TIMEZONE'),
      )
      const { day: currentDay, minutes: currentMinutes } = getCurrentDayAndMinutesForTimezone(new Date(), timezone)

      const startMinutes = parseTimeToMinutes(config.startHour ?? config.startTime, 8 * 60)
      const endMinutes = parseTimeToMinutes(config.endHour ?? config.endTime, 18 * 60)

      const configuredDays = normalizeDaysList(config.days, [])
      const isWithinDays = configuredDays.length > 0
        ? configuredDays.includes(currentDay)
        : evaluateDayTypeCondition(config.dayType, currentDay)

      const isWithinTime = isMinutesInRange(currentMinutes, startMinutes, endMinutes)
      return { success: true, nextHandle: (isWithinTime && isWithinDays) ? 'yes' : 'no' }
    }

    case 'weekday': {
      const timezone = getSafeTimezone(
        config.timezone || context.timezone || context.fuso_horario || Deno.env.get('AUTOMATION_TIMEZONE'),
      )
      const { day: currentDay } = getCurrentDayAndMinutesForTimezone(new Date(), timezone)
      const matches = evaluateDayTypeCondition(config.dayType, currentDay)

      return { success: true, nextHandle: matches ? 'yes' : 'no' }
    }

    case 'field_contains': {
      const field = config.field as string
      const value = config.value as string
      const caseSensitive = config.caseSensitive as boolean ?? false
      
      const fieldValue = getNestedValue(context, field)
      let result = false
      
      if (typeof fieldValue === 'string') {
        result = caseSensitive 
          ? fieldValue.includes(value)
          : fieldValue.toLowerCase().includes(value.toLowerCase())
      } else if (Array.isArray(fieldValue)) {
        // Para arrays (ex: items), verificar se algum item contém o valor
        result = fieldValue.some(item => {
          const itemStr = typeof item === 'string' ? item : JSON.stringify(item)
          return caseSensitive 
            ? itemStr.includes(value)
            : itemStr.toLowerCase().includes(value.toLowerCase())
        })
      }
      
      return { success: true, nextHandle: result ? 'yes' : 'no' }
    }
    
    default: {
      // Condição padrão: comparação de campo
      const field = config.field as string
      const operator = config.operator as string
      const value = config.value as unknown

      if (!field || !operator) {
        return { success: true, nextHandle: 'yes' }
      }

      const fieldValue = getNestedValue(context, field)
      let result = false

      switch (operator) {
        case 'equals':
          result = fieldValue === value
          break
        case 'not_equals':
          result = fieldValue !== value
          break
        case 'contains':
          result = String(fieldValue).toLowerCase().includes(String(value).toLowerCase())
          break
        case 'greater_than':
          result = Number(fieldValue) > Number(value)
          break
        case 'less_than':
          result = Number(fieldValue) < Number(value)
          break
        case 'is_empty':
          result = !fieldValue || fieldValue === ''
          break
        case 'is_not_empty':
          result = !!fieldValue && fieldValue !== ''
          break
        default:
          result = true
      }

      return { success: true, nextHandle: result ? 'yes' : 'no' }
    }
  }
}

function processControl(
  subtype: string,
  config: Record<string, unknown>,
  _context: Record<string, unknown>
): { success: boolean; scheduleDelay?: number; waitForEvent?: Record<string, unknown> } {
  switch (subtype) {
    case 'delay': {
      // Suportar ambos os formatos de config
      const amount = Number(config.amount || config.delay || config.delayValue) || 1
      const unit = config.unit as string || config.delayUnit as string || 'minutes'
      
      let delayMs = amount
      switch (unit) {
        case 'minutes':
          delayMs = amount * 60 * 1000
          break
        case 'hours':
          delayMs = amount * 60 * 60 * 1000
          break
        case 'days':
          delayMs = amount * 24 * 60 * 60 * 1000
          break
        default:
          delayMs = amount * 60 * 1000 // default to minutes
      }
      
      return { success: true, scheduleDelay: delayMs }
    }
    
    case 'schedule': {
      const scheduleType = config.scheduleType as string || 'specific_time'
      const time = config.time as string || '08:00'
      
      let delayMs = 0
      const now = new Date()
      
      if (scheduleType === 'next_business_day') {
        // Calcular próximo dia útil às X horas
        const targetDate = new Date(now)
        targetDate.setDate(targetDate.getDate() + 1)
        
        // Pular fim de semana
        while (targetDate.getDay() === 0 || targetDate.getDay() === 6) {
          targetDate.setDate(targetDate.getDate() + 1)
        }
        
        const [hours, minutes] = time.split(':').map(Number)
        targetDate.setHours(hours, minutes, 0, 0)
        
        delayMs = targetDate.getTime() - now.getTime()
      } else {
        // Agendar para horário específico hoje ou amanhã
        const [hours, minutes] = time.split(':').map(Number)
        const targetDate = new Date(now)
        targetDate.setHours(hours, minutes, 0, 0)
        
        if (targetDate <= now) {
          targetDate.setDate(targetDate.getDate() + 1)
        }
        
        delayMs = targetDate.getTime() - now.getTime()
      }
      
      return { success: true, scheduleDelay: delayMs }
    }

    case 'stop_flow':
      // Retornar sem próximo nó efetivamente para o fluxo
      return { success: true }

    default:
      return { success: true }
  }
}

type WeekDayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

function normalizeDayKey(value: unknown): WeekDayKey | null {
  const raw = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (!raw) return null

  const aliases: Record<string, WeekDayKey> = {
    sun: 'sun',
    sunday: 'sun',
    dom: 'sun',
    domingo: 'sun',

    mon: 'mon',
    monday: 'mon',
    seg: 'mon',
    segunda: 'mon',
    'segunda-feira': 'mon',
    segunda_feira: 'mon',

    tue: 'tue',
    tues: 'tue',
    tuesday: 'tue',
    ter: 'tue',
    terca: 'tue',
    'terca-feira': 'tue',
    terca_feira: 'tue',

    wed: 'wed',
    wednesday: 'wed',
    qua: 'wed',
    quarta: 'wed',
    'quarta-feira': 'wed',
    quarta_feira: 'wed',

    thu: 'thu',
    thur: 'thu',
    thurs: 'thu',
    thursday: 'thu',
    qui: 'thu',
    quinta: 'thu',
    'quinta-feira': 'thu',
    quinta_feira: 'thu',

    fri: 'fri',
    friday: 'fri',
    sex: 'fri',
    sexta: 'fri',
    'sexta-feira': 'fri',
    sexta_feira: 'fri',

    sat: 'sat',
    saturday: 'sat',
    sab: 'sat',
    sabado: 'sat',
  }

  return aliases[raw] || null
}

function normalizeDaysList(value: unknown, fallback: WeekDayKey[]): WeekDayKey[] {
  if (!Array.isArray(value)) return [...fallback]

  const days = value
    .map((item) => normalizeDayKey(item))
    .filter((item): item is WeekDayKey => item !== null)

  if (days.length === 0) return [...fallback]
  return Array.from(new Set(days))
}

function parseTimeToMinutes(value: unknown, fallback: number): number {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return fallback

  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback

  return hour * 60 + minute
}

function isMinutesInRange(current: number, start: number, end: number): boolean {
  // Mesmo valor = janela de 24h para simplificar configurações.
  if (start === end) return true
  if (start < end) return current >= start && current <= end
  // Janela que cruza meia-noite (ex: 22:00 -> 06:00).
  return current >= start || current <= end
}

function getCurrentDayAndMinutesForTimezone(
  now: Date,
  timezone: string,
): { day: WeekDayKey; minutes: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const weekdayRaw = parts.find((part) => part.type === 'weekday')?.value
    const hourRaw = parts.find((part) => part.type === 'hour')?.value
    const minuteRaw = parts.find((part) => part.type === 'minute')?.value

    const dayNames: WeekDayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const fallbackDay = dayNames[now.getDay()] || 'mon'

    const normalizedDay = normalizeDayKey(weekdayRaw) || fallbackDay
    const hour = Number(hourRaw)
    const minute = Number(minuteRaw)
    const safeHour = Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : now.getHours()
    const safeMinute = Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : now.getMinutes()

    return {
      day: normalizedDay,
      minutes: safeHour * 60 + safeMinute,
    }
  } catch {
    const dayNames: WeekDayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    return {
      day: dayNames[now.getDay()] || 'mon',
      minutes: now.getHours() * 60 + now.getMinutes(),
    }
  }
}

function evaluateDayTypeCondition(dayType: unknown, currentDay: WeekDayKey): boolean {
  const normalizedDayType = String(dayType || 'dia_util')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const weekdays: WeekDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri']

  switch (normalizedDayType) {
    case 'dia_util':
    case 'dias_uteis':
      return weekdays.includes(currentDay)
    case 'fim_de_semana':
      return currentDay === 'sat' || currentDay === 'sun'
    case 'segunda':
      return currentDay === 'mon'
    case 'terca':
      return currentDay === 'tue'
    case 'quarta':
      return currentDay === 'wed'
    case 'quinta':
      return currentDay === 'thu'
    case 'sexta':
      return currentDay === 'fri'
    case 'sabado':
      return currentDay === 'sat'
    case 'domingo':
      return currentDay === 'sun'
    default: {
      const normalizedDay = normalizeDayKey(normalizedDayType)
      return normalizedDay ? normalizedDay === currentDay : weekdays.includes(currentDay)
    }
  }
}
function resolveVariable(template: string, context: Record<string, unknown>): string {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return String(context[key] ?? '')
  })
}

function formatPhoneAsJid(rawPhone: string): string {
  const cleaned = String(rawPhone || '').replace(/\D/g, '')
  if (!cleaned) return ''
  const normalized = cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith('55')
    ? `55${cleaned}`
    : cleaned
  return `${normalized}@s.whatsapp.net`
}

function normalizeUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim())
        .filter((item) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item)),
    ),
  )
}

function matchKeyword(
  input: string,
  keyword: string,
  matchType: string,
  caseSensitive: boolean,
): boolean {
  const source = caseSensitive ? input : input.toLowerCase()
  const target = caseSensitive ? keyword : keyword.toLowerCase()
  if (!target) return false

  switch (matchType) {
    case 'exact':
      return source.trim() === target.trim()
    case 'starts_with':
      return source.startsWith(target)
    case 'ends_with':
      return source.endsWith(target)
    case 'contains':
    default:
      return source.includes(target)
  }
}

function getKeywordRuleResponses(rule: Record<string, unknown>): string[] {
  const responses: string[] = []
  if (Array.isArray(rule.responses)) {
    responses.push(...rule.responses.map((item) => String(item || '').trim()))
  }
  if (typeof rule.response === 'string') {
    responses.push(String(rule.response || '').trim())
  }
  return Array.from(new Set(responses.filter(Boolean)))
}

function splitAutoReplyMessage(message: string): string[] {
  const normalized = String(message || '').replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  if (normalized.includes('||')) {
    return normalized
      .split(/\s*\|\|\s*/g)
      .map((part) => part.trim())
      .filter(Boolean)
  }

  const byBlankLine = normalized
    .split(/\n\s*\n+/g)
    .map((part) => part.trim())
    .filter(Boolean)

  return byBlankLine.length > 1 ? byBlankLine : [normalized]
}

function hasSplitSeparator(message: string): boolean {
  const normalized = String(message || '').replace(/\r\n/g, '\n')
  if (!normalized.trim()) return false
  if (normalized.includes('||')) return true
  return /\n\s*\n+/.test(normalized)
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return ['1', 'true', 'yes', 'sim', 'on'].includes(normalized)
  }
  return false
}

function waitMs(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve()
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function pickRandomItem<T>(items: T[]): T | null {
  if (!Array.isArray(items) || items.length === 0) return null
  const index = Math.floor(Math.random() * items.length)
  return items[index]
}

async function enrichTemplateContext(
  supabase: AnySupabaseClient,
  context: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const conversationId = String(context.conversation_id || context.entity_id || '').trim()
  let assignedId = String(context.assigned_to || context.assigned_user_id || '').trim()

  if (!assignedId && conversationId) {
    const { data: conversation } = await supabase
      .from('whatsapp_conversations')
      .select('assigned_to')
      .eq('id', conversationId)
      .maybeSingle()
    const conversationAssignedId = String(conversation?.assigned_to || '').trim()
    if (conversationAssignedId) {
      assignedId = conversationAssignedId
    }
  }

  let attendantName = ''
  if (assignedId) {
    const { data: attendant } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', assignedId)
      .maybeSingle()
    attendantName = String(attendant?.nome || '').trim()
  }

  if (!attendantName) {
    attendantName = String(context.nome_atendente || context.attendant_name || context.assigned_user_name || '').trim()
  }

  return {
    ...context,
    ...(assignedId ? { assigned_to: assignedId } : {}),
    ...(attendantName
      ? {
          nome_atendente: attendantName,
          attendant_name: attendantName,
          assigned_user_name: attendantName,
        }
      : {}),
  }
}

function normalizeTemplateKey(key: string): string {
  return String(key || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const TEMPLATE_KEY_ALIASES: Record<string, string> = {
  saudacao: 'saudacao',
  nome: 'nome',
  nome_cliente: 'nome',
  cliente_nome: 'nome',
  nome_atendente: 'nome_atendente',
  atendente: 'nome_atendente',
  telefone: 'telefone',
  contato: 'telefone',
}

function getSafeTimezone(value: unknown): string {
  const candidate = String(value || '').trim()
  const fallback = 'America/Sao_Paulo'
  if (!candidate) return fallback
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: candidate }).format(new Date())
    return candidate
  } catch {
    return fallback
  }
}

function getHourForTimezone(now: Date, timezone: string): number {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    }).format(now)
    const hour = Number(formatted)
    return Number.isFinite(hour) ? hour : 0
  } catch {
    return now.getHours()
  }
}

function formatDateForTimezone(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  } catch {
    return now.toLocaleDateString('pt-BR')
  }
}

function formatTimeForTimezone(now: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now)
  } catch {
    return now.toLocaleTimeString('pt-BR')
  }
}

function extractFirstName(value: unknown): string {
  const fullName = String(value || '').trim()
  if (!fullName) return ''
  return fullName.split(/\s+/).filter(Boolean)[0] || ''
}

function resolveTemplate(template: string, context: Record<string, unknown>): string {
  if (!template) return ''
  
  // Adicionar variáveis de sistema
  const timezone = getSafeTimezone(context.timezone || context.fuso_horario || Deno.env.get('AUTOMATION_TIMEZONE'))
  const now = new Date()
  const hour = getHourForTimezone(now, timezone)
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const customerName = context.customer_name || context.nome || context.nome_cliente || context.contact_name || context.sender_name
  
  const enrichedContext: Record<string, unknown> = {
    ...context,
    data_atual: formatDateForTimezone(now, timezone),
    hora_atual: formatTimeForTimezone(now, timezone),
    saudacao: greeting,
    // Aliases comuns
    nome: extractFirstName(customerName),
    nome_atendente: context.nome_atendente || context.attendant_name || context.assigned_user_name,
    numero_pedido: context.order_number || context.numero_pedido,
    email: context.customer_email || context.email,
    telefone: context.customer_phone || context.telefone || context.whatsapp
  }

  const normalizedContext: Record<string, unknown> = {}
  Object.entries(enrichedContext).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    normalizedContext[normalizeTemplateKey(key)] = value
  })

  const resolveToken = (rawKey: string): string => {
    const directValue = enrichedContext[rawKey]
    if (directValue !== undefined && directValue !== null && directValue !== '') {
      return String(directValue)
    }

    const normalized = normalizeTemplateKey(rawKey)
    const aliased = TEMPLATE_KEY_ALIASES[normalized] || normalized
    const normalizedValue = normalizedContext[aliased] ?? normalizedContext[normalized]
    if (normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== '') {
      return String(normalizedValue)
    }

    return ''
  }

  const withBraces = template.replace(/\{([^{}]+)\}/g, (_match, key) => {
    return resolveToken(String(key))
  })

  return withBraces.replace(/\[([^\]]+)\]/g, (_match, key) => {
    return resolveToken(String(key))
  })
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined
  }, obj)
}

async function logNodeExecution(
  supabase: AnySupabaseClient,
  executionId: string,
  node: FlowNode,
  status: string,
  inputData: Record<string, unknown>,
  outputData?: Record<string, unknown> | null,
  durationMs?: number,
  errorMessage?: string,
  conditionResult?: string
): Promise<void> {
  await supabase.from('automation_execution_logs').insert({
    execution_id: executionId,
    node_id: node.id,
    node_type: node.type,
    node_label: node.data?.label || null,
    action: node.data?.subtype,
    status,
    input_data: inputData,
    output_data: outputData,
    duration_ms: durationMs,
    error_message: errorMessage,
    condition_result: conditionResult || null
  })
}
