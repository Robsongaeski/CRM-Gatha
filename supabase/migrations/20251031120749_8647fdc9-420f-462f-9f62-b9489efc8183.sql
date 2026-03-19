-- Fix Security Issue 1: Restrict profiles table access
-- Remove overly permissive policy that allows all users to see all profiles
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;

-- Add restricted policies: users see only their own profile, admins see all
CREATE POLICY "Usuários veem apenas seu próprio perfil"
ON profiles
FOR SELECT
USING (auth.uid() = id OR is_admin(auth.uid()));

-- Fix Security Issue 2: Restrict clientes table access to prevent LGPD violations
-- Remove the overly permissive policy that allows all authenticated users to see all customer data
DROP POLICY IF EXISTS "Usuários autenticados podem ver clientes" ON clientes;

-- Add role-based policy: vendors see only their customers (from pedidos/propostas), admins see all
CREATE POLICY "Vendedores veem seus clientes e admins veem todos"
ON clientes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.cliente_id = clientes.id 
    AND pedidos.vendedor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM propostas
    WHERE propostas.cliente_id = clientes.id
    AND propostas.vendedor_id = auth.uid()
  )
  OR is_admin(auth.uid())
);

-- Fix Security Issue 3: Restrict product modifications to admin only
-- Remove policies that allow any authenticated user to create/update products
DROP POLICY IF EXISTS "Usuários autenticados podem criar produtos" ON produtos;
DROP POLICY IF EXISTS "Usuários podem atualizar produtos" ON produtos;

-- Add admin-only policies for product creation and updates
CREATE POLICY "Apenas admins podem criar produtos"
ON produtos
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Apenas admins podem atualizar produtos"
ON produtos
FOR UPDATE
USING (is_admin(auth.uid()));