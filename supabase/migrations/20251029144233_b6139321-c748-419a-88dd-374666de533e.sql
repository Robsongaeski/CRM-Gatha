-- Tornar bucket de comprovantes público para permitir visualização dos arquivos
UPDATE storage.buckets 
SET public = true 
WHERE id = 'comprovantes-pagamento';