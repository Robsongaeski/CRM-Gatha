-- Hardening de acesso por instância no módulo WhatsApp.
-- Objetivo:
-- 1) Garantir que leitura/escrita de conversas/mensagens/fila respeite vínculo por instância.
-- 2) Manter acesso total para perfis de gestão (admin/configuração).

CREATE OR REPLACE FUNCTION public.can_manage_whatsapp_instances(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    is_admin(_user_id)
    OR has_permission(_user_id, 'ecommerce.whatsapp.configurar')
    OR has_permission(_user_id, 'whatsapp.configurar')
    OR has_permission(_user_id, 'whatsapp.instancias.gerenciar');
$function$;

CREATE OR REPLACE FUNCTION public.can_access_whatsapp_instance(_user_id uuid, _instance_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    has_whatsapp_access(_user_id)
    AND (
      (_instance_id IS NULL AND can_manage_whatsapp_instances(_user_id))
      OR can_manage_whatsapp_instances(_user_id)
      OR EXISTS (
        SELECT 1
        FROM public.whatsapp_instance_users wi
        WHERE wi.user_id = _user_id
          AND wi.instance_id = _instance_id
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.can_access_whatsapp_conversation(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.whatsapp_conversations c
    WHERE c.id = _conversation_id
      AND can_access_whatsapp_instance(_user_id, c.instance_id)
  );
$function$;

-- ==============================
-- whatsapp_instances
-- ==============================
DROP POLICY IF EXISTS "whatsapp_instances_select" ON public.whatsapp_instances;

CREATE POLICY "whatsapp_instances_select" ON public.whatsapp_instances
FOR SELECT
USING (
  can_access_whatsapp_instance(auth.uid(), id)
);

-- ==============================
-- whatsapp_conversations
-- ==============================
DROP POLICY IF EXISTS "whatsapp_conversations_select" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "whatsapp_conversations_insert" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "whatsapp_conversations_update" ON public.whatsapp_conversations;

CREATE POLICY "whatsapp_conversations_select" ON public.whatsapp_conversations
FOR SELECT
USING (
  can_access_whatsapp_instance(auth.uid(), instance_id)
);

CREATE POLICY "whatsapp_conversations_insert" ON public.whatsapp_conversations
FOR INSERT
WITH CHECK (
  can_access_whatsapp_instance(auth.uid(), instance_id)
);

CREATE POLICY "whatsapp_conversations_update" ON public.whatsapp_conversations
FOR UPDATE
USING (
  can_access_whatsapp_instance(auth.uid(), instance_id)
)
WITH CHECK (
  can_access_whatsapp_instance(auth.uid(), instance_id)
);

-- ==============================
-- whatsapp_messages
-- ==============================
DROP POLICY IF EXISTS "whatsapp_messages_select" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_insert" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "whatsapp_messages_update" ON public.whatsapp_messages;

CREATE POLICY "whatsapp_messages_select" ON public.whatsapp_messages
FOR SELECT
USING (
  can_access_whatsapp_instance(auth.uid(), instance_id)
  OR can_access_whatsapp_conversation(auth.uid(), conversation_id)
);

CREATE POLICY "whatsapp_messages_insert" ON public.whatsapp_messages
FOR INSERT
WITH CHECK (
  can_access_whatsapp_instance(auth.uid(), instance_id)
  OR can_access_whatsapp_conversation(auth.uid(), conversation_id)
);

CREATE POLICY "whatsapp_messages_update" ON public.whatsapp_messages
FOR UPDATE
USING (
  can_access_whatsapp_instance(auth.uid(), instance_id)
  OR can_access_whatsapp_conversation(auth.uid(), conversation_id)
)
WITH CHECK (
  can_access_whatsapp_instance(auth.uid(), instance_id)
  OR can_access_whatsapp_conversation(auth.uid(), conversation_id)
);

-- ==============================
-- whatsapp_message_queue
-- ==============================
DROP POLICY IF EXISTS "whatsapp_message_queue_select" ON public.whatsapp_message_queue;
DROP POLICY IF EXISTS "whatsapp_message_queue_insert" ON public.whatsapp_message_queue;
DROP POLICY IF EXISTS "whatsapp_message_queue_update" ON public.whatsapp_message_queue;

CREATE POLICY "whatsapp_message_queue_select" ON public.whatsapp_message_queue
FOR SELECT
USING (
  can_access_whatsapp_instance(auth.uid(), instance_id)
  OR can_access_whatsapp_conversation(auth.uid(), conversation_id)
);

CREATE POLICY "whatsapp_message_queue_insert" ON public.whatsapp_message_queue
FOR INSERT
WITH CHECK (
  can_access_whatsapp_instance(auth.uid(), instance_id)
  OR can_access_whatsapp_conversation(auth.uid(), conversation_id)
);

CREATE POLICY "whatsapp_message_queue_update" ON public.whatsapp_message_queue
FOR UPDATE
USING (
  can_access_whatsapp_instance(auth.uid(), instance_id)
  OR can_access_whatsapp_conversation(auth.uid(), conversation_id)
)
WITH CHECK (
  can_access_whatsapp_instance(auth.uid(), instance_id)
  OR can_access_whatsapp_conversation(auth.uid(), conversation_id)
);
