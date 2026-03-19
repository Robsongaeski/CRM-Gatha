-- =====================================================
-- CORREÇÃO: Políticas RLS de leads_interacoes
-- Problema: INSERT só permitia se lead.vendedor_id = auth.uid()
-- Solução: Permitir admin, leads sem vendedor, e usuários com permissão
-- =====================================================

-- 1. Remover políticas existentes
DROP POLICY IF EXISTS "Criar interações nos próprios leads" ON public.leads_interacoes;
DROP POLICY IF EXISTS "Visualizar interações dos próprios leads" ON public.leads_interacoes;

-- 2. Política de INSERT corrigida
-- Permite inserir se:
--   - É admin OU
--   - É dono do lead (vendedor_id = auth.uid()) OU
--   - Lead não tem vendedor atribuído (vendedor_id IS NULL) OU
--   - Tem permissão leads.editar ou leads.visualizar_todos
CREATE POLICY "leads_interacoes_insert_policy"
ON public.leads_interacoes
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = leads_interacoes.lead_id
      AND (
        l.vendedor_id = auth.uid() OR
        l.vendedor_id IS NULL
      )
  ) OR
  has_permission(auth.uid(), 'leads.editar') OR
  has_permission(auth.uid(), 'leads.visualizar_todos')
);

-- 3. Política de SELECT corrigida
-- Permite visualizar se:
--   - É admin OU
--   - É dono do lead OU
--   - Tem permissão leads.visualizar_todos
CREATE POLICY "leads_interacoes_select_policy"
ON public.leads_interacoes
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM leads l
    WHERE l.id = leads_interacoes.lead_id
      AND l.vendedor_id = auth.uid()
  ) OR
  has_permission(auth.uid(), 'leads.visualizar_todos')
);

-- 4. Política de UPDATE (caso precise editar interações)
CREATE POLICY "leads_interacoes_update_policy"
ON public.leads_interacoes
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) OR
  created_by = auth.uid() OR
  has_permission(auth.uid(), 'leads.editar')
)
WITH CHECK (
  is_admin(auth.uid()) OR
  created_by = auth.uid() OR
  has_permission(auth.uid(), 'leads.editar')
);

-- 5. Política de DELETE (para remover interações se necessário)
CREATE POLICY "leads_interacoes_delete_policy"
ON public.leads_interacoes
FOR DELETE
TO authenticated
USING (
  is_admin(auth.uid()) OR
  has_permission(auth.uid(), 'leads.excluir')
);

-- =====================================================
-- CORREÇÃO: Políticas RLS da tabela leads também
-- Para garantir que UPDATE funcione ao atribuir vendedor
-- =====================================================

-- Verificar/recriar política de UPDATE na tabela leads
DROP POLICY IF EXISTS "leads_update_policy" ON public.leads;
DROP POLICY IF EXISTS "Atualizar próprios leads" ON public.leads;

CREATE POLICY "leads_update_policy"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) OR
  vendedor_id = auth.uid() OR
  vendedor_id IS NULL OR
  has_permission(auth.uid(), 'leads.editar')
)
WITH CHECK (
  is_admin(auth.uid()) OR
  vendedor_id = auth.uid() OR
  has_permission(auth.uid(), 'leads.editar')
);