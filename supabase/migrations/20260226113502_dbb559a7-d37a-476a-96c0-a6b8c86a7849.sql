
-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Usuários podem criar pagamentos" ON public.pagamentos;

-- Recreate with permission-based check (allows any vendedor with pagamentos.registrar)
CREATE POLICY "Usuários podem criar pagamentos" ON public.pagamentos
FOR INSERT TO authenticated
WITH CHECK (
  is_admin(auth.uid())
  OR is_atendente(auth.uid())
  OR is_financeiro(auth.uid())
  OR has_permission(auth.uid(), 'pagamentos.registrar')
  OR EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pagamentos.pedido_id
    AND pedidos.vendedor_id = auth.uid()
  )
);
