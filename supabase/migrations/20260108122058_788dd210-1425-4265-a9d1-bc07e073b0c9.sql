-- Limpar dados de conversa incorretos onde contact_name é "Ana atendimento" ou similar
-- Isso permitirá que o webhook receba novos dados corretos nas próximas mensagens

UPDATE whatsapp_conversations
SET contact_name = NULL
WHERE contact_name ILIKE '%atendimento%'
  AND is_group = false;

-- Limpar telefones que são números de instância ou LIDs inválidos
-- Telefones com formato 554691154715 (número da instância 4715)
UPDATE whatsapp_conversations c
SET contact_phone = NULL
WHERE is_group = false
  AND (
    -- Telefones muito grandes (provavelmente LID)
    LENGTH(REGEXP_REPLACE(contact_phone, '\D', '', 'g')) > 15
    -- Ou telefones que são iguais a números conhecidos de instâncias
    OR contact_phone LIKE '%4691154715%'
  );