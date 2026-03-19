-- Limpar todas as políticas existentes
DROP POLICY IF EXISTS "Admin pode excluir tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Participantes podem atualizar tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Usuários podem criar tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Usuários veem próprias tarefas" ON public.tarefas;

-- SELECT: Permitir ver tarefas não excluídas (criador, executor ou admin)
CREATE POLICY "Usuários veem próprias tarefas"
ON public.tarefas FOR SELECT TO authenticated
USING (
  excluida_em IS NULL 
  AND (criador_id = auth.uid() OR executor_id = auth.uid() OR public.is_admin(auth.uid()))
);

-- INSERT: Permitir criar tarefas com permissão
CREATE POLICY "Usuários podem criar tarefas"
ON public.tarefas FOR INSERT TO authenticated
WITH CHECK (criador_id = auth.uid() AND public.has_permission(auth.uid(), 'tarefas.criar'));

-- UPDATE: Permitir atualizar (inclui soft delete) para participantes
-- Criadores podem excluir suas próprias tarefas via soft delete
CREATE POLICY "Participantes podem atualizar tarefas"
ON public.tarefas FOR UPDATE TO authenticated
USING (criador_id = auth.uid() OR executor_id = auth.uid() OR public.is_admin(auth.uid()))
WITH CHECK (true);

-- DELETE físico: Apenas admin
CREATE POLICY "Admin pode excluir tarefas"
ON public.tarefas FOR DELETE TO authenticated
USING (public.is_admin(auth.uid()));