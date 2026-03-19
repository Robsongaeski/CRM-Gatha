-- Não há necessidade de política DELETE pois usamos soft delete (excluida_em)
-- A política UPDATE existente já permite participantes e admins atualizarem
-- Apenas vamos garantir que está correto

-- Dropar e recriar a política de UPDATE para incluir explicitamente o soft delete
DROP POLICY IF EXISTS "Participantes podem atualizar tarefas" ON public.tarefas;

CREATE POLICY "Participantes podem atualizar tarefas"
ON public.tarefas
FOR UPDATE
USING (
  (excluida_em IS NULL OR excluida_em IS NOT NULL) -- Permite atualizar mesmo tarefas excluídas (para admins reverterem)
  AND (
    criador_id = auth.uid() 
    OR executor_id = auth.uid() 
    OR is_admin(auth.uid())
  )
)
WITH CHECK (
  criador_id = auth.uid() 
  OR executor_id = auth.uid() 
  OR is_admin(auth.uid())
);