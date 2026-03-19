-- Inserir configurações da Meta Cloud API no system_config
INSERT INTO public.system_config (key, value, description, is_secret)
VALUES 
  ('meta_access_token', NULL, 'Token de acesso permanente da Meta (System User Token) para WhatsApp Cloud API', true),
  ('meta_app_secret', NULL, 'App Secret da Meta para validação de webhooks do WhatsApp Cloud API', true),
  ('meta_verify_token', NULL, 'Token customizado para verificação do challenge do webhook da Meta', false)
ON CONFLICT (key) DO NOTHING;