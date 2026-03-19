-- =====================================================
-- Atualizar RLS de emprestimos_grade_prova para incluir permissões granulares
-- =====================================================

-- Dropar políticas existentes
DROP POLICY IF EXISTS "Admins podem ver todos os empréstimos" ON emprestimos_grade_prova;
DROP POLICY IF EXISTS "Atendentes podem ver todos os empréstimos" ON emprestimos_grade_prova;
DROP POLICY IF EXISTS "PCP pode ver todos os empréstimos" ON emprestimos_grade_prova;
DROP POLICY IF EXISTS "Vendedores podem ver seus próprios empréstimos" ON emprestimos_grade_prova;
DROP POLICY IF EXISTS "Admins podem inserir empréstimos" ON emprestimos_grade_prova;
DROP POLICY IF EXISTS "Atendentes podem inserir empréstimos" ON emprestimos_grade_prova;
DROP POLICY IF EXISTS "Vendedores podem inserir seus empréstimos" ON emprestimos_grade_prova;
DROP POLICY IF EXISTS "Admins podem atualizar empréstimos" ON emprestimos_grade_prova;
DROP POLICY IF EXISTS "Atendentes podem atualizar empréstimos" ON emprestimos_grade_prova;
DROP POLICY IF EXISTS "Vendedores podem atualizar seus empréstimos" ON emprestimos_grade_prova;
DROP POLICY IF EXISTS "Apenas admins podem excluir empréstimos" ON emprestimos_grade_prova;

-- Criar nova política SELECT unificada com permissões granulares
CREATE POLICY "Usuários podem ver empréstimos" ON emprestimos_grade_prova
FOR SELECT USING (
  vendedor_id = auth.uid()
  OR has_permission(auth.uid(), 'grades_prova.visualizar_todos')
  OR is_admin(auth.uid())
  OR is_atendente(auth.uid())
  OR is_pcp(auth.uid())
);

-- Criar nova política INSERT com permissões granulares
CREATE POLICY "Usuários podem inserir empréstimos" ON emprestimos_grade_prova
FOR INSERT WITH CHECK (
  has_permission(auth.uid(), 'grades_prova.criar')
  OR is_admin(auth.uid())
  OR is_atendente(auth.uid())
  OR (is_vendedor(auth.uid()) AND vendedor_id = auth.uid())
);

-- Criar nova política UPDATE com permissões granulares
CREATE POLICY "Usuários podem atualizar empréstimos" ON emprestimos_grade_prova
FOR UPDATE USING (
  vendedor_id = auth.uid()
  OR has_permission(auth.uid(), 'grades_prova.editar_todos')
  OR has_permission(auth.uid(), 'grades_prova.devolver')
  OR is_admin(auth.uid())
  OR is_atendente(auth.uid())
);

-- Manter política DELETE restrita para admins
CREATE POLICY "Admins podem excluir empréstimos" ON emprestimos_grade_prova
FOR DELETE USING (
  has_permission(auth.uid(), 'grades_prova.excluir')
  OR is_admin(auth.uid())
);

-- =====================================================
-- Atualizar RLS de emprestimo_grade_itens
-- =====================================================

DROP POLICY IF EXISTS "Usuários podem ver itens dos empréstimos que podem ver" ON emprestimo_grade_itens;
DROP POLICY IF EXISTS "Usuários podem inserir itens nos empréstimos que criaram" ON emprestimo_grade_itens;
DROP POLICY IF EXISTS "Usuários podem atualizar itens dos empréstimos que podem edit" ON emprestimo_grade_itens;
DROP POLICY IF EXISTS "Apenas admins podem excluir itens" ON emprestimo_grade_itens;
DROP POLICY IF EXISTS "Ver itens de empréstimos visíveis" ON emprestimo_grade_itens;
DROP POLICY IF EXISTS "Inserir itens em empréstimos autorizados" ON emprestimo_grade_itens;
DROP POLICY IF EXISTS "Atualizar itens de empréstimos autorizados" ON emprestimo_grade_itens;
DROP POLICY IF EXISTS "Excluir itens de empréstimos" ON emprestimo_grade_itens;

-- SELECT: herda visibilidade do empréstimo pai
CREATE POLICY "Ver itens de empréstimos visíveis" ON emprestimo_grade_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM emprestimos_grade_prova e 
    WHERE e.id = emprestimo_grade_itens.emprestimo_id 
    AND (
      e.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'grades_prova.visualizar_todos')
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- INSERT: herda permissão do empréstimo pai
CREATE POLICY "Inserir itens em empréstimos autorizados" ON emprestimo_grade_itens
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM emprestimos_grade_prova e 
    WHERE e.id = emprestimo_grade_itens.emprestimo_id 
    AND (
      e.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'grades_prova.criar')
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
    )
  )
);

-- UPDATE: para dar baixa em devoluções
CREATE POLICY "Atualizar itens de empréstimos autorizados" ON emprestimo_grade_itens
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM emprestimos_grade_prova e 
    WHERE e.id = emprestimo_grade_itens.emprestimo_id 
    AND (
      e.vendedor_id = auth.uid()
      OR has_permission(auth.uid(), 'grades_prova.editar_todos')
      OR has_permission(auth.uid(), 'grades_prova.devolver')
      OR is_admin(auth.uid())
      OR is_atendente(auth.uid())
    )
  )
);

-- DELETE: apenas admin
CREATE POLICY "Excluir itens de empréstimos" ON emprestimo_grade_itens
FOR DELETE USING (
  has_permission(auth.uid(), 'grades_prova.excluir')
  OR is_admin(auth.uid())
);