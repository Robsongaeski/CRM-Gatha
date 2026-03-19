-- =====================================================
-- RECRIAÇÃO COMPLETA DO MÓDULO DE TAREFAS
-- Versão corrigida: Usando CASCADE para dependências
-- =====================================================

-- PASSO 1: Remover triggers primeiro
DROP TRIGGER IF EXISTS tr_notificar_nova_tarefa ON public.tarefas;
DROP TRIGGER IF EXISTS tr_notificar_mudanca_status_tarefa ON public.tarefas;
DROP TRIGGER IF EXISTS tr_notificar_nova_observacao_tarefa ON public.tarefa_observacoes;

-- PASSO 2: Remover políticas RLS manualmente antes de dropar as funções
DROP POLICY IF EXISTS "Acesso checklist via tarefa" ON public.tarefa_checklist_itens;
DROP POLICY IF EXISTS "Inserir checklist em próprias tarefas" ON public.tarefa_checklist_itens;
DROP POLICY IF EXISTS "Atualizar checklist em próprias tarefas" ON public.tarefa_checklist_itens;
DROP POLICY IF EXISTS "Deletar checklist em próprias tarefas" ON public.tarefa_checklist_itens;
DROP POLICY IF EXISTS "Acesso observações via tarefa" ON public.tarefa_observacoes;
DROP POLICY IF EXISTS "Participantes podem comentar" ON public.tarefa_observacoes;
DROP POLICY IF EXISTS "Marcar como lida" ON public.tarefa_observacoes;
DROP POLICY IF EXISTS "Acesso anexos via tarefa" ON public.tarefa_anexos;
DROP POLICY IF EXISTS "Participantes podem anexar" ON public.tarefa_anexos;

-- PASSO 3: Remover funções
DROP FUNCTION IF EXISTS public.has_tarefa_access(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.notificar_nova_tarefa() CASCADE;
DROP FUNCTION IF EXISTS public.notificar_mudanca_status_tarefa() CASCADE;
DROP FUNCTION IF EXISTS public.notificar_nova_observacao_tarefa() CASCADE;

-- PASSO 4: Remover tabelas (ordem correta por FK)
DROP TABLE IF EXISTS public.tarefa_anexos CASCADE;
DROP TABLE IF EXISTS public.tarefa_observacoes CASCADE;
DROP TABLE IF EXISTS public.tarefa_checklist_itens CASCADE;
DROP TABLE IF EXISTS public.tarefas CASCADE;

-- PASSO 5: Recriar tipos ENUM (se não existirem)
DO $$ BEGIN
  CREATE TYPE public.tarefa_tipo_conteudo AS ENUM ('texto', 'checklist');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tarefa_prioridade AS ENUM ('baixa', 'media', 'alta');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tarefa_status AS ENUM ('pendente', 'em_andamento', 'aguardando_validacao', 'concluida', 'reaberta');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PASSO 6: Criar tabela principal de tarefas
CREATE TABLE public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  tipo_conteudo public.tarefa_tipo_conteudo NOT NULL DEFAULT 'texto',
  descricao TEXT,
  prioridade public.tarefa_prioridade NOT NULL DEFAULT 'media',
  data_limite DATE NOT NULL,
  status public.tarefa_status NOT NULL DEFAULT 'pendente',
  criador_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  executor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  concluida_em TIMESTAMPTZ,
  validada_em TIMESTAMPTZ,
  visualizada_em TIMESTAMPTZ,
  excluida_em TIMESTAMPTZ,
  recorrente BOOLEAN NOT NULL DEFAULT false,
  tipo_recorrencia TEXT,
  ativa_recorrencia BOOLEAN NOT NULL DEFAULT false,
  tarefa_origem_id UUID REFERENCES public.tarefas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_tarefas_criador ON public.tarefas(criador_id);
CREATE INDEX idx_tarefas_executor ON public.tarefas(executor_id);
CREATE INDEX idx_tarefas_status ON public.tarefas(status);
CREATE INDEX idx_tarefas_excluida ON public.tarefas(excluida_em);
CREATE INDEX idx_tarefas_data_limite ON public.tarefas(data_limite);
CREATE INDEX idx_tarefas_recorrencia ON public.tarefas(ativa_recorrencia) WHERE ativa_recorrencia = true;

-- PASSO 7: Criar tabela de checklist
CREATE TABLE public.tarefa_checklist_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  concluido BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  concluido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_tarefa ON public.tarefa_checklist_itens(tarefa_id);

-- PASSO 8: Criar tabela de observações
CREATE TABLE public.tarefa_observacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mensagem TEXT NOT NULL,
  lida_por UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_observacoes_tarefa ON public.tarefa_observacoes(tarefa_id);

-- PASSO 9: Criar tabela de anexos
CREATE TABLE public.tarefa_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES public.tarefas(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo_mime TEXT,
  tamanho BIGINT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_anexos_tarefa ON public.tarefa_anexos(tarefa_id);

-- PASSO 10: Habilitar RLS em todas as tabelas
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_observacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefa_anexos ENABLE ROW LEVEL SECURITY;

-- PASSO 11: Criar função has_tarefa_access SEM verificar excluida_em
-- Isso permite operações de soft delete funcionarem corretamente
CREATE OR REPLACE FUNCTION public.has_tarefa_access(_user_id uuid, _tarefa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tarefas
    WHERE id = _tarefa_id
      AND (criador_id = _user_id OR executor_id = _user_id OR is_admin(_user_id))
      -- NÃO verifica excluida_em para permitir soft delete
  );
$$;

-- PASSO 12: Políticas RLS para TAREFAS

-- SELECT: Apenas tarefas não excluídas que o usuário pode ver
CREATE POLICY "tarefas_select_policy" ON public.tarefas
FOR SELECT TO authenticated
USING (
  excluida_em IS NULL 
  AND (criador_id = auth.uid() OR executor_id = auth.uid() OR is_admin(auth.uid()))
);

-- INSERT: Usuário autenticado pode criar tarefas onde é o criador
CREATE POLICY "tarefas_insert_policy" ON public.tarefas
FOR INSERT TO authenticated
WITH CHECK (criador_id = auth.uid());

-- UPDATE: Criador, executor ou admin podem atualizar (inclui soft delete)
-- WITH CHECK (true) é seguro porque USING já garante acesso
CREATE POLICY "tarefas_update_policy" ON public.tarefas
FOR UPDATE TO authenticated
USING (criador_id = auth.uid() OR executor_id = auth.uid() OR is_admin(auth.uid()))
WITH CHECK (true);

-- DELETE: Ninguém pode deletar fisicamente (usamos soft delete)
CREATE POLICY "tarefas_delete_policy" ON public.tarefas
FOR DELETE TO authenticated
USING (false);

-- PASSO 13: Políticas RLS para CHECKLIST

CREATE POLICY "checklist_select_policy" ON public.tarefa_checklist_itens
FOR SELECT TO authenticated
USING (has_tarefa_access(auth.uid(), tarefa_id));

CREATE POLICY "checklist_insert_policy" ON public.tarefa_checklist_itens
FOR INSERT TO authenticated
WITH CHECK (has_tarefa_access(auth.uid(), tarefa_id));

CREATE POLICY "checklist_update_policy" ON public.tarefa_checklist_itens
FOR UPDATE TO authenticated
USING (has_tarefa_access(auth.uid(), tarefa_id))
WITH CHECK (true);

CREATE POLICY "checklist_delete_policy" ON public.tarefa_checklist_itens
FOR DELETE TO authenticated
USING (has_tarefa_access(auth.uid(), tarefa_id));

-- PASSO 14: Políticas RLS para OBSERVAÇÕES

CREATE POLICY "observacoes_select_policy" ON public.tarefa_observacoes
FOR SELECT TO authenticated
USING (has_tarefa_access(auth.uid(), tarefa_id));

CREATE POLICY "observacoes_insert_policy" ON public.tarefa_observacoes
FOR INSERT TO authenticated
WITH CHECK (has_tarefa_access(auth.uid(), tarefa_id) AND usuario_id = auth.uid());

CREATE POLICY "observacoes_update_policy" ON public.tarefa_observacoes
FOR UPDATE TO authenticated
USING (has_tarefa_access(auth.uid(), tarefa_id))
WITH CHECK (true);

-- PASSO 15: Políticas RLS para ANEXOS

CREATE POLICY "anexos_select_policy" ON public.tarefa_anexos
FOR SELECT TO authenticated
USING (has_tarefa_access(auth.uid(), tarefa_id));

CREATE POLICY "anexos_insert_policy" ON public.tarefa_anexos
FOR INSERT TO authenticated
WITH CHECK (has_tarefa_access(auth.uid(), tarefa_id) AND uploaded_by = auth.uid());

CREATE POLICY "anexos_delete_policy" ON public.tarefa_anexos
FOR DELETE TO authenticated
USING (has_tarefa_access(auth.uid(), tarefa_id));

-- PASSO 16: Trigger para updated_at
CREATE TRIGGER update_tarefas_updated_at
BEFORE UPDATE ON public.tarefas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- PASSO 17: Funções de notificação

CREATE OR REPLACE FUNCTION public.notificar_nova_tarefa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.notificar_mudanca_status_tarefa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.notificar_nova_observacao_tarefa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- PASSO 18: Criar triggers de notificação
CREATE TRIGGER tr_notificar_nova_tarefa
AFTER INSERT ON public.tarefas
FOR EACH ROW
EXECUTE FUNCTION public.notificar_nova_tarefa();

CREATE TRIGGER tr_notificar_mudanca_status_tarefa
AFTER UPDATE ON public.tarefas
FOR EACH ROW
EXECUTE FUNCTION public.notificar_mudanca_status_tarefa();

CREATE TRIGGER tr_notificar_nova_observacao_tarefa
AFTER INSERT ON public.tarefa_observacoes
FOR EACH ROW
EXECUTE FUNCTION public.notificar_nova_observacao_tarefa();