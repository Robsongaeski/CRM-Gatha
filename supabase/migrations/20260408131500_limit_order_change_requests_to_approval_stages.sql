-- Restringe solicitacoes de alteracao de pedido para etapas especificas de aprovacao
-- Etapas permitidas: Entrada, Aguardando Aprovacao, Alteracao e Pedido Aprovado

DROP POLICY IF EXISTS "Criar solicitacao de alteracao de pedido" ON public.pedidos_alteracoes_pendentes;

CREATE POLICY "Criar solicitacao de alteracao de pedido" ON public.pedidos_alteracoes_pendentes
FOR INSERT WITH CHECK (
  auth.uid() = solicitado_por
  AND (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'pedidos.editar_todos')
    OR (
      has_permission(auth.uid(), 'pedidos.alteracoes.solicitar')
      AND EXISTS (
        SELECT 1
        FROM public.pedidos p
        LEFT JOIN public.etapa_producao ep ON ep.id = p.etapa_producao_id
        WHERE p.id = pedidos_alteracoes_pendentes.pedido_id
          AND p.vendedor_id = auth.uid()
          AND lower(trim(COALESCE(ep.nome_etapa, ''))) IN (
            'entrada',
            'aguardando aprovacao',
            'alteracao',
            'pedido aprovado'
          )
      )
    )
  )
);