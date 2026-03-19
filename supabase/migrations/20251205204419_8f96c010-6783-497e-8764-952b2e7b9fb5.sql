-- Atualizar policy de DELETE para permitir que vendedores deletem suas próprias solicitações pendentes
DROP POLICY IF EXISTS "Apenas admins podem deletar solicitações" ON pedidos_aprovacao;

CREATE POLICY "Vendedores podem deletar suas solicitações pendentes"
ON pedidos_aprovacao
FOR DELETE
USING (
  is_admin(auth.uid()) 
  OR (
    status = 'pendente' 
    AND EXISTS (
      SELECT 1 FROM pedidos 
      WHERE pedidos.id = pedidos_aprovacao.pedido_id 
      AND pedidos.vendedor_id = auth.uid()
    )
  )
);