-- Garantir disponibilidade do tipo de estampa "Bordado" no comercial/PCP

UPDATE public.tipo_estampa
SET ativo = true,
    updated_at = now()
WHERE trim(nome_tipo_estampa) ILIKE 'bordado'
  AND ativo = false;

INSERT INTO public.tipo_estampa (nome_tipo_estampa, ativo)
SELECT 'Bordado', true
WHERE NOT EXISTS (
  SELECT 1
  FROM public.tipo_estampa
  WHERE trim(nome_tipo_estampa) ILIKE 'bordado'
);
