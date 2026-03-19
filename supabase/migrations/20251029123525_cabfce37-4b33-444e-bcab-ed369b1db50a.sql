-- Criar enums para pedidos
CREATE TYPE public.status_pedido AS ENUM ('em_producao', 'pronto', 'entregue', 'cancelado');
CREATE TYPE public.status_pagamento AS ENUM ('aguardando', 'parcial', 'quitado');
CREATE TYPE public.forma_pagamento AS ENUM ('pix', 'cartao', 'boleto', 'dinheiro');

-- Criar tabela de pedidos
CREATE TABLE public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_pedido TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  vendedor_id UUID NOT NULL,
  data_entrega TIMESTAMP WITH TIME ZONE,
  observacao TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_entrada NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento_entrada public.forma_pagamento,
  valor_restante NUMERIC NOT NULL DEFAULT 0,
  forma_pagamento_restante public.forma_pagamento,
  status_pagamento public.status_pagamento NOT NULL DEFAULT 'aguardando',
  status public.status_pedido NOT NULL DEFAULT 'em_producao',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de itens do pedido
CREATE TABLE public.pedido_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario NUMERIC NOT NULL CHECK (valor_unitario >= 0),
  valor_total NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger para calcular valor_total do item
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

CREATE TRIGGER trigger_calcular_valor_total_item
BEFORE INSERT OR UPDATE ON public.pedido_itens
FOR EACH ROW
EXECUTE FUNCTION public.calcular_valor_total_item();

-- Trigger para atualizar valor_total do pedido
CREATE OR REPLACE FUNCTION public.atualizar_valor_total_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pedidos
  SET 
    valor_total = (
      SELECT COALESCE(SUM(valor_total), 0)
      FROM public.pedido_itens
      WHERE pedido_id = COALESCE(NEW.pedido_id, OLD.pedido_id)
    ),
    valor_restante = valor_total - valor_entrada
  WHERE id = COALESCE(NEW.pedido_id, OLD.pedido_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_atualizar_valor_total_pedido
AFTER INSERT OR UPDATE OR DELETE ON public.pedido_itens
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_valor_total_pedido();

-- Trigger para calcular valor_restante quando valor_entrada muda
CREATE OR REPLACE FUNCTION public.atualizar_valor_restante()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.valor_restante = NEW.valor_total - NEW.valor_entrada;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_atualizar_valor_restante
BEFORE INSERT OR UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.atualizar_valor_restante();

-- Trigger para updated_at
CREATE TRIGGER trigger_pedidos_updated_at
BEFORE UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

-- RLS Policies para pedidos
CREATE POLICY "Vendedores veem seus pedidos"
ON public.pedidos
FOR SELECT
USING (vendedor_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Vendedores podem criar pedidos"
ON public.pedidos
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND vendedor_id = auth.uid());

CREATE POLICY "Vendedores podem atualizar seus pedidos"
ON public.pedidos
FOR UPDATE
USING (vendedor_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem deletar pedidos"
ON public.pedidos
FOR DELETE
USING (is_admin(auth.uid()));

-- RLS Policies para pedido_itens
CREATE POLICY "Ver itens de pedidos visíveis"
ON public.pedido_itens
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.pedidos
  WHERE pedidos.id = pedido_itens.pedido_id
  AND (pedidos.vendedor_id = auth.uid() OR is_admin(auth.uid()))
));

CREATE POLICY "Inserir itens em pedidos próprios"
ON public.pedido_itens
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = pedido_itens.pedido_id
    AND (pedidos.vendedor_id = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Atualizar itens de pedidos próprios"
ON public.pedido_itens
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.pedidos
  WHERE pedidos.id = pedido_itens.pedido_id
  AND (pedidos.vendedor_id = auth.uid() OR is_admin(auth.uid()))
));

CREATE POLICY "Deletar itens de pedidos próprios"
ON public.pedido_itens
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.pedidos
  WHERE pedidos.id = pedido_itens.pedido_id
  AND (pedidos.vendedor_id = auth.uid() OR is_admin(auth.uid()))
));