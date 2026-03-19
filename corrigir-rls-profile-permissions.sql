-- =====================================================
-- CORREÇÃO RLS: Eliminar recursão infinita nas policies
-- =====================================================
-- Este script corrige as políticas RLS que causam recursão
-- ao tentar verificar permissões consultando a própria tabela

-- =====================================================
-- PASSO 1: Remover policies problemáticas
-- =====================================================

-- Desabilitar temporariamente RLS para fazer as alterações
ALTER TABLE public.system_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Remover policies antigas que causam recursão
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.system_profiles;
DROP POLICY IF EXISTS "Admins podem gerenciar perfis" ON public.system_profiles;
DROP POLICY IF EXISTS "Admins podem gerenciar permissões de perfis" ON public.profile_permissions;
DROP POLICY IF EXISTS "Admins podem gerenciar atribuições de perfis" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins podem visualizar atribuições de perfis" ON public.user_profiles;

-- =====================================================
-- PASSO 2: Criar função segura para verificar admin
-- =====================================================

-- Função que verifica se usuário é admin SEM consultar profile_permissions
-- Isso evita recursão infinita
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id UUID)
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
    AND sp.codigo IN ('admin', 'administrador')
    AND sp.ativo = true
  )
$$;

-- Testar a função
DO $$
BEGIN
  IF public.is_admin_user(auth.uid()) THEN
    RAISE NOTICE 'Usuário atual É ADMIN';
  ELSE
    RAISE NOTICE 'Usuário atual NÃO É ADMIN';
  END IF;
END $$;

-- =====================================================
-- PASSO 3: Criar policies seguras usando is_admin_user()
-- =====================================================

-- Remover policies antigas primeiro
DROP POLICY IF EXISTS "Usuários autenticados podem ver perfis ativos" ON public.system_profiles;
DROP POLICY IF EXISTS "Admins podem gerenciar perfis" ON public.system_profiles;
DROP POLICY IF EXISTS "Usuários autenticados podem ver permissões de perfis" ON public.profile_permissions;
DROP POLICY IF EXISTS "Admins podem gerenciar permissões de perfis" ON public.profile_permissions;
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins podem gerenciar atribuições de perfis" ON public.user_profiles;

-- Policies para system_profiles
CREATE POLICY "Usuários autenticados podem ver perfis ativos"
ON public.system_profiles
FOR SELECT
TO authenticated
USING (ativo = true);

CREATE POLICY "Admins podem gerenciar perfis"
ON public.system_profiles
FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- Policies para profile_permissions
CREATE POLICY "Usuários autenticados podem ver permissões de perfis"
ON public.profile_permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins podem gerenciar permissões de perfis"
ON public.profile_permissions
FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- Policies para user_profiles
CREATE POLICY "Usuários podem ver seus próprios perfis"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_user(auth.uid()));

CREATE POLICY "Admins podem gerenciar atribuições de perfis"
ON public.user_profiles
FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

-- =====================================================
-- PASSO 4: Reabilitar RLS
-- =====================================================

ALTER TABLE public.system_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar policies criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('system_profiles', 'profile_permissions', 'user_profiles')
ORDER BY tablename, policyname;

-- Testar se usuário atual pode acessar os dados
SELECT 
  'system_profiles' as tabela,
  COUNT(*) as registros_visiveis
FROM public.system_profiles
UNION ALL
SELECT 
  'profile_permissions' as tabela,
  COUNT(*) as registros_visiveis
FROM public.profile_permissions
UNION ALL
SELECT 
  'user_profiles' as tabela,
  COUNT(*) as registros_visiveis
FROM public.user_profiles;

DO $$
BEGIN
  RAISE NOTICE 'Correção de RLS concluída com sucesso!';
  RAISE NOTICE 'Próximo passo: Recarregar Schema Cache no Supabase Dashboard';
END $$;
