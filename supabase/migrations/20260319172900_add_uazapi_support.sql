-- Migração: Suporte à UAZAPI como provedor de WhatsApp
-- Adiciona coluna api_type em whatsapp_instances e chaves de configuração

-- 1. Adicionar coluna api_type na tabela de instâncias (default 'evolution' para compatibilidade)
ALTER TABLE whatsapp_instances 
ADD COLUMN IF NOT EXISTS api_type TEXT NOT NULL DEFAULT 'evolution';

-- 2. Adicionar comentário explicativo na coluna
COMMENT ON COLUMN whatsapp_instances.api_type IS 
'Provedor de API WhatsApp: evolution = Evolution API, uazapi = UAZAPI, cloud_api = Meta Cloud API';

-- 3. Adicionar configurações da UAZAPI na tabela de system_config
INSERT INTO system_config (key, value, is_secret, description) VALUES
  ('uazapi_api_url', '', false, 'URL base da UAZAPI (ex: https://api.uazapi.dev)'),
  ('uazapi_admin_token', '', true, 'Admin Token da conta UAZAPI')
ON CONFLICT (key) DO NOTHING;
