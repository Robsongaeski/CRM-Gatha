-- ============================================================================
-- SISTEMA DE COMISSÕES BASEADO EM PAGAMENTOS APROVADOS
-- ============================================================================
-- Este migration implementa:
-- 1. Novas colunas na tabela comissoes
-- 2. Trigger para gerar comissão quando pagamento é aprovado
-- 3. Trigger para cancelar comissão quando pagamento é estornado
-- 4. Atualização da função existente para gerar apenas comissão prevista
-- ============================================================================

-- 1. ADICIONAR NOVAS COLUNAS NA TABELA COMISSOES
-- ============================================================================
ALTER TABLE comissoes
  ADD COLUMN IF NOT EXISTS pagamento_id UUID REFERENCES pagamentos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS valor_pago NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_comissao TEXT DEFAULT 'prevista';

-- Adicionar constraint para tipo_comissao
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comissoes_tipo_comissao_check'
  ) THEN
    ALTER TABLE comissoes ADD CONSTRAINT comissoes_tipo_comissao_check 
      CHECK (tipo_comissao IN ('prevista', 'efetiva'));
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_comissoes_pagamento_id ON comissoes(pagamento_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_tipo ON comissoes(tipo_comissao);
CREATE INDEX IF NOT EXISTS idx_comissoes_mes_competencia ON comissoes(mes_competencia);

-- Atualizar comissões existentes para tipo 'efetiva' se status for pendente ou paga
UPDATE comissoes 
SET tipo_comissao = 'efetiva' 
WHERE status IN ('pendente', 'paga') AND tipo_comissao = 'prevista';

-- ============================================================================
-- 2. FUNÇÃO AUXILIAR: Calcular percentual de comissão do mês do pedido
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calcular_percentual_comissao(
  p_vendedor_id UUID,
  p_mes_pedido DATE
)
RETURNS NUMERIC AS $$
DECLARE
  v_total_vendas_mes NUMERIC;
  v_regra_id UUID;
  v_percentual NUMERIC := 0;
BEGIN
  -- Buscar regra ativa do vendedor na data do pedido
  SELECT id INTO v_regra_id
  FROM regras_comissao_vendedor
  WHERE vendedor_id = p_vendedor_id
    AND ativo = true
    AND data_inicio <= p_mes_pedido
    AND (data_fim IS NULL OR data_fim >= p_mes_pedido)
  ORDER BY data_inicio DESC
  LIMIT 1;

  -- Calcular total de vendas do mês do pedido (excluindo cancelados e aguardando aprovação)
  SELECT COALESCE(SUM(valor_total), 0) INTO v_total_vendas_mes
  FROM pedidos
  WHERE vendedor_id = p_vendedor_id
    AND DATE_TRUNC('month', data_pedido) = DATE_TRUNC('month', p_mes_pedido)
    AND status != 'cancelado'
    AND (requer_aprovacao_preco IS NULL OR requer_aprovacao_preco = false);

  -- Buscar faixa de comissão apropriada (personalizada ou padrão)
  IF v_regra_id IS NOT NULL THEN
    SELECT percentual INTO v_percentual
    FROM faixas_comissao_vendedor
    WHERE regra_id = v_regra_id
      AND v_total_vendas_mes >= valor_minimo
      AND (valor_maximo IS NULL OR v_total_vendas_mes <= valor_maximo)
    ORDER BY ordem DESC
    LIMIT 1;
  ELSE
    SELECT percentual INTO v_percentual
    FROM faixas_comissao
    WHERE ativo = true
      AND v_total_vendas_mes >= valor_minimo
      AND (valor_maximo IS NULL OR v_total_vendas_mes <= valor_maximo)
    ORDER BY ordem DESC
    LIMIT 1;
  END IF;

  RETURN COALESCE(v_percentual, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 3. FUNÇÃO: Gerar comissão quando pagamento é aprovado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.gerar_comissao_por_pagamento()
RETURNS TRIGGER AS $$
DECLARE
  v_pedido RECORD;
  v_mes_pedido DATE;
  v_mes_aprovacao DATE;
  v_percentual NUMERIC;
  v_valor_comissao NUMERIC;
  v_regra_id UUID;
  v_comissao_existente UUID;
BEGIN
  -- Só processar quando status muda para 'aprovado'
  IF NEW.status != 'aprovado' OR OLD.status = 'aprovado' THEN
    RETURN NEW;
  END IF;

  RAISE NOTICE 'Gerando comissão para pagamento % (valor: %)', NEW.id, NEW.valor;

  -- Buscar dados do pedido
  SELECT p.*, pr.id as vendedor_id
  INTO v_pedido
  FROM pedidos p
  JOIN profiles pr ON p.vendedor_id = pr.id
  WHERE p.id = NEW.pedido_id;

  IF v_pedido IS NULL THEN
    RAISE NOTICE 'Pedido % não encontrado', NEW.pedido_id;
    RETURN NEW;
  END IF;

  -- Ignorar pedidos cancelados
  IF v_pedido.status = 'cancelado' THEN
    RAISE NOTICE 'Pedido % está cancelado, ignorando', NEW.pedido_id;
    RETURN NEW;
  END IF;

  -- Datas importantes
  v_mes_pedido := DATE_TRUNC('month', v_pedido.data_pedido);
  v_mes_aprovacao := DATE_TRUNC('month', NEW.data_aprovacao::DATE);

  -- Calcular percentual baseado no mês do PEDIDO
  v_percentual := calcular_percentual_comissao(v_pedido.vendedor_id, v_mes_pedido);

  IF v_percentual <= 0 THEN
    RAISE NOTICE 'Nenhuma faixa de comissão encontrada para vendedor %', v_pedido.vendedor_id;
    RETURN NEW;
  END IF;

  -- Calcular valor da comissão proporcional ao pagamento
  v_valor_comissao := (NEW.valor * v_percentual / 100);

  -- Buscar regra ativa do vendedor (para referência)
  SELECT id INTO v_regra_id
  FROM regras_comissao_vendedor
  WHERE vendedor_id = v_pedido.vendedor_id
    AND ativo = true
    AND data_inicio <= CURRENT_DATE
    AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
  ORDER BY data_inicio DESC
  LIMIT 1;

  -- Verificar se já existe comissão para este pagamento
  SELECT id INTO v_comissao_existente
  FROM comissoes
  WHERE pagamento_id = NEW.id;

  IF v_comissao_existente IS NULL THEN
    -- Criar nova comissão efetiva
    INSERT INTO comissoes (
      vendedor_id,
      pedido_id,
      pagamento_id,
      valor_pedido,
      valor_pago,
      percentual_comissao,
      valor_comissao,
      mes_competencia,
      status,
      tipo_comissao,
      regra_id,
      observacao
    ) VALUES (
      v_pedido.vendedor_id,
      NEW.pedido_id,
      NEW.id,
      v_pedido.valor_total,
      NEW.valor,
      v_percentual,
      v_valor_comissao,
      v_mes_aprovacao, -- Competência = mês da aprovação
      'pendente', -- Confirmada (aguardando pagamento ao vendedor)
      'efetiva',
      v_regra_id,
      'Comissão gerada por pagamento aprovado em ' || TO_CHAR(NEW.data_aprovacao::DATE, 'DD/MM/YYYY')
    );
    
    RAISE NOTICE 'Comissão efetiva criada: R$ % (% sobre R$ %) - Competência: %', 
      v_valor_comissao, v_percentual, NEW.valor, v_mes_aprovacao;
  ELSE
    RAISE NOTICE 'Comissão já existe para pagamento %', NEW.id;
  END IF;

  -- Atualizar/Reduzir comissão prevista do pedido
  UPDATE comissoes
  SET valor_pago = COALESCE(valor_pago, 0) + NEW.valor,
      valor_comissao = GREATEST(0, valor_comissao - v_valor_comissao),
      observacao = COALESCE(observacao, '') || ' | Reduzida em ' || TO_CHAR(NOW()::DATE, 'DD/MM/YYYY'),
      updated_at = NOW()
  WHERE pedido_id = NEW.pedido_id
    AND tipo_comissao = 'prevista'
    AND status = 'prevista';

  -- Se valor previsto zerou, marcar como cancelada (convertida)
  UPDATE comissoes
  SET status = 'cancelada',
      observacao = 'Convertida para comissões efetivas'
  WHERE pedido_id = NEW.pedido_id
    AND tipo_comissao = 'prevista'
    AND valor_comissao <= 0;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 4. FUNÇÃO: Cancelar comissão quando pagamento é estornado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancelar_comissao_pagamento()
RETURNS TRIGGER AS $$
DECLARE
  v_comissao RECORD;
BEGIN
  -- Só processar quando pagamento é estornado
  IF NEW.estornado = false OR OLD.estornado = true THEN
    RETURN NEW;
  END IF;

  RAISE NOTICE 'Cancelando comissão para pagamento estornado %', NEW.id;

  -- Buscar comissão relacionada ao pagamento
  SELECT * INTO v_comissao
  FROM comissoes
  WHERE pagamento_id = NEW.id;

  IF v_comissao IS NOT NULL THEN
    -- Cancelar a comissão efetiva
    UPDATE comissoes
    SET status = 'cancelada',
        observacao = COALESCE(observacao, '') || ' | Estornada em ' || TO_CHAR(NOW()::DATE, 'DD/MM/YYYY') || ': ' || COALESCE(NEW.motivo_estorno, 'Sem motivo'),
        updated_at = NOW()
    WHERE id = v_comissao.id;

    -- Aumentar comissão prevista do pedido (se existir)
    UPDATE comissoes
    SET valor_comissao = valor_comissao + v_comissao.valor_comissao,
        valor_pago = GREATEST(0, COALESCE(valor_pago, 0) - NEW.valor),
        updated_at = NOW()
    WHERE pedido_id = NEW.pedido_id
      AND tipo_comissao = 'prevista'
      AND status != 'cancelada';

    RAISE NOTICE 'Comissão % cancelada por estorno', v_comissao.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 5. ATUALIZAR FUNÇÃO: Gerar apenas comissão prevista ao criar pedido
-- ============================================================================
CREATE OR REPLACE FUNCTION public.gerar_comissao_automatica()
RETURNS TRIGGER AS $$
DECLARE
  v_mes_competencia DATE;
  v_percentual NUMERIC;
  v_valor_comissao NUMERIC;
  v_regra_id UUID;
  v_comissao_existente UUID;
BEGIN
  RAISE NOTICE 'Processando comissão prevista para pedido % (Operação: %)', NEW.id, TG_OP;

  -- Determinar se deve processar
  -- Só criar comissão prevista para pedidos novos ou quando aprovação de preço é removida
  IF (TG_OP = 'INSERT' AND (NEW.requer_aprovacao_preco IS NULL OR NEW.requer_aprovacao_preco = false)) OR
     (TG_OP = 'UPDATE' AND OLD.requer_aprovacao_preco = true AND NEW.requer_aprovacao_preco = false) THEN

    -- Ignorar pedidos cancelados
    IF NEW.status = 'cancelado' THEN
      RAISE NOTICE 'Pedido % ignorado: status=%', NEW.id, NEW.status;
      RETURN NEW;
    END IF;

    v_mes_competencia := DATE_TRUNC('month', NEW.data_pedido);

    -- Calcular percentual baseado no mês do pedido
    v_percentual := calcular_percentual_comissao(NEW.vendedor_id, v_mes_competencia);

    IF v_percentual <= 0 THEN
      RAISE NOTICE 'Nenhuma faixa de comissão encontrada para vendedor %', NEW.vendedor_id;
      RETURN NEW;
    END IF;

    -- Calcular valor da comissão prevista (sobre o total do pedido)
    v_valor_comissao := (NEW.valor_total * v_percentual / 100);

    -- Buscar regra ativa do vendedor
    SELECT id INTO v_regra_id
    FROM regras_comissao_vendedor
    WHERE vendedor_id = NEW.vendedor_id
      AND ativo = true
      AND data_inicio <= CURRENT_DATE
      AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
    ORDER BY data_inicio DESC
    LIMIT 1;

    -- Verificar se já existe comissão PREVISTA para este pedido
    SELECT id INTO v_comissao_existente
    FROM comissoes
    WHERE pedido_id = NEW.id
      AND tipo_comissao = 'prevista';

    IF v_comissao_existente IS NULL THEN
      -- Criar nova comissão prevista
      INSERT INTO comissoes (
        vendedor_id,
        pedido_id,
        valor_pedido,
        percentual_comissao,
        valor_comissao,
        mes_competencia,
        status,
        tipo_comissao,
        regra_id,
        observacao
      ) VALUES (
        NEW.vendedor_id,
        NEW.id,
        NEW.valor_total,
        v_percentual,
        v_valor_comissao,
        v_mes_competencia,
        'prevista',
        'prevista',
        v_regra_id,
        'Comissão prevista - aguardando pagamento'
      );
      
      RAISE NOTICE 'Comissão prevista criada: R$ % (% sobre R$ %)', v_valor_comissao, v_percentual, NEW.valor_total;
    ELSE
      -- Atualizar comissão prevista existente (se valor do pedido mudou)
      UPDATE comissoes
      SET valor_pedido = NEW.valor_total,
          percentual_comissao = v_percentual,
          valor_comissao = v_valor_comissao,
          updated_at = NOW()
      WHERE id = v_comissao_existente
        AND status = 'prevista'; -- Só atualizar se ainda é prevista
      
      RAISE NOTICE 'Comissão prevista atualizada: %', v_comissao_existente;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 6. FUNÇÃO: Cancelar comissões quando pedido é cancelado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancelar_comissao_pedido_cancelado()
RETURNS TRIGGER AS $$
BEGIN
  -- Cancelar TODAS as comissões quando pedido for cancelado
  IF NEW.status = 'cancelado' AND (OLD.status IS NULL OR OLD.status != 'cancelado') THEN
    
    UPDATE comissoes
    SET status = 'cancelada',
        observacao = COALESCE(observacao, '') || ' | Pedido cancelado em ' || NOW()::DATE,
        updated_at = NOW()
    WHERE pedido_id = NEW.id
      AND status IN ('pendente', 'prevista');
    
    RAISE NOTICE 'Comissões canceladas para pedido %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- 7. RECRIAR TRIGGERS
-- ============================================================================
-- Trigger para comissão prevista ao criar pedido
DROP TRIGGER IF EXISTS trigger_gerar_comissao ON pedidos;
CREATE TRIGGER trigger_gerar_comissao
  AFTER INSERT OR UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION gerar_comissao_automatica();

-- Trigger para cancelar ao cancelar pedido
DROP TRIGGER IF EXISTS trigger_cancelar_comissao ON pedidos;
CREATE TRIGGER trigger_cancelar_comissao
  AFTER UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION cancelar_comissao_pedido_cancelado();

-- Trigger para comissão efetiva ao aprovar pagamento
DROP TRIGGER IF EXISTS trigger_comissao_pagamento_aprovado ON pagamentos;
CREATE TRIGGER trigger_comissao_pagamento_aprovado
  AFTER UPDATE ON pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION gerar_comissao_por_pagamento();

-- Trigger para cancelar comissão ao estornar pagamento
DROP TRIGGER IF EXISTS trigger_comissao_pagamento_estornado ON pagamentos;
CREATE TRIGGER trigger_comissao_pagamento_estornado
  AFTER UPDATE ON pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION cancelar_comissao_pagamento();

-- ============================================================================
SELECT '✅ Sistema de comissões por pagamento implementado com sucesso!' as resultado;
-- ============================================================================