-- Add AI provider keys to admin system configuration
INSERT INTO public.system_config (key, value, description, is_secret)
VALUES
  ('openai_api_key', '', 'Chave da API OpenAI para roteador de IA WhatsApp', true),
  ('gemini_api_key', '', 'Chave da API Gemini para roteador de IA WhatsApp', true)
ON CONFLICT (key) DO UPDATE
SET
  description = EXCLUDED.description,
  is_secret = true,
  updated_at = now();
