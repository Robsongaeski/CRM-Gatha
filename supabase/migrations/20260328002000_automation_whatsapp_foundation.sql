-- Base para automações WhatsApp no módulo de Automação (visual flow builder)
-- 1) Estado de round-robin por workflow+instância
-- 2) Marcação visual de follow-up em conversas
-- 3) Log de respostas automáticas por palavra-chave

-- =============================================
-- Conversas: campos de follow-up visual
-- =============================================
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS needs_followup BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS followup_color VARCHAR(16),
  ADD COLUMN IF NOT EXISTS followup_reason TEXT,
  ADD COLUMN IF NOT EXISTS followup_flagged_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_followup
  ON public.whatsapp_conversations (needs_followup, followup_flagged_at DESC)
  WHERE needs_followup = true;

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_customer_message
  ON public.whatsapp_conversations (last_customer_message_at DESC);

-- =============================================
-- Estado de round-robin
-- =============================================
CREATE TABLE IF NOT EXISTS public.automation_whatsapp_round_robin_state (
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  next_index INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (workflow_id, instance_id)
);

-- Função transacional para escolher próximo usuário no round-robin
CREATE OR REPLACE FUNCTION public.automation_pick_round_robin_user(
  p_workflow_id UUID,
  p_instance_id UUID,
  p_user_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_current_index INTEGER;
  v_selected UUID;
BEGIN
  v_count := COALESCE(array_length(p_user_ids, 1), 0);
  IF v_count = 0 THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.automation_whatsapp_round_robin_state (workflow_id, instance_id, next_index)
  VALUES (p_workflow_id, p_instance_id, 0)
  ON CONFLICT (workflow_id, instance_id) DO NOTHING;

  SELECT next_index
    INTO v_current_index
  FROM public.automation_whatsapp_round_robin_state
  WHERE workflow_id = p_workflow_id
    AND instance_id = p_instance_id
  FOR UPDATE;

  v_current_index := COALESCE(v_current_index, 0);
  v_current_index := ((v_current_index % v_count) + v_count) % v_count;

  v_selected := p_user_ids[v_current_index + 1];

  UPDATE public.automation_whatsapp_round_robin_state
  SET
    next_index = (v_current_index + 1) % v_count,
    updated_at = now()
  WHERE workflow_id = p_workflow_id
    AND instance_id = p_instance_id;

  RETURN v_selected;
END;
$$;

REVOKE ALL ON FUNCTION public.automation_pick_round_robin_user(UUID, UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.automation_pick_round_robin_user(UUID, UUID, UUID[]) TO service_role;

-- =============================================
-- Log de auto-respostas por keyword
-- =============================================
CREATE TABLE IF NOT EXISTS public.automation_whatsapp_reply_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  execution_id UUID REFERENCES public.automation_workflow_executions(id) ON DELETE SET NULL,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  keyword TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_whatsapp_reply_logs_lookup
  ON public.automation_whatsapp_reply_logs (workflow_id, conversation_id, created_at DESC);
