-- Adicionar coluna 'codigo' na tabela produtos
ALTER TABLE public.produtos 
ADD COLUMN codigo VARCHAR(50);

-- Criar índice para otimizar buscas por código
CREATE INDEX idx_produtos_codigo ON public.produtos(codigo);

-- Comentário explicativo
COMMENT ON COLUMN public.produtos.codigo IS 'Código/SKU do produto para identificação';
