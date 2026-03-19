
-- Add observation column for delayed orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS observacao_atraso TEXT;
