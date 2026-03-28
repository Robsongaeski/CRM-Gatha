import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TriggerPayload {
  trigger_type: string
  entity_type: 'order' | 'lead' | 'pedido' | 'whatsapp' | 'whatsapp_conversation'
  entity_id: string
  data: Record<string, unknown>
  old_data?: Record<string, unknown>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: TriggerPayload = await req.json()
    console.log('Automation trigger received:', JSON.stringify(payload))

    const { trigger_type, entity_type, entity_id, data, old_data } = payload
    const workflowTypes = mapEntityToWorkflowTypes(entity_type)

    const { data: workflows, error: workflowError } = await supabase
      .from('automation_workflows')
      .select('id,nome,tipo,flow_data,trigger_config')
      .eq('ativo', true)
      .in('tipo', workflowTypes)

    if (workflowError) {
      console.error('Error fetching workflows:', workflowError)
      throw workflowError
    }

    console.log(`Found ${workflows?.length || 0} workflows for ${entity_type} (${workflowTypes.join(',')})`)

    const executedWorkflows: string[] = []

    for (const workflow of workflows || []) {
      const flowData = workflow.flow_data as {
        nodes?: Array<{ id: string; type: string; data?: { subtype?: string; config?: Record<string, unknown> } }>
      }

      const triggerNode = flowData?.nodes?.find((node) => node.type === 'trigger' && node.data?.subtype === trigger_type)
      if (!triggerNode) {
        continue
      }

      const triggerConfig = triggerNode.data?.config || {}
      const shouldExecute = evaluateTriggerConditions(triggerConfig, data, old_data)
      if (!shouldExecute) {
        continue
      }

      const triggerData = {
        ...data,
        entity_type,
        entity_id,
      }

      const { data: execution, error: execError } = await supabase
        .from('automation_workflow_executions')
        .insert({
          workflow_id: workflow.id,
          trigger_entity: entity_type,
          trigger_entity_id: entity_id,
          trigger_data: triggerData,
          status: 'pending',
          execution_path: [],
        })
        .select('id')
        .single()

      if (execError || !execution) {
        console.error(`Error creating execution for workflow ${workflow.id}:`, execError)
        continue
      }

      const engineUrl = `${supabaseUrl}/functions/v1/automation-engine`
      const engineResponse = await fetch(engineUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          execution_id: execution.id,
          workflow_id: workflow.id,
          flow_data: flowData,
          trigger_data: triggerData,
          current_node_id: triggerNode.id,
        }),
      })

      if (!engineResponse.ok) {
        console.error(`Engine error for execution ${execution.id}:`, await engineResponse.text())
      }

      executedWorkflows.push(workflow.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Triggered ${executedWorkflows.length} workflows`,
        workflows: executedWorkflows,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Automation trigger error:', error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

function mapEntityToWorkflowTypes(entityType: string): Array<'ecommerce' | 'leads' | 'whatsapp' | 'comercial' | 'geral'> {
  const type = String(entityType || '').toLowerCase()
  switch (type) {
    case 'order':
      return ['ecommerce', 'geral']
    case 'lead':
      return ['leads', 'geral']
    case 'pedido':
      return ['comercial', 'geral']
    case 'whatsapp':
    case 'whatsapp_conversation':
      return ['whatsapp', 'geral']
    default:
      return ['geral']
  }
}

function evaluateTriggerConditions(
  config: Record<string, unknown>,
  data: Record<string, unknown>,
  oldData?: Record<string, unknown>,
): boolean {
  if (!config || Object.keys(config).length === 0) {
    return true
  }

  if (config.status && data.status !== config.status) {
    return false
  }

  if (config.old_status && oldData?.status !== config.old_status) {
    return false
  }

  if (config.segmento_id && data.segmento_id !== config.segmento_id) {
    return false
  }

  if (config.valor_minimo && Number(data.valor_total || 0) < Number(config.valor_minimo || 0)) {
    return false
  }

  if (Array.isArray(config.instance_ids) && config.instance_ids.length > 0) {
    const instanceId = String(data.instance_id || '')
    if (!instanceId || !config.instance_ids.map(String).includes(instanceId)) {
      return false
    }
  }

  if (config.only_unassigned === true) {
    const assigned = data.assigned_to
    if (assigned !== null && assigned !== undefined && String(assigned) !== '') {
      return false
    }
  }

  if (config.skip_groups === true && data.is_group === true) {
    return false
  }

  if (config.min_inactivity_days) {
    const minDays = Number(config.min_inactivity_days)
    if (Number.isFinite(minDays) && minDays > 0) {
      const rawLast = String(data.last_customer_message_at || data.last_message_at || '')
      if (!rawLast) return false
      const lastMs = new Date(rawLast).getTime()
      if (!Number.isFinite(lastMs)) return false
      const daysWithoutInteraction = (Date.now() - lastMs) / (1000 * 60 * 60 * 24)
      if (daysWithoutInteraction < minDays) {
        return false
      }
    }
  }

  return true
}
