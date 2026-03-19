-- Atualizar política de SELECT para permitir que todos os usuários autenticados vejam todos os clientes
DROP POLICY IF EXISTS "Vendedores veem seus clientes e admins veem todos" ON public.clientes;

CREATE POLICY "Usuários autenticados podem ver todos os clientes"
ON public.clientes
FOR SELECT
TO authenticated
USING (true);