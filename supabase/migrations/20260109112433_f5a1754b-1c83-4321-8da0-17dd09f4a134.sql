-- Corrigir função find_cliente_by_phone para não fazer match com strings vazias
CREATE OR REPLACE FUNCTION public.find_cliente_by_phone(phone text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  normalized TEXT;
  cliente_id UUID;
BEGIN
  normalized := normalize_phone(phone);
  
  -- Se o telefone normalizado é vazio ou muito curto, não buscar
  -- Telefone brasileiro válido tem pelo menos 10 dígitos (sem código país) ou 12 (com 55)
  IF normalized IS NULL OR LENGTH(normalized) < 10 THEN
    RETURN NULL;
  END IF;
  
  -- Busca por telefone ou whatsapp normalizado
  -- Também garante que o telefone do cliente tem tamanho válido
  SELECT id INTO cliente_id
  FROM clientes
  WHERE (
    (normalize_phone(telefone) = normalized AND LENGTH(normalize_phone(telefone)) >= 10)
    OR 
    (normalize_phone(whatsapp) = normalized AND LENGTH(normalize_phone(whatsapp)) >= 10)
  )
  LIMIT 1;
  
  RETURN cliente_id;
END;
$function$;

-- Limpar vinculações incorretas do cliente JJR Contabil (que tem telefone inválido)
UPDATE whatsapp_conversations 
SET cliente_id = NULL 
WHERE cliente_id = 'd7c3a3f7-6612-49a5-81b1-9861a76c24ad';

-- Também corrigir o cliente JJR Contabil - limpar o campo telefone que contém um nome
UPDATE clientes 
SET telefone = NULL 
WHERE id = 'd7c3a3f7-6612-49a5-81b1-9861a76c24ad' 
  AND telefone = 'Mylena Andrade';