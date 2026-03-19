-- ============================================================================
-- SISTEMA DE PERMISSÕES GRANULARES (RBAC)
-- ============================================================================
-- Execute este script no SQL Editor do Supabase (Lovable Cloud)
-- ============================================================================

-- PARTE 1: CRIAR TABELAS
-- ============================================================================

-- Tabela de Permissões (Catálogo)
CREATE TABLE IF NOT EXISTS public.permissions (
  id TEXT PRIMARY KEY,
  modulo TEXT NOT NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  categoria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Perfis do Sistema
CREATE TABLE IF NOT EXISTS public.system_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  is_system BOOLEAN DEFAULT FALSE,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Relacionamento Perfil → Permissões
CREATE TABLE IF NOT EXISTS public.profile_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.system_profiles(id) ON DELETE CASCADE,
  permission_id TEXT REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, permission_id)
);

-- Tabela de Perfis dos Usuários
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.system_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, profile_id)
);

-- PARTE 2: INSERIR CATÁLOGO DE PERMISSÕES
-- ============================================================================

-- MÓDULO: DASHBOARD
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('dashboard.visualizar', 'dashboard', 'visualizar', 'Ver dashboard geral', 'Dashboard'),
('dashboard.metricas_vendas', 'dashboard', 'metricas_vendas', 'Ver métricas de vendas', 'Dashboard')
ON CONFLICT (id) DO NOTHING;

-- MÓDULO: PEDIDOS
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('pedidos.visualizar', 'pedidos', 'visualizar', 'Ver lista de pedidos', 'Vendas'),
('pedidos.visualizar_todos', 'pedidos', 'visualizar_todos', 'Ver todos os pedidos (não apenas próprios)', 'Vendas'),
('pedidos.criar', 'pedidos', 'criar', 'Criar novos pedidos', 'Vendas'),
('pedidos.editar', 'pedidos', 'editar', 'Editar pedidos', 'Vendas'),
('pedidos.editar_todos', 'pedidos', 'editar_todos', 'Editar qualquer pedido', 'Vendas'),
('pedidos.excluir', 'pedidos', 'excluir', 'Excluir pedidos', 'Vendas'),
('pedidos.alterar_status', 'pedidos', 'alterar_status', 'Alterar status de pedidos', 'Vendas'),
('pedidos.adicionar_observacao', 'pedidos', 'adicionar_observacao', 'Adicionar observações', 'Vendas'),
('pedidos.entregar', 'pedidos', 'entregar', 'Marcar pedidos como entregues', 'Atendimento')
ON CONFLICT (id) DO NOTHING;

-- MÓDULO: PROPOSTAS
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('propostas.visualizar', 'propostas', 'visualizar', 'Ver propostas', 'Vendas'),
('propostas.criar', 'propostas', 'criar', 'Criar propostas', 'Vendas'),
('propostas.editar', 'propostas', 'editar', 'Editar propostas', 'Vendas'),
('propostas.excluir', 'propostas', 'excluir', 'Excluir propostas', 'Vendas'),
('propostas.converter_pedido', 'propostas', 'converter_pedido', 'Converter proposta em pedido', 'Vendas'),
('propostas.imprimir', 'propostas', 'imprimir', 'Imprimir orçamentos', 'Vendas')
ON CONFLICT (id) DO NOTHING;

-- MÓDULO: CLIENTES
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('clientes.visualizar', 'clientes', 'visualizar', 'Ver clientes', 'Cadastros'),
('clientes.criar', 'clientes', 'criar', 'Cadastrar novos clientes', 'Cadastros'),
('clientes.editar', 'clientes', 'editar', 'Editar clientes', 'Cadastros'),
('clientes.excluir', 'clientes', 'excluir', 'Excluir clientes', 'Cadastros')
ON CONFLICT (id) DO NOTHING;

-- MÓDULO: PRODUTOS
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('produtos.visualizar', 'produtos', 'visualizar', 'Ver produtos', 'Cadastros'),
('produtos.criar', 'produtos', 'criar', 'Cadastrar novos produtos', 'Cadastros'),
('produtos.editar', 'produtos', 'editar', 'Editar produtos', 'Cadastros'),
('produtos.excluir', 'produtos', 'excluir', 'Excluir produtos', 'Cadastros'),
('produtos.gerenciar_faixas', 'produtos', 'gerenciar_faixas', 'Gerenciar faixas de preço', 'Cadastros')
ON CONFLICT (id) DO NOTHING;

-- MÓDULO: PAGAMENTOS
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('pagamentos.visualizar', 'pagamentos', 'visualizar', 'Ver pagamentos', 'Financeiro'),
('pagamentos.registrar', 'pagamentos', 'registrar', 'Registrar novos pagamentos', 'Financeiro'),
('pagamentos.aprovar', 'pagamentos', 'aprovar', 'Aprovar pagamentos', 'Financeiro'),
('pagamentos.rejeitar', 'pagamentos', 'rejeitar', 'Rejeitar pagamentos', 'Financeiro'),
('pagamentos.estornar', 'pagamentos', 'estornar', 'Estornar pagamentos', 'Financeiro'),
('pagamentos.visualizar_historico', 'pagamentos', 'visualizar_historico', 'Ver histórico financeiro', 'Financeiro')
ON CONFLICT (id) DO NOTHING;

-- MÓDULO: COMISSÕES
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('comissoes.visualizar_proprias', 'comissoes', 'visualizar_proprias', 'Ver próprias comissões', 'Vendas'),
('comissoes.visualizar_todas', 'comissoes', 'visualizar_todas', 'Ver comissões de todos', 'Administração'),
('comissoes.configurar_regras', 'comissoes', 'configurar_regras', 'Configurar regras de comissão', 'Administração')
ON CONFLICT (id) DO NOTHING;

-- MÓDULO: USUÁRIOS
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('usuarios.visualizar', 'usuarios', 'visualizar', 'Ver usuários', 'Administração'),
('usuarios.criar', 'usuarios', 'criar', 'Criar usuários', 'Administração'),
('usuarios.editar', 'usuarios', 'editar', 'Editar usuários', 'Administração'),
('usuarios.excluir', 'usuarios', 'excluir', 'Excluir usuários', 'Administração'),
('usuarios.alterar_status', 'usuarios', 'alterar_status', 'Ativar/desativar usuários', 'Administração')
ON CONFLICT (id) DO NOTHING;

-- MÓDULO: PERFIS
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('perfis.visualizar', 'perfis', 'visualizar', 'Ver perfis de acesso', 'Administração'),
('perfis.criar', 'perfis', 'criar', 'Criar novos perfis', 'Administração'),
('perfis.editar', 'perfis', 'editar', 'Editar perfis', 'Administração'),
('perfis.excluir', 'perfis', 'excluir', 'Excluir perfis customizados', 'Administração'),
('perfis.gerenciar_permissoes', 'perfis', 'gerenciar_permissoes', 'Atribuir permissões aos perfis', 'Administração')
ON CONFLICT (id) DO NOTHING;

-- MÓDULO: APROVAÇÕES
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('aprovacoes.visualizar', 'aprovacoes', 'visualizar', 'Ver solicitações de aprovação', 'Administração'),
('aprovacoes.aprovar', 'aprovacoes', 'aprovar', 'Aprovar pedidos', 'Administração'),
('aprovacoes.rejeitar', 'aprovacoes', 'rejeitar', 'Rejeitar pedidos', 'Administração')
ON CONFLICT (id) DO NOTHING;

-- PARTE 3: CRIAR PERFIS DEFAULT
-- ============================================================================

INSERT INTO system_profiles (codigo, nome, descricao, is_system) VALUES
('admin', 'Administrador', 'Acesso total ao sistema', TRUE),
('vendedor', 'Vendedor', 'Criar e gerenciar vendas e propostas', TRUE),
('financeiro', 'Financeiro', 'Gerenciar pagamentos e aprovações financeiras', TRUE),
('atendente', 'Atendente', 'Controlar entregas de pedidos', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- PARTE 4: ATRIBUIR PERMISSÕES AOS PERFIS
-- ============================================================================

-- Perfil ADMIN: TODAS as permissões
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT 
  (SELECT id FROM system_profiles WHERE codigo = 'admin'),
  id
FROM permissions
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Perfil VENDEDOR
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT 
  (SELECT id FROM system_profiles WHERE codigo = 'vendedor'),
  id
FROM permissions
WHERE id IN (
  'dashboard.visualizar',
  'pedidos.visualizar',
  'pedidos.criar',
  'pedidos.editar',
  'pedidos.adicionar_observacao',
  'propostas.visualizar',
  'propostas.criar',
  'propostas.editar',
  'propostas.converter_pedido',
  'propostas.imprimir',
  'clientes.visualizar',
  'clientes.criar',
  'clientes.editar',
  'produtos.visualizar',
  'pagamentos.registrar',
  'comissoes.visualizar_proprias'
)
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Perfil FINANCEIRO
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT 
  (SELECT id FROM system_profiles WHERE codigo = 'financeiro'),
  id
FROM permissions
WHERE id IN (
  'dashboard.visualizar',
  'pedidos.visualizar_todos',
  'pedidos.entregar',
  'pagamentos.visualizar',
  'pagamentos.aprovar',
  'pagamentos.rejeitar',
  'pagamentos.estornar',
  'pagamentos.visualizar_historico'
)
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Perfil ATENDENTE
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT 
  (SELECT id FROM system_profiles WHERE codigo = 'atendente'),
  id
FROM permissions
WHERE id IN (
  'pedidos.visualizar_todos',
  'pedidos.entregar',
  'pedidos.adicionar_observacao'
)
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- PARTE 5: FUNÇÕES DE SEGURANÇA (SECURITY DEFINER)
-- ============================================================================

-- Função para verificar se usuário tem permissão específica
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles up
    JOIN profile_permissions pp ON up.profile_id = pp.profile_id
    WHERE up.user_id = _user_id 
      AND pp.permission_id = _permission_id
  );
$$;

-- Função para verificar se usuário tem perfil específico (compatibilidade)
CREATE OR REPLACE FUNCTION public.has_profile(_user_id UUID, _profile_codigo TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles up
    JOIN system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id 
      AND sp.codigo = _profile_codigo
  );
$$;

-- Função para buscar todas as permissões de um usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE (permission_id TEXT, modulo TEXT, acao TEXT, descricao TEXT, categoria TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT 
    p.id, 
    p.modulo, 
    p.acao, 
    p.descricao,
    p.categoria
  FROM user_profiles up
  JOIN profile_permissions pp ON up.profile_id = pp.profile_id
  JOIN permissions p ON pp.permission_id = p.id
  WHERE up.user_id = _user_id;
$$;

-- PARTE 6: HABILITAR RLS NAS NOVAS TABELAS
-- ============================================================================

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas: Todos usuários autenticados podem ler
CREATE POLICY "Usuários autenticados podem ver permissões"
ON public.permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários autenticados podem ver perfis ativos"
ON public.system_profiles FOR SELECT
TO authenticated
USING (ativo = true);

CREATE POLICY "Usuários autenticados podem ver permissões dos perfis"
ON public.profile_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuários podem ver seus próprios perfis"
ON public.user_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_permission(auth.uid(), 'usuarios.visualizar'));

-- Apenas admins podem gerenciar perfis e permissões
CREATE POLICY "Admins podem gerenciar perfis"
ON public.system_profiles FOR ALL
TO authenticated
USING (has_permission(auth.uid(), 'perfis.editar'))
WITH CHECK (has_permission(auth.uid(), 'perfis.editar'));

CREATE POLICY "Admins podem gerenciar permissões dos perfis"
ON public.profile_permissions FOR ALL
TO authenticated
USING (has_permission(auth.uid(), 'perfis.gerenciar_permissoes'))
WITH CHECK (has_permission(auth.uid(), 'perfis.gerenciar_permissoes'));

CREATE POLICY "Admins podem gerenciar perfis de usuários"
ON public.user_profiles FOR ALL
TO authenticated
USING (has_permission(auth.uid(), 'usuarios.editar'))
WITH CHECK (has_permission(auth.uid(), 'usuarios.editar'));

-- PARTE 7: MIGRAR DADOS EXISTENTES (user_roles → user_profiles)
-- ============================================================================

INSERT INTO user_profiles (user_id, profile_id)
SELECT 
  ur.user_id,
  sp.id
FROM user_roles ur
JOIN system_profiles sp ON ur.role::TEXT = sp.codigo
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up 
  WHERE up.user_id = ur.user_id 
    AND up.profile_id = sp.id
)
ON CONFLICT (user_id, profile_id) DO NOTHING;

-- ============================================================================
SELECT '✅ Sistema de permissões RBAC criado com sucesso!' as resultado;
SELECT '✅ Agora vá em Lovable Cloud > Tables e clique em "Pull types" para atualizar os tipos TypeScript' as proxima_etapa;
-- ============================================================================
