-- =====================================================
-- FASE 1: KANBAN DE APROVAÇÃO DE PROPOSTAS
-- =====================================================

-- 1. Adicionar colunas na tabela propostas
ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS criar_previa boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS caminho_arquivos text,
ADD COLUMN IF NOT EXISTS descricao_criacao text,
ADD COLUMN IF NOT EXISTS imagem_aprovacao_url text,
ADD COLUMN IF NOT EXISTS etapa_aprovacao_id uuid REFERENCES public.etapa_producao(id);

-- 2. Inserir etapas de aprovação de arte (ordem negativa para aparecer antes da Entrada)
INSERT INTO public.etapa_producao (nome_etapa, ordem, tipo_etapa, cor_hex, ativa)
VALUES 
  ('Criar Prévia', -3, 'aprovacao_arte', '#f59e0b', true),
  ('Layout Criado', -2, 'aprovacao_arte', '#10b981', true),
  ('Revisão', -1, 'aprovacao_arte', '#ef4444', true)
ON CONFLICT DO NOTHING;

-- 3. Criar tabela de histórico de propostas
CREATE TABLE IF NOT EXISTS public.propostas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL,
  tipo_alteracao text NOT NULL,
  campo_alterado text,
  valor_anterior text,
  valor_novo text,
  descricao text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Criar tabela de tags para propostas
CREATE TABLE IF NOT EXISTS public.proposta_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  nome varchar NOT NULL,
  cor varchar NOT NULL DEFAULT '#3b82f6',
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Criar tabela de movimento de etapa de proposta
CREATE TABLE IF NOT EXISTS public.movimento_etapa_proposta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  etapa_anterior_id uuid REFERENCES public.etapa_producao(id),
  etapa_nova_id uuid NOT NULL REFERENCES public.etapa_producao(id),
  usuario_id uuid NOT NULL,
  observacao text,
  data_hora_movimento timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Habilitar RLS
ALTER TABLE public.propostas_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimento_etapa_proposta ENABLE ROW LEVEL SECURITY;

-- 7. RLS para propostas_historico
CREATE POLICY "Sistema pode inserir histórico de propostas"
ON public.propostas_historico FOR INSERT
WITH CHECK (true);

CREATE POLICY "Ver histórico de propostas visíveis"
ON public.propostas_historico FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = propostas_historico.proposta_id
    AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()))
  )
);

-- 8. RLS para proposta_tags
CREATE POLICY "Usuários podem gerenciar tags de propostas"
ON public.proposta_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposta_tags.proposta_id
    AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposta_tags.proposta_id
    AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Visualizar tags de propostas"
ON public.proposta_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposta_tags.proposta_id
    AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.visualizar'))
  )
);

-- 9. RLS para movimento_etapa_proposta
CREATE POLICY "Usuários com permissão podem registrar movimentos de proposta"
ON public.movimento_etapa_proposta FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.movimentar')
);

CREATE POLICY "Usuários com permissão podem visualizar movimentos de proposta"
ON public.movimento_etapa_proposta FOR SELECT
USING (
  is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.visualizar')
);

-- 10. Inserir novas permissões
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria)
VALUES 
  ('pcp.kanban.aprovacao.visualizar', 'pcp', 'visualizar', 'Visualizar Kanban de aprovação de propostas', 'PCP'),
  ('pcp.kanban.aprovacao.movimentar', 'pcp', 'movimentar', 'Movimentar cards no Kanban de aprovação', 'PCP'),
  ('pcp.kanban.aprovacao.editar', 'pcp', 'editar', 'Editar propostas no Kanban de aprovação', 'PCP')
ON CONFLICT (id) DO NOTHING;

-- 11. Trigger para registrar histórico de propostas
CREATE OR REPLACE FUNCTION public.registrar_historico_proposta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  v_usuario_id := COALESCE(auth.uid(), NEW.vendedor_id, OLD.vendedor_id);
  
  IF (TG_OP = 'UPDATE') THEN
    -- Etapa de aprovação alterada
    IF OLD.etapa_aprovacao_id IS DISTINCT FROM NEW.etapa_aprovacao_id THEN
      INSERT INTO public.propostas_historico (
        proposta_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'movimentacao', 'etapa_aprovacao_id',
        OLD.etapa_aprovacao_id::TEXT, NEW.etapa_aprovacao_id::TEXT,
        'Proposta movida entre etapas de aprovação'
      );
    END IF;
    
    -- Status alterado
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.propostas_historico (
        proposta_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'status', 'status',
        OLD.status::TEXT, NEW.status::TEXT,
        'Status alterado de "' || OLD.status || '" para "' || NEW.status || '"'
      );
    END IF;
    
    -- Imagem de aprovação adicionada/alterada
    IF OLD.imagem_aprovacao_url IS DISTINCT FROM NEW.imagem_aprovacao_url THEN
      INSERT INTO public.propostas_historico (
        proposta_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'imagem_aprovacao_url',
        COALESCE(OLD.imagem_aprovacao_url, ''), 
        COALESCE(NEW.imagem_aprovacao_url, ''),
        CASE 
          WHEN OLD.imagem_aprovacao_url IS NULL THEN 'Imagem de aprovação adicionada'
          ELSE 'Imagem de aprovação atualizada'
        END
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_registrar_historico_proposta ON public.propostas;
CREATE TRIGGER trigger_registrar_historico_proposta
AFTER UPDATE ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.registrar_historico_proposta();