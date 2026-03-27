-- Configuração de importação de histórico por instância de WhatsApp
ALTER TABLE public.whatsapp_instances
  ADD COLUMN IF NOT EXISTS import_history_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS import_history_days integer NOT NULL DEFAULT 7;

UPDATE public.whatsapp_instances
SET
  import_history_enabled = COALESCE(import_history_enabled, false),
  import_history_days = COALESCE(import_history_days, 7)
WHERE import_history_enabled IS NULL OR import_history_days IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_instances_import_history_days_check'
      AND conrelid = 'public.whatsapp_instances'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_instances
      ADD CONSTRAINT whatsapp_instances_import_history_days_check
      CHECK (import_history_days BETWEEN 1 AND 365);
  END IF;
END $$;

COMMENT ON COLUMN public.whatsapp_instances.import_history_enabled IS
  'Define se a instância pode importar mensagens históricas ao conectar/reconectar.';

COMMENT ON COLUMN public.whatsapp_instances.import_history_days IS
  'Limite de dias para importar histórico quando import_history_enabled = true.';
