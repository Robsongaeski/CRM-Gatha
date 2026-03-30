-- Melhora de performance para busca de conversas no WhatsApp
-- Suporta filtros com LIKE/ILIKE em nome, telefone, jid e preview.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_contact_name_trgm
  ON public.whatsapp_conversations
  USING gin (contact_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_group_name_trgm
  ON public.whatsapp_conversations
  USING gin (group_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_preview_trgm
  ON public.whatsapp_conversations
  USING gin (last_message_preview gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_contact_phone_trgm
  ON public.whatsapp_conversations
  USING gin (contact_phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_remote_jid_trgm
  ON public.whatsapp_conversations
  USING gin (remote_jid gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clientes_nome_razao_social_trgm
  ON public.clientes
  USING gin (nome_razao_social gin_trgm_ops);
