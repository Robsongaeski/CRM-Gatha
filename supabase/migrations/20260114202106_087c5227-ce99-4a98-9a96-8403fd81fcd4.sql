-- Tabela para configurações do sistema
CREATE TABLE IF NOT EXISTS public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver configurações
CREATE POLICY "Admins podem ver configurações"
ON public.system_config FOR SELECT
USING (is_admin(auth.uid()));

-- Apenas admins podem atualizar configurações
CREATE POLICY "Admins podem atualizar configurações"
ON public.system_config FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Apenas admins podem inserir configurações
CREATE POLICY "Admins podem inserir configurações"
ON public.system_config FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_system_config_updated_at
BEFORE UPDATE ON public.system_config
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações iniciais do WhatsApp
INSERT INTO public.system_config (key, value, description, is_secret) VALUES
('evolution_api_url', 'http://173.212.227.213:8088', 'URL base da Evolution API', false),
('evolution_api_key', '', 'Chave de acesso da Evolution API', true)
ON CONFLICT (key) DO NOTHING;