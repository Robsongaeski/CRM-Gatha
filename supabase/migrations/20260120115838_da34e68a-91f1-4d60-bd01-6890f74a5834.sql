-- Atualizar todos os pedidos atrasados há mais de 4 dias para status concluído
-- Isso é uma limpeza de dados históricos antes da atualização do sistema de envios

UPDATE public.orders
SET 
  status = 'delivered',
  wbuy_status_code = 10,
  updated_at = now()
WHERE 
  delivery_estimate < (CURRENT_DATE - INTERVAL '4 days')
  AND status NOT IN ('delivered', 'cancelled')
  AND (wbuy_status_code IS NULL OR wbuy_status_code NOT IN (9, 10, 11, 13));