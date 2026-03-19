-- Atualizar função is_pcp() para reconhecer tanto 'pcp' quanto 'producao'
CREATE OR REPLACE FUNCTION public.is_pcp(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles up
    JOIN system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id 
      AND sp.codigo IN ('pcp', 'producao')
      AND sp.ativo = true
  ) OR 
  has_role(_user_id, 'admin');
$$;