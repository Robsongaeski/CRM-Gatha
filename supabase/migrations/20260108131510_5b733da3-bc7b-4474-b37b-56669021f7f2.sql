-- Adicionar campo pix_key para armazenar a chave PIX do pedido
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pix_key TEXT;