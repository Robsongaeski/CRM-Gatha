-- Função RPC para buscar pedidos por telefone normalizado
CREATE OR REPLACE FUNCTION search_orders_by_phone(phone_suffix TEXT)
RETURNS TABLE (
  id UUID,
  order_number TEXT,
  created_at TIMESTAMPTZ,
  total NUMERIC,
  status TEXT,
  customer_phone TEXT,
  delivery_estimate DATE,
  wbuy_status_code TEXT
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

-- Função RPC para buscar carrinhos abandonados por telefone normalizado
CREATE OR REPLACE FUNCTION search_abandoned_carts_by_phone(phone_suffix TEXT)
RETURNS TABLE (
  id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  total NUMERIC,
  items JSONB,
  recovery_url TEXT,
  status TEXT,
  abandoned_at TIMESTAMPTZ,
  store_nome TEXT,
  store_cor TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id, ac.customer_name, ac.customer_phone, ac.total,
    ac.items, ac.recovery_url, ac.status, ac.abandoned_at,
    es.nome as store_nome, es.cor as store_cor
  FROM abandoned_carts ac
  LEFT JOIN ecommerce_stores es ON ac.store_id = es.id
  WHERE ac.status = 'abandoned'
    AND normalize_phone(ac.customer_phone) LIKE '%' || phone_suffix || '%'
  ORDER BY ac.abandoned_at DESC
  LIMIT 10;
END;
$$;