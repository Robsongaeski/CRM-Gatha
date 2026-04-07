-- =====================================================
-- WhatsApp AI foundation (Evolution/UAZAPI)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_ai_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  provider text NOT NULL CHECK (provider IN ('openai', 'gemini')),
  model text NOT NULL,
  fallback_provider text CHECK (fallback_provider IS NULL OR fallback_provider IN ('openai', 'gemini')),
  fallback_model text,
  system_prompt text NOT NULL DEFAULT '',
  temperature numeric(3,2) NOT NULL DEFAULT 0.20 CHECK (temperature >= 0 AND temperature <= 2),
  max_output_tokens integer NOT NULL DEFAULT 350 CHECK (max_output_tokens >= 32 AND max_output_tokens <= 4096),
  max_context_messages integer NOT NULL DEFAULT 12 CHECK (max_context_messages >= 1 AND max_context_messages <= 50),
  confidence_threshold numeric(4,3) NOT NULL DEFAULT 0.700 CHECK (confidence_threshold >= 0 AND confidence_threshold <= 1),
  max_auto_replies integer NOT NULL DEFAULT 2 CHECK (max_auto_replies >= 0 AND max_auto_replies <= 20),
  handoff_mode text NOT NULL DEFAULT 'round_robin' CHECK (handoff_mode IN ('round_robin', 'specific_user')),
  handoff_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  eligible_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  pricing_input_usd_per_1m numeric(12,6),
  pricing_output_usd_per_1m numeric(12,6),
  fallback_pricing_input_usd_per_1m numeric(12,6),
  fallback_pricing_output_usd_per_1m numeric(12,6),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_agents_active ON public.whatsapp_ai_agents(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_agents_provider_model ON public.whatsapp_ai_agents(provider, model);

DROP TRIGGER IF EXISTS update_whatsapp_ai_agents_updated_at ON public.whatsapp_ai_agents;
CREATE TRIGGER update_whatsapp_ai_agents_updated_at
BEFORE UPDATE ON public.whatsapp_ai_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.whatsapp_ai_knowledge_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.whatsapp_ai_agents(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  priority integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_knowledge_agent ON public.whatsapp_ai_knowledge_items(agent_id, is_active, priority);

DROP TRIGGER IF EXISTS update_whatsapp_ai_knowledge_items_updated_at ON public.whatsapp_ai_knowledge_items;
CREATE TRIGGER update_whatsapp_ai_knowledge_items_updated_at
BEFORE UPDATE ON public.whatsapp_ai_knowledge_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.whatsapp_ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  instance_id uuid REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES public.whatsapp_ai_agents(id) ON DELETE SET NULL,
  agent_key text,
  provider text,
  model text,
  trigger_message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  trigger_message_external_id text,
  input_excerpt text,
  decision_action text NOT NULL CHECK (decision_action IN ('reply', 'handoff', 'ignore', 'error', 'skipped')),
  decision_payload jsonb,
  reply_message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  handoff_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  handoff_reason text,
  latency_ms integer,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  estimated_cost_usd numeric(12,6),
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'fallback_success', 'error', 'skipped')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_runs_conversation_created_at ON public.whatsapp_ai_runs(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_runs_instance_created_at ON public.whatsapp_ai_runs(instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_runs_agent_created_at ON public.whatsapp_ai_runs(agent_key, created_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_ai_inbound_dedup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  message_id_external text,
  dedup_key text NOT NULL UNIQUE,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_inbound_dedup_instance_created_at ON public.whatsapp_ai_inbound_dedup(instance_id, created_at DESC);

ALTER TABLE public.whatsapp_ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_ai_knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_ai_inbound_dedup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_ai_agents_select" ON public.whatsapp_ai_agents;
DROP POLICY IF EXISTS "whatsapp_ai_agents_insert" ON public.whatsapp_ai_agents;
DROP POLICY IF EXISTS "whatsapp_ai_agents_update" ON public.whatsapp_ai_agents;
DROP POLICY IF EXISTS "whatsapp_ai_agents_delete" ON public.whatsapp_ai_agents;

CREATE POLICY "whatsapp_ai_agents_select" ON public.whatsapp_ai_agents
FOR SELECT
USING (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_ai_agents_insert" ON public.whatsapp_ai_agents
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);

CREATE POLICY "whatsapp_ai_agents_update" ON public.whatsapp_ai_agents
FOR UPDATE
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

CREATE POLICY "whatsapp_ai_agents_delete" ON public.whatsapp_ai_agents
FOR DELETE
USING (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);

DROP POLICY IF EXISTS "whatsapp_ai_knowledge_items_select" ON public.whatsapp_ai_knowledge_items;
DROP POLICY IF EXISTS "whatsapp_ai_knowledge_items_insert" ON public.whatsapp_ai_knowledge_items;
DROP POLICY IF EXISTS "whatsapp_ai_knowledge_items_update" ON public.whatsapp_ai_knowledge_items;
DROP POLICY IF EXISTS "whatsapp_ai_knowledge_items_delete" ON public.whatsapp_ai_knowledge_items;

CREATE POLICY "whatsapp_ai_knowledge_items_select" ON public.whatsapp_ai_knowledge_items
FOR SELECT
USING (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_ai_knowledge_items_insert" ON public.whatsapp_ai_knowledge_items
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);

CREATE POLICY "whatsapp_ai_knowledge_items_update" ON public.whatsapp_ai_knowledge_items
FOR UPDATE
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

CREATE POLICY "whatsapp_ai_knowledge_items_delete" ON public.whatsapp_ai_knowledge_items
FOR DELETE
USING (
  is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);

DROP POLICY IF EXISTS "whatsapp_ai_runs_select" ON public.whatsapp_ai_runs;
DROP POLICY IF EXISTS "whatsapp_ai_runs_insert" ON public.whatsapp_ai_runs;

CREATE POLICY "whatsapp_ai_runs_select" ON public.whatsapp_ai_runs
FOR SELECT
USING (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_ai_runs_insert" ON public.whatsapp_ai_runs
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  OR is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);

DROP POLICY IF EXISTS "whatsapp_ai_inbound_dedup_select" ON public.whatsapp_ai_inbound_dedup;
DROP POLICY IF EXISTS "whatsapp_ai_inbound_dedup_insert" ON public.whatsapp_ai_inbound_dedup;

CREATE POLICY "whatsapp_ai_inbound_dedup_select" ON public.whatsapp_ai_inbound_dedup
FOR SELECT
USING (has_whatsapp_access(auth.uid()));

CREATE POLICY "whatsapp_ai_inbound_dedup_insert" ON public.whatsapp_ai_inbound_dedup
FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
  OR is_admin(auth.uid())
  OR has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.configurar')
  OR has_permission(auth.uid(), 'whatsapp.instancias.gerenciar')
);
