-- Corrige RLS de INSERT em proposta_itens para permitir edicao de propostas de outros vendedores
-- quando o usuario tem permissao propostas.editar_todos (ou alias legado editar_todas).

DROP POLICY IF EXISTS "Inserir itens em propostas próprias" ON public.proposta_itens;

CREATE POLICY "Inserir itens em propostas próprias"
ON public.proposta_itens
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.propostas
    WHERE propostas.id = proposta_itens.proposta_id
      AND (
        propostas.vendedor_id = auth.uid()
        OR has_permission(auth.uid(), 'propostas.editar_todos')
        OR has_permission(auth.uid(), 'propostas.editar_todas')
        OR is_admin(auth.uid())
      )
  )
);
