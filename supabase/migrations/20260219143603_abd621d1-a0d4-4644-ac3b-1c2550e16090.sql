-- Reverter mensagens que foram incorretamente mudadas de 'error' para 'sent'
-- Restaurar status 'error' para mensagens da instância 2480 que realmente falharam
UPDATE whatsapp_messages
SET status = 'error'
WHERE instance_id = '51c0823c-84af-4c82-98c3-49574370e31e'
  AND from_me = true
  AND status = 'sent'
  AND message_id_external IS NOT NULL
  AND created_at >= '2026-02-19'::date;