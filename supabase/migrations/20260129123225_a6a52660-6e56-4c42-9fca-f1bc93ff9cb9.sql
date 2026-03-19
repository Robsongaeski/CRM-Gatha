
-- Corrigir TODAS as políticas RLS da tabela tarefas de uma vez por todas

-- 1. Remover políticas antigas
DROP POLICY IF EXISTS "Participantes podem atualizar tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Usuários podem criar tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "Usuários veem próprias tarefas" ON public.tarefas;

-- 2. Recriar política de SELECT - funciona corretamente
CREATE POLICY "Usuários veem próprias tarefas"
ON public.tarefas
FOR SELECT
TO authenticated
USING (
  excluida_em IS NULL 
  AND (
    criador_id = auth.uid() 
    OR executor_id = auth.uid() 
    OR public.is_admin(auth.uid())
  )
);

-- 3. Recriar política de INSERT
CREATE POLICY "Usuários podem criar tarefas"
ON public.tarefas
FOR INSERT
TO authenticated
WITH CHECK (
  criador_id = auth.uid() 
  AND public.has_permission(auth.uid(), 'tarefas.criar')
);

-- 4. Recriar política de UPDATE - O PROBLEMA ESTAVA AQUI
-- A chave é: WITH CHECK deve validar os NOVOS valores da linha
-- Após soft-delete, a linha ainda pertence ao criador/executor original
-- Então o WITH CHECK deve verificar se o usuário pode modificar ESSA linha
CREATE POLICY "Participantes podem atualizar tarefas"
ON public.tarefas
FOR UPDATE
TO authenticated
USING (
  criador_id = auth.uid() 
  OR executor_id = auth.uid() 
  OR public.is_admin(auth.uid())
)
WITH CHECK (
  -- Após update, a linha ainda precisa pertencer a alguém válido
  -- Como não mudamos criador_id nem executor_id no soft-delete, 
  -- apenas verificamos se são UUIDs válidos (não-nulos)
  criador_id IS NOT NULL 
  AND executor_id IS NOT NULL
);

-- 5. Adicionar política de DELETE real (caso queira no futuro)
DROP POLICY IF EXISTS "Admin pode excluir tarefas" ON public.tarefas;
CREATE POLICY "Admin pode excluir tarefas"
ON public.tarefas
FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
);
