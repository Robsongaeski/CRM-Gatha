-- Remover constraint antiga
ALTER TABLE public.motivos_troca_devolucao DROP CONSTRAINT IF EXISTS motivos_troca_devolucao_tipo_check;

-- Adicionar nova constraint que aceita os novos valores
ALTER TABLE public.motivos_troca_devolucao 
ADD CONSTRAINT motivos_troca_devolucao_tipo_check 
CHECK (tipo IS NOT NULL);