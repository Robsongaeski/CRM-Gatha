-- Adicionar categoria Calcinha
INSERT INTO categoria_produto_ecommerce (nome, codigos, ordem) 
VALUES ('Calcinha Personalizada', ARRAY['CAL', 'CAL-'], 7);

-- Criar tabela de histórico de status para rastrear quando pedidos entram em produção
CREATE TABLE orders_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status_anterior TEXT,
  status_novo TEXT NOT NULL,
  wbuy_status_code_anterior INTEGER,
  wbuy_status_code_novo INTEGER NOT NULL,
  data_alteracao TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance nas consultas
CREATE INDEX idx_orders_status_history_order ON orders_status_history(order_id);
CREATE INDEX idx_orders_status_history_data ON orders_status_history(data_alteracao);
CREATE INDEX idx_orders_status_history_status_novo ON orders_status_history(wbuy_status_code_novo);

-- RLS para orders_status_history (usando sistema RBAC com user_profiles/system_profiles)
ALTER TABLE orders_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e atendente podem ver histórico de status" 
ON orders_status_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN system_profiles sp ON sp.id = up.profile_id
    WHERE up.user_id = auth.uid() 
    AND sp.nome IN ('Administrador', 'Atendente', 'PCP')
  )
);

-- Comentário explicativo
COMMENT ON TABLE orders_status_history IS 'Histórico de mudanças de status dos pedidos do e-commerce para rastrear quando entraram em produção';