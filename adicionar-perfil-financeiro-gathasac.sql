-- Migration: Adicionar perfil de financeiro para gathasac@gmail.com
-- Data: 2025-01-05
-- Descrição: Configura o usuário gathasac@gmail.com como financeiro

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Buscar ID do usuário
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'gathasac@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário gathasac@gmail.com não encontrado. Execute o cadastro primeiro.';
  ELSE
    -- Adicionar role de financeiro
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'financeiro'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Role financeiro adicionado com sucesso para gathasac@gmail.com';
  END IF;
END $$;
