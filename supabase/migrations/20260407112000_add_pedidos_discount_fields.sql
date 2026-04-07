-- Campo de desconto geral para pedidos (pagamento a vista) e flag de aprovacao
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS desconto_percentual numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS desconto_aguardando_aprovacao boolean DEFAULT false;

UPDATE public.pedidos
SET
  desconto_percentual = COALESCE(desconto_percentual, 0),
  desconto_aguardando_aprovacao = COALESCE(desconto_aguardando_aprovacao, false)
WHERE
  desconto_percentual IS NULL
  OR desconto_aguardando_aprovacao IS NULL;

ALTER TABLE public.pedidos
ALTER COLUMN desconto_percentual SET DEFAULT 0,
ALTER COLUMN desconto_percentual SET NOT NULL,
ALTER COLUMN desconto_aguardando_aprovacao SET DEFAULT false,
ALTER COLUMN desconto_aguardando_aprovacao SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pedidos_desconto_percentual_check'
      AND conrelid = 'public.pedidos'::regclass
  ) THEN
    ALTER TABLE public.pedidos
    ADD CONSTRAINT pedidos_desconto_percentual_check
    CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100);
  END IF;
END $$;

-- Recalculo do valor_total considerando desconto geral do pedido
CREATE OR REPLACE FUNCTION public.recalcular_valor_total_pedido_por_id(p_pedido_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal numeric(12,2);
  v_desconto_percentual numeric(5,2);
BEGIN
  SELECT COALESCE(SUM(valor_total), 0)
    INTO v_subtotal
  FROM public.pedido_itens
  WHERE pedido_id = p_pedido_id;

  SELECT COALESCE(desconto_percentual, 0)
    INTO v_desconto_percentual
  FROM public.pedidos
  WHERE id = p_pedido_id;

  UPDATE public.pedidos
  SET valor_total = v_subtotal - (v_subtotal * (v_desconto_percentual / 100))
  WHERE id = p_pedido_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_valor_total_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalcular_valor_total_pedido_por_id(COALESCE(NEW.pedido_id, OLD.pedido_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.recalcular_valor_total_pedido_desconto_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.desconto_percentual IS DISTINCT FROM OLD.desconto_percentual THEN
    PERFORM public.recalcular_valor_total_pedido_por_id(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_recalcular_valor_total_pedido_desconto ON public.pedidos;
CREATE TRIGGER trigger_recalcular_valor_total_pedido_desconto
AFTER UPDATE OF desconto_percentual ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_valor_total_pedido_desconto_trigger();
