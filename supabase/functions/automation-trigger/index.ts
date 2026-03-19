import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TriggerPayload {
  trigger_type: string
  entity_type: 'order' | 'lead' | 'pedido' | 'whatsapp_conversation'
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

    // Buscar workflows ativos que correspondam a este trigger
    const { data: workflows, error: workflowError } = await supabase
      .from('automation_workflows')
      .select(`
        id, 
        nome,
        tipo,
        flow_data,
        trigger_config
      `)
      .eq('ativo', true)
      .or(`tipo.eq.${entity_type},tipo.eq.todos`)

    if (workflowError) {
      console.error('Error fetching workflows:', workflowError)
      throw workflowError
    }

    console.log(`Found ${workflows?.length || 0} active workflows for entity type: ${entity_type}`)

    const executedWorkflows: string[] = []

    for (const workflow of workflows || []) {
      // Verificar se o workflow tem um trigger node que corresponde ao evento
      const flowData = workflow.flow_data as { nodes?: Array<{ type: string, data?: { subtype?: string, config?: Record<string, unknown> } }> }
      const triggerNode = flowData?.nodes?.find(
        (node: { type: string, data?: { subtype?: string } }) => 
          node.type === 'trigger' && node.data?.subtype === trigger_type
      )

      if (!triggerNode) {
        console.log(`Workflow ${workflow.id} doesn't match trigger type ${trigger_type}`)
        continue
      }

      // Verificar condições adicionais do trigger (se houver)
      const triggerConfig = triggerNode.data?.config || {}
      const shouldExecute = evaluateTriggerConditions(triggerConfig, data, old_data)

      if (!shouldExecute) {
        console.log(`Workflow ${workflow.id} conditions not met`)
        continue
      }

      // Criar uma execução para este workflow
      const { data: execution, error: execError } = await supabase
        .from('automation_workflow_executions')
        .insert({
          workflow_id: workflow.id,
          trigger_entity: entity_type,
          trigger_entity_id: entity_id,
          trigger_data: data,
          status: 'pending',
          execution_path: []
        })
        .select()
        .single()

      if (execError) {
        console.error(`Error creating execution for workflow ${workflow.id}:`, execError)
        continue
      }

      console.log(`Created execution ${execution.id} for workflow ${workflow.id}`)

      // Chamar o automation-engine para processar esta execução
      const engineUrl = `${supabaseUrl}/functions/v1/automation-engine`
      const engineResponse = await fetch(engineUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          execution_id: execution.id,
          workflow_id: workflow.id,
          flow_data: flowData,
          trigger_data: data
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
        workflows: executedWorkflows 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Automation trigger error:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

function evaluateTriggerConditions(
  config: Record<string, unknown>, 
  data: Record<string, unknown>,
  oldData?: Record<string, unknown>
): boolean {
  // Se não há condições, sempre executa
  if (!config || Object.keys(config).length === 0) {
    return true
  }

  // Verificar status específico (se configurado)
  if (config.status && data.status !== config.status) {
    return false
  }

  // Verificar status anterior (para triggers de mudança de status)
  if (config.old_status && oldData?.status !== config.old_status) {
    return false
  }

  // Verificar segmento (para leads)
  if (config.segmento_id && data.segmento_id !== config.segmento_id) {
    return false
  }

  // Verificar valor mínimo (para pedidos)
  if (config.valor_minimo && (data.valor_total as number) < (config.valor_minimo as number)) {
    return false
  }

  return true
}
