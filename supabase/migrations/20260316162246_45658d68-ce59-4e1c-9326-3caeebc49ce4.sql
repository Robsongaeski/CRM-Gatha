
-- Adicionar colunas Cloud API à whatsapp_instances
ALTER TABLE public.whatsapp_instances 
  ADD COLUMN IF NOT EXISTS api_type text NOT NULL DEFAULT 'evolution' 
    CHECK (api_type IN ('evolution', 'cloud_api')),
  ADD COLUMN IF NOT EXISTS meta_phone_number_id text,
  ADD COLUMN IF NOT EXISTS meta_waba_id text;

-- Adicionar last_customer_message_at nas conversas
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS last_customer_message_at timestamptz;
