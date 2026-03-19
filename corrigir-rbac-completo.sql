-- =====================================================
-- CORREÇÃO COMPLETA DO SISTEMA RBAC
-- =====================================================
-- Este script corrige TODAS as inconsistências entre o sistema
-- antigo (user_roles) e o novo (user_profiles + system_profiles)

-- =====================================================
-- PARTE 1: CRIAR/ATUALIZAR FUNÇÕES is_*()
-- =====================================================

-- Função unificada is_admin (substitui is_admin e is_admin_user)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Sistema NOVO (user_profiles)
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id
      AND sp.codigo IN ('admin', 'administrador')
      AND sp.ativo = TRUE
  ) OR 
  -- Sistema ANTIGO (user_roles) - fallback
  has_role(_user_id, 'admin');
$$;

-- Função is_vendedor (CRIAR - não existe)
CREATE OR REPLACE FUNCTION public.is_vendedor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id
      AND sp.codigo = 'vendedor'
      AND sp.ativo = TRUE
  ) OR 
  has_role(_user_id, 'vendedor');
$$;

-- Função is_financeiro (CORRIGIR - remover up.ativo)
CREATE OR REPLACE FUNCTION public.is_financeiro(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id
      AND sp.codigo = 'financeiro'
      AND sp.ativo = TRUE
      -- ❌ REMOVIDO: AND up.ativo = TRUE (coluna não existe!)
  ) OR 
  has_role(_user_id, 'financeiro');
$$;

-- Função is_atendente (ATUALIZAR - adicionar sistema novo)
CREATE OR REPLACE FUNCTION public.is_atendente(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id
      AND sp.codigo = 'atendente'
      AND sp.ativo = TRUE
  ) OR 
  has_role(_user_id, 'atendente');
$$;

-- =====================================================
-- PARTE 2: CORRIGIR RLS DE PAGAMENTOS
-- =====================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Usuários podem criar pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Usuários podem ver pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Financeiro e admin podem atualizar pagamentos" ON public.pagamentos;

-- Política de INSERT
CREATE POLICY "Usuários podem criar pagamentos"
ON public.pagamentos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = pagamentos.pedido_id
      AND pedidos.vendedor_id = auth.uid()
  )
  OR is_admin(auth.uid())
  OR is_atendente(auth.uid())
  OR is_financeiro(auth.uid())
);

-- Política de SELECT
CREATE POLICY "Usuários podem ver pagamentos"
ON public.pagamentos
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = pagamentos.pedido_id
      AND (
        pedidos.vendedor_id = auth.uid()
        OR is_admin(auth.uid())
        OR is_atendente(auth.uid())
        OR is_financeiro(auth.uid())
      )
  )
);

-- Política de UPDATE
CREATE POLICY "Financeiro e admin podem atualizar pagamentos"
ON public.pagamentos
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) OR is_financeiro(auth.uid())
);

-- =====================================================
-- PARTE 3: ADICIONAR FINANCEIRO EM PEDIDOS
-- =====================================================

-- Remover policy antiga
DROP POLICY IF EXISTS "Usuários podem ver pedidos" ON public.pedidos;

-- Criar nova policy incluindo financeiro
CREATE POLICY "Usuários podem ver pedidos"
ON public.pedidos
FOR SELECT
TO authenticated
USING (
  vendedor_id = auth.uid() 
  OR is_admin(auth.uid()) 
  OR is_atendente(auth.uid())
  OR is_financeiro(auth.uid())
);

-- =====================================================
-- PARTE 4: CORRIGIR PEDIDOS_HISTORICO
-- =====================================================

-- Remover policy antiga
DROP POLICY IF EXISTS "Ver histórico de pedidos visíveis" ON public.pedidos_historico;

-- Criar nova policy usando funções unificadas
CREATE POLICY "Ver histórico de pedidos visíveis"
ON public.pedidos_historico
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = pedidos_historico.pedido_id
      AND (
        pedidos.vendedor_id = auth.uid() 
        OR is_admin(auth.uid())
        OR is_atendente(auth.uid())
        OR is_financeiro(auth.uid())
      )
  )
);

-- =====================================================
-- PARTE 5: GARANTIR PERFIL E PERMISSÕES FINANCEIRO
-- =====================================================

-- Garantir que perfil financeiro existe e está ativo
INSERT INTO public.system_profiles (codigo, nome, descricao, is_system, ativo)
VALUES ('financeiro', 'Financeiro', 'Gerenciar pagamentos e aprovações financeiras', TRUE, TRUE)
ON CONFLICT (codigo) 
DO UPDATE SET 
  ativo = TRUE,
  descricao = EXCLUDED.descricao;

-- Atribuir TODAS as permissões necessárias ao perfil financeiro
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT 
  (SELECT id FROM public.system_profiles WHERE codigo = 'financeiro'),
  unnest(ARRAY[
    'dashboard.visualizar',
    'pagamentos.visualizar',
    'pagamentos.registrar',
    'pagamentos.aprovar',
    'pagamentos.rejeitar',
    'pagamentos.estornar',
    'pagamentos.visualizar_historico',
    'pedidos.visualizar_todos',
    'pedidos.entregar',
    'clientes.visualizar'
  ])
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- =====================================================
-- PARTE 6: MIGRAR TODOS OS USUÁRIOS
-- =====================================================

-- Migrar TODOS os usuários de user_roles para user_profiles
-- Inclui: admin, vendedor, financeiro, atendente
INSERT INTO public.user_profiles (user_id, profile_id)
SELECT DISTINCT
  ur.user_id,
  sp.id
FROM public.user_roles ur
JOIN public.system_profiles sp ON ur.role::TEXT = sp.codigo
WHERE sp.ativo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.user_id = ur.user_id 
      AND up.profile_id = sp.id
  )
ON CONFLICT (user_id, profile_id) DO NOTHING;

-- =====================================================
-- PARTE 7: VERIFICAÇÕES FINAIS
-- =====================================================

-- 1. Resumo de perfis e usuários
SELECT 
  '=== RESUMO DE PERFIS ===' as secao,
  sp.codigo,
  sp.nome,
  sp.ativo,
  COUNT(DISTINCT pp.permission_id) as total_permissoes,
  COUNT(DISTINCT up.user_id) as total_usuarios
FROM public.system_profiles sp
LEFT JOIN public.profile_permissions pp ON sp.id = pp.profile_id
LEFT JOIN public.user_profiles up ON sp.id = up.profile_id
GROUP BY sp.id, sp.codigo, sp.nome, sp.ativo
ORDER BY sp.codigo;

-- 2. Verificar usuário financeiro específico
SELECT 
  '=== USUÁRIO FINANCEIRO ===' as secao,
  u.email,
  sp.codigo as perfil,
  sp.nome,
  sp.ativo,
  COUNT(pp.permission_id) as total_permissoes
FROM auth.users u
JOIN public.user_profiles up ON u.id = up.user_id
JOIN public.system_profiles sp ON sp.id = up.profile_id
LEFT JOIN public.profile_permissions pp ON sp.id = pp.profile_id
WHERE u.email = 'sacgatha@gmail.com'
GROUP BY u.email, sp.codigo, sp.nome, sp.ativo;

-- 3. Testar TODAS as funções is_*() para o usuário financeiro
SELECT 
  '=== TESTE DE FUNÇÕES ===' as secao,
  'sacgatha@gmail.com' as usuario,
  is_admin((SELECT id FROM auth.users WHERE email = 'sacgatha@gmail.com')) as eh_admin,
  is_vendedor((SELECT id FROM auth.users WHERE email = 'sacgatha@gmail.com')) as eh_vendedor,
  is_financeiro((SELECT id FROM auth.users WHERE email = 'sacgatha@gmail.com')) as eh_financeiro,
  is_atendente((SELECT id FROM auth.users WHERE email = 'sacgatha@gmail.com')) as eh_atendente;

-- 4. Listar permissões do usuário financeiro
SELECT 
  '=== PERMISSÕES DO FINANCEIRO ===' as secao,
  p.id as permission_code,
  p.descricao,
  p.categoria
FROM auth.users u
JOIN public.user_profiles up ON u.id = up.user_id
JOIN public.system_profiles sp ON sp.id = up.profile_id
JOIN public.profile_permissions pp ON sp.id = pp.profile_id
JOIN public.permissions p ON pp.permission_id = p.id
WHERE u.email = 'sacgatha@gmail.com'
  AND sp.codigo = 'financeiro'
ORDER BY p.categoria, p.id;

-- 5. Verificar policies de pagamentos
SELECT 
  '=== POLICIES DE PAGAMENTOS ===' as secao,
  schemaname,
  tablename,
  policyname,
  cmd as comando
FROM pg_policies
WHERE tablename = 'pagamentos'
ORDER BY policyname;

-- 6. Verificar policies de pedidos
SELECT 
  '=== POLICIES DE PEDIDOS ===' as secao,
  schemaname,
  tablename,
  policyname,
  cmd as comando
FROM pg_policies
WHERE tablename = 'pedidos'
ORDER BY policyname;

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================
SELECT 
  '✅ CORREÇÃO COMPLETA DO RBAC FINALIZADA!' as status,
  'Execute os testes acima para verificar' as proxima_acao,
  'Faça logout + login com sacgatha@gmail.com' as importante;
