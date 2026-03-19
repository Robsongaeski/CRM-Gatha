-- =====================================================
-- MÓDULO DE TAREFAS INTERNAS
-- =====================================================

-- 1. ENUM para tipos e status
CREATE TYPE public.tarefa_tipo_conteudo AS ENUM ('texto', 'checklist');
CREATE TYPE public.tarefa_prioridade AS ENUM ('baixa', 'media', 'alta');
CREATE TYPE public.tarefa_status AS ENUM ('pendente', 'em_andamento', 'aguardando_validacao', 'concluida', 'reaberta');

-- 2. Tabela Principal: tarefas
CREATE TABLE public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(255) NOT NULL,
  tipo_conteudo public.tarefa_tipo_conteudo NOT NULL DEFAULT 'texto',
  descricao TEXT,
  prioridade public.tarefa_prioridade NOT NULL DEFAULT 'media',
  data_limite DATE NOT NULL,
  status public.tarefa_status NOT NULL DEFAULT 'pendente',
  criador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  executor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  concluida_em TIMESTAMP WITH TIME ZONE,
  validada_em TIMESTAMP WITH TIME ZONE,
  visualizada_em TIMESTAMP WITH TIME ZONE,
  excluida_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_tarefas_criador ON public.tarefas(criador_id);
CREATE INDEX idx_tarefas_executor ON public.tarefas(executor_id);
CREATE INDEX idx_tarefas_status ON public.tarefas(status);
CREATE INDEX idx_tarefas_data_limite ON public.tarefas(data_limite);
CREATE INDEX idx_tarefas_excluida ON public.tarefas(excluida_em) WHERE excluida_em IS NULL;

-- 3. Tabela de Itens do Checklist
CREATE TABLE public.tarefa_checklist_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  concluido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_tarefa ON public.tarefa_checklist_itens(tarefa_id);

-- 4. Tabela de Observações (Chat)
CREATE TABLE public.tarefa_observacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  lida_por UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_observacoes_tarefa ON public.tarefa_observacoes(tarefa_id);

-- 5. Tabela de Anexos
CREATE TABLE public.tarefa_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  nome_arquivo VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  tipo_mime VARCHAR(100),
  tamanho INTEGER,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_anexos_tarefa ON public.tarefa_anexos(tarefa_id);

-- 6. Trigger para updated_at
CREATE TRIGGER update_tarefas_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_observacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_anexos ENABLE ROW LEVEL SECURITY;

-- Função helper para verificar acesso à tarefa
CREATE OR REPLACE FUNCTION public.has_tarefa_access(_user_id UUID, _tarefa_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tarefas
    WHERE id = _tarefa_id
      AND excluida_em IS NULL
      AND (criador_id = _user_id OR executor_id = _user_id OR is_admin(_user_id))
  );
$$;

-- Políticas para tarefas
CREATE POLICY "Usuários veem próprias tarefas" ON public.tarefas
  FOR SELECT USING (
    excluida_em IS NULL AND (
      criador_id = auth.uid() OR 
      executor_id = auth.uid() OR 
      is_admin(auth.uid())
    )
  );

CREATE POLICY "Usuários podem criar tarefas" ON public.tarefas
  FOR INSERT WITH CHECK (
    criador_id = auth.uid() AND
    has_permission(auth.uid(), 'tarefas.criar')
  );

CREATE POLICY "Participantes podem atualizar tarefas" ON public.tarefas
  FOR UPDATE USING (
    excluida_em IS NULL AND (
      criador_id = auth.uid() OR 
      executor_id = auth.uid() OR 
      is_admin(auth.uid())
    )
  );

-- Políticas para checklist
CREATE POLICY "Acesso checklist via tarefa" ON public.tarefa_checklist_itens
  FOR SELECT USING (has_tarefa_access(auth.uid(), tarefa_id));

CREATE POLICY "Inserir checklist em próprias tarefas" ON public.tarefa_checklist_itens
  FOR INSERT WITH CHECK (has_tarefa_access(auth.uid(), tarefa_id));

CREATE POLICY "Atualizar checklist em próprias tarefas" ON public.tarefa_checklist_itens
  FOR UPDATE USING (has_tarefa_access(auth.uid(), tarefa_id));

CREATE POLICY "Deletar checklist em próprias tarefas" ON public.tarefa_checklist_itens
  FOR DELETE USING (has_tarefa_access(auth.uid(), tarefa_id));

-- Políticas para observações
CREATE POLICY "Acesso observações via tarefa" ON public.tarefa_observacoes
  FOR SELECT USING (has_tarefa_access(auth.uid(), tarefa_id));

CREATE POLICY "Participantes podem comentar" ON public.tarefa_observacoes
  FOR INSERT WITH CHECK (
    usuario_id = auth.uid() AND
    has_tarefa_access(auth.uid(), tarefa_id)
  );

CREATE POLICY "Marcar como lida" ON public.tarefa_observacoes
  FOR UPDATE USING (has_tarefa_access(auth.uid(), tarefa_id));

-- Políticas para anexos
CREATE POLICY "Acesso anexos via tarefa" ON public.tarefa_anexos
  FOR SELECT USING (has_tarefa_access(auth.uid(), tarefa_id));

CREATE POLICY "Participantes podem anexar" ON public.tarefa_anexos
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    has_tarefa_access(auth.uid(), tarefa_id)
  );

CREATE POLICY "Autor ou admin pode deletar anexo" ON public.tarefa_anexos
  FOR DELETE USING (
    uploaded_by = auth.uid() OR is_admin(auth.uid())
  );

-- =====================================================
-- TRIGGERS DE NOTIFICAÇÃO
-- =====================================================

-- Notificar nova tarefa
CREATE OR REPLACE FUNCTION public.notificar_nova_tarefa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só notifica se foi atribuída a outro usuário
  IF NEW.executor_id != NEW.criador_id THEN
    INSERT INTO public.notificacoes (user_id, tipo, mensagem, link)
    VALUES (
      NEW.executor_id, 
      'tarefa_nova', 
      'Nova tarefa atribuída: ' || NEW.titulo, 
      '/tarefas/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notificar_nova_tarefa
  AFTER INSERT ON public.tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_nova_tarefa();

-- Notificar mudança de status
CREATE OR REPLACE FUNCTION public.notificar_mudanca_status_tarefa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Tarefa marcada como aguardando validação (executor concluiu)
  IF OLD.status != 'aguardando_validacao' AND NEW.status = 'aguardando_validacao' THEN
    INSERT INTO public.notificacoes (user_id, tipo, mensagem, link)
    VALUES (
      NEW.criador_id, 
      'tarefa_concluida', 
      'Tarefa aguardando validação: ' || NEW.titulo, 
      '/tarefas/' || NEW.id
    );
  END IF;
  
  -- Tarefa reaberta pelo criador
  IF OLD.status = 'aguardando_validacao' AND NEW.status = 'reaberta' THEN
    INSERT INTO public.notificacoes (user_id, tipo, mensagem, link)
    VALUES (
      NEW.executor_id, 
      'tarefa_reaberta', 
      'Tarefa reaberta: ' || NEW.titulo, 
      '/tarefas/' || NEW.id
    );
  END IF;
  
  -- Tarefa validada/concluída
  IF OLD.status != 'concluida' AND NEW.status = 'concluida' THEN
    INSERT INTO public.notificacoes (user_id, tipo, mensagem, link)
    VALUES (
      NEW.executor_id, 
      'tarefa_validada', 
      'Tarefa validada: ' || NEW.titulo, 
      '/tarefas/' || NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notificar_status_tarefa
  AFTER UPDATE ON public.tarefas
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notificar_mudanca_status_tarefa();

-- Notificar nova observação
CREATE OR REPLACE FUNCTION public.notificar_nova_observacao_tarefa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tarefa RECORD;
  v_destinatario UUID;
BEGIN
  SELECT * INTO v_tarefa FROM public.tarefas WHERE id = NEW.tarefa_id;
  
  -- Determina quem deve receber a notificação
  IF NEW.usuario_id = v_tarefa.criador_id THEN
    v_destinatario := v_tarefa.executor_id;
  ELSE
    v_destinatario := v_tarefa.criador_id;
  END IF;
  
  -- Só notifica se for diferente do autor
  IF v_destinatario != NEW.usuario_id THEN
    INSERT INTO public.notificacoes (user_id, tipo, mensagem, link)
    VALUES (
      v_destinatario, 
      'tarefa_observacao', 
      'Nova observação em: ' || v_tarefa.titulo, 
      '/tarefas/' || NEW.tarefa_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notificar_observacao_tarefa
  AFTER INSERT ON public.tarefa_observacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_nova_observacao_tarefa();

-- =====================================================
-- PERMISSÕES RBAC
-- =====================================================

INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('tarefas.visualizar', 'tarefas', 'visualizar', 'Ver próprias tarefas', 'Tarefas'),
  ('tarefas.criar', 'tarefas', 'criar', 'Criar novas tarefas', 'Tarefas'),
  ('tarefas.atribuir', 'tarefas', 'atribuir', 'Atribuir tarefas a outros usuários', 'Tarefas'),
  ('tarefas.visualizar_todas', 'tarefas', 'visualizar_todas', 'Ver todas as tarefas do sistema', 'Tarefas'),
  ('tarefas.editar_todas', 'tarefas', 'editar_todas', 'Editar qualquer tarefa', 'Tarefas'),
  ('tarefas.excluir', 'tarefas', 'excluir', 'Excluir tarefas (soft delete)', 'Tarefas')
ON CONFLICT (id) DO NOTHING;

-- Adicionar permissões ao perfil Admin
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo IN ('admin', 'administrador')
  AND p.id LIKE 'tarefas.%'
ON CONFLICT DO NOTHING;

-- Adicionar permissões básicas ao perfil Vendedor
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'tarefas.visualizar'
FROM public.system_profiles sp
WHERE sp.codigo = 'vendedor'
ON CONFLICT DO NOTHING;

INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'tarefas.criar'
FROM public.system_profiles sp
WHERE sp.codigo = 'vendedor'
ON CONFLICT DO NOTHING;

INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'tarefas.atribuir'
FROM public.system_profiles sp
WHERE sp.codigo = 'vendedor'
ON CONFLICT DO NOTHING;

-- Adicionar permissões ao perfil Atendente
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'tarefas.visualizar'
FROM public.system_profiles sp
WHERE sp.codigo = 'atendente'
ON CONFLICT DO NOTHING;

INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'tarefas.criar'
FROM public.system_profiles sp
WHERE sp.codigo = 'atendente'
ON CONFLICT DO NOTHING;

-- =====================================================
-- STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('tarefa-anexos', 'tarefa-anexos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas do bucket
CREATE POLICY "Usuários autenticados podem fazer upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tarefa-anexos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Participantes podem ver anexos" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tarefa-anexos' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Autor ou admin pode deletar anexo" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'tarefa-anexos' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR is_admin(auth.uid()))
  );