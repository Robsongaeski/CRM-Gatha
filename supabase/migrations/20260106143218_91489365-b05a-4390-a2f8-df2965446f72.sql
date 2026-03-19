-- Adicionar coluna motivo_id na tabela problemas_pedido
ALTER TABLE public.problemas_pedido
ADD COLUMN IF NOT EXISTS motivo_id UUID REFERENCES public.motivos_troca_devolucao(id);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_problemas_pedido_motivo_id ON public.problemas_pedido(motivo_id);