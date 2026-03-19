-- Adicionar campos de recorrência na tabela tarefas
ALTER TABLE public.tarefas 
ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tipo_recorrencia TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ativa_recorrencia BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS tarefa_origem_id UUID REFERENCES public.tarefas(id) ON DELETE SET NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.tarefas.recorrente IS 'Se a tarefa é uma template de recorrência';
COMMENT ON COLUMN public.tarefas.tipo_recorrencia IS 'Tipo de recorrência: diaria (dias úteis)';
COMMENT ON COLUMN public.tarefas.ativa_recorrencia IS 'Se a recorrência ainda está ativa';
COMMENT ON COLUMN public.tarefas.tarefa_origem_id IS 'Referência à tarefa original (para instâncias geradas)';