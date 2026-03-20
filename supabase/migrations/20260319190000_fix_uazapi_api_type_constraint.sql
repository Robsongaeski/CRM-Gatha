-- Migração: Atualizar restrição CHECK de api_type para permitir 'uazapi'

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- 1. Encontrar o nome da restrição CHECK para a coluna api_type
    SELECT conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
    WHERE con.conrelid = 'public.whatsapp_instances'::regclass
      AND con.contype = 'c'
      AND att.attname = 'api_type';

    -- 2. Se encontrar, remover
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.whatsapp_instances DROP CONSTRAINT ' || constraint_name;
    END IF;

    -- 3. Adicionar a nova restrição permitindo uazapi
    ALTER TABLE public.whatsapp_instances 
    ADD CONSTRAINT whatsapp_instances_api_type_check 
    CHECK (api_type IN ('evolution', 'cloud_api', 'uazapi'));
    
    RAISE NOTICE 'Restrição api_type atualizada com sucesso.';
END $$;
