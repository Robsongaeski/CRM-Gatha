-- Impedir múltiplas instâncias conectadas com o mesmo número WhatsApp
-- Regra: o mesmo número pode existir em mais de uma instância, mas apenas uma pode ficar "connected".

-- Se já existirem duplicidades conectadas, mantém a mais recente e marca as demais como erro.
WITH normalized AS (
  SELECT
    id,
    regexp_replace(coalesce(numero_whatsapp, ''), '\D', '', 'g') AS phone_digits,
    row_number() OVER (
      PARTITION BY regexp_replace(coalesce(numero_whatsapp, ''), '\D', '', 'g')
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.whatsapp_instances
  WHERE status = 'connected'
    AND coalesce(numero_whatsapp, '') <> ''
),
to_mark_error AS (
  SELECT id
  FROM normalized
  WHERE phone_digits <> ''
    AND rn > 1
)
UPDATE public.whatsapp_instances wi
SET
  status = 'error',
  updated_at = now()
FROM to_mark_error e
WHERE wi.id = e.id;

DROP INDEX IF EXISTS public.whatsapp_instances_connected_phone_unique;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_instances_connected_phone_unique
ON public.whatsapp_instances ((regexp_replace(coalesce(numero_whatsapp, ''), '\D', '', 'g')))
WHERE status = 'connected'
  AND coalesce(numero_whatsapp, '') <> ''
  AND regexp_replace(coalesce(numero_whatsapp, ''), '\D', '', 'g') <> '';
