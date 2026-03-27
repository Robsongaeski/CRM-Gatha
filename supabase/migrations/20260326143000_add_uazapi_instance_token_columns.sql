-- Add UAZAPI instance credentials cache fields
-- These fields store the token/external id returned by /instance/init or /instance/all
-- to avoid relying on admin listing in every operation.

ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS uazapi_instance_token TEXT,
  ADD COLUMN IF NOT EXISTS uazapi_instance_external_id TEXT;

COMMENT ON COLUMN public.whatsapp_instances.uazapi_instance_token IS
'Token da instancia UAZAPI para autenticacao em endpoints com header token.';

COMMENT ON COLUMN public.whatsapp_instances.uazapi_instance_external_id IS
'ID externo da instancia na UAZAPI (quando fornecido pela API).';

