
-- Corrigir política de admin para whatsapp_instance_users
-- O problema é que a política ALL não tem WITH CHECK, bloqueando INSERT

-- Remover política atual
DROP POLICY IF EXISTS "Admins podem gerenciar vínculos de instâncias" ON public.whatsapp_instance_users;

-- Recriar com WITH CHECK explícito
CREATE POLICY "Admins podem gerenciar vínculos de instâncias" 
ON public.whatsapp_instance_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = auth.uid() AND sp.codigo = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = auth.uid() AND sp.codigo = 'admin'
  )
);
