-- Atualiza workflows de exemplo de IA para usar o subtipo nativo `ai_agent`
-- no fluxo visual (sem URL de webhook exposta no componente).

WITH target AS (
  SELECT
    id,
    COALESCE(trigger_config->'instance_ids', '[]'::jsonb) AS instance_ids
  FROM public.automation_workflows
  WHERE nome = 'IA - Atendimento Ecommerce (Exemplo)'
    AND tipo = 'whatsapp'
)
UPDATE public.automation_workflows w
SET
  trigger_config = jsonb_build_object(
    'skip_groups', true,
    'only_unassigned', true,
    'instance_ids', target.instance_ids
  ),
  flow_data = jsonb_build_object(
    'nodes', jsonb_build_array(
      jsonb_build_object(
        'id', 'trigger-ai-ecommerce',
        'type', 'trigger',
        'position', jsonb_build_object('x', 220, 'y', 80),
        'data', jsonb_build_object(
          'label', 'Mensagem WhatsApp',
          'subtype', 'whatsapp_message',
          'config', jsonb_build_object(
            'skip_groups', true,
            'only_unassigned', true,
            'instance_ids', target.instance_ids
          )
        )
      ),
      jsonb_build_object(
        'id', 'action-ai-ecommerce',
        'type', 'action',
        'position', jsonb_build_object('x', 220, 'y', 280),
        'data', jsonb_build_object(
          'label', 'Agente IA Ecommerce',
          'subtype', 'ai_agent',
          'config', jsonb_build_object(
            'agent_key', 'ecommerce_v1',
            'agent_name', 'IA Ecommerce - Primeiro Atendimento'
          )
        )
      ),
      jsonb_build_object(
        'id', 'control-ai-ecommerce-stop',
        'type', 'control',
        'position', jsonb_build_object('x', 220, 'y', 470),
        'data', jsonb_build_object(
          'label', 'Encerrar',
          'subtype', 'stop_flow',
          'config', jsonb_build_object()
        )
      )
    ),
    'edges', jsonb_build_array(
      jsonb_build_object(
        'id', 'e-ai-ecommerce-1',
        'type', 'custom',
        'source', 'trigger-ai-ecommerce',
        'target', 'action-ai-ecommerce'
      ),
      jsonb_build_object(
        'id', 'e-ai-ecommerce-2',
        'type', 'custom',
        'source', 'action-ai-ecommerce',
        'target', 'control-ai-ecommerce-stop'
      )
    )
  ),
  updated_at = now()
FROM target
WHERE w.id = target.id;

WITH target AS (
  SELECT
    id,
    COALESCE(trigger_config->'instance_ids', '[]'::jsonb) AS instance_ids
  FROM public.automation_workflows
  WHERE nome = 'IA - Atendimento Comercial (Exemplo)'
    AND tipo = 'whatsapp'
)
UPDATE public.automation_workflows w
SET
  trigger_config = jsonb_build_object(
    'skip_groups', true,
    'only_unassigned', true,
    'instance_ids', target.instance_ids
  ),
  flow_data = jsonb_build_object(
    'nodes', jsonb_build_array(
      jsonb_build_object(
        'id', 'trigger-ai-comercial',
        'type', 'trigger',
        'position', jsonb_build_object('x', 220, 'y', 80),
        'data', jsonb_build_object(
          'label', 'Mensagem WhatsApp',
          'subtype', 'whatsapp_message',
          'config', jsonb_build_object(
            'skip_groups', true,
            'only_unassigned', true,
            'instance_ids', target.instance_ids
          )
        )
      ),
      jsonb_build_object(
        'id', 'action-ai-comercial',
        'type', 'action',
        'position', jsonb_build_object('x', 220, 'y', 280),
        'data', jsonb_build_object(
          'label', 'Agente IA Comercial',
          'subtype', 'ai_agent',
          'config', jsonb_build_object(
            'agent_key', 'comercial_v1',
            'agent_name', 'IA Comercial - Primeiro Atendimento'
          )
        )
      ),
      jsonb_build_object(
        'id', 'control-ai-comercial-stop',
        'type', 'control',
        'position', jsonb_build_object('x', 220, 'y', 470),
        'data', jsonb_build_object(
          'label', 'Encerrar',
          'subtype', 'stop_flow',
          'config', jsonb_build_object()
        )
      )
    ),
    'edges', jsonb_build_array(
      jsonb_build_object(
        'id', 'e-ai-comercial-1',
        'type', 'custom',
        'source', 'trigger-ai-comercial',
        'target', 'action-ai-comercial'
      ),
      jsonb_build_object(
        'id', 'e-ai-comercial-2',
        'type', 'custom',
        'source', 'action-ai-comercial',
        'target', 'control-ai-comercial-stop'
      )
    )
  ),
  updated_at = now()
FROM target
WHERE w.id = target.id;
