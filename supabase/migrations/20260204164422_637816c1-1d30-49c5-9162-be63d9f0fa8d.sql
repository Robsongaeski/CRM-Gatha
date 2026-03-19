
-- =====================================================
-- ATUALIZAR POLÍTICA RLS DE pedido_itens PARA INCLUIR PERMISSÕES GRANULARES
-- =====================================================
-- Problema: Usuários com permissão 'pedidos.visualizar_todos' não conseguem
-- ver as fotos dos itens porque a política SELECT de pedido_itens não reconhece
-- essa permissão granular.

-- 1. Remover política SELECT existente
DROP POLICY IF EXISTS "Usuários podem ver itens de pedidos" ON public.pedido_itens;

-- 2. Criar nova política SELECT que inclui permissões granulares
CREATE POLICY "Usuários podem ver itens de pedidos" ON public.pedido_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = pedido_itens.pedido_id 
    AND (
      -- Próprio vendedor sempre vê
      pedidos.vendedor_id = auth.uid()
      -- Ou tem permissão granular para ver todos os pedidos
      OR has_permission(auth.uid(), 'pedidos.visualizar_todos')
      -- Fallback para roles legados
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
      OR is_financeiro(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- 3. Também atualizar política UPDATE para consistência
DROP POLICY IF EXISTS "Atualizar itens de pedidos" ON public.pedido_itens;

CREATE POLICY "Atualizar itens de pedidos" ON public.pedido_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = pedido_itens.pedido_id 
    AND (
      -- Próprio vendedor pode editar
      pedidos.vendedor_id = auth.uid()
      -- Ou tem permissão granular para editar todos
      OR has_permission(auth.uid(), 'pedidos.editar_todos')
      -- Fallback para roles legados
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);
