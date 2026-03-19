-- CORREÇÃO 1: Atualizar os pedidos específicos mencionados pelo usuário

-- Pedido #10863006 - Deve estar "Em transporte" (code 6) conforme WBuy
UPDATE public.orders
SET 
  status = 'shipped',
  wbuy_status_code = 6,
  updated_at = now()
WHERE order_number = '10863006';

-- Pedido #10890766 - Deve estar "Em transporte" (code 6) conforme WBuy  
UPDATE public.orders
SET 
  status = 'shipped',
  wbuy_status_code = 6,
  updated_at = now()
WHERE order_number = '10890766';

-- Pedido #10916474 - Deve estar "Cancelado" (code 9) conforme WBuy
UPDATE public.orders
SET 
  status = 'cancelled',
  wbuy_status_code = 9,
  updated_at = now()
WHERE order_number = '10916474';

-- Pedido #10910550 - Deve estar "Cancelado" (code 9) conforme WBuy
UPDATE public.orders
SET 
  status = 'cancelled',
  wbuy_status_code = 9,
  updated_at = now()
WHERE order_number = '10910550';

-- CORREÇÃO 2: Identificar e corrigir padrões comuns
-- Pedidos com data de atraso muito grande que ainda estão em "processing" 
-- provavelmente deveriam estar em "shipped" ou "delivered"

-- Primeiro, vamos ver quantos pedidos têm delivery_estimate muito antiga e status incorreto
-- Esta query é apenas informativa, não altera nada