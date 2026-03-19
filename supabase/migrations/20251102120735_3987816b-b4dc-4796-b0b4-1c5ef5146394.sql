-- Criar tabela de faixas de preço por produto
CREATE TABLE IF NOT EXISTS public.faixas_preco_produto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade_minima INTEGER NOT NULL,
  quantidade_maxima INTEGER,
  preco_minimo NUMERIC NOT NULL CHECK (preco_minimo >= 0),
  preco_maximo NUMERIC NOT NULL CHECK (preco_maximo >= preco_minimo),
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela de solicitações de aprovação de pedidos
CREATE TABLE IF NOT EXISTS public.pedidos_aprovacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  motivo_solicitacao TEXT NOT NULL,
  observacao_vendedor TEXT,
  observacao_admin TEXT,
  solicitado_por UUID NOT NULL,
  analisado_por UUID,
  data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_analise TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar coluna requer_aprovacao_preco na tabela pedidos
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS requer_aprovacao_preco BOOLEAN DEFAULT FALSE;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_faixas_preco_produto_id ON public.faixas_preco_produto(produto_id);
CREATE INDEX IF NOT EXISTS idx_faixas_preco_ordem ON public.faixas_preco_produto(produto_id, ordem);
CREATE INDEX IF NOT EXISTS idx_pedidos_aprovacao_pedido ON public.pedidos_aprovacao(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_aprovacao_status ON public.pedidos_aprovacao(status);

-- Trigger para atualizar updated_at em faixas_preco_produto
CREATE TRIGGER update_faixas_preco_produto_updated_at
  BEFORE UPDATE ON public.faixas_preco_produto
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para atualizar updated_at em pedidos_aprovacao
CREATE TRIGGER update_pedidos_aprovacao_updated_at
  BEFORE UPDATE ON public.pedidos_aprovacao
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para buscar a faixa de preço adequada
CREATE OR REPLACE FUNCTION public.buscar_faixa_preco(
  p_produto_id UUID,
  p_quantidade INTEGER
)
RETURNS TABLE (
  id UUID,
  preco_minimo NUMERIC,
  preco_maximo NUMERIC,
  quantidade_minima INTEGER,
  quantidade_maxima INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    preco_minimo,
    preco_maximo,
    quantidade_minima,
    quantidade_maxima
  FROM faixas_preco_produto
  WHERE produto_id = p_produto_id
    AND ativo = TRUE
    AND quantidade_minima <= p_quantidade
    AND (quantidade_maxima IS NULL OR quantidade_maxima >= p_quantidade)
  ORDER BY ordem DESC
  LIMIT 1;
$$;

-- RLS Policies para faixas_preco_produto
ALTER TABLE public.faixas_preco_produto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados podem ver faixas de preço"
  ON public.faixas_preco_produto
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem criar faixas de preço"
  ON public.faixas_preco_produto
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem atualizar faixas de preço"
  ON public.faixas_preco_produto
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem deletar faixas de preço"
  ON public.faixas_preco_produto
  FOR DELETE
  USING (is_admin(auth.uid()));

-- RLS Policies para pedidos_aprovacao
ALTER TABLE public.pedidos_aprovacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem solicitações dos seus pedidos"
  ON public.pedidos_aprovacao
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedidos_aprovacao.pedido_id
        AND (pedidos.vendedor_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Vendedores podem criar solicitações"
  ON public.pedidos_aprovacao
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedidos_aprovacao.pedido_id
        AND pedidos.vendedor_id = auth.uid()
    )
  );

CREATE POLICY "Apenas admins podem atualizar solicitações"
  ON public.pedidos_aprovacao
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem deletar solicitações"
  ON public.pedidos_aprovacao
  FOR DELETE
  USING (is_admin(auth.uid()));