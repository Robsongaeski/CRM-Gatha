-- Adicionar campo de data de vencimento do boleto na tabela pagamentos
ALTER TABLE public.pagamentos 
ADD COLUMN data_vencimento_boleto DATE;