-- Ajuste de segurança e consistência no módulo WhatsApp.
-- 1) Remove permissão global de gerenciamento de instâncias para perfis operacionais.
--    Acesso passa a depender de vínculo em whatsapp_instance_users (ou perfis administrativos).
-- 2) Desatribui Daniele das conversas da instância 4715- (UAZAPI), evitando indicação de atendente indevida.

-- 1) Remover permissões globais sensíveis dos perfis vendedor/atendente
WITH target_profiles AS (
  SELECT id
  FROM public.system_profiles
  WHERE codigo IN ('vendedor', 'atendente')
)
DELETE FROM public.profile_permissions pp
USING target_profiles tp
WHERE pp.profile_id = tp.id
  AND pp.permission_id IN (
    'ecommerce.whatsapp.configurar',
    'whatsapp.configurar',
    'whatsapp.instancias.gerenciar'
  );

-- 2) Desatribuir Daniele apenas na instância 4715- (UAZAPI)
UPDATE public.whatsapp_conversations c
SET
  assigned_to = NULL,
  status = CASE
    WHEN c.status = 'in_progress' THEN 'pending'
    ELSE c.status
  END
WHERE c.instance_id = (
  SELECT wi.id
  FROM public.whatsapp_instances wi
  WHERE wi.instance_name = '4715-'
    AND wi.api_type = 'uazapi'
  LIMIT 1
)
AND c.assigned_to = (
  SELECT p.id
  FROM public.profiles p
  WHERE p.nome = 'Daniele'
  ORDER BY p.created_at DESC
  LIMIT 1
);
