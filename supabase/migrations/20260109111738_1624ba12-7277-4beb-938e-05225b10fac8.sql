-- Limpar contact_phone inválidos de conversas @lid
-- Conversas com remote_jid @lid não têm número de telefone real no jid
UPDATE whatsapp_conversations 
SET contact_phone = NULL 
WHERE remote_jid LIKE '%@lid' 
  AND contact_phone IS NOT NULL;

-- Limpar também telefones com mais de 13 dígitos (inválidos para Brasil: 55 + 11 dígitos = 13)
UPDATE whatsapp_conversations 
SET contact_phone = NULL 
WHERE contact_phone IS NOT NULL 
  AND LENGTH(REGEXP_REPLACE(contact_phone, '[^0-9]', '', 'g')) > 13;