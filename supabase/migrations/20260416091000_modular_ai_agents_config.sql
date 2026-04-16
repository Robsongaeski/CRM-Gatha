-- Migration: Modular AI Agents Configuration
-- This migration consolidates previous requests and prepares the agents for a more modular architecture.

BEGIN;

-- 1. Remove the robotic dynamic catalog
DELETE FROM public.whatsapp_ai_knowledge_items
WHERE agent_id IN (SELECT id FROM public.whatsapp_ai_agents WHERE agent_key = 'comercial_v1')
  AND title = 'Catalogo de Produtos do Modulo Vendas';

-- 2. Update the static 'Guia de Produtos' with detailed and strategic information
-- This replaces the robotic list with humanized product explanations.
UPDATE public.whatsapp_ai_knowledge_items
SET content = $$
Categorias de Produtos:
- Uniformes Empresariais: Camisas Gola Polo, Camisetas Algodão/PV, Calças e Bermudas Brim.
- Linha Esportiva: Camisetas Dry Fit, Conjuntos de Time, Shorts e Agasalhos.
- Inverno: Moletons (com capuz, sem capuz, canguru), Jaquetas e Puffer.
- Acessórios/Especiais: Canecas, Sacochilas, Body Bebê e Vestidos Sublimados.

Guia de Tecidos:
- Algodão: Ideal para conforto e uso casual.
- Poliviscose (PV): Alta durabilidade, não desbota fácil, ótimo custo-benefício.
- Dry Fit (Liso ou Furadinho): Esportivo, leve e respirável.
- Dry Sol: Tecnologia com proteção solar e resistência.
- Piquet: Tecido clássico para camisas polo.

Tipos de Personalização:
- Silk Screen: Ideal para grandes quantidades.
- Bordado: Proporciona um acabamento sofisticado e durável.
- DTF: Estampas coloridas com alta definição em qualquer tecido.
- Sublimação: Permite artes complexas e total no Dry Fit/Poliéster.
$$,
  updated_at = now()
WHERE agent_id IN (SELECT id FROM public.whatsapp_ai_agents WHERE agent_key = 'comercial_v1')
  AND title = 'Guia de Produtos, Tecidos e Personalizacao';

-- 3. Update the agent metadata to support the new modular architecture in the router
-- We add features and specific triage requirements here.
UPDATE public.whatsapp_ai_agents
SET metadata = metadata || '{
  "features": {
    "humanize_style": true,
    "auto_sanitize": true,
    "use_llm_triage": true
  },
  "triage": {
    "enabled": true,
    "required_fields": ["produto", "quantidade", "personalizacao"]
  }
}'::jsonb,
  updated_at = now()
WHERE agent_key = 'comercial_v1';

COMMIT;
