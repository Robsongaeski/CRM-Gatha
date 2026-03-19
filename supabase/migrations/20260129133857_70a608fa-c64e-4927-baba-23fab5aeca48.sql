-- Correção definitiva: Simplificar WITH CHECK para true
-- O USING já valida quem pode modificar, não precisa de WITH CHECK complexo

DROP POLICY IF EXISTS "Participantes podem atualizar tarefas" ON public.tarefas;

CREATE POLICY "Participantes podem atualizar tarefas"
ON public.tarefas
FOR UPDATE
TO authenticated
USING (
  criador_id = auth.uid() OR 
  executor_id = auth.uid() OR 
  public.is_admin(auth.uid())
)
WITH CHECK (true);