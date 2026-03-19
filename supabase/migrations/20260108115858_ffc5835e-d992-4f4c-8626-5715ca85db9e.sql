-- Adicionar coluna para armazenar o código de status original da WBuy
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wbuy_status_code integer;

-- Comentário explicativo
COMMENT ON COLUMN orders.wbuy_status_code IS 'Código de status original da WBuy (1-16)';

-- Atualizar pedidos existentes com código WBuy estimado baseado no status atual
UPDATE orders SET wbuy_status_code = 
  CASE status
    WHEN 'pending' THEN 1
    WHEN 'processing' THEN 3
    WHEN 'shipped' THEN 6
    WHEN 'delivered' THEN 10
    WHEN 'cancelled' THEN 9
    WHEN 'payment_denied' THEN 11
  END
WHERE wbuy_status_code IS NULL;