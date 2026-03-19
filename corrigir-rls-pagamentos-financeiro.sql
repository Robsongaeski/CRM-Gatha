-- ============================================================================
-- Migration: Corrigir RLS de Pagamentos para Perfil Financeiro
-- Data: 2025-01-XX
-- Descrição: Atualiza políticas RLS de pagamentos para funcionar com o
--            novo sistema RBAC e garantir que usuários financeiros possam
--            ver e gerenciar pagamentos pendentes
-- ============================================================================

-- =====================================================
-- PASSO 1: Criar função para verificar perfil financeiro
-- =====================================================

-- Função que verifica se usuário tem perfil financeiro usando o novo sistema RBAC
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
      AND up.ativo = TRUE
      AND sp.ativo = TRUE
  ) OR has_role(_user_id, 'financeiro'); -- Fallback para sistema antigo
$$;

-- =====================================================
-- PASSO 2: Atualizar políticas RLS de pagamentos
-- =====================================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Usuários podem ver pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Usuários podem criar pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Financeiro e admin podem atualizar pagamentos" ON public.pagamentos;

-- Criar política de SELECT atualizada
CREATE POLICY "Usuários podem ver pagamentos"
ON public.pagamentos
FOR SELECT
TO authenticated
USING (
  -- Vendedor do pedido
  EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = pagamentos.pedido_id
      AND pedidos.vendedor_id = auth.uid()
  )
  OR
  -- Admin
  is_admin(auth.uid())
  OR
  -- Atendente
  is_atendente(auth.uid())
  OR
  -- Financeiro (novo sistema RBAC)
  is_financeiro(auth.uid())
);

-- Criar política de INSERT atualizada
CREATE POLICY "Usuários podem criar pagamentos"
ON public.pagamentos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- Vendedor do pedido
    EXISTS (
      SELECT 1 FROM public.pedidos
      WHERE pedidos.id = pagamentos.pedido_id
        AND pedidos.vendedor_id = auth.uid()
    )
    OR
    -- Admin
    is_admin(auth.uid())
    OR
    -- Atendente
    is_atendente(auth.uid())
    OR
    -- Financeiro
    is_financeiro(auth.uid())
  )
);

-- Criar política de UPDATE atualizada
CREATE POLICY "Financeiro e admin podem atualizar pagamentos"
ON public.pagamentos
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) OR is_financeiro(auth.uid())
);

-- =====================================================
-- PASSO 3: Verificar e garantir que o perfil existe
-- =====================================================

-- Garantir que o perfil financeiro existe no sistema RBAC
INSERT INTO public.system_profiles (codigo, nome, descricao, is_system)
VALUES ('financeiro', 'Financeiro', 'Gerenciar pagamentos e aprovações financeiras', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================
-- PASSO 4: Atribuir permissões ao perfil financeiro
-- =====================================================

DO $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Buscar ID do perfil financeiro
  SELECT id INTO v_profile_id
  FROM public.system_profiles
  WHERE codigo = 'financeiro';

  IF v_profile_id IS NULL THEN
    RAISE NOTICE 'Perfil financeiro não encontrado. Execute o script rbac-sistema-permissoes.sql primeiro.';
  ELSE
    -- Atribuir permissões de pagamentos
    INSERT INTO public.profile_permissions (profile_id, permission_id)
    SELECT v_profile_id, p.id
    FROM public.permissions p
    WHERE p.id IN (
      'pagamentos.visualizar',
      'pagamentos.aprovar',
      'pagamentos.rejeitar',
      'pagamentos.estornar',
      'pagamentos.visualizar_historico',
      'pedidos.visualizar_todos', -- Necessário para ver pedidos
      'clientes.visualizar' -- Necessário para ver informações dos clientes
    )
    ON CONFLICT (profile_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Permissões atribuídas ao perfil financeiro com sucesso!';
  END IF;
END $$;

-- =====================================================
-- PASSO 5: Migrar usuário do sistema antigo para o novo
-- =====================================================

-- Esta parte deve ser executada APENAS UMA VEZ
-- Migra usuários que têm role 'financeiro' na tabela antiga para o novo sistema

DO $$
DECLARE
  v_profile_id UUID;
  v_user_id UUID;
BEGIN
  -- Buscar ID do perfil financeiro
  SELECT id INTO v_profile_id
  FROM public.system_profiles
  WHERE codigo = 'financeiro';

  IF v_profile_id IS NOT NULL THEN
    -- Para cada usuário com role financeiro na tabela antiga
    FOR v_user_id IN 
      SELECT DISTINCT user_id 
      FROM public.user_roles 
      WHERE role = 'financeiro'
    LOOP
      -- Adicionar no novo sistema se ainda não existir
      INSERT INTO public.user_profiles (user_id, profile_id)
      VALUES (v_user_id, v_profile_id)
      ON CONFLICT (user_id, profile_id) DO NOTHING;
      
      RAISE NOTICE 'Usuário % migrado para o perfil financeiro no novo sistema RBAC', v_user_id;
    END LOOP;
  END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Listar todos os usuários financeiros
SELECT 
  u.email,
  sp.nome as perfil,
  up.ativo
FROM auth.users u
JOIN public.user_profiles up ON up.user_id = u.id
JOIN public.system_profiles sp ON sp.id = up.profile_id
WHERE sp.codigo = 'financeiro';

-- Verificar políticas RLS de pagamentos
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'pagamentos'
ORDER BY policyname;
