-- Corrigir mensagens da instância 2480 ("novo") com falso status de erro
-- Mensagens que têm message_id_external (API aceitou) mas error_message NULL (sem erro real)
UPDATE whatsapp_messages
SET status = 'sent'
WHERE instance_id = '51c0823c-84af-4c82-98c3-49574370e31e'
  AND from_me = true
  AND status = 'error'
  AND error_message IS NULL
  AND message_id_external IS NOT NULL;