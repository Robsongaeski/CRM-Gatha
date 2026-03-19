-- Alterar tabela expedicao_registro para suportar lançamentos vinculados ou avulsos

-- 1. Tornar pedido_id opcional (nullable)
ALTER TABLE public.expedicao_registro 
ALTER COLUMN pedido_id DROP NOT NULL;

-- 2. Adicionar novos campos baseados na interface
ALTER TABLE public.expedicao_registro
ADD COLUMN descricao TEXT,
ADD COLUMN data_lancamento DATE DEFAULT CURRENT_DATE,
ADD COLUMN data_pedidos_enviados DATE,
ADD COLUMN data_pedido_mais_atrasado DATE,
ADD COLUMN motivo_atraso VARCHAR,
ADD COLUMN quantidade_pedidos_enviados INTEGER DEFAULT 0,
ADD COLUMN quantidade_pedidos_pendentes INTEGER DEFAULT 0,
ADD COLUMN descricao_motivo TEXT,
ADD COLUMN tipo_lancamento VARCHAR DEFAULT 'pedido' CHECK (tipo_lancamento IN ('pedido', 'avulso'));

-- 3. Adicionar comentários para documentação
COMMENT ON COLUMN public.expedicao_registro.tipo_lancamento IS 'Tipo de lançamento: pedido (vinculado a pedido) ou avulso (registro manual)';
COMMENT ON COLUMN public.expedicao_registro.descricao IS 'Descrição geral da expedição';
COMMENT ON COLUMN public.expedicao_registro.data_lancamento IS 'Data em que o lançamento foi realizado';