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
    const executionPath: string[] = []
    let context = { ...trigger_data }
    
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
            status: 'waiting', 
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
            status: 'waiting', 
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
      const phone = resolveVariable(config.phone as string, context) || 
                   context.customer_phone || context.whatsapp || context.telefone
      
      // Suporte para mensagens randômicas
      let message: string
      if (config.randomMessages && Array.isArray(config.messages) && config.messages.length > 0) {
        const randomIndex = Math.floor(Math.random() * config.messages.length)
        message = resolveTemplate(config.messages[randomIndex] as string, context)
      } else {
        message = resolveTemplate(config.message as string, context)
      }
      
      const instanceId = config.instance_id as string
      
      if (!phone || !message) {
        throw new Error('WhatsApp: phone or message missing')
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          to: phone,
          message,
          instance_id: instanceId
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`WhatsApp send failed: ${error}`)
      }

      return { success: true, output: { whatsapp_sent: true, message_sent: message } }
    }

    case 'send_email': {
      const to = resolveVariable(config.to as string, context) || context.customer_email || context.email
      const subject = resolveTemplate(config.subject as string, context)
      const body = resolveTemplate(config.body as string, context)
      
      if (!to || !subject || !body) {
        throw new Error('Email: to, subject, or body missing')
      }

      // TODO: Integrar com Resend quando configurado
      console.log(`Email would be sent to ${to}: ${subject}`)
      
      return { success: true, output: { email_sent: true } }
    }

    case 'create_notification': {
      const userId = config.user_id as string || context.vendedor_id as string
      const message = resolveTemplate(config.message as string || config.title as string, context)
      const tipo = config.tipo as string || 'automacao'
      const link = resolveTemplate(config.link as string, context)
      
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

    case 'call_webhook': {
      const url = config.url as string || config.webhookUrl as string
      const method = (config.method as string) || 'POST'
      const bodyTemplate = config.body as string
      
      if (!url) {
        throw new Error('Webhook: URL missing')
      }

      const body = bodyTemplate ? resolveTemplate(bodyTemplate, context) : JSON.stringify(context)
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'GET' ? body : undefined
      })

      return { 
        success: response.ok, 
        output: { 
          webhook_called: true, 
          response_status: response.status 
        } 
      }
    }

    default:
      console.log(`Unknown action subtype: ${subtype}`)
      return { success: true }
  }
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
      // Verifica se está dentro do horário
      const startTime = config.startTime as string || '08:00'
      const endTime = config.endTime as string || '18:00'
      const days = config.days as string[] || ['mon', 'tue', 'wed', 'thu', 'fri']
      
      const now = new Date()
      const currentHour = now.getHours()
      const currentMinutes = now.getMinutes()
      const currentTime = currentHour * 60 + currentMinutes
      
      const [startH, startM] = startTime.split(':').map(Number)
      const [endH, endM] = endTime.split(':').map(Number)
      const startMinutes = startH * 60 + startM
      const endMinutes = endH * 60 + endM
      
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const currentDay = dayNames[now.getDay()]
      
      const isWithinTime = currentTime >= startMinutes && currentTime <= endMinutes
      const isWithinDays = days.includes(currentDay)
      
      return { success: true, nextHandle: (isWithinTime && isWithinDays) ? 'yes' : 'no' }
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
      const amount = Number(config.amount || config.delayValue) || 1
      const unit = config.unit as string || config.delayUnit as string || 'hours'
      
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

function resolveVariable(template: string, context: Record<string, unknown>): string {
  if (!template) return ''
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return String(context[key] ?? '')
  })
}

function resolveTemplate(template: string, context: Record<string, unknown>): string {
  if (!template) return ''
  
  // Adicionar variáveis de sistema
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  
  const enrichedContext: Record<string, unknown> = {
    ...context,
    data_atual: now.toLocaleDateString('pt-BR'),
    hora_atual: now.toLocaleTimeString('pt-BR'),
    saudacao: greeting,
    // Aliases comuns
    nome: context.customer_name || context.nome || context.nome_cliente,
    numero_pedido: context.order_number || context.numero_pedido,
    email: context.customer_email || context.email,
    telefone: context.customer_phone || context.telefone || context.whatsapp
  }

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = enrichedContext[key as string]
    return value !== undefined ? String(value) : match
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
