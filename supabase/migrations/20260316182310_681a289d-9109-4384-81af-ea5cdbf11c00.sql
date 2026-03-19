ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS meta_business_account_id text,
  ADD COLUMN IF NOT EXISTS meta_display_phone_number text,
  ADD COLUMN IF NOT EXISTS meta_account_name text;

INSERT INTO public.system_config (key, value, description, is_secret)
VALUES ('meta_app_id', '947231041130313', 'Facebook App ID para Embedded Signup', false)
ON CONFLICT (key) DO NOTHING;