-- Corrige regra de etapa inicial dos pedidos para priorizar etapa de producao (Entrada)
-- e nunca cair em etapa de aprovacao de arte por ordem.

CREATE OR REPLACE FUNCTION public.set_etapa_inicial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  etapa_entrada_id UUID;
  etapa_atual_tipo TEXT;
BEGIN
  -- 1) Priorizar etapa marcada como inicial
  SELECT id INTO etapa_entrada_id
  FROM public.etapa_producao
  WHERE ativa = true
    AND tipo_etapa = 'inicial'
  ORDER BY ordem ASC
  LIMIT 1;

  -- 2) Fallback: primeira etapa ativa que nao seja de aprovacao de arte
  IF etapa_entrada_id IS NULL THEN
    SELECT id INTO etapa_entrada_id
    FROM public.etapa_producao
    WHERE ativa = true
      AND COALESCE(tipo_etapa, 'intermediaria') <> 'aprovacao_arte'
    ORDER BY ordem ASC
    LIMIT 1;
  END IF;

  IF NEW.status = 'em_producao' AND etapa_entrada_id IS NOT NULL THEN
    IF NEW.etapa_producao_id IS NULL THEN
      NEW.etapa_producao_id := etapa_entrada_id;
    ELSE
      SELECT tipo_etapa INTO etapa_atual_tipo
      FROM public.etapa_producao
      WHERE id = NEW.etapa_producao_id;

      -- Se apontar para etapa de aprovacao de arte, normaliza para etapa inicial de producao
      IF etapa_atual_tipo = 'aprovacao_arte' THEN
        NEW.etapa_producao_id := etapa_entrada_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Corrigir pedidos ja impactados (em producao presos em etapa de aprovacao)
WITH etapa_inicial AS (
  SELECT id
  FROM public.etapa_producao
  WHERE ativa = true
    AND tipo_etapa = 'inicial'
  ORDER BY ordem ASC
  LIMIT 1
), etapa_fallback AS (
  SELECT id
  FROM public.etapa_producao
  WHERE ativa = true
    AND COALESCE(tipo_etapa, 'intermediaria') <> 'aprovacao_arte'
  ORDER BY ordem ASC
  LIMIT 1
), etapa_destino AS (
  SELECT COALESCE((SELECT id FROM etapa_inicial), (SELECT id FROM etapa_fallback)) AS id
)
UPDATE public.pedidos p
SET etapa_producao_id = ed.id
FROM etapa_destino ed
JOIN public.etapa_producao ep ON ep.id = p.etapa_producao_id
WHERE p.status = 'em_producao'
  AND ed.id IS NOT NULL
  AND ep.tipo_etapa = 'aprovacao_arte';
