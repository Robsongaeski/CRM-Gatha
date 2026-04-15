-- Garante o marcador de transferencia IA -> Distribuir no Horario
-- para fluxos com gatilho WhatsApp + business_hours + ai_agent + atribuicao.
-- Aplica em qualquer tipo de fluxo (whatsapp/comercial/geral).

-- 1) Adiciona marcador quando ainda nao existe.
UPDATE public.automation_workflows w
SET
  flow_data = jsonb_set(
    COALESCE(w.flow_data, '{}'::jsonb),
    '{nodes}',
    COALESCE(w.flow_data->'nodes', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'id', 'control-business-hours-handoff',
        'type', 'control',
        'position', jsonb_build_object('x', 860, 'y', 80),
        'data', jsonb_build_object(
          'label', 'IA -> Distribuir no Horario',
          'subtype', 'business_hours_handoff',
          'config', jsonb_build_object(
            'enabled', true,
            'limit_per_run', 80,
            'handoff_limit', 80
          )
        )
      )
    ),
    true
  ),
  updated_at = now()
WHERE jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "trigger" && (@.data.subtype == "whatsapp_message" || @.data.subtype == "whatsapp_new_lead"))')
  AND jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "condition" && @.data.subtype == "business_hours")')
  AND jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "action" && @.data.subtype == "ai_agent")')
  AND (
    jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "action" && @.data.subtype == "assign_round_robin")')
    OR jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "action" && @.data.subtype == "assign_to_user")')
  )
  AND NOT jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "control" && @.data.subtype == "business_hours_handoff")');

-- 2) Padroniza label do marcador quando ja existe.
UPDATE public.automation_workflows w
SET
  flow_data = jsonb_set(
    w.flow_data,
    '{nodes}',
    (
      SELECT jsonb_agg(
        CASE
          WHEN node->>'type' = 'control' AND node->'data'->>'subtype' = 'business_hours_handoff'
            THEN jsonb_set(node, '{data,label}', to_jsonb('IA -> Distribuir no Horario'::text), true)
          ELSE node
        END
      )
      FROM jsonb_array_elements(COALESCE(w.flow_data->'nodes', '[]'::jsonb)) AS node
    ),
    true
  ),
  updated_at = now()
WHERE jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "control" && @.data.subtype == "business_hours_handoff")');
