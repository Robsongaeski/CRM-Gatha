
-- Remover a política antiga
DROP POLICY IF EXISTS "Ver histórico de propostas visíveis" ON propostas_historico;

-- Criar política atualizada que inclui PCP e usuários do Kanban
CREATE POLICY "Ver histórico de propostas visíveis"
  ON propostas_historico FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM propostas p
      WHERE p.id = propostas_historico.proposta_id
      AND (
        p.vendedor_id = auth.uid()
        OR has_permission(auth.uid(), 'propostas.visualizar_todos')
        OR is_admin(auth.uid())
        OR is_pcp(auth.uid())
        OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.visualizar')
      )
    )
  );
