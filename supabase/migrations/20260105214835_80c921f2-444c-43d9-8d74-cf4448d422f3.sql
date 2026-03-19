-- Corrigir comissões com valor_pedido = 0 ou divergente do pedido atual
-- Atualiza baseado no valor_total real do pedido

UPDATE comissoes c
SET 
  valor_pedido = p.valor_total,
  valor_comissao = p.valor_total * c.percentual_comissao / 100,
  observacao = COALESCE(c.observacao, '') || ' | Valor corrigido em ' || CURRENT_DATE,
  updated_at = NOW()
FROM pedidos p
WHERE c.pedido_id = p.id
  AND (c.valor_pedido = 0 OR ABS(c.valor_pedido - p.valor_total) > 0.01)
  AND p.valor_total > 0
  AND p.status != 'cancelado';