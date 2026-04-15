import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Called by a cron job to process scheduled actions.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Checking for scheduled automation actions...')

    // Find pending actions that are already due.
    const { data: pendingActions, error: fetchError } = await supabase
      .from('automation_scheduled_actions')
      .select(`
        id,
        execution_id,
        workflow_id,
        node_id,
        payload,
        scheduled_for
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(50) // Processar em batches

    if (fetchError) {
      console.error('Error fetching scheduled actions:', fetchError)
      throw fetchError
    }

    console.log(`Found ${pendingActions?.length || 0} scheduled actions to process`)

    const results: Array<{ id: string; success: boolean; error?: string }> = []

    for (const action of pendingActions || []) {
      try {
        // Marcar como em processamento
        await supabase
          .from('automation_scheduled_actions')
          .update({ status: 'processing' })
          .eq('id', action.id)

        // Load execution to get workflow metadata.
        const { data: execution } = await supabase
          .from('automation_workflow_executions')
          .select('id, workflow_id, trigger_entity, trigger_entity_id')
          .eq('id', action.execution_id)
          .single()

        if (!execution) {
          throw new Error('Execution not found')
        }

        // Buscar o workflow com flow_data
        const { data: workflow } = await supabase
          .from('automation_workflows')
          .select('flow_data')
          .eq('id', action.workflow_id)
          .single()

        if (!workflow) {
          throw new Error('Workflow not found')
        }

        const payload = action.payload as { flow_data?: Record<string, unknown>, trigger_data?: Record<string, unknown> }

        // Resume from the scheduled node.
        // Compatibility:
        // - Current format: action.node_id is already the next node to execute
        // - Legacy format: action.node_id may point to the previous node (e.g. delay)
        const flowData = workflow.flow_data as { nodes: Array<{ id: string }>, edges: Array<{ source: string, target: string }> }
        const nodes = flowData.nodes || []
        const edges = flowData.edges || []
        let resumeNodeId = action.node_id
        const hasDirectNode = nodes.some((node) => node.id === resumeNodeId)
        if (!hasDirectNode) {
          const nextEdge = edges.find((e: { source: string }) => e.source === action.node_id)
          resumeNodeId = nextEdge?.target || ''
        }

        if (!resumeNodeId) {
          // Workflow finished with no next node.
          await supabase
            .from('automation_workflow_executions')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', action.execution_id)

          await supabase
            .from('automation_scheduled_actions')
            .update({ status: 'executed', executed_at: new Date().toISOString() })
            .eq('id', action.id)

          results.push({ id: action.id, success: true })
          continue
        }

        // Continue execution from the correct node.
        const engineUrl = `${supabaseUrl}/functions/v1/automation-engine`
        const engineResponse = await fetch(engineUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            execution_id: action.execution_id,
            workflow_id: action.workflow_id,
            flow_data: flowData,
            trigger_data: {
              ...payload.trigger_data,
              entity_type: execution.trigger_entity,
              entity_id: execution.trigger_entity_id
            },
            current_node_id: resumeNodeId
          }),
        })

        if (!engineResponse.ok) {
          throw new Error(`Engine error: ${await engineResponse.text()}`)
        }

        // Mark action as executed.
        await supabase
          .from('automation_scheduled_actions')
          .update({ status: 'executed', executed_at: new Date().toISOString() })
          .eq('id', action.id)

        results.push({ id: action.id, success: true })

      } catch (actionError: unknown) {
        const errorMessage = actionError instanceof Error ? actionError.message : 'Unknown error'
        console.error(`Error processing scheduled action ${action.id}:`, actionError)
        
        await supabase
          .from('automation_scheduled_actions')
          .update({ 
            status: 'failed', 
            error_message: errorMessage 
          })
          .eq('id', action.id)

        results.push({ id: action.id, success: false, error: errorMessage })
      }
    }

    const inactivityResult = await triggerWhatsappInactivityWorkflows(supabase, supabaseUrl, supabaseServiceKey)
    const businessHoursHandoffResult = await triggerWhatsappBusinessHoursHandoff(supabase)

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results,
        inactivity: inactivityResult,
        business_hours_handoff: businessHoursHandoffResult,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Automation scheduler error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function triggerWhatsappInactivityWorkflows(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  supabaseServiceKey: string,
): Promise<{ workflowsChecked: number; conversationsTriggered: number }> {
  try {
    const { data: workflows, error: workflowsError } = await supabase
      .from('automation_workflows')
      .select('id, flow_data')
      .eq('ativo', true)
      .in('tipo', ['whatsapp', 'comercial', 'geral'])

    if (workflowsError) throw workflowsError

    let conversationsTriggered = 0
    let workflowsChecked = 0

    for (const workflow of workflows || []) {
      const flowData = workflow.flow_data as {
        nodes?: Array<{ type: string; data?: { subtype?: string; config?: Record<string, unknown> } }>
      }

      const triggerNode = flowData?.nodes?.find(
        (node) => node.type === 'trigger' && node.data?.subtype === 'whatsapp_inactive',
      )
      if (!triggerNode) continue
      workflowsChecked += 1

      const config = triggerNode.data?.config || {}
      const inactivityDays = Number(config.inactivity_days || 3)
      const onlyAssigned = config.only_assigned === true
      const limitPerWorkflow = Math.min(Math.max(Number(config.limit || 50), 1), 200)
      const instanceIds = Array.isArray(config.instance_ids) ? config.instance_ids.map(String).filter(Boolean) : []

      const thresholdIso = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000).toISOString()

      let conversationsQuery = supabase
        .from('whatsapp_conversations')
        .select(`
          id,
          instance_id,
          remote_jid,
          contact_name,
          contact_phone,
          status,
          assigned_to,
          is_group,
          last_message_at,
          last_customer_message_at,
          needs_followup
        `)
        .eq('is_group', false)
        .neq('status', 'finished')
        .eq('needs_followup', false)
        .or(`last_customer_message_at.lt.${thresholdIso},and(last_customer_message_at.is.null,last_message_at.lt.${thresholdIso})`)
        .limit(limitPerWorkflow)

      if (onlyAssigned) {
        conversationsQuery = conversationsQuery.not('assigned_to', 'is', null)
      }
      if (instanceIds.length > 0) {
        conversationsQuery = conversationsQuery.in('instance_id', instanceIds)
      }

      const { data: conversations, error: conversationsError } = await conversationsQuery
      if (conversationsError) {
        console.error('[AUTOMATION SCHEDULER] inactivity query error:', conversationsError)
        continue
      }

      for (const conversation of conversations || []) {
        const triggerPayload = {
          trigger_type: 'whatsapp_inactive',
          entity_type: 'whatsapp',
          entity_id: conversation.id,
          data: {
            ...conversation,
            conversation_id: conversation.id,
            message_text: null,
            from_me: false,
          },
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/automation-trigger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify(triggerPayload),
        })

        if (response.ok) {
          conversationsTriggered += 1
        } else {
          console.error('[AUTOMATION SCHEDULER] inactivity trigger failed:', await response.text())
        }
      }
    }

    return { workflowsChecked, conversationsTriggered }
  } catch (error) {
    console.error('[AUTOMATION SCHEDULER] inactivity processing failed:', error)
    return { workflowsChecked: 0, conversationsTriggered: 0 }
  }
}

type WeekDayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

type SchedulerFlowNode = {
  id: string
  type: string
  data?: {
    subtype?: string
    config?: Record<string, unknown>
  }
}

type SchedulerFlowEdge = {
  source: string
  target: string
  sourceHandle?: string
}

type BusinessHoursHandoffConfig = {
  markerConfig: Record<string, unknown>
  conditionConfig: Record<string, unknown>
  assignSubtype: 'assign_round_robin' | 'assign_to_user'
  assignConfig: Record<string, unknown>
  aiAgentKey: string | null
  triggerInstanceIds: string[]
  skipGroups: boolean
  limitPerRun: number
}

async function triggerWhatsappBusinessHoursHandoff(
  supabase: ReturnType<typeof createClient>,
): Promise<{ workflowsChecked: number; conversationsChecked: number; conversationsAssigned: number }> {
  try {
    const { data: workflows, error: workflowsError } = await supabase
      .from('automation_workflows')
      .select('id, flow_data')
      .eq('ativo', true)
      .eq('tipo', 'whatsapp')

    if (workflowsError) throw workflowsError

    let workflowsChecked = 0
    let conversationsChecked = 0
    let conversationsAssigned = 0

    for (const workflow of workflows || []) {
      const flowData = workflow.flow_data as { nodes?: SchedulerFlowNode[]; edges?: SchedulerFlowEdge[] }
      const handoffConfigs = findBusinessHoursHandoffConfigs(flowData)
      if (handoffConfigs.length === 0) continue

      workflowsChecked += 1

      for (const handoffConfig of handoffConfigs) {
        const scheduleConfig = handoffConfig.markerConfig.use_custom_schedule === true
          ? handoffConfig.markerConfig
          : handoffConfig.conditionConfig

        if (!isNowWithinBusinessHours(scheduleConfig)) {
          continue
        }

        const assignedCount = await handoffConversationsForWorkflow(
          supabase,
          String(workflow.id),
          handoffConfig,
        )

        conversationsChecked += assignedCount.checked
        conversationsAssigned += assignedCount.assigned
      }
    }

    return { workflowsChecked, conversationsChecked, conversationsAssigned }
  } catch (error) {
    console.error('[AUTOMATION SCHEDULER] business-hours handoff failed:', error)
    return { workflowsChecked: 0, conversationsChecked: 0, conversationsAssigned: 0 }
  }
}

async function handoffConversationsForWorkflow(
  supabase: ReturnType<typeof createClient>,
  workflowId: string,
  config: BusinessHoursHandoffConfig,
): Promise<{ checked: number; assigned: number }> {
  const recentSinceIso = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()

  let aiRunsQuery = supabase
    .from('whatsapp_ai_runs')
    .select('conversation_id, agent_key, created_at')
    .gte('created_at', recentSinceIso)
    .order('created_at', { ascending: false })
    .limit(Math.max(config.limitPerRun * 6, 200))

  if (config.aiAgentKey) {
    aiRunsQuery = aiRunsQuery.eq('agent_key', config.aiAgentKey)
  }

  const { data: aiRuns, error: aiRunsError } = await aiRunsQuery
  if (aiRunsError) {
    console.error('[AUTOMATION SCHEDULER] ai-runs query error:', aiRunsError)
    return { checked: 0, assigned: 0 }
  }

  const conversationIds = Array.from(
    new Set(
      (aiRuns || [])
        .map((run) => String((run as { conversation_id?: string | null }).conversation_id || '').trim())
        .filter(Boolean),
    ),
  )

  if (conversationIds.length === 0) {
    return { checked: 0, assigned: 0 }
  }

  const limitedConversationIds = conversationIds.slice(0, config.limitPerRun * 3)

  let assigned = 0
  let checked = 0

  for (const idChunk of chunkArray(limitedConversationIds, 200)) {
    let conversationsQuery = supabase
      .from('whatsapp_conversations')
      .select('id, instance_id, assigned_to, status, is_group')
      .in('id', idChunk)
      .is('assigned_to', null)
      .neq('status', 'finished')

    if (config.skipGroups) {
      conversationsQuery = conversationsQuery.eq('is_group', false)
    }
    if (config.triggerInstanceIds.length > 0) {
      conversationsQuery = conversationsQuery.in('instance_id', config.triggerInstanceIds)
    }

    const { data: conversations, error: conversationsError } = await conversationsQuery
    if (conversationsError) {
      console.error('[AUTOMATION SCHEDULER] handoff conversations query error:', conversationsError)
      continue
    }

    for (const conversation of conversations || []) {
      checked += 1
      const assignedNow = await assignConversationFromConfig(
        supabase,
        workflowId,
        {
          id: String((conversation as { id?: string | null }).id || ''),
          instance_id: String((conversation as { instance_id?: string | null }).instance_id || ''),
        },
        config,
      )
      if (assignedNow) {
        assigned += 1
      }
      if (assigned >= config.limitPerRun) {
        return { checked, assigned }
      }
    }
  }

  return { checked, assigned }
}

async function assignConversationFromConfig(
  supabase: ReturnType<typeof createClient>,
  workflowId: string,
  conversation: { id: string; instance_id: string },
  config: BusinessHoursHandoffConfig,
): Promise<boolean> {
  const markInProgress = config.assignConfig.mark_in_progress !== false

  if (config.assignSubtype === 'assign_to_user') {
    const userId = String(config.assignConfig.user_id || '').trim()
    if (!looksLikeUuid(userId)) return false

    const patch: Record<string, unknown> = { assigned_to: userId }
    if (markInProgress) patch.status = 'in_progress'

    const { data: updatedRows, error: updateError } = await supabase
      .from('whatsapp_conversations')
      .update(patch)
      .eq('id', conversation.id)
      .is('assigned_to', null)
      .select('id')

    if (updateError) {
      console.error('[AUTOMATION SCHEDULER] assign_to_user update error:', updateError)
      return false
    }

    return Boolean(updatedRows && updatedRows.length > 0)
  }

  let eligibleUserIds = normalizeUuidArray(config.assignConfig.eligible_user_ids)
  if (eligibleUserIds.length === 0) {
    const { data: links, error: linksError } = await supabase
      .from('whatsapp_instance_users')
      .select('user_id')
      .eq('instance_id', conversation.instance_id)

    if (linksError) {
      console.error('[AUTOMATION SCHEDULER] instance-user links query error:', linksError)
      return false
    }

    eligibleUserIds = Array.from(
      new Set(
        (links || [])
          .map((item) => String((item as { user_id?: string | null }).user_id || ''))
          .filter(looksLikeUuid),
      ),
    )
  }

  if (eligibleUserIds.length === 0) {
    return false
  }

  const { data: pickedUserId, error: pickError } = await supabase.rpc('automation_pick_round_robin_user', {
    p_workflow_id: workflowId,
    p_instance_id: conversation.instance_id,
    p_user_ids: eligibleUserIds,
  })

  if (pickError) {
    console.error('[AUTOMATION SCHEDULER] round-robin pick error:', pickError)
    return false
  }

  const picked = String(pickedUserId || '').trim()
  if (!looksLikeUuid(picked)) {
    return false
  }

  const patch: Record<string, unknown> = { assigned_to: picked }
  if (markInProgress) patch.status = 'in_progress'

  const { data: updatedRows, error: updateError } = await supabase
    .from('whatsapp_conversations')
    .update(patch)
    .eq('id', conversation.id)
    .is('assigned_to', null)
    .select('id')

  if (updateError) {
    console.error('[AUTOMATION SCHEDULER] assign_round_robin update error:', updateError)
    return false
  }

  if (!updatedRows || updatedRows.length === 0) {
    return false
  }

  if (config.assignConfig.create_system_message !== false) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nome')
      .eq('id', picked)
      .maybeSingle()

    const assignedName = String(profile?.nome || '').trim() || 'atendente'
    await supabase.from('whatsapp_messages').insert({
      conversation_id: conversation.id,
      instance_id: conversation.instance_id,
      from_me: true,
      message_type: 'system',
      content: `Atendimento distribuido automaticamente para ${assignedName}.`,
      status: 'delivered',
    })
  }

  return true
}

function findBusinessHoursHandoffConfigs(
  flowData: { nodes?: SchedulerFlowNode[]; edges?: SchedulerFlowEdge[] } | null | undefined,
): BusinessHoursHandoffConfig[] {
  const nodes = flowData?.nodes || []
  const edges = flowData?.edges || []
  if (nodes.length === 0 || edges.length === 0) return []

  const handoffMarkerNode = nodes.find(
    (node) => node.type === 'control' && String(node.data?.subtype || '') === 'business_hours_handoff',
  )
  const markerConfig = (handoffMarkerNode?.data?.config || {}) as Record<string, unknown>
  if (!handoffMarkerNode || markerConfig.enabled === false) {
    return []
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const triggerNodes = nodes.filter(
    (node) => node.type === 'trigger' && ['whatsapp_message', 'whatsapp_new_lead'].includes(String(node.data?.subtype || '')),
  )

  const triggerInstanceIds = Array.from(
    new Set(
      triggerNodes.flatMap((node) => {
        const ids = node.data?.config?.instance_ids
        if (!Array.isArray(ids)) return []
        return ids.map((id) => String(id || '').trim()).filter(looksLikeUuid)
      }),
    ),
  )

  const skipGroups = triggerNodes.every((node) => node.data?.config?.skip_groups !== false)

  const configs: BusinessHoursHandoffConfig[] = []

  for (const conditionNode of nodes) {
    const conditionSubtype = String(conditionNode.data?.subtype || '')
    const isBusinessCondition = ['business_hours', 'time_condition'].includes(conditionSubtype)
    if (conditionNode.type !== 'condition' || !isBusinessCondition) continue

    const yesEdge = edges.find((edge) => edge.source === conditionNode.id && normalizeHandle(edge.sourceHandle) === 'yes')
    const noEdge = edges.find((edge) => edge.source === conditionNode.id && normalizeHandle(edge.sourceHandle) === 'no')
    if (!yesEdge || !noEdge) continue

    const yesNode = nodeById.get(yesEdge.target)
    const noNode = nodeById.get(noEdge.target)
    if (!yesNode || !noNode) continue

    const yesSubtype = String(yesNode.data?.subtype || '')
    const noSubtype = String(noNode.data?.subtype || '')

    const yesIsAssignNode = yesNode.type === 'action' && (yesSubtype === 'assign_round_robin' || yesSubtype === 'assign_to_user')
    const noIsAiNode = noNode.type === 'action' && noSubtype === 'ai_agent'
    if (!yesIsAssignNode || !noIsAiNode) continue

    const conditionConfig = (conditionNode.data?.config || {}) as Record<string, unknown>
    const assignConfig = (yesNode.data?.config || {}) as Record<string, unknown>
    const aiConfig = (noNode.data?.config || {}) as Record<string, unknown>
    const aiAgentKey = String(aiConfig.agent_key || aiConfig.agentKey || '').trim() || null
    const limitRaw = Number(markerConfig.limit_per_run ?? markerConfig.handoff_limit ?? conditionConfig.handoff_limit ?? 80)
    const limitPerRun = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 80, 1), 300)

    configs.push({
      markerConfig,
      conditionConfig,
      assignSubtype: yesSubtype as 'assign_round_robin' | 'assign_to_user',
      assignConfig,
      aiAgentKey,
      triggerInstanceIds,
      skipGroups,
      limitPerRun,
    })
  }

  return configs
}

function normalizeHandle(value: unknown): 'yes' | 'no' | '' {
  const handle = String(value || '').trim().toLowerCase()
  if (handle === 'yes' || handle === 'true' || handle === 'sim') return 'yes'
  if (handle === 'no' || handle === 'false' || handle === 'nao') return 'no'
  return ''
}

function isNowWithinBusinessHours(config: Record<string, unknown>): boolean {
  const timezone = getSafeTimezone(config.timezone || Deno.env.get('AUTOMATION_TIMEZONE'))
  const { day: currentDay, minutes: currentMinutes } = getCurrentDayAndMinutesForTimezone(new Date(), timezone)

  const startMinutes = parseTimeToMinutes(config.startHour ?? config.startTime, 8 * 60)
  const endMinutes = parseTimeToMinutes(config.endHour ?? config.endTime, 18 * 60)

  const configuredDays = normalizeDaysList(config.days, [])
  const isWithinDays = configuredDays.length > 0
    ? configuredDays.includes(currentDay)
    : evaluateDayTypeCondition(config.dayType, currentDay)

  const isWithinTime = isMinutesInRange(currentMinutes, startMinutes, endMinutes)
  return isWithinTime && isWithinDays
}

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
  if (start === end) return true
  if (start < end) return current >= start && current <= end
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

function normalizeUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .map((item) => String(item || '').trim())
        .filter(looksLikeUuid),
    ),
  )
}

function looksLikeUuid(value: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''))
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (!Array.isArray(items) || items.length === 0) return []
  const chunkSize = Math.max(1, Math.floor(size))
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}
