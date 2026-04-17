CREATE OR REPLACE FUNCTION public.get_whatsapp_conversation_starters(_conversation_ids uuid[])
RETURNS TABLE (
  conversation_id uuid,
  first_message_at timestamptz,
  started_by_attendant boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (wm.conversation_id)
    wm.conversation_id,
    wm.created_at AS first_message_at,
    COALESCE(wm.from_me, false) AS started_by_attendant
  FROM public.whatsapp_messages wm
  WHERE wm.conversation_id = ANY(_conversation_ids)
  ORDER BY wm.conversation_id, wm.created_at ASC, wm.id ASC;
$function$;
