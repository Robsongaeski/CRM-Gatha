
-- One-time fix: Mark shipped orders with 12+ days without tracking as delivered
-- Covers wbuy_status_code 6 (Em transporte) and 8 (Disponível para retirada)
UPDATE orders
SET status = 'delivered',
    wbuy_status_code = 10,
    updated_at = now()
WHERE tracking_code IS NULL
  AND created_at < now() - interval '12 days'
  AND status NOT IN ('delivered', 'cancelled')
  AND wbuy_status_code IN (6, 7, 8);
