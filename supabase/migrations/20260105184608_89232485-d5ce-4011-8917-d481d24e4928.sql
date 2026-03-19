-- Corrigir os tipos duplicados, padronizando para formato capitalizado único
UPDATE motivos_troca_devolucao SET tipo = '["Problema"]' WHERE nome = 'Sem Movimentação';
UPDATE motivos_troca_devolucao SET tipo = '["Problema", "Devolução", "Troca"]' WHERE nome = 'Atraso na Entrega';
UPDATE motivos_troca_devolucao SET tipo = '["Devolução", "Troca"]' WHERE nome = 'Tamanho incorreto';
UPDATE motivos_troca_devolucao SET tipo = '["Devolução", "Troca"]' WHERE nome = 'Produto enviado errado';
UPDATE motivos_troca_devolucao SET tipo = '["Problema", "Devolução"]' WHERE nome = 'Sem Tentativa de Entrega';
UPDATE motivos_troca_devolucao SET tipo = '["Problema", "Devolução"]' WHERE nome = 'Entregue mas não Recebido';
UPDATE motivos_troca_devolucao SET tipo = '["Devolução", "Troca"]' WHERE nome = 'Não gostou do produto';
UPDATE motivos_troca_devolucao SET tipo = '["Devolução", "Troca"]' WHERE nome = 'Produto com defeito';
UPDATE motivos_troca_devolucao SET tipo = '["Devolução", "Troca"]' WHERE nome = 'Arrependimento';
UPDATE motivos_troca_devolucao SET tipo = '["Devolução", "Problema", "Troca"]' WHERE nome = 'Outro';