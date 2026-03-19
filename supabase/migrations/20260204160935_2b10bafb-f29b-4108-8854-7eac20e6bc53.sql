
-- =====================================================
-- ATUALIZAR POLÍTICAS RLS PARA USAR PERMISSÕES GRANULARES
-- =====================================================

-- 1. Remover políticas existentes
DROP POLICY IF EXISTS "Usuários podem ver pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem atualizar pedidos" ON public.pedidos;

-- 2. Criar política SELECT que considera permissão pedidos.visualizar_todos
CREATE POLICY "Usuários podem ver pedidos" ON public.pedidos
FOR SELECT USING (
  -- Próprio vendedor sempre vê seus pedidos
  vendedor_id = auth.uid()
  -- Ou tem permissão para ver todos
  OR has_permission(auth.uid(), 'pedidos.visualizar_todos')
  -- Ou é um dos perfis com acesso total (fallback para sistema legado)
  OR is_admin(auth.uid())
  OR is_atendente(auth.uid())
  OR is_financeiro(auth.uid())
  OR is_pcp(auth.uid())
);

-- 3. Criar política UPDATE que considera permissão pedidos.editar_todos
CREATE POLICY "Usuários podem atualizar pedidos" ON public.pedidos
FOR UPDATE USING (
  -- Próprio vendedor pode editar seus pedidos
  vendedor_id = auth.uid()
  -- Ou tem permissão para editar todos
  OR has_permission(auth.uid(), 'pedidos.editar_todos')
  -- Ou é um dos perfis com acesso (fallback)
  OR is_admin(auth.uid())
  OR is_atendente(auth.uid())
  OR is_pcp(auth.uid())
)
WITH CHECK (
  -- Atendentes e PCP não podem cancelar
  (is_atendente(auth.uid()) AND status != 'cancelado')
  OR (is_pcp(auth.uid()) AND status != 'cancelado')
  -- Admin pode tudo
  OR is_admin(auth.uid())
  -- Vendedor pode editar os próprios
  OR vendedor_id = auth.uid()
  -- Quem tem permissão editar_todos pode editar
  OR has_permission(auth.uid(), 'pedidos.editar_todos')
);
