-- Drop existing update policy
DROP POLICY IF EXISTS "Participantes podem atualizar tarefas" ON public.tarefas;

-- Create a more permissive update policy that allows:
-- 1. Creators to update their tasks (including soft delete)
-- 2. Executors to update their tasks
-- 3. Admins to update any task
CREATE POLICY "Participantes podem atualizar tarefas"
ON public.tarefas
FOR UPDATE
USING (
  criador_id = auth.uid() OR 
  executor_id = auth.uid() OR 
  is_admin(auth.uid())
)
WITH CHECK (
  criador_id = auth.uid() OR 
  executor_id = auth.uid() OR 
  is_admin(auth.uid())
);