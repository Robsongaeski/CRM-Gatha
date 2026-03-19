-- Add foreign key constraint from pedidos to profiles for vendedor_id
ALTER TABLE public.pedidos
ADD CONSTRAINT pedidos_vendedor_id_fkey
FOREIGN KEY (vendedor_id)
REFERENCES public.profiles(id)
ON DELETE RESTRICT;