-- Verificar e corrigir associação de usuários aos perfis do sistema RBAC

-- 1. Verificar usuários sem perfil no novo sistema
DO $$
DECLARE
  v_user RECORD;
  v_perfil_id UUID;
BEGIN
  -- Para cada usuário no profiles que não tem perfil no novo sistema
  FOR v_user IN 
    SELECT p.id, p.email, p.nome
    FROM profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM user_profiles up WHERE up.user_id = p.id
    )
  LOOP
    RAISE NOTICE 'Usuário sem perfil encontrado: % (%) - %', v_user.nome, v_user.email, v_user.id;
    
    -- Verificar se tem role antiga
    SELECT sp.id INTO v_perfil_id
    FROM user_roles ur
    JOIN system_profiles sp ON sp.codigo = ur.role::text
    WHERE ur.user_id = v_user.id
    LIMIT 1;
    
    IF v_perfil_id IS NOT NULL THEN
      -- Associar ao perfil equivalente
      INSERT INTO user_profiles (user_id, profile_id)
      VALUES (v_user.id, v_perfil_id)
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE 'Usuário % associado ao perfil %', v_user.email, v_perfil_id;
    ELSE
      -- Se não tem role antiga, associar ao perfil de vendedor por padrão
      SELECT id INTO v_perfil_id
      FROM system_profiles
      WHERE codigo = 'vendedor'
      LIMIT 1;
      
      IF v_perfil_id IS NOT NULL THEN
        INSERT INTO user_profiles (user_id, profile_id)
        VALUES (v_user.id, v_perfil_id)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Usuário % associado ao perfil vendedor por padrão', v_user.email;
      END IF;
    END IF;
  END LOOP;
END $$;

-- 2. Relatório final
SELECT 
  'Total de usuários' as tipo,
  COUNT(*) as quantidade
FROM profiles
UNION ALL
SELECT 
  'Usuários com perfil RBAC' as tipo,
  COUNT(DISTINCT user_id) as quantidade
FROM user_profiles
UNION ALL
SELECT 
  'Usuários SEM perfil RBAC' as tipo,
  COUNT(*) as quantidade
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = p.id
);