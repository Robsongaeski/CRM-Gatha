-- Adicionar campo caminho_arquivos à tabela pedidos
ALTER TABLE public.pedidos 
ADD COLUMN caminho_arquivos TEXT;

-- Adicionar campo tipo_estampa_id à tabela pedido_itens
ALTER TABLE public.pedido_itens 
ADD COLUMN tipo_estampa_id UUID REFERENCES public.tipo_estampa(id);

-- Criar tabela para detalhes dos itens do pedido
CREATE TABLE public.pedido_item_detalhes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_item_id UUID NOT NULL REFERENCES public.pedido_itens(id) ON DELETE CASCADE,
  tipo_detalhe VARCHAR(100) NOT NULL,
  valor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.pedido_item_detalhes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pedido_item_detalhes
CREATE POLICY "Ver detalhes dos itens de pedidos visíveis"
  ON public.pedido_item_detalhes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pedido_itens pi
      JOIN public.pedidos p ON pi.pedido_id = p.id
      WHERE pi.id = pedido_item_detalhes.pedido_item_id
        AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()) OR is_atendente(auth.uid()))
    )
  );

CREATE POLICY "Inserir detalhes em itens de pedidos próprios"
  ON public.pedido_item_detalhes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.pedido_itens pi
      JOIN public.pedidos p ON pi.pedido_id = p.id
      WHERE pi.id = pedido_item_detalhes.pedido_item_id
        AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Atualizar detalhes de itens de pedidos próprios"
  ON public.pedido_item_detalhes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.pedido_itens pi
      JOIN public.pedidos p ON pi.pedido_id = p.id
      WHERE pi.id = pedido_item_detalhes.pedido_item_id
        AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Deletar detalhes de itens de pedidos próprios"
  ON public.pedido_item_detalhes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.pedido_itens pi
      JOIN public.pedidos p ON pi.pedido_id = p.id
      WHERE pi.id = pedido_item_detalhes.pedido_item_id
        AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

-- Índices para performance
CREATE INDEX idx_pedido_item_detalhes_pedido_item_id ON public.pedido_item_detalhes(pedido_item_id);
CREATE INDEX idx_pedido_itens_tipo_estampa_id ON public.pedido_itens(tipo_estampa_id);