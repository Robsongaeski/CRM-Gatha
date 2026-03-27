-- Compatibilidade entre IDs antigos e novos de permissao de propostas.
-- Historico: existe cadastro antigo "propostas.editar_todas" no banco,
-- enquanto RLS e parte do frontend usam "propostas.editar_todos".

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
    WHERE up.user_id = _user_id
      AND (
        pp.permission_id = _permission_id
        OR (_permission_id = 'propostas.editar_todos' AND pp.permission_id = 'propostas.editar_todas')
        OR (_permission_id = 'propostas.editar_todas' AND pp.permission_id = 'propostas.editar_todos')
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(permission_id text, permission_code text, permission_description text, category text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base_permissions AS (
    SELECT DISTINCT
      p.id AS permission_id,
      p.id AS permission_code,
      p.descricao AS permission_description,
      p.categoria AS category
    FROM public.user_profiles up
    JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
    JOIN public.permissions p ON pp.permission_id = p.id
    WHERE up.user_id = _user_id
  ),
  aliases AS (
    SELECT
      bp.permission_id,
      'propostas.editar_todos'::text AS permission_code,
      bp.permission_description,
      bp.category
    FROM base_permissions bp
    WHERE bp.permission_code = 'propostas.editar_todas'
  )
  SELECT permission_id, permission_code, permission_description, category
  FROM base_permissions
  UNION
  SELECT permission_id, permission_code, permission_description, category
  FROM aliases;
$function$;
