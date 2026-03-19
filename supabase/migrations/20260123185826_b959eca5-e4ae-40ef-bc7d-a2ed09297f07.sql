-- =====================================================
-- CORREÇÃO: Políticas RLS de pedido_itens para Upload de Imagens
-- =====================================================

-- 1. Remover políticas existentes de UPDATE para pedido_itens
DROP POLICY IF EXISTS "Atualizar itens de pedidos próprios" ON pedido_itens;
DROP POLICY IF EXISTS "Atualizar itens de pedidos" ON pedido_itens;
DROP POLICY IF EXISTS "update_pedido_itens_policy" ON pedido_itens;

-- 2. Criar nova política de UPDATE que inclui PCP e Atendente
CREATE POLICY "Atualizar itens de pedidos"
ON pedido_itens FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_itens.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid()
      OR is_admin(auth.uid())
      OR is_pcp(auth.uid())
      OR is_atendente(auth.uid())
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_itens.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid()
      OR is_admin(auth.uid())
      OR is_pcp(auth.uid())
      OR is_atendente(auth.uid())
    )
  )
);