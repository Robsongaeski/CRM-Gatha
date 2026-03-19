
-- Forçar geração de comissões para pedidos sem comissão
UPDATE pedidos
SET updated_at = NOW()
WHERE id IN (
  SELECT p.id
  FROM pedidos p
  LEFT JOIN comissoes c ON c.pedido_id = p.id
  WHERE c.id IS NULL
    AND p.status != 'cancelado'
    AND (p.requer_aprovacao_preco IS NULL OR p.requer_aprovacao_preco = false)
);
