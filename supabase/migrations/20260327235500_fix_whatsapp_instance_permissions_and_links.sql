-- Ajuste de permissoes do modulo WhatsApp para perfis granulares.
-- Objetivo:
-- 1) permitir que "whatsapp.configurar" e "whatsapp.instancias.gerenciar"
--    tenham os mesmos direitos de gestao de instancias que a permissao legada.
-- 2) corrigir visibilidade/acesso de vinculos em whatsapp_instance_users.

CREATE OR REPLACE FUNCTION public.has_whatsapp_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    is_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN system_profiles sp ON up.profile_id = sp.id
      WHERE up.user_id = _user_id
        AND sp.codigo IN ('ecommerce', 'atendente')
        AND sp.ativo = true
    )
    OR has_permission(_user_id, 'ecommerce.whatsapp.visualizar')
    OR has_permission(_user_id, 'whatsapp.visualizar')
    OR has_permission(_user_id, 'ecommerce.whatsapp.configurar')
    OR has_permission(_user_id, 'whatsapp.configurar')
    OR has_permission(_user_id, 'whatsapp.instancias.gerenciar');
$function$;

-- ==============================
-- whatsapp_instances
-- ==============================
DROP POLICY IF EXISTS "whatsapp_instances_insert" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_update" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "whatsapp_instances_delete" ON public.whatsapp_instances;

CREATE POLICY "whatsapp_instances_insert" ON public.whatsapp_instances
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);

CREATE POLICY "whatsapp_instances_update" ON public.whatsapp_instances
FOR UPDATE
USING (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);

CREATE POLICY "whatsapp_instances_delete" ON public.whatsapp_instances
FOR DELETE
USING (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);

-- ==============================
-- whatsapp_instance_users
-- ==============================
DROP POLICY IF EXISTS "Usuarios com permissao podem gerenciar vinculos" ON public.whatsapp_instance_users;
DROP POLICY IF EXISTS "Usuarios podem ver seus vinculos" ON public.whatsapp_instance_users;
DROP POLICY IF EXISTS "Usuários podem ver seus vínculos" ON public.whatsapp_instance_users;
DROP POLICY IF EXISTS "Admins podem gerenciar vínculos de instâncias" ON public.whatsapp_instance_users;
DROP POLICY IF EXISTS "Admins e E-commerce podem gerenciar vínculos" ON public.whatsapp_instance_users;

CREATE POLICY "Usuarios podem ver seus vinculos" ON public.whatsapp_instance_users
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);

CREATE POLICY "Usuarios com permissao podem gerenciar vinculos" ON public.whatsapp_instance_users
FOR ALL
USING (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
)
WITH CHECK (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);
