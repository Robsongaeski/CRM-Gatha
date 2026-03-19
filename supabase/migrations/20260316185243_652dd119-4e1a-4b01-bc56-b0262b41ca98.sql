INSERT INTO public.system_config (key, value, description, is_secret)
VALUES 
  ('meta_config_id', '947231041130313', 'Configuration ID do Facebook Login for Business', false)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

UPDATE public.system_config SET value = '917920924543512' WHERE key = 'meta_app_id';