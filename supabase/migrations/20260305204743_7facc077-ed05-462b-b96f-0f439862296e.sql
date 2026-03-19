
-- 1. Make sensitive buckets private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('comprovantes-pagamento', 'comprovantes-devolucao', 'pedidos-aprovacao');

-- 2. Drop overly permissive policies
DROP POLICY IF EXISTS "Qualquer um pode ver imagens de aprovação" ON storage.objects;
DROP POLICY IF EXISTS "Visualizar comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode ver comprovantes de devolução" ON storage.objects;
DROP POLICY IF EXISTS "Qualquer um pode ver comprovantes" ON storage.objects;

-- 3. Create role-based access policies for payment receipts
CREATE POLICY "Financeiro and admin view payment receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes-pagamento'
  AND (is_admin(auth.uid()) OR is_financeiro(auth.uid()))
);

-- 4. Create role-based access policies for return proofs
CREATE POLICY "Authorized users view return proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'comprovantes-devolucao'
  AND (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'trocas_devolucoes.visualizar')
    OR is_atendente(auth.uid())
  )
);

-- 5. Create access policy for approval images (any authenticated user)
CREATE POLICY "Authenticated users view approval images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'pedidos-aprovacao'
);
