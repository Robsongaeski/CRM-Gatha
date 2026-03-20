-- Migração: Corrigir nome da tabela de configuração (plural para singular)
-- O sistema utiliza 'system_config' mas a implementação anterior usou 'system_configs'

-- 1. Mover dados da tabela plural para a singular se existirem
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'system_configs') THEN
        INSERT INTO system_config (key, value, is_secret, description, updated_at)
        SELECT key, value, is_secret, description, now()
        FROM system_configs
        WHERE key IN ('uazapi_api_url', 'uazapi_admin_token')
        ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            is_secret = EXCLUDED.is_secret,
            description = EXCLUDED.description,
            updated_at = now();
            
        -- 2. Remover a tabela redundante
        DROP TABLE system_configs;
    END IF;
END $$;

-- 3. Garantir que as chaves existam na tabela correta (caso a plural não existisse)
INSERT INTO system_config (key, value, is_secret, description) VALUES
  ('uazapi_api_url', '', false, 'URL base da UAZAPI (ex: https://api.uazapi.dev)'),
  ('uazapi_admin_token', '', true, 'Admin Token da conta UAZAPI')
ON CONFLICT (key) DO NOTHING;
