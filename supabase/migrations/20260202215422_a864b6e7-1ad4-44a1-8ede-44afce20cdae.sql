-- Corrigir a função search_orders_by_phone com tipos corretos
DROP FUNCTION IF EXISTS search_orders_by_phone(TEXT);

CREATE OR REPLACE FUNCTION search_orders_by_phone(phone_suffix TEXT)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  created_at TIMESTAMPTZ,
  total NUMERIC,
  status order_status,
  customer_phone TEXT,
  delivery_estimate DATE,
  wbuy_status_code INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id, o.order_number, o.created_at, o.total, 
    o.status, o.customer_phone, o.delivery_estimate, o.wbuy_status_code
  FROM orders o
  WHERE normalize_phone(o.customer_phone) LIKE '%' || phone_suffix || '%'
  ORDER BY o.created_at DESC
  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION search_orders_by_phone(TEXT) TO anon, authenticated;