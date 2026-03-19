
-- =====================================================
-- MÓDULO TROCAS E DEVOLUÇÕES
-- =====================================================

-- 1. ENUM para tipo de problema
CREATE TYPE public.tipo_problema_pedido AS ENUM (
  'atraso_entrega',
  'sem_tentativa_entrega', 
  'entregue_nao_recebido',
  'outro'
);

-- 2. ENUM para status de ressarcimento
CREATE TYPE public.status_ressarcimento AS ENUM (
  'pendente',
  'aprovado',
  'negado'
);

-- 3. ENUM para status de problema
CREATE TYPE public.status_problema AS ENUM (
  'pendente',
  'resolvido',
  'nao_resolvido'
);

-- 4. TABELA: Motivos de Troca/Devolução (configurável)
CREATE TABLE public.motivos_troca_devolucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('troca', 'devolucao', 'ambos')),
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABELA: Trocas
CREATE TABLE public.trocas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido VARCHAR(50) NOT NULL,
  nome_cliente VARCHAR(200) NOT NULL,
  email_cliente VARCHAR(200),
  telefone_cliente VARCHAR(20),
  valor_pedido NUMERIC(10,2) DEFAULT 0,
  data_pedido_original DATE,
  motivo_id UUID REFERENCES public.motivos_troca_devolucao(id),
  motivo_outro TEXT,
  transportadora VARCHAR(100),
  observacao TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABELA: Devoluções
CREATE TABLE public.devolucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido VARCHAR(50) NOT NULL,
  nome_cliente VARCHAR(200) NOT NULL,
  email_cliente VARCHAR(200),
  telefone_cliente VARCHAR(20),
  valor_pedido NUMERIC(10,2) DEFAULT 0,
  data_pedido_original DATE,
  motivo_id UUID REFERENCES public.motivos_troca_devolucao(id),
  motivo_outro TEXT,
  transportadora VARCHAR(100),
  comprovante_url TEXT,
  observacao TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABELA: Extravios/Roubos
CREATE TABLE public.extravios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido VARCHAR(50) NOT NULL,
  nome_cliente VARCHAR(200) NOT NULL,
  email_cliente VARCHAR(200),
  telefone_cliente VARCHAR(20),
  valor_pedido NUMERIC(10,2) DEFAULT 0,
  data_pedido_original DATE,
  numero_rastreio VARCHAR(50),
  numero_chamado VARCHAR(50),
  numero_nf VARCHAR(50),
  chave_nf VARCHAR(50),
  transportadora VARCHAR(100),
  solicitado_ressarcimento BOOLEAN DEFAULT false,
  status_ressarcimento public.status_ressarcimento DEFAULT 'pendente',
  motivo_negacao TEXT,
  valor_ressarcimento NUMERIC(10,2),
  observacao TEXT,
  data_resolucao DATE,
  problema_origem_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. TABELA: Problemas de Pedido
CREATE TABLE public.problemas_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido VARCHAR(50) NOT NULL,
  codigo_rastreio VARCHAR(50),
  numero_chamado VARCHAR(50),
  tipo_problema public.tipo_problema_pedido NOT NULL,
  problema_outro TEXT,
  transportadora VARCHAR(100),
  observacao TEXT,
  status public.status_problema DEFAULT 'pendente',
  data_resolucao DATE,
  extravio_gerado_id UUID REFERENCES public.extravios(id),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar FK de problema_origem_id em extravios
ALTER TABLE public.extravios 
ADD CONSTRAINT extravios_problema_origem_id_fkey 
FOREIGN KEY (problema_origem_id) REFERENCES public.problemas_pedido(id);

-- 9. TABELA: Histórico de Alterações
CREATE TABLE public.trocas_devolucoes_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_registro VARCHAR(20) NOT NULL CHECK (tipo_registro IN ('troca', 'devolucao', 'extravio', 'problema')),
  registro_id UUID NOT NULL,
  usuario_id UUID NOT NULL,
  tipo_alteracao VARCHAR(50) NOT NULL,
  campo_alterado VARCHAR(100),
  valor_anterior TEXT,
  valor_novo TEXT,
  descricao TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. STORAGE: Bucket para comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-devolucao', 'comprovantes-devolucao', true)
ON CONFLICT (id) DO NOTHING;

-- 11. PERMISSÕES RBAC
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('trocas_devolucoes.visualizar', 'trocas_devolucoes', 'visualizar', 'Visualizar trocas, devoluções, extravios e problemas', 'Trocas e Devoluções'),
  ('trocas_devolucoes.criar', 'trocas_devolucoes', 'criar', 'Criar registros de trocas, devoluções, extravios e problemas', 'Trocas e Devoluções'),
  ('trocas_devolucoes.editar', 'trocas_devolucoes', 'editar', 'Editar registros de trocas, devoluções, extravios e problemas', 'Trocas e Devoluções'),
  ('trocas_devolucoes.excluir', 'trocas_devolucoes', 'excluir', 'Excluir registros de trocas, devoluções, extravios e problemas', 'Trocas e Devoluções'),
  ('trocas_devolucoes.motivos.gerenciar', 'trocas_devolucoes', 'gerenciar_motivos', 'Gerenciar cadastro de motivos de troca/devolução', 'Trocas e Devoluções')
ON CONFLICT (id) DO NOTHING;

-- 12. ATRIBUIR PERMISSÕES aos perfis Admin e Atendente
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo IN ('admin', 'administrador')
  AND p.id IN (
    'trocas_devolucoes.visualizar',
    'trocas_devolucoes.criar',
    'trocas_devolucoes.editar',
    'trocas_devolucoes.excluir',
    'trocas_devolucoes.motivos.gerenciar'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo = 'atendente'
  AND p.id IN (
    'trocas_devolucoes.visualizar',
    'trocas_devolucoes.criar',
    'trocas_devolucoes.editar'
  )
ON CONFLICT DO NOTHING;

-- 13. ENABLE RLS
ALTER TABLE public.motivos_troca_devolucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trocas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extravios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problemas_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trocas_devolucoes_historico ENABLE ROW LEVEL SECURITY;

-- 14. RLS POLICIES - Motivos (Admin gerencia, todos visualizam ativos)
CREATE POLICY "Admins podem gerenciar motivos"
ON public.motivos_troca_devolucao FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Usuários autorizados podem ver motivos ativos"
ON public.motivos_troca_devolucao FOR SELECT
USING (
  ativo = true 
  OR is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.visualizar')
);

-- 15. RLS POLICIES - Trocas
CREATE POLICY "Visualizar trocas"
ON public.trocas FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.visualizar')
);

CREATE POLICY "Criar trocas"
ON public.trocas FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.criar')
);

CREATE POLICY "Editar trocas"
ON public.trocas FOR UPDATE
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.editar')
);

CREATE POLICY "Excluir trocas"
ON public.trocas FOR DELETE
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.excluir')
);

-- 16. RLS POLICIES - Devoluções
CREATE POLICY "Visualizar devolucoes"
ON public.devolucoes FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.visualizar')
);

CREATE POLICY "Criar devolucoes"
ON public.devolucoes FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.criar')
);

CREATE POLICY "Editar devolucoes"
ON public.devolucoes FOR UPDATE
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.editar')
);

CREATE POLICY "Excluir devolucoes"
ON public.devolucoes FOR DELETE
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.excluir')
);

-- 17. RLS POLICIES - Extravios
CREATE POLICY "Visualizar extravios"
ON public.extravios FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.visualizar')
);

CREATE POLICY "Criar extravios"
ON public.extravios FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.criar')
);

CREATE POLICY "Editar extravios"
ON public.extravios FOR UPDATE
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.editar')
);

CREATE POLICY "Excluir extravios"
ON public.extravios FOR DELETE
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.excluir')
);

-- 18. RLS POLICIES - Problemas
CREATE POLICY "Visualizar problemas"
ON public.problemas_pedido FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.visualizar')
);

CREATE POLICY "Criar problemas"
ON public.problemas_pedido FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.criar')
);

CREATE POLICY "Editar problemas"
ON public.problemas_pedido FOR UPDATE
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.editar')
);

CREATE POLICY "Excluir problemas"
ON public.problemas_pedido FOR DELETE
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.excluir')
);

-- 19. RLS POLICIES - Histórico
CREATE POLICY "Visualizar historico"
ON public.trocas_devolucoes_historico FOR SELECT
USING (
  is_admin(auth.uid()) 
  OR has_permission(auth.uid(), 'trocas_devolucoes.visualizar')
);

CREATE POLICY "Sistema insere historico"
ON public.trocas_devolucoes_historico FOR INSERT
WITH CHECK (true);

-- 20. STORAGE POLICIES
CREATE POLICY "Visualizar comprovantes"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprovantes-devolucao');

CREATE POLICY "Upload comprovantes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comprovantes-devolucao' 
  AND (is_admin(auth.uid()) OR has_permission(auth.uid(), 'trocas_devolucoes.criar'))
);

CREATE POLICY "Deletar comprovantes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'comprovantes-devolucao' 
  AND (is_admin(auth.uid()) OR has_permission(auth.uid(), 'trocas_devolucoes.excluir'))
);

-- 21. TRIGGERS para updated_at
CREATE TRIGGER update_motivos_troca_devolucao_updated_at
BEFORE UPDATE ON public.motivos_troca_devolucao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trocas_updated_at
BEFORE UPDATE ON public.trocas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_devolucoes_updated_at
BEFORE UPDATE ON public.devolucoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_extravios_updated_at
BEFORE UPDATE ON public.extravios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_problemas_pedido_updated_at
BEFORE UPDATE ON public.problemas_pedido
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 22. DADOS INICIAIS: Motivos de Troca
INSERT INTO public.motivos_troca_devolucao (nome, tipo, ordem) VALUES
  ('Tamanho incorreto', 'troca', 1),
  ('Produto enviado errado', 'ambos', 2),
  ('Não gostou do produto', 'ambos', 3),
  ('Produto com defeito', 'ambos', 4),
  ('Arrependimento', 'devolucao', 5),
  ('Outro', 'ambos', 99);

-- 23. FUNÇÃO para calcular dias úteis
CREATE OR REPLACE FUNCTION public.calcular_dias_uteis(data_inicio TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  dias_uteis INTEGER := 0;
  data_atual DATE := data_inicio::DATE;
  data_fim DATE := CURRENT_DATE;
BEGIN
  WHILE data_atual < data_fim LOOP
    -- Excluir sábados (6) e domingos (0)
    IF EXTRACT(DOW FROM data_atual) NOT IN (0, 6) THEN
      dias_uteis := dias_uteis + 1;
    END IF;
    data_atual := data_atual + INTERVAL '1 day';
  END LOOP;
  
  -- Multiplicar por 24 para retornar horas úteis
  RETURN dias_uteis * 24;
END;
$$;
