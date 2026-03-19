-- ============================================================================
-- CORREÇÃO COMPLETA: RLS para todos os perfis (Admin, Vendedor, Atendente, Financeiro, PCP)
-- ============================================================================

-- ============================================================================
-- 1. GARANTIR QUE TODAS AS FUNÇÕES is_* EXISTEM
-- ============================================================================

-- Função is_pcp já foi criada, garantir consistência
CREATE OR REPLACE FUNCTION public.is_pcp(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles up
    JOIN system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id 
      AND sp.codigo = 'pcp'
      AND sp.ativo = true
  ) OR 
  has_role(_user_id, 'admin');
$$;

-- ============================================================================
-- 2. PEDIDOS - Garantir acesso para todos os perfis relevantes
-- ============================================================================

-- SELECT: Admin, Vendedor (próprios), Atendente, Financeiro, PCP
DROP POLICY IF EXISTS "Usuários podem ver pedidos" ON pedidos;
CREATE POLICY "Usuários podem ver pedidos" ON pedidos
FOR SELECT USING (
  vendedor_id = auth.uid() 
  OR is_admin(auth.uid()) 
  OR is_atendente(auth.uid()) 
  OR is_financeiro(auth.uid())
  OR is_pcp(auth.uid())
);

-- UPDATE: Admin, Vendedor (próprios), Atendente, PCP
DROP POLICY IF EXISTS "Usuários podem atualizar pedidos" ON pedidos;
CREATE POLICY "Usuários podem atualizar pedidos" ON pedidos
FOR UPDATE USING (
  vendedor_id = auth.uid() 
  OR is_admin(auth.uid()) 
  OR is_atendente(auth.uid())
  OR is_pcp(auth.uid())
) WITH CHECK (
  (is_atendente(auth.uid()) AND status <> 'cancelado'::status_pedido) 
  OR (is_pcp(auth.uid()) AND status <> 'cancelado'::status_pedido)
  OR is_admin(auth.uid()) 
  OR vendedor_id = auth.uid()
);

-- ============================================================================
-- 3. PEDIDO_ITENS - Acesso para visualização e edição
-- ============================================================================

-- SELECT: Inclui PCP
DROP POLICY IF EXISTS "Usuários podem ver itens de pedidos" ON pedido_itens;
CREATE POLICY "Usuários podem ver itens de pedidos" ON pedido_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_itens.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_financeiro(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- ============================================================================
-- 4. PEDIDO_ITEM_GRADES - Acesso para visualização
-- ============================================================================

DROP POLICY IF EXISTS "Ver grades do item" ON pedido_item_grades;
CREATE POLICY "Ver grades do item" ON pedido_item_grades
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    WHERE pi.id = pedido_item_grades.pedido_item_id
    AND (
      p.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_financeiro(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- ============================================================================
-- 5. PEDIDO_ITEM_DETALHES - Acesso para visualização
-- ============================================================================

DROP POLICY IF EXISTS "Ver detalhes dos itens de pedidos visíveis" ON pedido_item_detalhes;
CREATE POLICY "Ver detalhes dos itens de pedidos visíveis" ON pedido_item_detalhes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedido_itens pi
    JOIN pedidos p ON pi.pedido_id = p.id
    WHERE pi.id = pedido_item_detalhes.pedido_item_id
    AND (
      p.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_financeiro(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- ============================================================================
-- 6. PEDIDO_TAGS - Acesso para todos os perfis que veem pedidos
-- ============================================================================

DROP POLICY IF EXISTS "Usuários podem visualizar tags de pedidos visíveis" ON pedido_tags;
CREATE POLICY "Usuários podem visualizar tags de pedidos visíveis" ON pedido_tags
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_tags.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_financeiro(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Usuários podem gerenciar tags de pedidos" ON pedido_tags;
CREATE POLICY "Usuários podem gerenciar tags de pedidos" ON pedido_tags
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_tags.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedido_tags.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- ============================================================================
-- 7. PEDIDOS_HISTORICO - Acesso para visualização
-- ============================================================================

DROP POLICY IF EXISTS "Ver histórico de pedidos visíveis" ON pedidos_historico;
CREATE POLICY "Ver histórico de pedidos visíveis" ON pedidos_historico
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM pedidos
    WHERE pedidos.id = pedidos_historico.pedido_id
    AND (
      pedidos.vendedor_id = auth.uid() 
      OR is_admin(auth.uid()) 
      OR is_atendente(auth.uid()) 
      OR is_financeiro(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- ============================================================================
-- 8. PROPOSTAS - Acesso para PCP (aprovação de arte)
-- ============================================================================

-- Verificar se existe política para propostas e adicionar PCP
DROP POLICY IF EXISTS "Vendedores podem ver propostas" ON propostas;
CREATE POLICY "Usuários podem ver propostas" ON propostas
FOR SELECT USING (
  vendedor_id = auth.uid() 
  OR is_admin(auth.uid())
  OR is_pcp(auth.uid())
);

DROP POLICY IF EXISTS "Vendedores podem atualizar propostas" ON propostas;
CREATE POLICY "Usuários podem atualizar propostas" ON propostas
FOR UPDATE USING (
  vendedor_id = auth.uid() 
  OR is_admin(auth.uid())
  OR is_pcp(auth.uid())
);

-- ============================================================================
-- 9. PROPOSTA_ITENS - Acesso para visualização
-- ============================================================================

DROP POLICY IF EXISTS "Ver itens de propostas visíveis" ON proposta_itens;
CREATE POLICY "Ver itens de propostas visíveis" ON proposta_itens
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM propostas
    WHERE propostas.id = proposta_itens.proposta_id
    AND (
      propostas.vendedor_id = auth.uid() 
      OR is_admin(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- ============================================================================
-- 10. PROPOSTA_TAGS - Acesso para visualização e gestão
-- ============================================================================

DROP POLICY IF EXISTS "Usuários podem visualizar tags de propostas" ON proposta_tags;
CREATE POLICY "Usuários podem visualizar tags de propostas" ON proposta_tags
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM propostas
    WHERE propostas.id = proposta_tags.proposta_id
    AND (
      propostas.vendedor_id = auth.uid() 
      OR is_admin(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Usuários podem gerenciar tags de propostas" ON proposta_tags;
CREATE POLICY "Usuários podem gerenciar tags de propostas" ON proposta_tags
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM propostas
    WHERE propostas.id = proposta_tags.proposta_id
    AND (
      propostas.vendedor_id = auth.uid() 
      OR is_admin(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM propostas
    WHERE propostas.id = proposta_tags.proposta_id
    AND (
      propostas.vendedor_id = auth.uid() 
      OR is_admin(auth.uid())
      OR is_pcp(auth.uid())
    )
  )
);

-- ============================================================================
-- 11. MOVIMENTO_ETAPA_PRODUCAO - PCP pode visualizar e registrar
-- ============================================================================

DROP POLICY IF EXISTS "Usuários com permissão podem visualizar movimentos" ON movimento_etapa_producao;
CREATE POLICY "Usuários com permissão podem visualizar movimentos" ON movimento_etapa_producao
FOR SELECT USING (
  is_admin(auth.uid()) 
  OR is_pcp(auth.uid())
  OR has_permission(auth.uid(), 'pcp.kanban.visualizar')
);

DROP POLICY IF EXISTS "Usuários com permissão podem registrar movimentos" ON movimento_etapa_producao;
CREATE POLICY "Usuários com permissão podem registrar movimentos" ON movimento_etapa_producao
FOR INSERT WITH CHECK (
  is_admin(auth.uid()) 
  OR is_pcp(auth.uid())
  OR has_permission(auth.uid(), 'pcp.kanban.movimentar')
);

-- ============================================================================
-- 12. MOVIMENTO_ETAPA_PROPOSTA - PCP pode visualizar e registrar
-- ============================================================================

DROP POLICY IF EXISTS "Usuários com permissão podem visualizar movimentos de proposta" ON movimento_etapa_proposta;
CREATE POLICY "Usuários com permissão podem visualizar movimentos de proposta" ON movimento_etapa_proposta
FOR SELECT USING (
  is_admin(auth.uid()) 
  OR is_pcp(auth.uid())
  OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.visualizar')
);

DROP POLICY IF EXISTS "Usuários com permissão podem registrar movimentos de proposta" ON movimento_etapa_proposta;
CREATE POLICY "Usuários com permissão podem registrar movimentos de proposta" ON movimento_etapa_proposta
FOR INSERT WITH CHECK (
  is_admin(auth.uid()) 
  OR is_pcp(auth.uid())
  OR has_permission(auth.uid(), 'pcp.kanban.aprovacao.movimentar')
);

-- ============================================================================
-- 13. CLIENTES - PCP pode visualizar (para ver dados do cliente nos pedidos)
-- ============================================================================
-- Clientes já tem política aberta para autenticados, não precisa alterar

-- ============================================================================
-- 14. PROFILES - Garantir que todos podem ver perfis necessários
-- ============================================================================

DROP POLICY IF EXISTS "Usuários veem apenas seu próprio perfil" ON profiles;
CREATE POLICY "Usuários veem perfis necessários" ON profiles
FOR SELECT USING (
  auth.uid() = id 
  OR is_admin(auth.uid())
  OR is_pcp(auth.uid())
  OR is_atendente(auth.uid())
  OR is_financeiro(auth.uid())
  OR is_vendedor(auth.uid())
);

-- ============================================================================
-- RESULTADO
-- ============================================================================
SELECT '✅ Todas as políticas RLS foram atualizadas para suportar todos os perfis!' as resultado;