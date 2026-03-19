-- Remover constraint existente que não inclui 'system'
ALTER TABLE whatsapp_messages 
DROP CONSTRAINT IF EXISTS whatsapp_messages_message_type_check;

-- Recriar constraint incluindo 'system' como tipo válido
ALTER TABLE whatsapp_messages 
ADD CONSTRAINT whatsapp_messages_message_type_check 
CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'sticker', 'reaction', 'location', 'contact', 'poll', 'system'));