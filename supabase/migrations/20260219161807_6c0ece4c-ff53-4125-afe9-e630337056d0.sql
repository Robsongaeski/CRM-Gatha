
-- Alterar FK de whatsapp_conversations para SET NULL (evitar cascade de milhares de registros)
ALTER TABLE whatsapp_conversations DROP CONSTRAINT IF EXISTS whatsapp_conversations_instance_id_fkey;
ALTER TABLE whatsapp_conversations ADD CONSTRAINT whatsapp_conversations_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL;

-- Alterar FK de whatsapp_messages para SET NULL
ALTER TABLE whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_instance_id_fkey;
ALTER TABLE whatsapp_messages ADD CONSTRAINT whatsapp_messages_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES whatsapp_instances(id) ON DELETE SET NULL;
