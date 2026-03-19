-- ============================================================================
-- SCRIPT DE CORREÇÃO: Sistema de Comissões Previstas
-- ============================================================================
-- Este script corrige a geração automática de comissões e adiciona suporte
-- para comissões previstas (pedidos não quitados) e pendentes (pedidos quitados)
-- ============================================================================

-- 1. FUNÇÃO: Gerar Comissão Automática
-- ============================================================================
CREATE OR REPLACE FUNCTION public.gerar_comissao_automatica()
RETURNS TRIGGER AS $$
DECLARE
  v_mes_competencia DATE;
  v_total_vendas_mes NUMERIC;
  v_regra_id UUID;
  v_faixa RECORD;
  v_valor_comissao NUMERIC;
  v_comissao_existente UUID;
  v_novo_status TEXT;
  v_observacao TEXT;
BEGIN
  -- Log para debugging
  RAISE NOTICE 'Processando comissão para pedido % (Operação: %)', NEW.id, TG_OP;

  -- Determinar se deve processar
  IF (TG_OP = 'INSERT' AND (NEW.requer_aprovacao_preco IS NULL OR NEW.requer_aprovacao_preco = false)) OR
     (TG_OP = 'UPDATE' AND OLD.requer_aprovacao_preco = true AND NEW.requer_aprovacao_preco = false) OR
     (TG_OP = 'UPDATE' AND OLD.status_pagamento IS DISTINCT FROM NEW.status_pagamento) THEN

    -- Ignorar pedidos cancelados
    IF NEW.status = 'cancelado' THEN
      RAISE NOTICE 'Pedido % ignorado: status=%', NEW.id, NEW.status;
      RETURN NEW;
    END IF;

    v_mes_competencia := DATE_TRUNC('month', NEW.data_pedido);

    -- Buscar regra ativa do vendedor
    SELECT id INTO v_regra_id
    FROM regras_comissao_vendedor
    WHERE vendedor_id = NEW.vendedor_id
      AND ativo = true
      AND data_inicio <= CURRENT_DATE
      AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
    ORDER BY data_inicio DESC
    LIMIT 1;

    -- Calcular total de vendas do mês (excluindo cancelados e aguardando aprovação)
    SELECT COALESCE(SUM(valor_total), 0) INTO v_total_vendas_mes
    FROM pedidos
    WHERE vendedor_id = NEW.vendedor_id
      AND DATE_TRUNC('month', data_pedido) = v_mes_competencia
      AND status != 'cancelado'
      AND (requer_aprovacao_preco IS NULL OR requer_aprovacao_preco = false);

    RAISE NOTICE 'Total vendas do mês para vendedor %: %', NEW.vendedor_id, v_total_vendas_mes;

    -- Buscar faixa de comissão apropriada (personalizada ou padrão)
    IF v_regra_id IS NOT NULL THEN
      SELECT * INTO v_faixa
      FROM faixas_comissao_vendedor
      WHERE regra_id = v_regra_id
        AND v_total_vendas_mes >= valor_minimo
        AND (valor_maximo IS NULL OR v_total_vendas_mes <= valor_maximo)
      ORDER BY ordem DESC
      LIMIT 1;
      
      RAISE NOTICE 'Usando faixa personalizada: %', v_faixa.percentual;
    ELSE
      SELECT * INTO v_faixa
      FROM faixas_comissao
      WHERE ativo = true
        AND v_total_vendas_mes >= valor_minimo
        AND (valor_maximo IS NULL OR v_total_vendas_mes <= valor_maximo)
      ORDER BY ordem DESC
      LIMIT 1;
      
      RAISE NOTICE 'Usando faixa padrão: %', v_faixa.percentual;
    END IF;

    IF v_faixa IS NOT NULL THEN
      v_valor_comissao := (NEW.valor_total * v_faixa.percentual / 100);

      -- Determinar status e observação
      IF NEW.status_pagamento = 'quitado' THEN
        v_novo_status := 'pendente';
        v_observacao := 'Comissão confirmada - pedido quitado';
      ELSE
        v_novo_status := 'prevista';
        v_observacao := 'Comissão prevista - aguardando quitação';
      END IF;

      -- Verificar se já existe comissão para este pedido
      SELECT id INTO v_comissao_existente
      FROM comissoes
      WHERE pedido_id = NEW.id;

      IF v_comissao_existente IS NULL THEN
        -- Criar nova comissão
        INSERT INTO comissoes (
          vendedor_id,
          pedido_id,
          valor_pedido,
          percentual_comissao,
          valor_comissao,
          mes_competencia,
          status,
          regra_id,
          observacao
        ) VALUES (
          NEW.vendedor_id,
          NEW.id,
          NEW.valor_total,
          v_faixa.percentual,
          v_valor_comissao,
          v_mes_competencia,
          v_novo_status,
          v_regra_id,
          v_observacao
        );
        
        RAISE NOTICE 'Comissão criada: % (status: %)', v_valor_comissao, v_novo_status;
      ELSE
        -- Atualizar comissão existente
        UPDATE comissoes
        SET valor_pedido = NEW.valor_total,
            percentual_comissao = v_faixa.percentual,
            valor_comissao = v_valor_comissao,
            status = v_novo_status,
            observacao = v_observacao,
            updated_at = NOW()
        WHERE id = v_comissao_existente;
        
        RAISE NOTICE 'Comissão atualizada: % -> % (status: %)', v_comissao_existente, v_valor_comissao, v_novo_status;
      END IF;
    ELSE
      RAISE NOTICE 'Nenhuma faixa de comissão encontrada para o valor %', v_total_vendas_mes;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. FUNÇÃO: Cancelar Comissão de Pedido Cancelado
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cancelar_comissao_pedido_cancelado()
RETURNS TRIGGER AS $$
BEGIN
  -- Cancelar comissão quando pedido for cancelado
  IF NEW.status = 'cancelado' AND (OLD.status IS NULL OR OLD.status != 'cancelado') THEN
    
    UPDATE comissoes
    SET status = 'cancelada',
        observacao = COALESCE(observacao, '') || ' | Pedido cancelado em ' || NOW()::DATE,
        updated_at = NOW()
    WHERE pedido_id = NEW.id
      AND status IN ('pendente', 'prevista');
    
    RAISE NOTICE 'Comissão cancelada para pedido %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. RECRIAR TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_gerar_comissao ON pedidos;
CREATE TRIGGER trigger_gerar_comissao
  AFTER INSERT OR UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION gerar_comissao_automatica();

DROP TRIGGER IF EXISTS trigger_cancelar_comissao ON pedidos;
CREATE TRIGGER trigger_cancelar_comissao
  AFTER UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION cancelar_comissao_pedido_cancelado();

-- 4. GERAR COMISSÕES RETROATIVAS
-- ============================================================================
-- Atualiza pedidos existentes que não têm comissão para disparar o trigger
DO $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  UPDATE pedidos p
  SET updated_at = updated_at
  FROM (
    SELECT p.id
    FROM pedidos p
    LEFT JOIN comissoes c ON c.pedido_id = p.id
    WHERE c.id IS NULL
      AND p.status != 'cancelado'
      AND (p.requer_aprovacao_preco IS NULL OR p.requer_aprovacao_preco = false)
  ) AS pedidos_sem_comissao
  WHERE p.id = pedidos_sem_comissao.id;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Processados % pedidos retroativos', v_count;
END $$;

-- 5. VERIFICAÇÕES (OPCIONAL - pode comentar após verificar)
-- ============================================================================
-- Verificar status das comissões
SELECT 
  status,
  COUNT(*) as quantidade,
  SUM(valor_comissao) as total
FROM comissoes
GROUP BY status
ORDER BY status;

-- Verificar comissões da vendedora Celi
SELECT 
  c.status,
  COUNT(*) as quantidade,
  SUM(c.valor_comissao) as total_comissao,
  SUM(c.valor_pedido) as total_vendas
FROM comissoes c
JOIN profiles p ON c.vendedor_id = p.id
WHERE p.nome ILIKE '%celi%'
GROUP BY c.status;

-- ============================================================================
SELECT '✅ Script executado com sucesso! Sistema de comissões previstas ativado.' as resultado;
-- ============================================================================
