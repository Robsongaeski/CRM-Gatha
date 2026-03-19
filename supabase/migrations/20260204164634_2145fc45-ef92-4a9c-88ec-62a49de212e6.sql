
-- =====================================================
-- ATUALIZAÇÃO MASSIVA DE POLÍTICAS RLS PARA USAR PERMISSÕES GRANULARES
-- =====================================================
-- Objetivo: Garantir que usuários com permissões específicas (como pedidos.visualizar_todos)
-- possam acessar dados mesmo sem ter um perfil legado (is_admin, is_vendedor, etc.)

-- ===========================================
-- 1. TABELA: pedido_item_grades
-- ===========================================
DROP POLICY IF EXISTS "Ver grades do item" ON public.pedido_item_grades;
CREATE POLICY "Ver grades do item" ON public.pedido_item_grades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    WHERE pi.id = pedido_item_grades.pedido_item_id 
    AND (
      p.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'pedidos.visualizar_todos')
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
      OR is_financeiro(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Atualizar grades" ON public.pedido_item_grades;
CREATE POLICY "Atualizar grades" ON public.pedido_item_grades
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    WHERE pi.id = pedido_item_grades.pedido_item_id 
    AND (
      p.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'pedidos.editar_todos')
      OR is_admin(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Deletar grades" ON public.pedido_item_grades;
CREATE POLICY "Deletar grades" ON public.pedido_item_grades
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    WHERE pi.id = pedido_item_grades.pedido_item_id 
    AND (
      p.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'pedidos.editar_todos')
      OR is_admin(auth.uid())
    )
  )
);

-- ===========================================
-- 2. TABELA: pedido_item_detalhes
-- ===========================================
DROP POLICY IF EXISTS "Ver detalhes dos itens de pedidos visíveis" ON public.pedido_item_detalhes;
CREATE POLICY "Ver detalhes dos itens de pedidos visíveis" ON public.pedido_item_detalhes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    WHERE pi.id = pedido_item_detalhes.pedido_item_id 
    AND (
      p.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'pedidos.visualizar_todos')
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
      OR is_financeiro(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Atualizar detalhes de itens de pedidos próprios" ON public.pedido_item_detalhes;
CREATE POLICY "Atualizar detalhes de itens de pedidos próprios" ON public.pedido_item_detalhes
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    WHERE pi.id = pedido_item_detalhes.pedido_item_id 
    AND (
      p.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'pedidos.editar_todos')
      OR is_admin(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Deletar detalhes de itens de pedidos próprios" ON public.pedido_item_detalhes;
CREATE POLICY "Deletar detalhes de itens de pedidos próprios" ON public.pedido_item_detalhes
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    WHERE pi.id = pedido_item_detalhes.pedido_item_id 
    AND (
      p.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'pedidos.editar_todos')
      OR is_admin(auth.uid())
    )
  )
);

-- ===========================================
-- 3. TABELA: pedido_tags
-- ===========================================
DROP POLICY IF EXISTS "Usuários podem visualizar tags de pedidos visíveis" ON public.pedido_tags;
CREATE POLICY "Usuários podem visualizar tags de pedidos visíveis" ON public.pedido_tags
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_tags.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'pedidos.visualizar_todos')
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
      OR is_financeiro(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Usuários podem gerenciar tags de pedidos" ON public.pedido_tags;
CREATE POLICY "Usuários podem gerenciar tags de pedidos" ON public.pedido_tags
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_tags.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'pedidos.editar_todos')
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- ===========================================
-- 4. TABELA: pedidos_historico
-- ===========================================
DROP POLICY IF EXISTS "Ver histórico de pedidos visíveis" ON public.pedidos_historico;
CREATE POLICY "Ver histórico de pedidos visíveis" ON public.pedidos_historico
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedidos_historico.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'pedidos.visualizar_todos')
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
      OR is_financeiro(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- ===========================================
-- 5. TABELA: pagamentos
-- ===========================================
DROP POLICY IF EXISTS "Usuários podem ver pagamentos" ON public.pagamentos;
CREATE POLICY "Usuários podem ver pagamentos" ON public.pagamentos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pagamentos.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'pedidos.visualizar_todos')
      OR has_permission(auth.uid(), 'pagamentos.visualizar')
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
      OR is_financeiro(auth.uid())
    )
  )
);

-- ===========================================
-- 6. TABELA: propostas
-- ===========================================
DROP POLICY IF EXISTS "Vendedores veem suas propostas" ON public.propostas;
DROP POLICY IF EXISTS "Usuários podem ver propostas" ON public.propostas;
CREATE POLICY "Usuários podem ver propostas" ON public.propostas
FOR SELECT USING (
  vendedor_id = auth.uid()
  OR has_permission(auth.uid(), 'propostas.visualizar_todos')
  OR is_admin(auth.uid())
  OR is_pcp(auth.uid())
);

DROP POLICY IF EXISTS "Vendedores podem atualizar suas propostas" ON public.propostas;
DROP POLICY IF EXISTS "Usuários podem atualizar propostas" ON public.propostas;
CREATE POLICY "Usuários podem atualizar propostas" ON public.propostas
FOR UPDATE USING (
  vendedor_id = auth.uid()
  OR has_permission(auth.uid(), 'propostas.editar_todos')
  OR is_admin(auth.uid())
  OR is_pcp(auth.uid())
);

-- ===========================================
-- 7. TABELA: proposta_itens
-- ===========================================
DROP POLICY IF EXISTS "Ver itens de propostas visíveis" ON public.proposta_itens;
CREATE POLICY "Ver itens de propostas visíveis" ON public.proposta_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM propostas
    WHERE propostas.id = proposta_itens.proposta_id
    AND (
      propostas.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'propostas.visualizar_todos')
      OR is_admin(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Atualizar itens de propostas próprias" ON public.proposta_itens;
CREATE POLICY "Atualizar itens de propostas próprias" ON public.proposta_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM propostas
    WHERE propostas.id = proposta_itens.proposta_id
    AND (
      propostas.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'propostas.editar_todos')
      OR is_admin(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Deletar itens de propostas próprias" ON public.proposta_itens;
CREATE POLICY "Deletar itens de propostas próprias" ON public.proposta_itens
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM propostas
    WHERE propostas.id = proposta_itens.proposta_id
    AND (
      propostas.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'propostas.editar_todos')
      OR is_admin(auth.uid())
    )
  )
);

-- ===========================================
-- 8. TABELA: propostas_historico
-- ===========================================
DROP POLICY IF EXISTS "Ver histórico de propostas visíveis" ON public.propostas_historico;
CREATE POLICY "Ver histórico de propostas visíveis" ON public.propostas_historico
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM propostas p
    WHERE p.id = propostas_historico.proposta_id
    AND (
      p.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'propostas.visualizar_todos')
      OR is_admin(auth.uid())
    )
  )
);

-- ===========================================
-- 9. TABELA: comissoes
-- ===========================================
DROP POLICY IF EXISTS "Vendedores veem suas comissões" ON public.comissoes;
CREATE POLICY "Vendedores veem suas comissões" ON public.comissoes
FOR SELECT USING (
  vendedor_id = auth.uid()
  OR has_permission(auth.uid(), 'comissoes.visualizar_todos')
  OR is_admin(auth.uid())
);
