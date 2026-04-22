-- Adicionar colunas customizadas para itens manuais (XX) na tabela proposta_itens
ALTER TABLE proposta_itens ADD COLUMN IF NOT EXISTS nome_customizado TEXT;
ALTER TABLE proposta_itens ADD COLUMN IF NOT EXISTS valor_base_customizado NUMERIC;

-- Comentários para documentação
COMMENT ON COLUMN proposta_itens.nome_customizado IS 'Nome manual do produto quando usado produto genérico XX';
COMMENT ON COLUMN proposta_itens.valor_base_customizado IS 'Valor de tabela manual quando usado produto genérico XX';
