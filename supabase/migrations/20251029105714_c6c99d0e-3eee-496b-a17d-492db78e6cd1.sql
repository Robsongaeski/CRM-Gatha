-- Ajustar política RLS de proposta_itens para INSERT
-- A política atual pode estar falhando quando tentamos inserir itens 
-- logo após criar a proposta

DROP POLICY IF EXISTS "Inserir itens em propostas próprias" ON proposta_itens;

-- Nova política mais robusta que permite inserir itens se o usuário
-- é o vendedor da proposta OU se é admin
CREATE POLICY "Inserir itens em propostas próprias"
ON proposta_itens
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM propostas
    WHERE propostas.id = proposta_itens.proposta_id
    AND (propostas.vendedor_id = auth.uid() OR is_admin(auth.uid()))
  )
);

-- Garantir que a política de SELECT em propostas permite
-- que o vendedor veja suas propostas durante a inserção de itens
-- (essa já existe, mas vamos recriar para ter certeza)
DROP POLICY IF EXISTS "Vendedores veem suas propostas" ON propostas;

CREATE POLICY "Vendedores veem suas propostas"
ON propostas
FOR SELECT
USING (vendedor_id = auth.uid() OR is_admin(auth.uid()));