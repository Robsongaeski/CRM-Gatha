-- Inserir produtos
INSERT INTO produtos (nome, tipo, valor_base) VALUES
('Camiseta Algodão', 'Vestuário', 89.90),
('Camiseta Dryfit', 'Vestuário', 99.90),
('Camiseta Dryfit Furadinho', 'Vestuário', 99.90),
('Camiseta Oversize', 'Vestuário', 119.90),
('Conjunto Esportivo (Camiseta - Shorts)', 'Vestuário', 164.90),
('Moletom Capuz', 'Vestuário', 149.90),
('Moletom Ziper', 'Vestuário', 154.90),
('Moletom Basico', 'Vestuário', 144.90),
('Corta vento Estampa Localizada', 'Vestuário', 199.00),
('Corta vento Full Print', 'Vestuário', 280.00),
('Shorts Dry Esportivo', 'Vestuário', 99.00),
('Shorts Praia Elastic', 'Vestuário', 119.90),
('Vestido de Malha', 'Vestuário', 139.90),
('Vestido de Moletom', 'Vestuário', 149.90),
('Caneca', 'Acessórios', 34.90),
('Gola Polo', 'Vestuário', 149.90);

-- Inserir faixas de preço para Camiseta Algodão
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 89.90, 89.90, 1 FROM produtos WHERE nome = 'Camiseta Algodão'
UNION ALL
SELECT id, 5, 10, 65.70, 79.90, 2 FROM produtos WHERE nome = 'Camiseta Algodão'
UNION ALL
SELECT id, 11, 50, 54.90, 64.90, 3 FROM produtos WHERE nome = 'Camiseta Algodão'
UNION ALL
SELECT id, 51, NULL, 46.30, 54.90, 4 FROM produtos WHERE nome = 'Camiseta Algodão';

-- Inserir faixas de preço para Camiseta Dryfit Furadinho
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 99.90, 99.90, 1 FROM produtos WHERE nome = 'Camiseta Dryfit Furadinho'
UNION ALL
SELECT id, 5, 10, 70.70, 84.90, 2 FROM produtos WHERE nome = 'Camiseta Dryfit Furadinho'
UNION ALL
SELECT id, 11, 50, 59.90, 69.90, 3 FROM produtos WHERE nome = 'Camiseta Dryfit Furadinho'
UNION ALL
SELECT id, 51, NULL, 51.30, 59.90, 4 FROM produtos WHERE nome = 'Camiseta Dryfit Furadinho';

-- Inserir faixas de preço para Camiseta Oversize
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 119.90, 119.90, 1 FROM produtos WHERE nome = 'Camiseta Oversize'
UNION ALL
SELECT id, 5, 10, 99.90, 119.90, 2 FROM produtos WHERE nome = 'Camiseta Oversize'
UNION ALL
SELECT id, 11, 50, 89.90, 99.90, 3 FROM produtos WHERE nome = 'Camiseta Oversize'
UNION ALL
SELECT id, 51, NULL, 69.90, 79.90, 4 FROM produtos WHERE nome = 'Camiseta Oversize';

-- Inserir faixas de preço para Conjunto Esportivo
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 164.90, 164.90, 1 FROM produtos WHERE nome = 'Conjunto Esportivo (Camiseta - Shorts)'
UNION ALL
SELECT id, 5, 10, 119.90, 129.60, 2 FROM produtos WHERE nome = 'Conjunto Esportivo (Camiseta - Shorts)'
UNION ALL
SELECT id, 11, 50, 99.90, 109.90, 3 FROM produtos WHERE nome = 'Conjunto Esportivo (Camiseta - Shorts)'
UNION ALL
SELECT id, 51, NULL, 92.30, 99.90, 4 FROM produtos WHERE nome = 'Conjunto Esportivo (Camiseta - Shorts)';

-- Inserir faixas de preço para Moletom Capuz
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 149.90, 149.90, 1 FROM produtos WHERE nome = 'Moletom Capuz'
UNION ALL
SELECT id, 5, 10, 133.90, 149.90, 2 FROM produtos WHERE nome = 'Moletom Capuz'
UNION ALL
SELECT id, 11, 50, 108.89, 125.90, 3 FROM produtos WHERE nome = 'Moletom Capuz'
UNION ALL
SELECT id, 51, NULL, 86.40, 99.90, 4 FROM produtos WHERE nome = 'Moletom Capuz';

-- Inserir faixas de preço para Moletom Ziper
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 154.90, 154.90, 1 FROM produtos WHERE nome = 'Moletom Ziper'
UNION ALL
SELECT id, 5, 10, 138.90, 154.90, 2 FROM produtos WHERE nome = 'Moletom Ziper'
UNION ALL
SELECT id, 11, 50, 112.26, 129.80, 3 FROM produtos WHERE nome = 'Moletom Ziper'
UNION ALL
SELECT id, 51, NULL, 90.73, 104.90, 4 FROM produtos WHERE nome = 'Moletom Ziper';

-- Inserir faixas de preço para Moletom Basico
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 144.90, 144.90, 1 FROM produtos WHERE nome = 'Moletom Basico'
UNION ALL
SELECT id, 5, 10, 128.90, 144.90, 2 FROM produtos WHERE nome = 'Moletom Basico'
UNION ALL
SELECT id, 11, 50, 103.70, 119.90, 3 FROM produtos WHERE nome = 'Moletom Basico'
UNION ALL
SELECT id, 51, NULL, 84.59, 97.80, 4 FROM produtos WHERE nome = 'Moletom Basico';

-- Inserir faixas de preço para Corta vento Estampa Localizada
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 199.00, 199.00, 1 FROM produtos WHERE nome = 'Corta vento Estampa Localizada'
UNION ALL
SELECT id, 5, 10, 168.43, 199.00, 2 FROM produtos WHERE nome = 'Corta vento Estampa Localizada'
UNION ALL
SELECT id, 11, 50, 131.16, 154.96, 3 FROM produtos WHERE nome = 'Corta vento Estampa Localizada'
UNION ALL
SELECT id, 51, NULL, 102.13, 120.66, 4 FROM produtos WHERE nome = 'Corta vento Estampa Localizada';

-- Inserir faixas de preço para Corta vento Full Print
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 280.00, 280.00, 1 FROM produtos WHERE nome = 'Corta vento Full Print'
UNION ALL
SELECT id, 5, 10, 227.68, 269.00, 2 FROM produtos WHERE nome = 'Corta vento Full Print'
UNION ALL
SELECT id, 11, 50, 177.29, 209.47, 3 FROM produtos WHERE nome = 'Corta vento Full Print'
UNION ALL
SELECT id, 51, NULL, 156.31, 177.50, 4 FROM produtos WHERE nome = 'Corta vento Full Print';

-- Inserir faixas de preço para Shorts Dry Esportivo
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 99.00, 99.00, 1 FROM produtos WHERE nome = 'Shorts Dry Esportivo'
UNION ALL
SELECT id, 5, 10, 76.09, 89.90, 2 FROM produtos WHERE nome = 'Shorts Dry Esportivo'
UNION ALL
SELECT id, 11, 50, 59.25, 70.00, 3 FROM produtos WHERE nome = 'Shorts Dry Esportivo'
UNION ALL
SELECT id, 51, NULL, 46.14, 54.51, 4 FROM produtos WHERE nome = 'Shorts Dry Esportivo';

-- Inserir faixas de preço para Shorts Praia Elastic
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 119.90, 119.90, 1 FROM produtos WHERE nome = 'Shorts Praia Elastic'
UNION ALL
SELECT id, 5, 10, 101.48, 119.90, 2 FROM produtos WHERE nome = 'Shorts Praia Elastic'
UNION ALL
SELECT id, 11, 50, 76.09, 89.90, 3 FROM produtos WHERE nome = 'Shorts Praia Elastic'
UNION ALL
SELECT id, 51, NULL, 59.16, 69.90, 4 FROM produtos WHERE nome = 'Shorts Praia Elastic';

-- Inserir faixas de preço para Vestido de Malha
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 139.90, 139.90, 1 FROM produtos WHERE nome = 'Vestido de Malha'
UNION ALL
SELECT id, 5, 10, 118.41, 139.90, 2 FROM produtos WHERE nome = 'Vestido de Malha'
UNION ALL
SELECT id, 11, 50, 92.21, 108.94, 3 FROM produtos WHERE nome = 'Vestido de Malha'
UNION ALL
SELECT id, 51, NULL, 71.80, 84.83, 4 FROM produtos WHERE nome = 'Vestido de Malha';

-- Inserir faixas de preço para Vestido de Moletom
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 149.90, 149.90, 1 FROM produtos WHERE nome = 'Vestido de Moletom'
UNION ALL
SELECT id, 5, 10, 126.88, 149.90, 2 FROM produtos WHERE nome = 'Vestido de Moletom'
UNION ALL
SELECT id, 11, 50, 98.80, 116.73, 3 FROM produtos WHERE nome = 'Vestido de Moletom'
UNION ALL
SELECT id, 51, NULL, 76.93, 90.89, 4 FROM produtos WHERE nome = 'Vestido de Moletom';

-- Inserir faixas de preço para Caneca
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 34.90, 34.90, 1 FROM produtos WHERE nome = 'Caneca'
UNION ALL
SELECT id, 5, 10, 31.50, 34.90, 2 FROM produtos WHERE nome = 'Caneca'
UNION ALL
SELECT id, 11, 50, 27.00, 29.92, 3 FROM produtos WHERE nome = 'Caneca'
UNION ALL
SELECT id, 51, NULL, 23.15, 25.65, 4 FROM produtos WHERE nome = 'Caneca';

-- Inserir faixas de preço para Gola Polo
INSERT INTO faixas_preco_produto (produto_id, quantidade_minima, quantidade_maxima, preco_minimo, preco_maximo, ordem)
SELECT id, 1, 4, 149.90, 149.90, 1 FROM produtos WHERE nome = 'Gola Polo'
UNION ALL
SELECT id, 5, 10, 119.90, 129.90, 2 FROM produtos WHERE nome = 'Gola Polo'
UNION ALL
SELECT id, 11, 50, 79.89, 89.90, 3 FROM produtos WHERE nome = 'Gola Polo'
UNION ALL
SELECT id, 51, NULL, 59.90, 74.90, 4 FROM produtos WHERE nome = 'Gola Polo';