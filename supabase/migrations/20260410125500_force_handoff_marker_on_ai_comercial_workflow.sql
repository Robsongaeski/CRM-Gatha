-- Forca marcador de retomada no fluxo IA - Atendimento Comercial (por nome),
-- mesmo quando nao entra no criterio automatico.

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
  AND w.nome ILIKE 'IA - Atendimento Comercial%'
  AND NOT jsonb_path_exists(w.flow_data, '$.nodes[*] ? (@.type == "control" && @.data.subtype == "business_hours_handoff")');
