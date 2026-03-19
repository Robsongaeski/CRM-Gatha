-- Corrigir search_path nas funções usando CREATE OR REPLACE
CREATE OR REPLACE FUNCTION public.calcular_valor_total_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.valor_total = NEW.quantidade * NEW.valor_unitario;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_valor_restante()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.valor_restante = NEW.valor_total - NEW.valor_entrada;
  RETURN NEW;
END;
$$;