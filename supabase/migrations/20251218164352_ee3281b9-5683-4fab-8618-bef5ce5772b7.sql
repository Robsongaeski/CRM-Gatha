-- Add customer fields to problemas_pedido table
ALTER TABLE public.problemas_pedido 
ADD COLUMN IF NOT EXISTS nome_cliente character varying,
ADD COLUMN IF NOT EXISTS email_cliente character varying,
ADD COLUMN IF NOT EXISTS telefone_cliente character varying,
ADD COLUMN IF NOT EXISTS endereco_cliente text,
ADD COLUMN IF NOT EXISTS valor_pedido numeric;