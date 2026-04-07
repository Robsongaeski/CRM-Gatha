-- Seed idempotente de workflows exemplo para roteamento IA no WhatsApp.
-- Cria/atualiza dois fluxos:
-- 1) IA - Atendimento Ecommerce (Exemplo)  -> agent_key=ecommerce_v1
-- 2) IA - Atendimento Comercial (Exemplo)  -> agent_key=comercial_v1
--
-- Observacao:
-- - Os fluxos sao criados DESATIVADOS (ativo=false) para evitar impacto imediato.
-- - O instance_id e resolvido automaticamente a partir de workflows existentes
--   e, em fallback, pelas instancias ativas.

WITH resolved AS (
  SELECT
    COALESCE(
      (
        SELECT instance_id
        FROM (
          SELECT jsonb_array_elements_text(aw.trigger_config->'instance_ids') AS instance_id
          FROM public.automation_workflows aw
          WHERE aw.tipo = 'whatsapp'
            AND aw.nome ILIKE '%ecommerce%'
        ) src
        WHERE src.instance_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        LIMIT 1
      ),
      (
        SELECT wi.id::text
        FROM public.whatsapp_instances wi
        WHERE wi.is_active = true
          AND (wi.nome ILIKE '%ecommerce%' OR wi.instance_name ILIKE '%ecommerce%')
        ORDER BY wi.updated_at DESC
        LIMIT 1
      ),
      (
        SELECT wi.id::text
        FROM public.whatsapp_instances wi
        WHERE wi.is_active = true
          AND wi.nome NOT ILIKE '%comercial%'
          AND wi.instance_name NOT ILIKE '%comercial%'
        ORDER BY wi.updated_at DESC
        LIMIT 1
      ),
      (
        SELECT wi.id::text
        FROM public.whatsapp_instances wi
        ORDER BY wi.updated_at DESC
        LIMIT 1
      )
    ) AS ecommerce_instance_id
),
payload AS (
  SELECT
    'IA - Atendimento Ecommerce (Exemplo)'::text AS nome,
    'Fluxo exemplo: encaminha mensagem WhatsApp para o agente IA de ecommerce (whatsapp-ai-router?agent_key=ecommerce_v1).'::text AS descricao,
    jsonb_build_object(
      'skip_groups', true,
      'only_unassigned', true,
      'instance_ids', CASE
        WHEN resolved.ecommerce_instance_id IS NULL THEN '[]'::jsonb
        ELSE jsonb_build_array(resolved.ecommerce_instance_id)
      END
    ) AS trigger_cfg,
    jsonb_build_object(
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
              'instance_ids', CASE
                WHEN resolved.ecommerce_instance_id IS NULL THEN '[]'::jsonb
                ELSE jsonb_build_array(resolved.ecommerce_instance_id)
              END
            )
          )
        ),
        jsonb_build_object(
          'id', 'action-ai-ecommerce',
          'type', 'action',
          'position', jsonb_build_object('x', 220, 'y', 280),
          'data', jsonb_build_object(
            'label', 'IA Ecommerce',
            'subtype', 'call_webhook',
            'config', jsonb_build_object(
              'method', 'POST',
              'url', '/functions/v1/whatsapp-ai-router?agent_key=ecommerce_v1',
              'webhookUrl', '/functions/v1/whatsapp-ai-router?agent_key=ecommerce_v1'
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
    ) AS flow
  FROM resolved
),
updated AS (
  UPDATE public.automation_workflows w
  SET
    descricao = p.descricao,
    tipo = 'whatsapp',
    ativo = false,
    flow_data = p.flow,
    trigger_config = p.trigger_cfg,
    updated_at = now()
  FROM payload p
  WHERE w.nome = p.nome
  RETURNING w.id
)
INSERT INTO public.automation_workflows (nome, descricao, tipo, ativo, flow_data, trigger_config)
SELECT p.nome, p.descricao, 'whatsapp', false, p.flow, p.trigger_cfg
FROM payload p
WHERE NOT EXISTS (SELECT 1 FROM updated);

WITH resolved AS (
  SELECT
    COALESCE(
      (
        SELECT instance_id
        FROM (
          SELECT jsonb_array_elements_text(aw.trigger_config->'instance_ids') AS instance_id
          FROM public.automation_workflows aw
          WHERE aw.tipo = 'whatsapp'
            AND aw.nome ILIKE '%comercial%'
        ) src
        WHERE src.instance_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        LIMIT 1
      ),
      (
        SELECT wi.id::text
        FROM public.whatsapp_instances wi
        WHERE wi.is_active = true
          AND (wi.nome ILIKE '%comercial%' OR wi.instance_name ILIKE '%comercial%')
        ORDER BY wi.updated_at DESC
        LIMIT 1
      ),
      (
        SELECT wi.id::text
        FROM public.whatsapp_instances wi
        WHERE wi.is_active = true
        ORDER BY wi.updated_at DESC
        LIMIT 1
      ),
      (
        SELECT wi.id::text
        FROM public.whatsapp_instances wi
        ORDER BY wi.updated_at DESC
        LIMIT 1
      )
    ) AS comercial_instance_id
),
payload AS (
  SELECT
    'IA - Atendimento Comercial (Exemplo)'::text AS nome,
    'Fluxo exemplo: encaminha mensagem WhatsApp para o agente IA comercial (whatsapp-ai-router?agent_key=comercial_v1).'::text AS descricao,
    jsonb_build_object(
      'skip_groups', true,
      'only_unassigned', true,
      'instance_ids', CASE
        WHEN resolved.comercial_instance_id IS NULL THEN '[]'::jsonb
        ELSE jsonb_build_array(resolved.comercial_instance_id)
      END
    ) AS trigger_cfg,
    jsonb_build_object(
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
              'instance_ids', CASE
                WHEN resolved.comercial_instance_id IS NULL THEN '[]'::jsonb
                ELSE jsonb_build_array(resolved.comercial_instance_id)
              END
            )
          )
        ),
        jsonb_build_object(
          'id', 'action-ai-comercial',
          'type', 'action',
          'position', jsonb_build_object('x', 220, 'y', 280),
          'data', jsonb_build_object(
            'label', 'IA Comercial',
            'subtype', 'call_webhook',
            'config', jsonb_build_object(
              'method', 'POST',
              'url', '/functions/v1/whatsapp-ai-router?agent_key=comercial_v1',
              'webhookUrl', '/functions/v1/whatsapp-ai-router?agent_key=comercial_v1'
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
    ) AS flow
  FROM resolved
),
updated AS (
  UPDATE public.automation_workflows w
  SET
    descricao = p.descricao,
    tipo = 'whatsapp',
    ativo = false,
    flow_data = p.flow,
    trigger_config = p.trigger_cfg,
    updated_at = now()
  FROM payload p
  WHERE w.nome = p.nome
  RETURNING w.id
)
INSERT INTO public.automation_workflows (nome, descricao, tipo, ativo, flow_data, trigger_config)
SELECT p.nome, p.descricao, 'whatsapp', false, p.flow, p.trigger_cfg
FROM payload p
WHERE NOT EXISTS (SELECT 1 FROM updated);
