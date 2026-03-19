-- =====================================================
-- MÓDULO WHATSAPP - ESTRUTURA COMPLETA DO BANCO
-- =====================================================

-- 1. TABELA: whatsapp_instances
-- Instâncias de WhatsApp conectadas via Evolution API
CREATE TABLE public.whatsapp_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  instance_name VARCHAR(100) NOT NULL UNIQUE,
  numero_whatsapp VARCHAR(20),
  status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'connecting', 'connected', 'error')),
  is_active BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  foto_url TEXT,
  webhook_configured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TABELA: whatsapp_conversations
-- Conversas (contatos ou grupos)
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  remote_jid VARCHAR(100) NOT NULL,
  is_group BOOLEAN DEFAULT false,
  group_name VARCHAR(255),
  group_photo_url TEXT,
  contact_name VARCHAR(255),
  contact_phone VARCHAR(20),
  contact_photo_url TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'finished')),
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  internal_notes TEXT,
  ai_enabled BOOLEAN DEFAULT false,
  ai_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(instance_id, remote_jid)
);

-- 3. TABELA: whatsapp_messages
-- Mensagens das conversas
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  instance_id UUID REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  message_id_external VARCHAR(100),
  from_me BOOLEAN DEFAULT false,
  sender_phone VARCHAR(20),
  sender_name VARCHAR(255),
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document', 'sticker', 'reaction', 'location', 'contact', 'poll')),
  media_url TEXT,
  media_mime_type VARCHAR(100),
  media_filename VARCHAR(255),
  media_base64 TEXT,
  quoted_message_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  quoted_content TEXT,
  quoted_sender VARCHAR(255),
  reactions JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. TABELA: whatsapp_quick_replies
-- Respostas rápidas com variáveis
CREATE TABLE public.whatsapp_quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo VARCHAR(100) NOT NULL,
  conteudo TEXT NOT NULL,
  atalho VARCHAR(50),
  variaveis JSONB DEFAULT '[]'::jsonb,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. TABELA: whatsapp_message_queue
-- Fila de mensagens para envio (quando instância offline)
CREATE TABLE public.whatsapp_message_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  remote_jid VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  media_url TEXT,
  media_base64 TEXT,
  quoted_message_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'error')),
  attempts INTEGER DEFAULT 0,
  error_message TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_whatsapp_conversations_instance ON public.whatsapp_conversations(instance_id);
CREATE INDEX idx_whatsapp_conversations_cliente ON public.whatsapp_conversations(cliente_id);
CREATE INDEX idx_whatsapp_conversations_assigned ON public.whatsapp_conversations(assigned_to);
CREATE INDEX idx_whatsapp_conversations_status ON public.whatsapp_conversations(status);
CREATE INDEX idx_whatsapp_conversations_last_message ON public.whatsapp_conversations(last_message_at DESC);
CREATE INDEX idx_whatsapp_conversations_unread ON public.whatsapp_conversations(unread_count) WHERE unread_count > 0;

CREATE INDEX idx_whatsapp_messages_conversation ON public.whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_created ON public.whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_external ON public.whatsapp_messages(message_id_external);
CREATE INDEX idx_whatsapp_messages_type ON public.whatsapp_messages(message_type);

CREATE INDEX idx_whatsapp_queue_status ON public.whatsapp_message_queue(status) WHERE status = 'pending';
CREATE INDEX idx_whatsapp_queue_instance ON public.whatsapp_message_queue(instance_id);

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para normalizar telefone brasileiro
CREATE OR REPLACE FUNCTION public.normalize_phone(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  -- Remove tudo que não é número
  cleaned := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- Se começar com +, já removemos
  -- Se tiver 10-11 dígitos, adiciona 55 (Brasil)
  IF length(cleaned) >= 10 AND length(cleaned) <= 11 AND NOT cleaned LIKE '55%' THEN
    cleaned := '55' || cleaned;
  END IF;
  
  RETURN cleaned;
END;
$$;

-- Função para buscar cliente pelo telefone
CREATE OR REPLACE FUNCTION public.find_cliente_by_phone(phone TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized TEXT;
  cliente_id UUID;
BEGIN
  normalized := normalize_phone(phone);
  
  -- Busca por telefone ou whatsapp normalizado
  SELECT id INTO cliente_id
  FROM clientes
  WHERE normalize_phone(telefone) = normalized
     OR normalize_phone(whatsapp) = normalized
  LIMIT 1;
  
  RETURN cliente_id;
END;
$$;

-- Função para verificar acesso ao módulo WhatsApp
CREATE OR REPLACE FUNCTION public.has_whatsapp_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_admin(_user_id) OR
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN system_profiles sp ON up.profile_id = sp.id
      WHERE up.user_id = _user_id
        AND sp.codigo IN ('ecommerce', 'atendente')
        AND sp.ativo = true
    ) OR
    has_permission(_user_id, 'ecommerce.whatsapp.visualizar');
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON public.whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_quick_replies_updated_at
  BEFORE UPDATE ON public.whatsapp_quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para vincular cliente automaticamente ao criar conversa
CREATE OR REPLACE FUNCTION public.auto_link_cliente_whatsapp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se não tem cliente vinculado e tem telefone, tenta encontrar
  IF NEW.cliente_id IS NULL AND NEW.contact_phone IS NOT NULL THEN
    NEW.cliente_id := find_cliente_by_phone(NEW.contact_phone);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_link_cliente_on_conversation
  BEFORE INSERT OR UPDATE ON public.whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_cliente_whatsapp();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_queue ENABLE ROW LEVEL SECURITY;

-- Policies para whatsapp_instances (apenas admins e ecommerce podem gerenciar)
CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
  FOR SELECT USING (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar'));

CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
  FOR UPDATE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar'));

CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
  FOR DELETE USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar'));

-- Policies para whatsapp_conversations
CREATE POLICY "whatsapp_conversations_select" ON public.whatsapp_conversations
  FOR SELECT USING (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_conversations_insert" ON public.whatsapp_conversations
  FOR INSERT WITH CHECK (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_conversations_update" ON public.whatsapp_conversations
  FOR UPDATE USING (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_conversations_delete" ON public.whatsapp_conversations
  FOR DELETE USING (is_admin(auth.uid()));

-- Policies para whatsapp_messages
CREATE POLICY "whatsapp_messages_select" ON public.whatsapp_messages
  FOR SELECT USING (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_messages_insert" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_messages_update" ON public.whatsapp_messages
  FOR UPDATE USING (has_whatsapp_access(auth.uid()));

-- Policies para whatsapp_quick_replies
CREATE POLICY "whatsapp_quick_replies_select" ON public.whatsapp_quick_replies
  FOR SELECT USING (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_quick_replies_all" ON public.whatsapp_quick_replies
  FOR ALL USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar'));

-- Policies para whatsapp_message_queue
CREATE POLICY "whatsapp_message_queue_select" ON public.whatsapp_message_queue
  FOR SELECT USING (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_message_queue_insert" ON public.whatsapp_message_queue
  FOR INSERT WITH CHECK (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_message_queue_update" ON public.whatsapp_message_queue
  FOR UPDATE USING (has_whatsapp_access(auth.uid()));

-- =====================================================
-- PERMISSÕES DO MÓDULO WHATSAPP
-- =====================================================

INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('ecommerce.whatsapp.visualizar', 'ecommerce', 'whatsapp.visualizar', 'Visualizar atendimentos WhatsApp', 'WhatsApp'),
  ('ecommerce.whatsapp.atender', 'ecommerce', 'whatsapp.atender', 'Responder mensagens WhatsApp', 'WhatsApp'),
  ('ecommerce.whatsapp.configurar', 'ecommerce', 'whatsapp.configurar', 'Gerenciar instâncias e respostas rápidas', 'WhatsApp'),
  ('ecommerce.whatsapp.dashboard', 'ecommerce', 'whatsapp.dashboard', 'Visualizar dashboard WhatsApp', 'WhatsApp')
ON CONFLICT (id) DO NOTHING;

-- Adicionar permissões ao perfil admin
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo IN ('admin', 'administrador')
  AND p.id LIKE 'ecommerce.whatsapp.%'
ON CONFLICT DO NOTHING;

-- Adicionar permissões ao perfil ecommerce (se existir)
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo = 'ecommerce'
  AND p.id LIKE 'ecommerce.whatsapp.%'
ON CONFLICT DO NOTHING;

-- =====================================================
-- HABILITAR REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_instances;