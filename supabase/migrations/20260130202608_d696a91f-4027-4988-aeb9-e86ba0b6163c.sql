-- Remover policies antigas
DROP POLICY IF EXISTS "quick_replies_select_own" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "quick_replies_update_own" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "quick_replies_delete_own" ON public.whatsapp_quick_replies;

-- Nova policy SELECT: ver APENAS as próprias (mesmo admin)
CREATE POLICY "quick_replies_select_own" ON public.whatsapp_quick_replies
  FOR SELECT USING (created_by = auth.uid());

-- UPDATE: apenas as próprias
CREATE POLICY "quick_replies_update_own" ON public.whatsapp_quick_replies
  FOR UPDATE USING (created_by = auth.uid());

-- DELETE: apenas as próprias
CREATE POLICY "quick_replies_delete_own" ON public.whatsapp_quick_replies
  FOR DELETE USING (created_by = auth.uid());