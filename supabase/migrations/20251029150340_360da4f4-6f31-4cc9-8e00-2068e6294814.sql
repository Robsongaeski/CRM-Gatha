-- Adicionar coluna numero_pedido
ALTER TABLE pedidos 
ADD COLUMN numero_pedido INTEGER;

-- Criar sequência começando em 1000
CREATE SEQUENCE pedidos_numero_seq START WITH 1000;

-- Atualizar pedidos existentes com números sequenciais começando em 1000
WITH numbered_pedidos AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) + 999 AS numero
  FROM pedidos
  WHERE numero_pedido IS NULL
)
UPDATE pedidos
SET numero_pedido = numbered_pedidos.numero
FROM numbered_pedidos
WHERE pedidos.id = numbered_pedidos.id;

-- Resetar a sequência para o próximo valor correto
SELECT setval('pedidos_numero_seq', 
  (SELECT COALESCE(MAX(numero_pedido), 999) FROM pedidos) + 1
);

-- Tornar a coluna NOT NULL e definir valor padrão
ALTER TABLE pedidos 
ALTER COLUMN numero_pedido SET NOT NULL,
ALTER COLUMN numero_pedido SET DEFAULT nextval('pedidos_numero_seq');

-- Criar índice para performance
CREATE INDEX idx_pedidos_numero ON pedidos(numero_pedido);

-- Adicionar constraint de unicidade
ALTER TABLE pedidos 
ADD CONSTRAINT pedidos_numero_pedido_unique UNIQUE (numero_pedido);