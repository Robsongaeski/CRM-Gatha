-- =====================================================
-- CORREÇÃO: Foreign Keys da tabela leads
-- Data: 2025-11-06
-- Objetivo: Corrigir referências de auth.users para profiles
-- =====================================================

-- 1. Remover FK antiga vendedor_id (que aponta para auth.users)
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_vendedor_id_fkey;

-- 2. Criar FK correta vendedor_id (apontando para profiles)
ALTER TABLE public.leads 
ADD CONSTRAINT leads_vendedor_id_fkey 
FOREIGN KEY (vendedor_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- 3. Remover FK antiga created_by (que aponta para auth.users)
ALTER TABLE public.leads 
DROP CONSTRAINT IF EXISTS leads_created_by_fkey;

-- 4. Criar FK correta created_by (apontando para profiles)
ALTER TABLE public.leads 
ADD CONSTRAINT leads_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- =====================================================
-- VERIFICAÇÃO: Testar se os joins funcionam
-- =====================================================

-- Esta query deve retornar os leads com nome do vendedor
SELECT 
  l.id,
  l.nome as lead_nome,
  l.email as lead_email,
  l.telefone as lead_telefone,
  l.status,
  p.nome as vendedor_nome,
  p.email as vendedor_email
FROM public.leads l
LEFT JOIN public.profiles p ON l.vendedor_id = p.id
LIMIT 10;

-- =====================================================
-- VERIFICAR RPC get_user_permissions
-- =====================================================

-- Verificar se a função existe
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'get_user_permissions';

-- Remover função antiga (assinatura incompatível)
DROP FUNCTION IF EXISTS public.get_user_permissions(UUID);

-- Criar função com assinatura correta para o hook usePermissions.ts
CREATE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS TABLE (
  permission_id TEXT,
  permission_code TEXT,
  permission_description TEXT,
  category TEXT
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id as permission_id,
    p.id as permission_code,
    p.descricao as permission_description,
    p.categoria as category
  FROM public.user_profiles up
  JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
  JOIN public.permissions p ON pp.permission_id = p.id
  WHERE up.user_id = _user_id
$$;

-- =====================================================
-- QUERIES DE DIAGNÓSTICO
-- =====================================================

-- 1. Verificar estrutura da tabela leads
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'leads'
ORDER BY ordinal_position;

-- 2. Verificar foreign keys da tabela leads
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name = 'leads';

-- 3. Verificar políticas RLS da tabela leads
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'leads';

-- =====================================================
-- INSTRUÇÕES DE USO
-- =====================================================

/*
COMO USAR ESTE SCRIPT:

1. Execute este script completo no SQL Editor do Supabase

2. Após execução, verifique se os JOINs funcionam:
   - A query de verificação deve retornar leads com nomes de vendedores
   - Se retornar vazio, está correto (não há leads cadastrados ainda)
   - Se der erro, revise as FKs

3. Verifique suas permissões de usuário:
   
   -- Substitua 'seu-email@exemplo.com' pelo seu email
   SELECT 
     u.email,
     sp.nome as perfil,
     sp.codigo
   FROM auth.users u
   JOIN public.user_profiles up ON u.id = up.user_id
   JOIN public.system_profiles sp ON up.profile_id = sp.id
   WHERE u.email = 'seu-email@exemplo.com';

4. Se não tiver perfil atribuído, execute:

   INSERT INTO public.user_profiles (user_id, profile_id)
   SELECT 
     (SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com'),
     id
   FROM public.system_profiles
   WHERE codigo = 'administrador'
   ON CONFLICT DO NOTHING;

5. Recarregue o Schema Cache no Supabase:
   Settings → API → Reload schema cache

6. Teste na aplicação:
   - Recarregue a página /leads
   - Verifique se os botões "Importar CSV" e "Novo Lead" aparecem
   - Teste criar um lead manualmente
   - Teste importar leads via CSV

*/
