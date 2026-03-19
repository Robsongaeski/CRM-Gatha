-- Criar enum para status de envio
CREATE TYPE status_envio AS ENUM ('aguardando_despacho', 'despachado', 'reprocessado', 'cancelado');

-- Adicionar campos na tabela orders para controle de envios
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS chave_nfe TEXT,
ADD COLUMN IF NOT EXISTS status_envio status_envio DEFAULT 'aguardando_despacho',
ADD COLUMN IF NOT EXISTS data_despacho TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS despachado_por UUID REFERENCES auth.users(id);

-- Criar índice para busca por chave NF-e
CREATE INDEX IF NOT EXISTS idx_orders_chave_nfe ON public.orders(chave_nfe);
CREATE INDEX IF NOT EXISTS idx_orders_status_envio ON public.orders(status_envio);

-- Criar tabela de log de despachos
CREATE TABLE public.envios_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id),
  acao TEXT NOT NULL, -- 'despacho', 'reprocessamento'
  status_anterior status_envio,
  status_novo status_envio NOT NULL,
  chave_nfe_lida TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para log
CREATE INDEX IF NOT EXISTS idx_envios_log_order_id ON public.envios_log(order_id);
CREATE INDEX IF NOT EXISTS idx_envios_log_created_at ON public.envios_log(created_at);

-- RLS para orders (ajustar para admins)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver todos os pedidos" ON public.orders
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar pedidos" ON public.orders
FOR UPDATE USING (public.is_admin(auth.uid()));

-- RLS para envios_log
ALTER TABLE public.envios_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver logs de envio" ON public.envios_log
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins podem inserir logs de envio" ON public.envios_log
FOR INSERT WITH CHECK (public.is_admin(auth.uid()));