-- ============================================================================
-- MIGRAÇÃO: Remover Pagamentos Automáticos Residuais
-- ============================================================================
-- Remove pagamentos gerados automaticamente que ainda existem no sistema
-- e ajusta o status de pagamento dos pedidos afetados
-- ============================================================================

-- 1. BACKUP: Registrar pedidos que serão afetados
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Contar pagamentos que serão removidos
  SELECT COUNT(*) INTO v_count
  FROM pagamentos
  WHERE observacao = 'Pagamento gerado automaticamente ao criar o pedido'
    AND status IN ('aguardando', 'rejeitado');
  
  RAISE NOTICE 'Serão removidos % pagamentos automáticos', v_count;
END $$;

-- 2. DELETAR pagamentos automáticos com status aguardando ou rejeitado
DELETE FROM pagamentos
WHERE observacao = 'Pagamento gerado automaticamente ao criar o pedido'
  AND status IN ('aguardando', 'rejeitado');

-- 3. ATUALIZAR status de pagamento dos pedidos afetados
-- Para cada pedido, recalcular o status baseado nos pagamentos restantes
UPDATE pedidos p
SET status_pagamento = CASE
  -- Se tem pagamento aprovado não estornado e valor total coberto = quitado
  WHEN EXISTS (
    SELECT 1 FROM pagamentos pag
    WHERE pag.pedido_id = p.id
      AND pag.status = 'aprovado'
      AND pag.estornado = false
  ) AND (
    SELECT COALESCE(SUM(valor), 0) FROM pagamentos pag
    WHERE pag.pedido_id = p.id
      AND pag.status = 'aprovado'
      AND pag.estornado = false
  ) >= p.valor_total THEN 'quitado'::status_pagamento
  
  -- Se tem pagamento aprovado mas não cobre o total = parcial
  WHEN EXISTS (
    SELECT 1 FROM pagamentos pag
    WHERE pag.pedido_id = p.id
      AND pag.status = 'aprovado'
      AND pag.estornado = false
  ) THEN 'parcial'::status_pagamento
  
  -- Se não tem nenhum pagamento aprovado = aguardando
  ELSE 'aguardando'::status_pagamento
END
WHERE id IN (
  -- Apenas pedidos que tinham pagamentos automáticos deletados
  SELECT DISTINCT pedido_id 
  FROM pagamentos 
  WHERE observacao = 'Pagamento gerado automaticamente ao criar o pedido'
    AND status IN ('aguardando', 'rejeitado')
);

-- 4. VERIFICAÇÃO: Mostrar resultado da limpeza
DO $$
DECLARE
  v_total_pagamentos INTEGER;
  v_pagamentos_automaticos INTEGER;
BEGIN
  -- Total de pagamentos no sistema
  SELECT COUNT(*) INTO v_total_pagamentos FROM pagamentos;
  
  -- Pagamentos automáticos restantes (deve ser 0)
  SELECT COUNT(*) INTO v_pagamentos_automaticos
  FROM pagamentos
  WHERE observacao = 'Pagamento gerado automaticamente ao criar o pedido';
  
  RAISE NOTICE '=== RESULTADO DA LIMPEZA ===';
  RAISE NOTICE 'Total de pagamentos no sistema: %', v_total_pagamentos;
  RAISE NOTICE 'Pagamentos automáticos restantes: %', v_pagamentos_automaticos;
  
  IF v_pagamentos_automaticos = 0 THEN
    RAISE NOTICE '✅ Sistema limpo com sucesso!';
  ELSE
    RAISE WARNING '⚠️ Ainda existem % pagamentos automáticos no sistema', v_pagamentos_automaticos;
  END IF;
END $$;

-- ============================================================================
SELECT '✅ Migração concluída: Pagamentos automáticos removidos' as resultado;
-- ============================================================================