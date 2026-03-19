
-- Corrigir RLS: usuários devem poder VER seus próprios vínculos
-- Apenas GERENCIAR (insert/update/delete) requer permissão especial

-- Remover política atual (FOR ALL)
DROP POLICY IF EXISTS "Usuarios com permissao podem gerenciar vinculos" ON public.whatsapp_instance_users;

-- Política SELECT: ver próprios vínculos OU ter permissão de configurar
CREATE POLICY "Usuarios podem ver seus vinculos"
ON public.whatsapp_instance_users
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
);

-- Política INSERT/UPDATE/DELETE: apenas quem tem permissão de configurar
CREATE POLICY "Usuarios com permissao podem gerenciar vinculos"
ON public.whatsapp_instance_users
FOR ALL
USING (
  public.has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
)
WITH CHECK (
  public.has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
);
