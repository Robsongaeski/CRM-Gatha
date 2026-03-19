-- Adicionar política RLS para admins poderem atualizar outros perfis
CREATE POLICY "Admins podem atualizar perfis"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Adicionar política RLS para admins poderem deletar perfis (se necessário no futuro)
CREATE POLICY "Admins podem deletar perfis"
ON public.profiles
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));