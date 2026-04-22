ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS entrega_obrigatoria boolean NOT NULL DEFAULT false;
