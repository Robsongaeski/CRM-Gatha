-- Drop and recreate the update policy with explicit function call
DROP POLICY IF EXISTS "Participantes podem atualizar tarefas" ON public.tarefas;

-- Create a simpler, more direct policy without function calls in WITH CHECK
-- The issue might be the WITH CHECK clause validation on UPDATE
CREATE POLICY "Participantes podem atualizar tarefas"
ON public.tarefas
FOR UPDATE
TO authenticated
USING (
  criador_id = auth.uid() OR 
  executor_id = auth.uid() OR 
  public.is_admin(auth.uid())
);