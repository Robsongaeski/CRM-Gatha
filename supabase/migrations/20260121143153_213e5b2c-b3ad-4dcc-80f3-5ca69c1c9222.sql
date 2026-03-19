-- Tabela para mapear códigos de produtos do e-commerce a categorias
-- Permite classificar produtos por prefixo do código externo

CREATE TABLE public.categoria_produto_ecommerce (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,              -- Nome da categoria (Ex: "Samba Canção", "Camiseta Sublimação")
  codigos TEXT[] NOT NULL DEFAULT '{}',    -- Array de prefixos (Ex: ["CSC", "CSC-", "C-"])
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,                 -- Ordem de prioridade na classificação
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comentários
COMMENT ON TABLE public.categoria_produto_ecommerce IS 'Mapeia prefixos de códigos de produtos do e-commerce às categorias';
COMMENT ON COLUMN public.categoria_produto_ecommerce.codigos IS 'Array de prefixos que identificam produtos desta categoria';

-- Índices
CREATE INDEX idx_categoria_produto_ecommerce_ativo ON public.categoria_produto_ecommerce(ativo);
CREATE INDEX idx_categoria_produto_ecommerce_ordem ON public.categoria_produto_ecommerce(ordem);

-- RLS
ALTER TABLE public.categoria_produto_ecommerce ENABLE ROW LEVEL SECURITY;

-- Políticas (visualização para todos autenticados, edição só admin)
CREATE POLICY "Categorias ecommerce visíveis para autenticados"
ON public.categoria_produto_ecommerce FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Categorias ecommerce gerenciadas por admin"
ON public.categoria_produto_ecommerce FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_categoria_produto_ecommerce_updated_at
BEFORE UPDATE ON public.categoria_produto_ecommerce
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Dados iniciais baseados nos exemplos do usuário
INSERT INTO public.categoria_produto_ecommerce (nome, codigos, ordem) VALUES
('Samba Canção', ARRAY['CSC', 'CSC-'], 1),
('Cueca Personalizada', ARRAY['C-', 'CUE', 'CUE-'], 2),
('Camiseta Sublimação', ARRAY['S-', 'SUB', 'SUB-'], 3),
('Camiseta Algodão', ARRAY['ALS', 'ALS-', 'ALG', 'ALG-'], 4),
('Regata', ARRAY['REG', 'REG-', 'R-'], 5),
('Bermuda/Shorts', ARRAY['BER', 'BER-', 'SHO', 'SHO-'], 6);