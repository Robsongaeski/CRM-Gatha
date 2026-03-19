-- 1. Criar tabela de faixas de comissão padrão
CREATE TABLE faixas_comissao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem INTEGER NOT NULL UNIQUE,
  valor_minimo NUMERIC NOT NULL,
  valor_maximo NUMERIC,
  percentual NUMERIC NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir faixas iniciais
INSERT INTO faixas_comissao (ordem, valor_minimo, valor_maximo, percentual, descricao) VALUES
(1, 0, 59000, 3, 'Faixa Bronze'),
(2, 59000.01, 99999.99, 4, 'Faixa Prata'),
(3, 100000, NULL, 5, 'Faixa Ouro');

-- 2. Criar tabela de comissões
CREATE TABLE comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  
  -- Valores
  valor_pedido NUMERIC NOT NULL,
  percentual_comissao NUMERIC NOT NULL,
  valor_comissao NUMERIC NOT NULL,
  
  -- Controle
  mes_competencia DATE NOT NULL,
  data_geracao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pendente',
  data_pagamento TIMESTAMP WITH TIME ZONE,
  
  -- Observações
  observacao TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(pedido_id)
);

CREATE INDEX idx_comissoes_vendedor ON comissoes(vendedor_id);
CREATE INDEX idx_comissoes_mes ON comissoes(mes_competencia);
CREATE INDEX idx_comissoes_status ON comissoes(status);

-- 3. Criar tabela de regras de comissão por vendedor
CREATE TABLE regras_comissao_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendedor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome_regra TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(vendedor_id, nome_regra)
);

CREATE INDEX idx_regras_comissao_vendedor ON regras_comissao_vendedor(vendedor_id);
CREATE INDEX idx_regras_comissao_ativo ON regras_comissao_vendedor(ativo);

-- 4. Criar tabela de faixas de comissão por regra
CREATE TABLE faixas_comissao_vendedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id UUID NOT NULL REFERENCES regras_comissao_vendedor(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  valor_minimo NUMERIC NOT NULL,
  valor_maximo NUMERIC,
  percentual NUMERIC NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(regra_id, ordem)
);

CREATE INDEX idx_faixas_comissao_regra ON faixas_comissao_vendedor(regra_id);

-- 5. Adicionar coluna regra_id na tabela comissoes
ALTER TABLE comissoes ADD COLUMN regra_id UUID REFERENCES regras_comissao_vendedor(id);

-- 6. Trigger para gerar comissão automaticamente
CREATE OR REPLACE FUNCTION gerar_comissao_automatica()
RETURNS TRIGGER AS $$
DECLARE
  v_mes_competencia DATE;
  v_total_vendas_mes NUMERIC;
  v_regra_id UUID;
  v_faixa RECORD;
  v_valor_comissao NUMERIC;
BEGIN
  IF NEW.status_pagamento = 'quitado' AND 
     (OLD.status_pagamento IS NULL OR OLD.status_pagamento != 'quitado') THEN
    
    v_mes_competencia := DATE_TRUNC('month', NEW.data_pedido);
    
    IF NOT EXISTS (SELECT 1 FROM comissoes WHERE pedido_id = NEW.id) THEN
      
      SELECT id INTO v_regra_id
      FROM regras_comissao_vendedor
      WHERE vendedor_id = NEW.vendedor_id
        AND ativo = TRUE
        AND data_inicio <= NEW.data_pedido
        AND (data_fim IS NULL OR data_fim >= NEW.data_pedido)
      ORDER BY data_inicio DESC
      LIMIT 1;
      
      SELECT COALESCE(SUM(valor_total), 0) INTO v_total_vendas_mes
      FROM pedidos
      WHERE vendedor_id = NEW.vendedor_id
        AND DATE_TRUNC('month', data_pedido) = v_mes_competencia
        AND status_pagamento = 'quitado'
        AND status != 'cancelado';
      
      IF v_regra_id IS NULL THEN
        SELECT * INTO v_faixa
        FROM faixas_comissao
        WHERE ativo = TRUE
          AND v_total_vendas_mes >= valor_minimo
          AND (valor_maximo IS NULL OR v_total_vendas_mes <= valor_maximo)
        ORDER BY ordem DESC
        LIMIT 1;
      ELSE
        SELECT ordem, valor_minimo, valor_maximo, percentual INTO v_faixa
        FROM faixas_comissao_vendedor
        WHERE regra_id = v_regra_id
          AND v_total_vendas_mes >= valor_minimo
          AND (valor_maximo IS NULL OR v_total_vendas_mes <= valor_maximo)
        ORDER BY ordem DESC
        LIMIT 1;
      END IF;
      
      IF v_faixa IS NOT NULL THEN
        v_valor_comissao := NEW.valor_total * (v_faixa.percentual / 100);
        
        INSERT INTO comissoes (
          vendedor_id, pedido_id, valor_pedido, percentual_comissao,
          valor_comissao, mes_competencia, regra_id, status
        ) VALUES (
          NEW.vendedor_id, NEW.id, NEW.valor_total, v_faixa.percentual,
          v_valor_comissao, v_mes_competencia, v_regra_id, 'pendente'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_gerar_comissao
  AFTER UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION gerar_comissao_automatica();

-- 7. Trigger para cancelar comissão quando pedido é cancelado
CREATE OR REPLACE FUNCTION cancelar_comissao_pedido_cancelado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelado' AND (OLD.status IS NULL OR OLD.status != 'cancelado') THEN
    UPDATE comissoes
    SET status = 'cancelada',
        observacao = COALESCE(observacao, '') || ' | Pedido cancelado em ' || NOW()::DATE,
        updated_at = NOW()
    WHERE pedido_id = NEW.id AND status = 'pendente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_cancelar_comissao
  AFTER UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION cancelar_comissao_pedido_cancelado();

-- 8. RLS Policies
ALTER TABLE comissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem suas comissões"
ON comissoes FOR SELECT TO authenticated
USING (vendedor_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar comissões"
ON comissoes FOR UPDATE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar comissões"
ON comissoes FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Sistema pode inserir comissões"
ON comissoes FOR INSERT TO authenticated
WITH CHECK (TRUE);

ALTER TABLE faixas_comissao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver faixas"
ON faixas_comissao FOR SELECT TO authenticated
USING (TRUE);

CREATE POLICY "Apenas admins podem gerenciar faixas"
ON faixas_comissao FOR ALL TO authenticated
USING (is_admin(auth.uid()));

ALTER TABLE regras_comissao_vendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem suas regras"
ON regras_comissao_vendedor FOR SELECT TO authenticated
USING (vendedor_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Admins podem gerenciar regras"
ON regras_comissao_vendedor FOR ALL TO authenticated
USING (is_admin(auth.uid()));

ALTER TABLE faixas_comissao_vendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso via regra"
ON faixas_comissao_vendedor FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM regras_comissao_vendedor
    WHERE id = faixas_comissao_vendedor.regra_id
      AND (vendedor_id = auth.uid() OR is_admin(auth.uid()))
  )
);

CREATE POLICY "Admins podem gerenciar faixas"
ON faixas_comissao_vendedor FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM regras_comissao_vendedor
    WHERE id = faixas_comissao_vendedor.regra_id
      AND is_admin(auth.uid())
  )
);

-- 9. Triggers de updated_at
CREATE TRIGGER update_comissoes_updated_at
  BEFORE UPDATE ON comissoes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_regras_comissao_updated_at
  BEFORE UPDATE ON regras_comissao_vendedor
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();