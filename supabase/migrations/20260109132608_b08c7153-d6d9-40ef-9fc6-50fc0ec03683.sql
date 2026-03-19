-- Mover mensagens da conversa duplicada @lid para a conversa original
UPDATE whatsapp_messages 
SET conversation_id = '6edd7e7e-167b-4ed1-ad97-dda12b295415'
WHERE conversation_id = '254cc9f5-eae4-42f6-9e53-c9f5e121b14c';

-- Deletar a conversa duplicada
DELETE FROM whatsapp_conversations 
WHERE id = '254cc9f5-eae4-42f6-9e53-c9f5e121b14c';