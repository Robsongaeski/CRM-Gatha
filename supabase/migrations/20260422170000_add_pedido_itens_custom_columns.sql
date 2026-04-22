-- Adicionar colunas para suporte a itens manuais (Produto XX)
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS nome_customizado TEXT;
ALTER TABLE pedido_itens ADD COLUMN IF NOT EXISTS valor_base_customizado NUMERIC;
