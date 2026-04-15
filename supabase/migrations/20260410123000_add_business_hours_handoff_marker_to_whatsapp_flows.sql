-- Marca fluxos WhatsApp para retomar conversas da IA no inicio do horario comercial.
-- Criterio: fluxo com condicao business_hours + acao ai_agent + acao de atribuicao,
-- sem o marcador business_hours_handoff.

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
          'label', 'Retomar IA no Comercial',
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
WHERE w.tipo = 'whatsapp'
  AND jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "condition" && @.data.subtype == "business_hours")')
  AND jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "action" && @.data.subtype == "ai_agent")')
  AND (
    jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "action" && @.data.subtype == "assign_round_robin")')
    OR jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "action" && @.data.subtype == "assign_to_user")')
  )
  AND NOT jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "control" && @.data.subtype == "business_hours_handoff")');
