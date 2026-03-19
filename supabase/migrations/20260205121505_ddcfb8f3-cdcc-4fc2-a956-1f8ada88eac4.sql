
-- =====================================================
-- Correção do check constraint para status de mensagens WhatsApp
-- Problema: webhook retorna SERVER_ACK, DELIVERY_ACK que são convertidos 
-- para lowercase mas não estão no constraint
-- =====================================================

-- Remover constraint antigo
ALTER TABLE public.whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_status_check;

-- Adicionar constraint atualizado com todos os status possíveis
ALTER TABLE public.whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_status_check 
CHECK (status IN (
  'pending',      -- Aguardando envio
  'sent',         -- Enviado
  'delivered',    -- Entregue
  'read',         -- Lido
  'error',        -- Erro
  'queued',       -- Na fila (instância offline)
  'server_ack',   -- Confirmado pelo servidor WhatsApp
  'delivery_ack', -- Confirmado entrega ao destinatário
  'played'        -- Áudio/vídeo reproduzido
));

-- Comentário explicativo
COMMENT ON CONSTRAINT whatsapp_messages_status_check ON public.whatsapp_messages IS
'Status válidos para mensagens WhatsApp: pending, sent, delivered, read, error, queued, server_ack, delivery_ack, played';
