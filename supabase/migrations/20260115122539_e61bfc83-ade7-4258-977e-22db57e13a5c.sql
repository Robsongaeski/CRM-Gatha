-- Atualizar política para usar permissão granular do sistema de perfis
-- A permissão 'ecommerce.whatsapp.configurar' já existe e é apropriada

-- Remover política atual
DROP POLICY IF EXISTS "Admins e E-commerce podem gerenciar vínculos" ON public.whatsapp_instance_users;

-- Criar política baseada em permissão granular
CREATE POLICY "Usuarios com permissao podem gerenciar vinculos"
ON public.whatsapp_instance_users
FOR ALL
USING (
  public.has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
)
WITH CHECK (
  public.has_permission(auth.uid(), 'ecommerce.whatsapp.configurar')
);