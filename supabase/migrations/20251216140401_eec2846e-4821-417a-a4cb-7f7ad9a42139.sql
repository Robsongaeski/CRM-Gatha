
-- Corrigir search_path da função calcular_dias_uteis
CREATE OR REPLACE FUNCTION public.calcular_dias_uteis(data_inicio TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dias_uteis INTEGER := 0;
  data_atual DATE := data_inicio::DATE;
  data_fim DATE := CURRENT_DATE;
BEGIN
  WHILE data_atual < data_fim LOOP
    IF EXTRACT(DOW FROM data_atual) NOT IN (0, 6) THEN
      dias_uteis := dias_uteis + 1;
    END IF;
    data_atual := data_atual + INTERVAL '1 day';
  END LOOP;
  RETURN dias_uteis * 24;
END;
$$;
