-- ============================================================================
-- MÓDULO PCP - PLANEJAMENTO E CONTROLE DE PRODUÇÃO
-- ============================================================================
-- Fase 1: Estrutura do Banco de Dados
-- Fase 2: Perfis e Permissões
-- ============================================================================

-- ============================================================================
-- TABELAS DO MÓDULO PCP
-- ============================================================================

-- A) Tabela de Máquinas de Impressão
CREATE TABLE IF NOT EXISTS public.maquina_impressao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_maquina VARCHAR(100) NOT NULL,
  tecnologia VARCHAR(50),
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- B) Tabela de Tipos de Estampa
CREATE TABLE IF NOT EXISTS public.tipo_estampa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_tipo_estampa VARCHAR(100) NOT NULL,
  maquina_padrao_id UUID REFERENCES public.maquina_impressao(id),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- C) Tabela de Categorias de Falha
CREATE TABLE IF NOT EXISTS public.categoria_falha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_categoria VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- D) Tabela de Tipos de Falha
CREATE TABLE IF NOT EXISTS public.tipo_falha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_falha VARCHAR(100) NOT NULL,
  categoria_falha_id UUID NOT NULL REFERENCES public.categoria_falha(id),
  descricao TEXT,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- E) Tabela de Etapas de Produção (Colunas do Kanban)
CREATE TABLE IF NOT EXISTS public.etapa_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_etapa VARCHAR(100) NOT NULL,
  ordem INTEGER NOT NULL,
  cor_hex VARCHAR(7) DEFAULT '#6366f1',
  tipo_etapa VARCHAR(20) DEFAULT 'intermediaria', -- inicial, intermediaria, final
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ordem)
);

-- F) Tabela de Movimentação de Etapas (Log do Kanban)
CREATE TABLE IF NOT EXISTS public.movimento_etapa_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  etapa_anterior_id UUID REFERENCES public.etapa_producao(id),
  etapa_nova_id UUID NOT NULL REFERENCES public.etapa_producao(id),
  usuario_id UUID NOT NULL,
  data_hora_movimento TIMESTAMPTZ DEFAULT now(),
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- G) Tabela de Impressões
CREATE TABLE IF NOT EXISTS public.impressao_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_registro VARCHAR(20) NOT NULL DEFAULT 'com_pedido', -- 'com_pedido' ou 'sem_pedido'
  data_impressao DATE NOT NULL DEFAULT CURRENT_DATE,
  pedido_id UUID REFERENCES public.pedidos(id),
  item_pedido_id UUID REFERENCES public.pedido_itens(id),
  tipo_estampa_id UUID NOT NULL REFERENCES public.tipo_estampa(id),
  maquina_impressao_id UUID REFERENCES public.maquina_impressao(id),
  operador_id UUID NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  descricao_livre TEXT,
  observacoes TEXT,
  marcado_como_impresso BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_impressao_pedido CHECK (
    (tipo_registro = 'com_pedido' AND pedido_id IS NOT NULL) OR
    (tipo_registro = 'sem_pedido' AND descricao_livre IS NOT NULL)
  )
);

-- H) Tabela de Falhas de Produção
CREATE TABLE IF NOT EXISTS public.falha_producao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_falha DATE NOT NULL DEFAULT CURRENT_DATE,
  pedido_id UUID REFERENCES public.pedidos(id),
  item_pedido_id UUID REFERENCES public.pedido_itens(id),
  tipo_falha_id UUID NOT NULL REFERENCES public.tipo_falha(id),
  categoria_falha_id UUID NOT NULL REFERENCES public.categoria_falha(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  origem VARCHAR(50), -- Impressão, Costura, Revisão, Expedição
  observacoes TEXT,
  precisa_reimpressao BOOLEAN DEFAULT false,
  resolvido BOOLEAN DEFAULT false,
  data_resolucao DATE,
  registrado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- I) Tabela de Expedição (Histórico)
CREATE TABLE IF NOT EXISTS public.expedicao_registro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  data_prevista_envio DATE,
  data_envio_real DATE,
  transportadora VARCHAR(100),
  codigo_rastreio VARCHAR(100),
  observacoes TEXT,
  origem VARCHAR(20) DEFAULT 'comercial', -- comercial, ecommerce
  criado_manual BOOLEAN DEFAULT false,
  registrado_por UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ALTERAÇÕES NA TABELA DE PEDIDOS
-- ============================================================================

-- Adicionar colunas do PCP na tabela de pedidos
ALTER TABLE public.pedidos 
  ADD COLUMN IF NOT EXISTS etapa_producao_id UUID REFERENCES public.etapa_producao(id),
  ADD COLUMN IF NOT EXISTS data_inicio_producao DATE,
  ADD COLUMN IF NOT EXISTS data_fim_producao DATE,
  ADD COLUMN IF NOT EXISTS origem VARCHAR(20) DEFAULT 'comercial'; -- comercial, ecommerce

-- ============================================================================
-- DADOS PADRÃO - ETAPAS DE PRODUÇÃO
-- ============================================================================

INSERT INTO public.etapa_producao (nome_etapa, ordem, tipo_etapa, cor_hex) VALUES
  ('Entrada', 1, 'inicial', '#94a3b8'),
  ('Aguardando Impressão', 2, 'intermediaria', '#f59e0b'),
  ('Em Impressão', 3, 'intermediaria', '#3b82f6'),
  ('Aguardando Costura', 4, 'intermediaria', '#f97316'),
  ('Em Costura', 5, 'intermediaria', '#8b5cf6'),
  ('Revisão', 6, 'intermediaria', '#10b981'),
  ('Expedição', 7, 'intermediaria', '#06b6d4'),
  ('Concluído', 8, 'final', '#22c55e')
ON CONFLICT (ordem) DO NOTHING;

-- ============================================================================
-- TRIGGERS PARA UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_maquina_impressao_updated_at
  BEFORE UPDATE ON public.maquina_impressao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tipo_estampa_updated_at
  BEFORE UPDATE ON public.tipo_estampa
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categoria_falha_updated_at
  BEFORE UPDATE ON public.categoria_falha
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tipo_falha_updated_at
  BEFORE UPDATE ON public.tipo_falha
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_etapa_producao_updated_at
  BEFORE UPDATE ON public.etapa_producao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_impressao_pedido_updated_at
  BEFORE UPDATE ON public.impressao_pedido
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_falha_producao_updated_at
  BEFORE UPDATE ON public.falha_producao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expedicao_registro_updated_at
  BEFORE UPDATE ON public.expedicao_registro
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas PCP
ALTER TABLE public.maquina_impressao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_estampa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categoria_falha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipo_falha ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapa_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimento_etapa_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impressao_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.falha_producao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expedicao_registro ENABLE ROW LEVEL SECURITY;

-- Políticas para maquina_impressao
CREATE POLICY "Todos podem visualizar máquinas ativas"
  ON public.maquina_impressao FOR SELECT
  USING (ativo = true OR is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.cadastros.visualizar'));

CREATE POLICY "Admins e PCP podem gerenciar máquinas"
  ON public.maquina_impressao FOR ALL
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.cadastros.gerenciar'));

-- Políticas para tipo_estampa
CREATE POLICY "Todos podem visualizar tipos de estampa ativos"
  ON public.tipo_estampa FOR SELECT
  USING (ativo = true OR is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.cadastros.visualizar'));

CREATE POLICY "Admins e PCP podem gerenciar tipos de estampa"
  ON public.tipo_estampa FOR ALL
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.cadastros.gerenciar'));

-- Políticas para categoria_falha
CREATE POLICY "Todos podem visualizar categorias de falha ativas"
  ON public.categoria_falha FOR SELECT
  USING (ativa = true OR is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.cadastros.visualizar'));

CREATE POLICY "Admins e PCP podem gerenciar categorias de falha"
  ON public.categoria_falha FOR ALL
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.cadastros.gerenciar'));

-- Políticas para tipo_falha
CREATE POLICY "Todos podem visualizar tipos de falha ativos"
  ON public.tipo_falha FOR SELECT
  USING (ativa = true OR is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.cadastros.visualizar'));

CREATE POLICY "Admins e PCP podem gerenciar tipos de falha"
  ON public.tipo_falha FOR ALL
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.cadastros.gerenciar'));

-- Políticas para etapa_producao
CREATE POLICY "Todos podem visualizar etapas ativas"
  ON public.etapa_producao FOR SELECT
  USING (ativa = true OR is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.cadastros.visualizar'));

CREATE POLICY "Admins e PCP podem gerenciar etapas"
  ON public.etapa_producao FOR ALL
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.cadastros.gerenciar'));

-- Políticas para movimento_etapa_producao
CREATE POLICY "Usuários com permissão podem visualizar movimentos"
  ON public.movimento_etapa_producao FOR SELECT
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.kanban.visualizar'));

CREATE POLICY "Usuários com permissão podem registrar movimentos"
  ON public.movimento_etapa_producao FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.kanban.movimentar'));

-- Políticas para impressao_pedido
CREATE POLICY "Usuários podem visualizar impressões"
  ON public.impressao_pedido FOR SELECT
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.impressao.visualizar') OR operador_id = auth.uid());

CREATE POLICY "Usuários podem registrar impressões"
  ON public.impressao_pedido FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.impressao.registrar'));

CREATE POLICY "Usuários podem atualizar suas impressões"
  ON public.impressao_pedido FOR UPDATE
  USING (is_admin(auth.uid()) OR operador_id = auth.uid());

-- Políticas para falha_producao
CREATE POLICY "Usuários podem visualizar falhas"
  ON public.falha_producao FOR SELECT
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.falhas.visualizar') OR registrado_por = auth.uid());

CREATE POLICY "Usuários podem registrar falhas"
  ON public.falha_producao FOR INSERT
  WITH CHECK (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.falhas.registrar'));

CREATE POLICY "Usuários podem atualizar falhas"
  ON public.falha_producao FOR UPDATE
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.falhas.registrar') OR registrado_por = auth.uid());

-- Políticas para expedicao_registro
CREATE POLICY "Usuários podem visualizar expedição"
  ON public.expedicao_registro FOR SELECT
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.expedicao.visualizar'));

CREATE POLICY "Usuários podem gerenciar expedição"
  ON public.expedicao_registro FOR ALL
  USING (is_admin(auth.uid()) OR has_permission(auth.uid(), 'pcp.expedicao.gerenciar'));

-- ============================================================================
-- PERFIL E PERMISSÕES DO MÓDULO PCP
-- ============================================================================

-- Criar perfil PCP
INSERT INTO public.system_profiles (nome, codigo, descricao, is_system, ativo) VALUES
  ('PCP / Produção', 'pcp', 'Controlar produção, impressões, falhas e expedição', true, true)
ON CONFLICT (codigo) DO NOTHING;

-- Criar permissões do módulo PCP
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  -- Dashboard
  ('pcp.dashboard', 'pcp', 'dashboard', 'Visualizar dashboard do PCP', 'PCP'),
  
  -- Cadastros
  ('pcp.cadastros.visualizar', 'pcp', 'cadastros.visualizar', 'Visualizar cadastros do PCP', 'PCP'),
  ('pcp.cadastros.gerenciar', 'pcp', 'cadastros.gerenciar', 'Gerenciar cadastros do PCP (máquinas, etapas, etc)', 'PCP'),
  
  -- Impressão
  ('pcp.impressao.visualizar', 'pcp', 'impressao.visualizar', 'Visualizar registros de impressão', 'PCP'),
  ('pcp.impressao.registrar', 'pcp', 'impressao.registrar', 'Registrar impressões', 'PCP'),
  
  -- Falhas
  ('pcp.falhas.visualizar', 'pcp', 'falhas.visualizar', 'Visualizar falhas de produção', 'PCP'),
  ('pcp.falhas.registrar', 'pcp', 'falhas.registrar', 'Registrar falhas de produção', 'PCP'),
  
  -- Kanban
  ('pcp.kanban.visualizar', 'pcp', 'kanban.visualizar', 'Visualizar Kanban de produção', 'PCP'),
  ('pcp.kanban.movimentar', 'pcp', 'kanban.movimentar', 'Movimentar pedidos no Kanban', 'PCP'),
  
  -- Expedição
  ('pcp.expedicao.visualizar', 'pcp', 'expedicao.visualizar', 'Visualizar expedição', 'PCP'),
  ('pcp.expedicao.gerenciar', 'pcp', 'expedicao.gerenciar', 'Gerenciar expedição e envios', 'PCP'),
  
  -- Calendário
  ('pcp.calendario.visualizar', 'pcp', 'calendario.visualizar', 'Visualizar calendário de entregas', 'PCP')
ON CONFLICT (id) DO NOTHING;

-- Atribuir TODAS as permissões ao perfil ADMIN
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo = 'admin' 
  AND p.categoria = 'PCP'
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_permissions pp 
    WHERE pp.profile_id = sp.id AND pp.permission_id = p.id
  );

-- Atribuir permissões ao perfil PCP
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo = 'pcp' 
  AND p.id IN (
    'pcp.dashboard',
    'pcp.cadastros.visualizar',
    'pcp.impressao.visualizar',
    'pcp.impressao.registrar',
    'pcp.falhas.visualizar',
    'pcp.falhas.registrar',
    'pcp.kanban.visualizar',
    'pcp.kanban.movimentar',
    'pcp.expedicao.visualizar',
    'pcp.expedicao.gerenciar',
    'pcp.calendario.visualizar',
    'pedidos.visualizar' -- Apenas visualizar pedidos
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_permissions pp 
    WHERE pp.profile_id = sp.id AND pp.permission_id = p.id
  );

-- Atribuir permissões de visualização ao perfil VENDEDOR (para ver Kanban e Calendário)
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo = 'vendedor' 
  AND p.id IN (
    'pcp.kanban.visualizar',
    'pcp.calendario.visualizar'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.profile_permissions pp 
    WHERE pp.profile_id = sp.id AND pp.permission_id = p.id
  );

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_pedidos_etapa_producao ON public.pedidos(etapa_producao_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_origem ON public.pedidos(origem);
CREATE INDEX IF NOT EXISTS idx_movimento_etapa_pedido ON public.movimento_etapa_producao(pedido_id);
CREATE INDEX IF NOT EXISTS idx_movimento_etapa_data ON public.movimento_etapa_producao(data_hora_movimento);
CREATE INDEX IF NOT EXISTS idx_impressao_pedido ON public.impressao_pedido(pedido_id);
CREATE INDEX IF NOT EXISTS idx_impressao_data ON public.impressao_pedido(data_impressao);
CREATE INDEX IF NOT EXISTS idx_falha_pedido ON public.falha_producao(pedido_id);
CREATE INDEX IF NOT EXISTS idx_falha_data ON public.falha_producao(data_falha);
CREATE INDEX IF NOT EXISTS idx_expedicao_pedido ON public.expedicao_registro(pedido_id);

-- ============================================================================
-- FIM DA MIGRAÇÃO DO MÓDULO PCP
-- ============================================================================