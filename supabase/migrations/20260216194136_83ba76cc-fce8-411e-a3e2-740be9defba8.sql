
-- One-time fix: Mark orders with 12+ days without tracking as delivered
-- This is NOT a permanent policy, just a data cleanup
UPDATE orders
SET status = 'delivered',
    wbuy_status_code = 10,
    updated_at = now()
WHERE tracking_code IS NULL
  AND created_at < now() - interval '12 days'
  AND status NOT IN ('delivered', 'cancelled')
  AND wbuy_status_code IN (3, 4, 5, 15, 16);
