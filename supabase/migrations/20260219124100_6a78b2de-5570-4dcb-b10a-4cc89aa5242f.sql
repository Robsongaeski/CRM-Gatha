
-- Add tipo_atraso_manual column to orders for manual override
ALTER TABLE public.orders ADD COLUMN tipo_atraso_manual TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.tipo_atraso_manual IS 'Override manual do tipo de atraso: transportadora, envio, sem_contato, envio_bloqueado';
