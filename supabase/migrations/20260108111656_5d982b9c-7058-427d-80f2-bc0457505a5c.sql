-- Tabela de vínculo entre instâncias WhatsApp e usuários
CREATE TABLE public.whatsapp_instance_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (instance_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.whatsapp_instance_users ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Admins podem gerenciar todos os vínculos
CREATE POLICY "Admins podem gerenciar vínculos de instâncias"
ON public.whatsapp_instance_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = auth.uid() AND sp.codigo = 'admin'
  )
);

-- Usuários podem ver seus próprios vínculos
CREATE POLICY "Usuários podem ver seus vínculos"
ON public.whatsapp_instance_users
FOR SELECT
USING (user_id = auth.uid());

-- Índices para performance
CREATE INDEX idx_whatsapp_instance_users_instance ON public.whatsapp_instance_users(instance_id);
CREATE INDEX idx_whatsapp_instance_users_user ON public.whatsapp_instance_users(user_id);