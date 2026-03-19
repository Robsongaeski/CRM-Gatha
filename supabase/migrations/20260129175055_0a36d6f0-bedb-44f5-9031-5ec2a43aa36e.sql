-- =====================================================
-- MIGRAÇÃO: Normalizar telefones e CPF/CNPJ existentes
-- =====================================================

-- Função auxiliar para formatar telefone brasileiro
CREATE OR REPLACE FUNCTION format_phone_br(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove tudo que não é dígito
  digits := regexp_replace(phone, '[^0-9]', '', 'g');
  
  -- Se começar com 55 e tiver mais de 11 dígitos, remove o 55
  IF LENGTH(digits) > 11 AND digits LIKE '55%' THEN
    digits := substring(digits from 3);
  END IF;
  
  -- Limita a 11 dígitos
  digits := substring(digits from 1 for 11);
  
  -- Formata de acordo com o tamanho
  IF LENGTH(digits) = 11 THEN
    -- Celular: (00) 00000-0000
    RETURN '(' || substring(digits from 1 for 2) || ') ' || 
           substring(digits from 3 for 5) || '-' || 
           substring(digits from 8 for 4);
  ELSIF LENGTH(digits) = 10 THEN
    -- Fixo: (00) 0000-0000
    RETURN '(' || substring(digits from 1 for 2) || ') ' || 
           substring(digits from 3 for 4) || '-' || 
           substring(digits from 7 for 4);
  ELSIF LENGTH(digits) >= 8 THEN
    -- Sem DDD, retorna como está
    RETURN digits;
  END IF;
  
  RETURN phone; -- Retorna original se não conseguir formatar
END;
$$;

-- Função auxiliar para formatar CPF/CNPJ
CREATE OR REPLACE FUNCTION format_cpf_cnpj(doc TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF doc IS NULL OR doc = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove tudo que não é dígito
  digits := regexp_replace(doc, '[^0-9]', '', 'g');
  
  -- Formata de acordo com o tamanho
  IF LENGTH(digits) = 11 THEN
    -- CPF: 000.000.000-00
    RETURN substring(digits from 1 for 3) || '.' || 
           substring(digits from 4 for 3) || '.' || 
           substring(digits from 7 for 3) || '-' || 
           substring(digits from 10 for 2);
  ELSIF LENGTH(digits) = 14 THEN
    -- CNPJ: 00.000.000/0000-00
    RETURN substring(digits from 1 for 2) || '.' || 
           substring(digits from 3 for 3) || '.' || 
           substring(digits from 6 for 3) || '/' || 
           substring(digits from 9 for 4) || '-' || 
           substring(digits from 13 for 2);
  END IF;
  
  RETURN doc; -- Retorna original se não conseguir formatar
END;
$$;

-- 1. Normalizar telefones existentes
UPDATE clientes
SET telefone = format_phone_br(telefone)
WHERE telefone IS NOT NULL 
  AND telefone != ''
  AND telefone NOT LIKE '(__)%'; -- Não reformatar os que já estão formatados

-- 2. Normalizar WhatsApp existentes
UPDATE clientes
SET whatsapp = format_phone_br(whatsapp)
WHERE whatsapp IS NOT NULL 
  AND whatsapp != ''
  AND whatsapp NOT LIKE '(__)%';

-- 3. Preencher telefone com whatsapp quando telefone está vazio
UPDATE clientes
SET telefone = whatsapp
WHERE (telefone IS NULL OR telefone = '')
  AND whatsapp IS NOT NULL 
  AND whatsapp != '';

-- 4. Preencher whatsapp com telefone quando whatsapp está vazio
UPDATE clientes
SET whatsapp = telefone
WHERE (whatsapp IS NULL OR whatsapp = '')
  AND telefone IS NOT NULL 
  AND telefone != '';

-- 5. Normalizar CPF/CNPJ existentes
UPDATE clientes
SET cpf_cnpj = format_cpf_cnpj(cpf_cnpj)
WHERE cpf_cnpj IS NOT NULL 
  AND cpf_cnpj != ''
  AND cpf_cnpj NOT LIKE '%.%.%-%' -- Não reformatar CPF já formatado
  AND cpf_cnpj NOT LIKE '%/%-%'; -- Não reformatar CNPJ já formatado

-- 6. Normalizar leads também
UPDATE leads
SET telefone = format_phone_br(telefone)
WHERE telefone IS NOT NULL 
  AND telefone != ''
  AND telefone NOT LIKE '(__)%';

UPDATE leads
SET whatsapp = format_phone_br(whatsapp)
WHERE whatsapp IS NOT NULL 
  AND whatsapp != ''
  AND whatsapp NOT LIKE '(__)%';

UPDATE leads
SET cpf_cnpj = format_cpf_cnpj(cpf_cnpj)
WHERE cpf_cnpj IS NOT NULL 
  AND cpf_cnpj != ''
  AND cpf_cnpj NOT LIKE '%.%.%-%'
  AND cpf_cnpj NOT LIKE '%/%-%';

-- Comentário: Funções format_phone_br e format_cpf_cnpj podem ser usadas em triggers futuros
-- para garantir formatação consistente em novos registros