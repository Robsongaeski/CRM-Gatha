-- Criar tabela de pagamentos
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'parcial', 'quitacao', 'estorno')),
  valor NUMERIC NOT NULL CHECK (valor > 0),
  forma_pagamento forma_pagamento NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  comprovante_url TEXT,
  observacao TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'aprovado', 'rejeitado')),
  aprovado_por UUID,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  motivo_rejeicao TEXT,
  estornado BOOLEAN DEFAULT FALSE,
  estornado_por UUID,
  data_estorno TIMESTAMP WITH TIME ZONE,
  motivo_estorno TEXT,
  criado_por UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_pagamentos_pedido_id ON public.pagamentos(pedido_id);
CREATE INDEX idx_pagamentos_status ON public.pagamentos(status);
CREATE INDEX idx_pagamentos_criado_por ON public.pagamentos(criado_por);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_pagamentos_updated_at
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pagamentos
-- Vendedores podem ver pagamentos dos seus pedidos
CREATE POLICY "Vendedores podem ver pagamentos dos seus pedidos"
  ON public.pagamentos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pedidos
      WHERE pedidos.id = pagamentos.pedido_id
      AND (pedidos.vendedor_id = auth.uid() OR is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'))
    )
  );

-- Vendedores podem criar pagamentos nos seus pedidos
CREATE POLICY "Vendedores podem criar pagamentos"
  ON public.pagamentos
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.pedidos
      WHERE pedidos.id = pagamentos.pedido_id
      AND pedidos.vendedor_id = auth.uid()
    )
  );

-- Apenas financeiro e admin podem atualizar pagamentos (aprovar/rejeitar/estornar)
CREATE POLICY "Financeiro e admin podem atualizar pagamentos"
  ON public.pagamentos
  FOR UPDATE
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'));

-- Apenas admin pode deletar pagamentos
CREATE POLICY "Admin pode deletar pagamentos"
  ON public.pagamentos
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Criar bucket de storage para comprovantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes-pagamento', 'comprovantes-pagamento', false);

-- Políticas de storage para comprovantes
-- Vendedores podem fazer upload de comprovantes nos seus pedidos
CREATE POLICY "Vendedores podem fazer upload de comprovantes"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'comprovantes-pagamento'
    AND auth.uid() IS NOT NULL
  );

-- Financeiro e admin podem ver todos os comprovantes
CREATE POLICY "Financeiro e admin podem ver comprovantes"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'comprovantes-pagamento'
    AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'financeiro'))
  );

-- Vendedores podem ver comprovantes dos seus pedidos
CREATE POLICY "Vendedores podem ver seus comprovantes"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'comprovantes-pagamento'
    AND auth.uid() IS NOT NULL
  );

-- Função para recalcular status de pagamento do pedido
CREATE OR REPLACE FUNCTION public.recalcular_status_pagamento_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido_id UUID;
  v_valor_total NUMERIC;
  v_valor_pago NUMERIC;
BEGIN
  -- Determinar o pedido_id
  v_pedido_id := COALESCE(NEW.pedido_id, OLD.pedido_id);
  
  -- Buscar valor total do pedido
  SELECT valor_total INTO v_valor_total
  FROM public.pedidos
  WHERE id = v_pedido_id;
  
  -- Calcular valor pago (soma dos pagamentos aprovados não estornados)
  SELECT COALESCE(SUM(valor), 0) INTO v_valor_pago
  FROM public.pagamentos
  WHERE pedido_id = v_pedido_id
    AND status = 'aprovado'
    AND estornado = FALSE;
  
  -- Atualizar status de pagamento do pedido
  UPDATE public.pedidos
  SET status_pagamento = CASE
    WHEN v_valor_pago = 0 THEN 'aguardando'::status_pagamento
    WHEN v_valor_pago >= v_valor_total THEN 'quitado'::status_pagamento
    ELSE 'parcial'::status_pagamento
  END
  WHERE id = v_pedido_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger para recalcular status de pagamento
CREATE TRIGGER recalcular_status_pagamento_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.recalcular_status_pagamento_pedido();

-- Remover campos antigos de pagamento da tabela pedidos
ALTER TABLE public.pedidos DROP COLUMN IF EXISTS valor_entrada;
ALTER TABLE public.pedidos DROP COLUMN IF EXISTS forma_pagamento_entrada;
ALTER TABLE public.pedidos DROP COLUMN IF EXISTS valor_restante;
ALTER TABLE public.pedidos DROP COLUMN IF EXISTS forma_pagamento_restante;