-- Adiciona suporte a conversas fixadas no topo
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Índice para ordenação eficiente (fixadas primeiro)
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_pinned
  ON whatsapp_conversations (is_pinned DESC, last_message_at DESC);

-- Habilitar realtime para a nova coluna (já está habilitado na tabela)
COMMENT ON COLUMN whatsapp_conversations.is_pinned IS 'Conversa fixada no topo da lista';
