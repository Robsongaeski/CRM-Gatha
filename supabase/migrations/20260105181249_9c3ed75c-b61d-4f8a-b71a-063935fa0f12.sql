-- Alterar coluna tipo para suportar JSON array (text)
ALTER TABLE motivos_troca_devolucao ALTER COLUMN tipo TYPE TEXT;

-- Atualizar registros existentes para formato JSON array
UPDATE motivos_troca_devolucao SET tipo = '["Troca", "Devolução"]' WHERE tipo = 'ambos';
UPDATE motivos_troca_devolucao SET tipo = '["Troca"]' WHERE tipo = 'troca';
UPDATE motivos_troca_devolucao SET tipo = '["Devolução"]' WHERE tipo = 'devolucao';
UPDATE motivos_troca_devolucao SET tipo = '["Problema"]' WHERE tipo = 'problema';

-- Adicionar motivos de problema que estão faltando
INSERT INTO motivos_troca_devolucao (nome, tipo, ordem, ativo) VALUES 
  ('Atraso na Entrega', '["Problema"]', 1, true),
  ('Sem Tentativa de Entrega', '["Problema"]', 2, true),
  ('Entregue mas não Recebido', '["Problema"]', 3, true)
ON CONFLICT DO NOTHING;

-- Garantir que "Outro" inclua todos os tipos
UPDATE motivos_troca_devolucao 
SET tipo = '["Troca", "Devolução", "Problema"]'
WHERE nome = 'Outro';