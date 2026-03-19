-- Corrigir funções sem search_path definido
CREATE OR REPLACE FUNCTION public.atualizar_valor_total_proposta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE propostas
  SET valor_total = (
    SELECT COALESCE(SUM(valor_total), 0)
    FROM proposta_itens
    WHERE proposta_id = COALESCE(NEW.proposta_id, OLD.proposta_id)
  )
  WHERE id = COALESCE(NEW.proposta_id, OLD.proposta_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.validar_motivo_perda()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'perdida' AND (NEW.motivo_perda IS NULL OR NEW.motivo_perda = '') THEN
    RAISE EXCEPTION 'Motivo da perda é obrigatório quando status é "perdida"';
  END IF;
  
  IF NEW.status != 'perdida' THEN
    NEW.motivo_perda = NULL;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_valor_total_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.pedidos
  SET 
    valor_total = (
      SELECT COALESCE(SUM(valor_total), 0)
      FROM public.pedido_itens
      WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
    )
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_valor_total_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.valor_total = NEW.quantidade * NEW.valor_unitario;
  RETURN NEW;
END;
$function$;