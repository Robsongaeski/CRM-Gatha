ALTER TABLE public.produtos
ADD COLUMN IF NOT EXISTS quantidade_minima_venda integer;

ALTER TABLE public.produtos
DROP CONSTRAINT IF EXISTS produtos_quantidade_minima_venda_check;

ALTER TABLE public.produtos
ADD CONSTRAINT produtos_quantidade_minima_venda_check
CHECK (
  quantidade_minima_venda IS NULL
  OR quantidade_minima_venda >= 1
);

COMMENT ON COLUMN public.produtos.quantidade_minima_venda IS
'Quantidade minima recomendada para venda/proposta. Abaixo desse valor o sistema apenas exibe aviso ao vendedor.';
