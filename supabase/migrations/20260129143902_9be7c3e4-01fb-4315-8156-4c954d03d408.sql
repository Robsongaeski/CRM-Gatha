-- ============================================================================
-- CORREÇÃO: Remover constraint UNIQUE(pedido_id) da tabela comissoes
-- 
-- PROBLEMA: O sistema atual de comissões por pagamento cria múltiplas comissões
-- para um mesmo pedido (uma prevista + uma efetiva para cada pagamento).
-- A constraint UNIQUE(pedido_id) impede isso e causa o erro "registro já existe".
--
-- SOLUÇÃO: Remover a constraint UNIQUE(pedido_id) e garantir unicidade apenas
-- para pagamento_id quando não for NULL.
-- ============================================================================

-- 1. Remover a constraint UNIQUE(pedido_id) que causa o problema
ALTER TABLE public.comissoes DROP CONSTRAINT IF EXISTS comissoes_pedido_id_key;

-- 2. Criar constraint para evitar duplicatas de pagamento_id (quando definido)
-- Apenas uma comissão por pagamento_id
DROP INDEX IF EXISTS idx_comissoes_pagamento_unique;
CREATE UNIQUE INDEX idx_comissoes_pagamento_unique 
  ON public.comissoes (pagamento_id) 
  WHERE pagamento_id IS NOT NULL;

-- 3. Garantir que existe índice para buscas eficientes por pedido
DROP INDEX IF EXISTS idx_comissoes_pedido_id;
CREATE INDEX idx_comissoes_pedido_id ON public.comissoes (pedido_id);

-- 4. Índice para tipo_comissao (busca por prevista/efetiva)
DROP INDEX IF EXISTS idx_comissoes_tipo;
CREATE INDEX idx_comissoes_tipo ON public.comissoes (pedido_id, tipo_comissao);

SELECT '✅ Constraint corrigida - Sistema permite múltiplas comissões por pedido' as resultado;