-- Remover clientes duplicados, mantendo o mais antigo de cada CPF/CNPJ
DELETE FROM public.clientes c1
WHERE c1.cpf_cnpj IS NOT NULL 
  AND c1.cpf_cnpj != ''
  AND EXISTS (
    SELECT 1 FROM public.clientes c2
    WHERE c2.cpf_cnpj = c1.cpf_cnpj
      AND c2.created_at < c1.created_at
  );

-- Criar índices únicos para evitar duplicatas futuras
CREATE UNIQUE INDEX clientes_cpf_cnpj_unique 
ON public.clientes (cpf_cnpj) 
WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj != '';

CREATE UNIQUE INDEX clientes_email_unique 
ON public.clientes (lower(email)) 
WHERE email IS NOT NULL AND email != '';