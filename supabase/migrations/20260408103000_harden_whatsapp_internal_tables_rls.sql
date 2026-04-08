-- Security hardening: enable RLS on internal WhatsApp automation/debug tables.
-- These tables are written/read by Edge Functions using service_role.
-- With RLS enabled and no policies, anon/authenticated access is blocked.

ALTER TABLE IF EXISTS public.automation_whatsapp_round_robin_state
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.automation_whatsapp_reply_logs
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS public.whatsapp_webhook_debug_events
  ENABLE ROW LEVEL SECURITY;

-- Defense in depth: ensure client roles do not have direct table privileges.
REVOKE ALL ON TABLE public.automation_whatsapp_round_robin_state FROM anon, authenticated;
REVOKE ALL ON TABLE public.automation_whatsapp_reply_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.whatsapp_webhook_debug_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.automation_whatsapp_round_robin_state FROM PUBLIC;
REVOKE ALL ON TABLE public.automation_whatsapp_reply_logs FROM PUBLIC;
REVOKE ALL ON TABLE public.whatsapp_webhook_debug_events FROM PUBLIC;
