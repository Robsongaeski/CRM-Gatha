-- ============================================================================
-- CORREÇÃO: Acesso PCP às tabelas de pedidos
-- ============================================================================

-- 1. Criar função is_pcp() para verificar usuários com perfil PCP
CREATE OR REPLACE FUNCTION public.is_pcp(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles up
    JOIN system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id 
      AND sp.codigo = 'pcp'
      AND sp.ativo = true
  ) OR 
  has_role(_user_id, 'admin');
$$;

-- 2. Atualizar RLS policy de pedidos (SELECT) para incluir PCP
DROP POLICY IF EXISTS "Usuários podem ver pedidos" ON pedidos;

CREATE POLICY "Usuários podem ver pedidos" ON pedidos
FOR SELECT USING (
  vendedor_id = auth.uid() 
  OR is_admin(auth.uid()) 
  OR is_atendente(auth.uid()) 
  OR is_financeiro(auth.uid())
  OR is_pcp(auth.uid())
);

-- 3. Atualizar RLS policy de pedido_itens (SELECT) para incluir PCP
DROP POLICY IF EXISTS "Usuários podem ver itens de pedidos" ON pedido_itens;

CREATE POLICY "Usuários podem ver itens de pedidos" ON pedido_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_itens.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- 4. Atualizar RLS policy de pedido_item_grades (SELECT) para incluir PCP
DROP POLICY IF EXISTS "Ver grades do item" ON pedido_item_grades;

CREATE POLICY "Ver grades do item" ON pedido_item_grades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    WHERE pi.id = pedido_item_grades.pedido_item_id
    AND (
      p.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- 5. Atualizar RLS policy de pedido_item_detalhes (SELECT) para incluir PCP
DROP POLICY IF EXISTS "Ver detalhes dos itens de pedidos visíveis" ON pedido_item_detalhes;

CREATE POLICY "Ver detalhes dos itens de pedidos visíveis" ON pedido_item_detalhes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    WHERE pi.id = pedido_item_detalhes.pedido_item_id
    AND (
      p.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- 6. Atualizar RLS policy de pedido_tags (SELECT) para incluir PCP
DROP POLICY IF EXISTS "Usuários podem visualizar tags de pedidos visíveis" ON pedido_tags;

CREATE POLICY "Usuários podem visualizar tags de pedidos visíveis" ON pedido_tags
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_tags.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- 7. Atualizar RLS policy de pedido_tags (ALL) para incluir PCP na gestão
DROP POLICY IF EXISTS "Usuários podem gerenciar tags de pedidos" ON pedido_tags;

CREATE POLICY "Usuários podem gerenciar tags de pedidos" ON pedido_tags
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_tags.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_tags.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- 8. Garantir que PCP pode ver propostas no Kanban de aprovação
DROP POLICY IF EXISTS "Usuários com permissão podem visualizar movimentos de propost" ON movimento_etapa_proposta;

CREATE POLICY "Usuários com permissão podem visualizar movimentos de proposta" ON movimento_etapa_proposta
FOR SELECT USING (
  is_admin(auth.uid()) 
  OR is_pcp(auth.uid())
  OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.visualizar')
);