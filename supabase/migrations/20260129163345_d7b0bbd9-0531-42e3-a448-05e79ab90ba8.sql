-- =====================================================
-- SOLUÇÃO ALTERNATIVA: INATIVAR EM VEZ DE EXCLUIR
-- =====================================================

-- 1. Adicionar coluna 'ativo' na tabela tarefas
ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

-- 2. Criar índice para filtrar tarefas ativas
CREATE INDEX IF NOT EXISTS idx_tarefas_ativo ON public.tarefas(ativo) WHERE ativo = true;

-- 3. Atualizar política SELECT para filtrar apenas ativas (ou mostrar inativas para admin)
DROP POLICY IF EXISTS "tarefas_select_policy" ON public.tarefas;
CREATE POLICY "tarefas_select_policy" ON public.tarefas
FOR SELECT TO authenticated
USING (
  -- Usuário vê suas tarefas ativas OU admin vê todas
  (
    (criador_id = auth.uid() OR executor_id = auth.uid())
    AND ativo = true
  )
  OR is_admin(auth.uid())
);

-- 4. Política UPDATE permanece simples
DROP POLICY IF EXISTS "tarefas_update_policy" ON public.tarefas;
CREATE POLICY "tarefas_update_policy" ON public.tarefas
FOR UPDATE TO authenticated
USING (
  criador_id = auth.uid() 
  OR executor_id = auth.uid() 
  OR is_admin(auth.uid())
)
WITH CHECK (true);