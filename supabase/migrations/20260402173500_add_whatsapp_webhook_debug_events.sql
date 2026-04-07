-- Tabela de diagnóstico para webhooks WhatsApp.
-- Objetivo: facilitar troubleshooting de casos em que envio funciona e recebimento falha.

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_debug_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  provider TEXT NOT NULL,
  source_function TEXT NOT NULL,
  instance_id UUID NULL REFERENCES public.whatsapp_instances(id) ON DELETE SET NULL,
  instance_identifier TEXT NULL,
  raw_event TEXT NULL,
  normalized_event TEXT NULL,
  status TEXT NOT NULL,
  message_candidates INTEGER NULL,
  messages_processed INTEGER NULL,
  parse_errors INTEGER NULL,
  details JSONB NULL,
  error_message TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_debug_events_created_at
  ON public.whatsapp_webhook_debug_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_webhook_debug_events_instance
  ON public.whatsapp_webhook_debug_events (instance_id, created_at DESC);
