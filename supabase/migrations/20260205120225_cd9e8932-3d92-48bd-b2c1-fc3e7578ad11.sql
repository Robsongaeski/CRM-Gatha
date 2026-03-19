
-- =====================================================
-- Correção da função has_whatsapp_access
-- Problema: não está verificando a permissão global whatsapp.visualizar
-- =====================================================

-- Recriar função para verificar AMBAS as permissões (antiga e nova)
CREATE OR REPLACE FUNCTION public.has_whatsapp_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    is_admin(_user_id) OR
    -- Permissões por perfil de sistema (legado)
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN system_profiles sp ON up.profile_id = sp.id
      WHERE up.user_id = _user_id
        AND sp.codigo IN ('ecommerce', 'atendente')
        AND sp.ativo = true
    ) OR
    -- Permissão antiga do e-commerce
    has_permission(_user_id, 'ecommerce.whatsapp.visualizar') OR
    -- Permissão nova global do módulo WhatsApp
    has_permission(_user_id, 'whatsapp.visualizar');
$$;

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.has_whatsapp_access IS 
'Verifica se o usuário tem acesso ao módulo WhatsApp. 
Considera: admin, perfis ecommerce/atendente, e permissões granulares (nova e antiga).';
