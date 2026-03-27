-- Permite que usuarios com propostas.editar_todos visualizem propostas de outros vendedores.
-- Sem isso, o RLS de SELECT bloqueia a listagem mesmo quando UPDATE e permitido.

DROP POLICY IF EXISTS "Permissao editar_todos permite ver propostas" ON public.propostas;
CREATE POLICY "Permissao editar_todos permite ver propostas"
ON public.propostas
FOR SELECT
USING (has_permission(auth.uid(), 'propostas.editar_todos'));

DROP POLICY IF EXISTS "Permissao editar_todos permite ver itens de propostas" ON public.proposta_itens;
CREATE POLICY "Permissao editar_todos permite ver itens de propostas"
ON public.proposta_itens
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.propostas p
    WHERE p.id = proposta_itens.proposta_id
      AND has_permission(auth.uid(), 'propostas.editar_todos')
  )
);

DROP POLICY IF EXISTS "Permissao editar_todos permite ver historico de propostas" ON public.propostas_historico;
CREATE POLICY "Permissao editar_todos permite ver historico de propostas"
ON public.propostas_historico
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.propostas p
    WHERE p.id = propostas_historico.proposta_id
      AND has_permission(auth.uid(), 'propostas.editar_todos')
  )
);
