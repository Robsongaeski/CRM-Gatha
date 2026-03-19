-- Criar tabela para tags coloridas dos pedidos
CREATE TABLE IF NOT EXISTS pedido_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  nome VARCHAR(50) NOT NULL,
  cor VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index para performance
CREATE INDEX idx_pedido_tags_pedido ON pedido_tags(pedido_id);

-- RLS para pedido_tags
ALTER TABLE pedido_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar tags de pedidos visíveis"
  ON pedido_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_tags.pedido_id
      AND (pedidos.vendedor_id = auth.uid() OR is_admin(auth.uid()) OR is_atendente(auth.uid()))
    )
  );

CREATE POLICY "Usuários podem gerenciar tags de pedidos"
  ON pedido_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_tags.pedido_id
      AND (pedidos.vendedor_id = auth.uid() OR is_admin(auth.uid()) OR is_atendente(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pedidos
      WHERE pedidos.id = pedido_tags.pedido_id
      AND (pedidos.vendedor_id = auth.uid() OR is_admin(auth.uid()) OR is_atendente(auth.uid()))
    )
  );

-- Trigger para definir etapa inicial automaticamente
CREATE OR REPLACE FUNCTION set_etapa_inicial()
RETURNS TRIGGER AS $$
DECLARE
  etapa_entrada_id UUID;
BEGIN
  -- Buscar etapa inicial (tipo='inicial' ou ordem=1)
  SELECT id INTO etapa_entrada_id 
  FROM etapa_producao 
  WHERE ativa = true
  AND (tipo_etapa = 'inicial' OR ordem = 1)
  ORDER BY ordem ASC
  LIMIT 1;
  
  -- Se status mudou para em_producao e não tem etapa, define como Entrada
  IF NEW.status = 'em_producao' AND NEW.etapa_producao_id IS NULL AND etapa_entrada_id IS NOT NULL THEN
    NEW.etapa_producao_id := etapa_entrada_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_set_etapa_inicial ON pedidos;
CREATE TRIGGER trigger_set_etapa_inicial
  BEFORE INSERT OR UPDATE ON pedidos
  FOR EACH ROW 
  EXECUTE FUNCTION set_etapa_inicial();