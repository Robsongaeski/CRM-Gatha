-- Migration 1: Criar enum para status da proposta
CREATE TYPE status_proposta AS ENUM (
  'pendente',
  'enviada',
  'follow_up',
  'ganha',
  'perdida'
);

-- Migration 2: Tabela principal de propostas
CREATE TABLE propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE RESTRICT NOT NULL,
  vendedor_id UUID NOT NULL,
  status status_proposta NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  data_follow_up TIMESTAMPTZ,
  motivo_perda TEXT,
  valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_propostas_cliente ON propostas(cliente_id);
CREATE INDEX idx_propostas_vendedor ON propostas(vendedor_id);
CREATE INDEX idx_propostas_status ON propostas(status);
CREATE INDEX idx_propostas_follow_up ON propostas(data_follow_up) WHERE status = 'follow_up';

-- Trigger para updated_at
CREATE TRIGGER update_propostas_updated_at 
  BEFORE UPDATE ON propostas
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Migration 3: Tabela de itens da proposta
CREATE TABLE proposta_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID REFERENCES propostas(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES produtos(id) ON DELETE RESTRICT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario DECIMAL(10,2) NOT NULL CHECK (valor_unitario >= 0),
  valor_total DECIMAL(10,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_proposta_itens_proposta ON proposta_itens(proposta_id);
CREATE INDEX idx_proposta_itens_produto ON proposta_itens(produto_id);

-- Migration 4: Função para atualizar valor total da proposta
CREATE OR REPLACE FUNCTION atualizar_valor_total_proposta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE propostas
  SET valor_total = (
    SELECT COALESCE(SUM(valor_total), 0)
    FROM proposta_itens
    WHERE proposta_id = COALESCE(NEW.proposta_id, OLD.proposta_id)
  )
  WHERE id = COALESCE(NEW.proposta_id, OLD.proposta_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers para recalcular quando itens são modificados
CREATE TRIGGER trigger_atualizar_valor_total_insert
  AFTER INSERT ON proposta_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_total_proposta();

CREATE TRIGGER trigger_atualizar_valor_total_update
  AFTER UPDATE ON proposta_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_total_proposta();

CREATE TRIGGER trigger_atualizar_valor_total_delete
  AFTER DELETE ON proposta_itens
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_total_proposta();

-- Migration 5: Validação de motivo de perda
CREATE OR REPLACE FUNCTION validar_motivo_perda()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'perdida' AND (NEW.motivo_perda IS NULL OR NEW.motivo_perda = '') THEN
    RAISE EXCEPTION 'Motivo da perda é obrigatório quando status é "perdida"';
  END IF;
  
  IF NEW.status != 'perdida' THEN
    NEW.motivo_perda = NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_validar_motivo_perda
  BEFORE INSERT OR UPDATE ON propostas
  FOR EACH ROW
  EXECUTE FUNCTION validar_motivo_perda();

-- Migration 6: RLS Policies
ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposta_itens ENABLE ROW LEVEL SECURITY;

-- Políticas para PROPOSTAS
CREATE POLICY "Vendedores veem suas propostas"
  ON propostas FOR SELECT
  USING (
    vendedor_id = auth.uid() OR is_admin(auth.uid())
  );

CREATE POLICY "Vendedores podem criar propostas"
  ON propostas FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    vendedor_id = auth.uid()
  );

CREATE POLICY "Vendedores podem atualizar suas propostas"
  ON propostas FOR UPDATE
  USING (
    vendedor_id = auth.uid() OR is_admin(auth.uid())
  );

CREATE POLICY "Apenas admins podem deletar propostas"
  ON propostas FOR DELETE
  USING (is_admin(auth.uid()));

-- Políticas para PROPOSTA_ITENS
CREATE POLICY "Ver itens de propostas visíveis"
  ON proposta_itens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM propostas
      WHERE propostas.id = proposta_itens.proposta_id
      AND (propostas.vendedor_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Inserir itens em propostas próprias"
  ON proposta_itens FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM propostas
      WHERE propostas.id = proposta_itens.proposta_id
      AND propostas.vendedor_id = auth.uid()
    )
  );

CREATE POLICY "Atualizar itens de propostas próprias"
  ON proposta_itens FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM propostas
      WHERE propostas.id = proposta_itens.proposta_id
      AND (propostas.vendedor_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Deletar itens de propostas próprias"
  ON proposta_itens FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM propostas
      WHERE propostas.id = proposta_itens.proposta_id
      AND (propostas.vendedor_id = auth.uid() OR is_admin(auth.uid()))
    )
  );