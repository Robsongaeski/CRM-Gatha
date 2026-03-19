-- Expandir política para permitir perfil E-commerce gerenciar vínculos de instâncias WhatsApp

-- Remover política atual (que só permite admin)
DROP POLICY IF EXISTS "Admins podem gerenciar vínculos de instâncias" ON public.whatsapp_instance_users;

-- Criar política expandida para admin E ecommerce
CREATE POLICY "Admins e E-commerce podem gerenciar vínculos"
ON public.whatsapp_instance_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = auth.uid()
      AND sp.codigo IN ('admin', 'ecommerce')
      AND sp.ativo = true
  )
  OR public.has_permission(auth.uid(), 'ecommerce.whatsapp.visualizar')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = auth.uid()
      AND sp.codigo IN ('admin', 'ecommerce')
      AND sp.ativo = true
  )
  OR public.has_permission(auth.uid(), 'ecommerce.whatsapp.visualizar')
);