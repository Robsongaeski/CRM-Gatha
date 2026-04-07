-- Refine Comercial AI tone to reduce repeated openers and increase human-like personalization

UPDATE public.whatsapp_ai_agents
SET
  system_prompt = trim(coalesce(system_prompt, '')) || E'\n\nEstilo humano avancado:\n- Evite repetir a mesma palavra de abertura em mensagens seguidas (ex.: "Perfeito").\n- Varie naturalmente as aberturas entre: "Claro", "Entendi", "Legal", "Show", "Otimo".\n- Quando fizer sentido, use o primeiro nome do cliente na saudacao inicial para criar conexao.\n- A primeira resposta da conversa deve soar acolhedora, pessoal e objetiva, sem parecer robo.',
  updated_at = now()
WHERE agent_key = 'comercial_v1'
  AND position('Evite repetir a mesma palavra de abertura em mensagens seguidas' in coalesce(system_prompt, '')) = 0;

UPDATE public.whatsapp_ai_knowledge_items
SET
  content = $$
Nunca informar:
- valores,
- previsao de prazo final,
- desconto,
- frete fechado,
- condicao de pagamento final.

Resposta recomendada para esses casos (variar linguagem):
"Claro! Vou encaminhar para nossa equipe comercial te passar valores e prazos certinhos."
$$,
  updated_at = now()
WHERE agent_id = (SELECT id FROM public.whatsapp_ai_agents WHERE agent_key = 'comercial_v1')
  AND title = 'Limites Comerciais (Nao passar preco/prazo)';
