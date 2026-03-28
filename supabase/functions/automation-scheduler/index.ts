import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Esta função é chamada por um cron job para processar ações agendadas
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Checking for scheduled automation actions...')

    // Buscar ações pendentes que já passaram do horário agendado
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

        // Buscar a execução para obter o workflow
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

        // Encontrar o próximo nó após o delay
        const flowData = workflow.flow_data as { nodes: Array<{ id: string }>, edges: Array<{ source: string, target: string }> }
        const edges = flowData.edges || []
        const nextEdge = edges.find((e: { source: string }) => e.source === action.node_id)
        
        if (!nextEdge) {
          // Fluxo terminou após o delay
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

        // Continuar a execução a partir do próximo nó
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
            current_node_id: nextEdge.target
          }),
        })

        if (!engineResponse.ok) {
          throw new Error(`Engine error: ${await engineResponse.text()}`)
        }

        // Marcar ação como executada
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results,
        inactivity: inactivityResult,
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
      .eq('tipo', 'whatsapp')

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
