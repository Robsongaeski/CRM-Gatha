-- SQL para Adicionar Perfil de Atendente
-- Execute este script no SQL Editor do Lovable Cloud
-- Data: 2025-11-05
-- Descrição: Configura o usuário negociopb@gmail.com como atendente puro

-- 1. Verificar se o usuário existe e adicionar role de atendente
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar ID do usuário
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'negociopb@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário negociopb@gmail.com não encontrado. Execute o cadastro primeiro.';
  ELSE
    -- Remover roles existentes (descomente a linha abaixo se quiser que o usuário seja APENAS atendente)
    -- DELETE FROM public.user_roles WHERE user_id = v_user_id;
    
    -- Adicionar role de atendente
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'atendente'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Role atendente adicionado com sucesso para negociopb@gmail.com';
  END IF;
END $$;

-- 2. Verificar o resultado (opcional)
SELECT 
  u.email,
  u.id,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'negociopb@gmail.com';
