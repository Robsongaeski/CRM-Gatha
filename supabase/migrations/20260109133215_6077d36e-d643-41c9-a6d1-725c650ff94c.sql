-- Corrigir status baseado na imagem da WBuy
-- 11018997: Pagamento negado (11)
UPDATE orders SET wbuy_status_code = 11, status = 'payment_denied' WHERE order_number = '11018997';

-- 11018178: Pedido cancelado (9)
UPDATE orders SET wbuy_status_code = 9, status = 'cancelled' WHERE order_number = '11018178';

-- 11017485: Em produção (4)
UPDATE orders SET wbuy_status_code = 4, status = 'processing' WHERE order_number = '11017485';

-- 11016296: Em produção (4)
UPDATE orders SET wbuy_status_code = 4, status = 'processing' WHERE order_number = '11016296';

-- 11015981: Em produção (4)
UPDATE orders SET wbuy_status_code = 4, status = 'processing' WHERE order_number = '11015981';

-- 11015960: Em produção (4)
UPDATE orders SET wbuy_status_code = 4, status = 'processing' WHERE order_number = '11015960';

-- 11019145: Aguardando pagamento (1) - verificar na imagem não aparece esse
-- Se o status atual é 3 (pago), pode estar certo, vou deixar