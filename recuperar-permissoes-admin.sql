-- =====================================================
-- RECUPERAÇÃO EMERGENCIAL: Restaurar permissões Admin
-- =====================================================
-- Este script restaura TODAS as permissões para os perfis de administrador
-- Executar IMEDIATAMENTE para recuperar acesso ao sistema

-- Verificar quais perfis admin existem
DO $$
DECLARE
  v_admin_id UUID;
  v_administrador_id UUID;
  v_total_permissions INTEGER;
BEGIN
  -- Buscar IDs dos perfis
  SELECT id INTO v_admin_id 
  FROM public.system_profiles 
  WHERE codigo = 'admin';
  
  SELECT id INTO v_administrador_id 
  FROM public.system_profiles 
  WHERE codigo = 'administrador';
  
  -- Contar total de permissões disponíveis
  SELECT COUNT(*) INTO v_total_permissions 
  FROM public.permissions;
  
  RAISE NOTICE 'Total de permissões no sistema: %', v_total_permissions;
  
  -- Recuperar permissões para perfil 'admin' (se existir)
  IF v_admin_id IS NOT NULL THEN
    -- Deletar permissões antigas
    DELETE FROM public.profile_permissions 
    WHERE profile_id = v_admin_id;
    
    -- Atribuir TODAS as permissões
    INSERT INTO public.profile_permissions (profile_id, permission_id)
    SELECT v_admin_id, id
    FROM public.permissions
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Permissões restauradas para perfil "admin": %', 
      (SELECT COUNT(*) FROM public.profile_permissions WHERE profile_id = v_admin_id);
  ELSE
    RAISE NOTICE 'Perfil "admin" não encontrado';
  END IF;
  
  -- Recuperar permissões para perfil 'administrador' (se existir)
  IF v_administrador_id IS NOT NULL THEN
    -- Deletar permissões antigas
    DELETE FROM public.profile_permissions 
    WHERE profile_id = v_administrador_id;
    
    -- Atribuir TODAS as permissões
    INSERT INTO public.profile_permissions (profile_id, permission_id)
    SELECT v_administrador_id, id
    FROM public.permissions
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Permissões restauradas para perfil "administrador": %', 
      (SELECT COUNT(*) FROM public.profile_permissions WHERE profile_id = v_administrador_id);
  ELSE
    RAISE NOTICE 'Perfil "administrador" não encontrado';
  END IF;
  
  -- Verificar se o usuário atual tem a permissão crítica
  IF EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
    JOIN public.permissions p ON pp.permission_id = p.id
    WHERE up.user_id = auth.uid()
    AND p.id = 'perfis.gerenciar_permissoes'
  ) THEN
    RAISE NOTICE 'Usuário atual TEM permissão para gerenciar perfis';
  ELSE
    RAISE NOTICE 'ATENÇÃO: Usuário atual NÃO TEM permissão para gerenciar perfis';
  END IF;
END $$;

-- Verificação final: Mostrar resumo de permissões por perfil admin
SELECT 
  sp.codigo,
  sp.nome,
  COUNT(pp.permission_id) as total_permissoes
FROM public.system_profiles sp
LEFT JOIN public.profile_permissions pp ON sp.id = pp.profile_id
WHERE sp.codigo IN ('admin', 'administrador')
GROUP BY sp.codigo, sp.nome
ORDER BY sp.codigo;

-- Mostrar as primeiras 10 permissões do perfil administrador para confirmação
SELECT 
  p.id,
  p.descricao,
  p.categoria
FROM public.system_profiles sp
JOIN public.profile_permissions pp ON sp.id = pp.profile_id
JOIN public.permissions p ON pp.permission_id = p.id
WHERE sp.codigo IN ('admin', 'administrador')
ORDER BY p.id
LIMIT 10;
