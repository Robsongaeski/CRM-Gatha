-- 1. Criar função para verificar se usuário é atendente
CREATE OR REPLACE FUNCTION public.is_atendente(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT has_role(_user_id, 'atendente');
$$;

-- 2. Remover políticas antigas de pedidos para recriá-las
DROP POLICY IF EXISTS "Vendedores veem seus pedidos" ON pedidos;
DROP POLICY IF EXISTS "Vendedores podem atualizar seus pedidos" ON pedidos;

-- 3. Criar novas políticas para pedidos (incluindo atendentes)
CREATE POLICY "Usuários podem ver pedidos"
ON pedidos FOR SELECT
TO authenticated
USING (
  vendedor_id = auth.uid() OR 
  is_admin(auth.uid()) OR 
  is_atendente(auth.uid())
);

CREATE POLICY "Usuários podem atualizar pedidos"
ON pedidos FOR UPDATE
TO authenticated
USING (
  vendedor_id = auth.uid() OR 
  is_admin(auth.uid()) OR 
  is_atendente(auth.uid())
)
WITH CHECK (
  -- Apenas admins podem cancelar pedidos
  (is_atendente(auth.uid()) AND status != 'cancelado') OR
  is_admin(auth.uid()) OR
  vendedor_id = auth.uid()
);

-- 4. Remover políticas antigas de pedido_itens para recriá-las
DROP POLICY IF EXISTS "Ver itens de pedidos visíveis" ON pedido_itens;

-- 5. Criar nova política para pedido_itens (incluindo atendentes)
CREATE POLICY "Usuários podem ver itens de pedidos"
ON pedido_itens FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_itens.pedido_id
      AND (
        pedidos.vendedor_id = auth.uid() OR
        is_admin(auth.uid()) OR
        is_atendente(auth.uid())
      )
  )
);

-- 6. Remover políticas antigas de pagamentos para recriá-las
DROP POLICY IF EXISTS "Vendedores podem criar pagamentos" ON pagamentos;
DROP POLICY IF EXISTS "Vendedores podem ver pagamentos dos seus pedidos" ON pagamentos;

-- 7. Criar novas políticas para pagamentos (incluindo atendentes)
CREATE POLICY "Usuários podem criar pagamentos"
ON pagamentos FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pagamentos.pedido_id
        AND pedidos.vendedor_id = auth.uid()
    ) OR
    is_admin(auth.uid()) OR
    is_atendente(auth.uid()) OR
    has_role(auth.uid(), 'financeiro')
  )
);

CREATE POLICY "Usuários podem ver pagamentos"
ON pagamentos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pagamentos.pedido_id
      AND (
        pedidos.vendedor_id = auth.uid() OR
        is_admin(auth.uid()) OR
        is_atendente(auth.uid()) OR
        has_role(auth.uid(), 'financeiro')
      )
  )
);