-- =====================================================
-- CONSOLIDAÇÃO: Unificar perfis admin e administrador
-- =====================================================
-- Este script consolida os perfis 'admin' e 'administrador'
-- em um único perfil 'administrador' com todas as permissões

-- =====================================================
-- ANÁLISE INICIAL
-- =====================================================

-- Verificar perfis admin existentes
SELECT 
  id,
  nome,
  codigo,
  ativo,
  is_system,
  (SELECT COUNT(*) FROM public.profile_permissions pp WHERE pp.profile_id = sp.id) as total_permissoes,
  (SELECT COUNT(*) FROM public.user_profiles up WHERE up.profile_id = sp.id) as total_usuarios
FROM public.system_profiles sp
WHERE codigo IN ('admin', 'administrador')
ORDER BY codigo;

-- =====================================================
-- CONSOLIDAÇÃO
-- =====================================================

DO $$
DECLARE
  v_admin_id UUID;
  v_administrador_id UUID;
  v_usuarios_migrados INTEGER := 0;
BEGIN
  -- Buscar IDs dos perfis
  SELECT id INTO v_admin_id 
  FROM public.system_profiles 
  WHERE codigo = 'admin';
  
  SELECT id INTO v_administrador_id 
  FROM public.system_profiles 
  WHERE codigo = 'administrador';
  
  -- Se ambos existem, consolidar
  IF v_admin_id IS NOT NULL AND v_administrador_id IS NOT NULL THEN
    RAISE NOTICE 'Consolidando perfis admin...';
    
    -- Migrar usuários do perfil 'admin' para 'administrador'
    UPDATE public.user_profiles
    SET profile_id = v_administrador_id
    WHERE profile_id = v_admin_id;
    
    GET DIAGNOSTICS v_usuarios_migrados = ROW_COUNT;
    RAISE NOTICE 'Usuários migrados: %', v_usuarios_migrados;
    
    -- Garantir que 'administrador' tem TODAS as permissões
    DELETE FROM public.profile_permissions WHERE profile_id = v_administrador_id;
    INSERT INTO public.profile_permissions (profile_id, permission_id)
    SELECT v_administrador_id, id FROM public.permissions;
    
    RAISE NOTICE 'Permissões atribuídas ao perfil administrador: %',
      (SELECT COUNT(*) FROM public.profile_permissions WHERE profile_id = v_administrador_id);
    
    -- Desativar perfil 'admin' antigo (não deletar para manter histórico)
    UPDATE public.system_profiles
    SET ativo = false,
        descricao = 'OBSOLETO - Migrado para perfil "administrador"'
    WHERE id = v_admin_id;
    
    RAISE NOTICE 'Perfil "admin" desativado';
    
  -- Se só existe 'administrador', apenas garantir permissões
  ELSIF v_administrador_id IS NOT NULL THEN
    RAISE NOTICE 'Apenas perfil "administrador" existe, garantindo permissões...';
    
    DELETE FROM public.profile_permissions WHERE profile_id = v_administrador_id;
    INSERT INTO public.profile_permissions (profile_id, permission_id)
    SELECT v_administrador_id, id FROM public.permissions;
    
    RAISE NOTICE 'Permissões atribuídas: %',
      (SELECT COUNT(*) FROM public.profile_permissions WHERE profile_id = v_administrador_id);
    
  -- Se só existe 'admin', renomear para 'administrador'
  ELSIF v_admin_id IS NOT NULL THEN
    RAISE NOTICE 'Renomeando perfil "admin" para "administrador"...';
    
    UPDATE public.system_profiles
    SET codigo = 'administrador',
        nome = 'Administrador',
        descricao = 'Acesso completo ao sistema'
    WHERE id = v_admin_id;
    
    -- Garantir todas as permissões
    DELETE FROM public.profile_permissions WHERE profile_id = v_admin_id;
    INSERT INTO public.profile_permissions (profile_id, permission_id)
    SELECT v_admin_id, id FROM public.permissions;
    
    RAISE NOTICE 'Perfil renomeado e permissões atribuídas';
    
  ELSE
    RAISE EXCEPTION 'Nenhum perfil admin encontrado!';
  END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar resultado da consolidação
SELECT 
  sp.codigo,
  sp.nome,
  sp.ativo,
  COUNT(pp.permission_id) as total_permissoes,
  (SELECT COUNT(*) FROM public.user_profiles up WHERE up.profile_id = sp.id) as total_usuarios
FROM public.system_profiles sp
LEFT JOIN public.profile_permissions pp ON sp.id = pp.profile_id
WHERE sp.codigo IN ('admin', 'administrador')
GROUP BY sp.id, sp.codigo, sp.nome, sp.ativo
ORDER BY sp.codigo;

-- Verificar usuários atribuídos
SELECT 
  u.email,
  sp.codigo as perfil_codigo,
  sp.nome as perfil_nome
FROM auth.users u
JOIN public.user_profiles up ON u.id = up.user_id
JOIN public.system_profiles sp ON up.profile_id = sp.id
WHERE sp.codigo IN ('admin', 'administrador')
ORDER BY u.email;

DO $$
BEGIN
  RAISE NOTICE 'Consolidação concluída com sucesso!';
  RAISE NOTICE 'Apenas o perfil "administrador" deve estar ativo com todas as permissões';
END $$;
