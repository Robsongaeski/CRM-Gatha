-- Corrigir pedido 10992332 que WBuy enviou com código errado (6) mas nome correto (Pedido cancelado = 9)
UPDATE orders SET wbuy_status_code = 9, status = 'cancelled' WHERE order_number = '10992332';