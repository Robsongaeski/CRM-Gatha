-- Adicionar 'rascunho' ao enum status_pedido
ALTER TYPE status_pedido ADD VALUE IF NOT EXISTS 'rascunho' BEFORE 'em_producao';