-- Fix overly permissive RLS policies on orders table
-- This table contains sensitive customer data (names, emails, phones, CPF, addresses)

-- Step 1: Drop overly permissive policies
DROP POLICY IF EXISTS "Permitir leitura pública de pedidos" ON orders;
DROP POLICY IF EXISTS "Usuários autenticados podem gerenciar pedidos" ON orders;

-- Step 2: Keep existing secure policies (Admins podem ver/atualizar, Service role)
-- These are already properly scoped

-- Step 3: Add policy for WhatsApp atendentes who need to view orders
-- They need access to link orders with conversations
CREATE POLICY "Atendentes podem visualizar pedidos"
  ON orders FOR SELECT
  USING (is_admin(auth.uid()) OR is_atendente(auth.uid()));

-- Step 4: Add policy for authenticated users to manage orders (restricted to admins/atendentes)
CREATE POLICY "Usuários autorizados podem gerenciar pedidos"
  ON orders FOR ALL
  USING (is_admin(auth.uid()) OR is_atendente(auth.uid()))
  WITH CHECK (is_admin(auth.uid()) OR is_atendente(auth.uid()));