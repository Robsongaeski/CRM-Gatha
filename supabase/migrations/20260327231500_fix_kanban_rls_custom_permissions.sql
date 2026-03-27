-- Corrige RLS do Kanban para perfis customizados que usam permissoes granulares.
-- Problema observado:
-- - usuario com permissao de Kanban recebia toast de sucesso
-- - mas UPDATE em pedidos/propostas nao era aplicado (bloqueio RLS silencioso)
-- - porque algumas policies dependiam de is_pcp() / pedidos.editar_todos
--   e nao consideravam permissoes pcp.kanban.*

-- =====================================================
-- PEDIDOS
-- =====================================================
DROP POLICY IF EXISTS "Usuários podem ver pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuarios podem ver pedidos" ON public.pedidos;

CREATE POLICY "Usuários podem ver pedidos" ON public.pedidos
FOR SELECT USING (
  vendedor_id = auth.uid()
  OR has_permission(auth.uid(), 'pedidos.visualizar_todos')
  OR has_permission(auth.uid(), 'pcp.kanban.visualizar')
  OR has_permission(auth.uid(), 'pcp.kanban.movimentar')
  OR is_admin(auth.uid())
  OR is_atendente(auth.uid())
  OR is_financeiro(auth.uid())
  OR is_pcp(auth.uid())
);

DROP POLICY IF EXISTS "Usuários podem atualizar pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuarios podem atualizar pedidos" ON public.pedidos;

CREATE POLICY "Usuários podem atualizar pedidos" ON public.pedidos
FOR UPDATE USING (
  vendedor_id = auth.uid()
  OR has_permission(auth.uid(), 'pedidos.editar_todos')
  OR has_permission(auth.uid(), 'pcp.kanban.movimentar')
  OR is_admin(auth.uid())
  OR is_atendente(auth.uid())
  OR is_pcp(auth.uid())
)
WITH CHECK (
  (is_atendente(auth.uid()) AND status != 'cancelado')
  OR (is_pcp(auth.uid()) AND status != 'cancelado')
  OR (has_permission(auth.uid(), 'pcp.kanban.movimentar') AND status != 'cancelado')
  OR is_admin(auth.uid())
  OR vendedor_id = auth.uid()
  OR has_permission(auth.uid(), 'pedidos.editar_todos')
);

-- =====================================================
-- PROPOSTAS (KANBAN DE APROVACAO)
-- =====================================================
DROP POLICY IF EXISTS "Usuários podem ver propostas" ON public.propostas;
DROP POLICY IF EXISTS "Usuarios podem ver propostas" ON public.propostas;

CREATE POLICY "Usuários podem ver propostas" ON public.propostas
FOR SELECT USING (
  vendedor_id = auth.uid()
  OR has_permission(auth.uid(), 'propostas.visualizar_todos')
  OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.visualizar')
  OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.movimentar')
  OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.editar')
  OR is_admin(auth.uid())
  OR is_pcp(auth.uid())
);

DROP POLICY IF EXISTS "Usuários podem atualizar propostas" ON public.propostas;
DROP POLICY IF EXISTS "Usuarios podem atualizar propostas" ON public.propostas;

CREATE POLICY "Usuários podem atualizar propostas" ON public.propostas
FOR UPDATE USING (
  vendedor_id = auth.uid()
  OR has_permission(auth.uid(), 'propostas.editar_todos')
  OR has_permission(auth.uid(), 'propostas.editar_todas')
  OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.movimentar')
  OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.editar')
  OR is_admin(auth.uid())
  OR is_pcp(auth.uid())
);
