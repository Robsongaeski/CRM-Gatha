-- Alterar tipos das colunas da tabela leads para text
-- Isso corrige o erro "value too long for type character varying(20)"
-- e mantém consistência com a tabela clientes

ALTER TABLE public.leads 
  ALTER COLUMN telefone TYPE text,
  ALTER COLUMN whatsapp TYPE text,
  ALTER COLUMN cpf_cnpj TYPE text;