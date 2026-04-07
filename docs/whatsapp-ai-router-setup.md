# WhatsApp AI Router Setup (Evolution/UAZAPI)

This setup enables AI first-response in WhatsApp using automation workflows and the `whatsapp-ai-router` Edge Function.

## 1. Provider keys (recommended in Admin)

Preferred:

- Configure keys in Admin -> WhatsApp API Config:
  - `openai_api_key`
  - `gemini_api_key`

Fallback:

- You can still use Supabase secrets:
  - `OPENAI_API_KEY`
  - `GEMINI_API_KEY`
- Router resolution order is: `system_config` first, environment secret second.

Still recommended as secret:

- `WHATSAPP_AI_WEBHOOK_SECRET`

If `WHATSAPP_AI_WEBHOOK_SECRET` is set, the router requires header `x-webhook-secret`.
`automation-engine` now sends this header automatically for internal calls to `whatsapp-ai-router`.

## 2. Create AI agents

After migrations, insert at least one agent.

Example (ecommerce):

```sql
insert into public.whatsapp_ai_agents (
  agent_key,
  name,
  provider,
  model,
  fallback_provider,
  fallback_model,
  system_prompt,
  confidence_threshold,
  max_auto_replies,
  handoff_mode,
  is_active
)
values (
  'ecommerce_v1',
  'Ecommerce First Response',
  'openai',
  'gpt-5-mini',
  'gemini',
  'gemini-2.5-flash',
  'Voce atende clientes de ecommerce. Seja objetivo, educado e preciso.\nQuando houver duvida, faca handoff para humano.',
  0.70,
  2,
  'round_robin',
  true
);
```

Optional pricing fields can be set to estimate cost in `whatsapp_ai_runs`.

## 3. Add knowledge base

Insert active knowledge records linked to agent id:

```sql
insert into public.whatsapp_ai_knowledge_items (agent_id, title, content, priority, is_active)
select id, 'Frete', 'Prazo de envio em ate 2 dias uteis apos confirmacao.', 10, true
from public.whatsapp_ai_agents
where agent_key = 'ecommerce_v1';
```

## 4. Automation workflow configuration

Preferred (new UI):

- Create/manage agents in `Automacao -> Agentes IA`
- In Flow Builder, add action node `Agente IA`
- Select the desired `agent_key` in node config

Use a WhatsApp workflow with trigger `whatsapp_message` and conditions for the desired instance.

Action: `call_webhook`

- Method: `POST`
- URL:

```text
https://<PROJECT-REF>.supabase.co/functions/v1/whatsapp-ai-router?agent_key=ecommerce_v1
```

No custom body is required. Default automation context payload is enough.

Legacy option remains supported:

- Action `call_webhook` pointing to `whatsapp-ai-router?agent_key=...`

## 5. Handoff behavior

When action is `handoff`, router tries:

1. `specific_user` when configured and allowed in instance
2. `round_robin` via `automation_pick_round_robin_user` using workflow id
3. fallback to first eligible user in `whatsapp_instance_users`

## 6. Safety and observability

- Dedup by inbound message id/external id (`whatsapp_ai_inbound_dedup`)
- Full run logs in `whatsapp_ai_runs`
- AI skipped automatically for:
  - outbound messages (`from_me = true`)
  - group chats
  - conversations already assigned and in progress

## 7. Rollout suggestion

1. Enable in one low-risk instance
2. Monitor `whatsapp_ai_runs` for 2-3 days
3. Tune prompt/knowledge/handoff thresholds
4. Expand to more instances

## 8. Example workflows created

Two example workflows were seeded (disabled by default):

- `IA - Atendimento Comercial (Exemplo)` -> `/functions/v1/whatsapp-ai-router?agent_key=comercial_v1`
- `IA - Atendimento Ecommerce (Exemplo)` -> `/functions/v1/whatsapp-ai-router?agent_key=ecommerce_v1`

Both use:

- Trigger: `whatsapp_message`
- Filters: `skip_groups=true`, `only_unassigned=true`, `instance_ids=[...]`
- Action: `call_webhook`
- Control: `stop_flow`

Before enabling, review `instance_ids` in each trigger to make sure each workflow is attached to the intended WhatsApp instance.
