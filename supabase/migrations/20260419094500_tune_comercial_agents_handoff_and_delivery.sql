BEGIN;

UPDATE public.whatsapp_ai_agents
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'features', jsonb_build_object(
    'humanize_style', true,
    'auto_sanitize', true,
    'use_llm_triage', true,
    'split_greeting_question', true
  ),
  'triage', jsonb_build_object(
    'enabled', true,
    'required_fields', jsonb_build_array('produto', 'quantidade', 'ideia')
  ),
  'handoff', jsonb_build_object(
    'send_transition_message', true,
    'transition_message', 'Vou passar para a [nome atendente], que vai finalizar o orçamento para você. Ja deixei as informacoes que voce me passou aqui para agilizar, tudo bem?',
    'price_request_handoff_threshold', 2,
    'min_customer_messages_before_handoff', 4
  )
)
WHERE agent_key IN ('comercial_v1', 'comercial_v2');

COMMIT;
