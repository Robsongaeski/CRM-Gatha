-- Remover pagamentos automáticos criados anteriormente
-- Estes pagamentos foram gerados automaticamente ao criar pedidos
-- e não devem aparecer na aprovação do financeiro

DELETE FROM pagamentos 
WHERE observacao = 'Pagamento gerado automaticamente ao criar o pedido' 
  AND status = 'aguardando';