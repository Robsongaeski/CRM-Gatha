
-- 1. Atualizar comissões existentes com valor zerado
UPDATE comissoes c
SET 
  valor_pedido = p.valor_total,
  valor_comissao = (p.valor_total * c.percentual_comissao / 100),
  updated_at = NOW()
FROM pedidos p
WHERE c.pedido_id = p.id
  AND c.valor_comissao = 0
  AND p.valor_total > 0
  AND p.status != 'cancelado';

-- 2. Criar comissões faltantes para pedidos sem comissão
DO $$
DECLARE
  v_pedido RECORD;
  v_mes_competencia DATE;
  v_total_vendas_mes NUMERIC;
  v_regra_id UUID;
  v_faixa RECORD;
  v_valor_comissao NUMERIC;
  v_novo_status TEXT;
  v_observacao TEXT;
BEGIN
  FOR v_pedido IN (
    SELECT p.*
    FROM pedidos p
    LEFT JOIN comissoes c ON c.pedido_id = p.id
    WHERE c.id IS NULL
      AND p.status != 'cancelado'
      AND (p.requer_aprovacao_preco IS NULL OR p.requer_aprovacao_preco = false)
      AND p.valor_total > 0
  ) LOOP
    
    v_mes_competencia := DATE_TRUNC('month', v_pedido.data_pedido);

    -- Buscar regra ativa do vendedor
    SELECT id INTO v_regra_id
    FROM regras_comissao_vendedor
    WHERE vendedor_id = v_pedido.vendedor_id
      AND ativo = true
      AND data_inicio <= CURRENT_DATE
      AND (data_fim IS NULL OR data_fim >= CURRENT_DATE)
    ORDER BY data_inicio DESC
    LIMIT 1;

    -- Calcular total de vendas do mês
    SELECT COALESCE(SUM(valor_total), 0) INTO v_total_vendas_mes
    FROM pedidos
    WHERE vendedor_id = v_pedido.vendedor_id
      AND DATE_TRUNC('month', data_pedido) = v_mes_competencia
      AND status != 'cancelado'
      AND (requer_aprovacao_preco IS NULL OR requer_aprovacao_preco = false);

    -- Buscar faixa apropriada
    IF v_regra_id IS NOT NULL THEN
      SELECT * INTO v_faixa
      FROM faixas_comissao_vendedor
      WHERE regra_id = v_regra_id
        AND v_total_vendas_mes >= valor_minimo
        AND (valor_maximo IS NULL OR v_total_vendas_mes <= valor_maximo)
      ORDER BY ordem DESC
      LIMIT 1;
    ELSE
      SELECT * INTO v_faixa
      FROM faixas_comissao
      WHERE ativo = true
        AND v_total_vendas_mes >= valor_minimo
        AND (valor_maximo IS NULL OR v_total_vendas_mes <= valor_maximo)
      ORDER BY ordem DESC
      LIMIT 1;
    END IF;

    IF v_faixa IS NOT NULL THEN
      v_valor_comissao := (v_pedido.valor_total * v_faixa.percentual / 100);

      -- Determinar status
      IF v_pedido.status_pagamento = 'quitado' THEN
        v_novo_status := 'pendente';
        v_observacao := 'Comissão confirmada - pedido quitado';
      ELSE
        v_novo_status := 'prevista';
        v_observacao := 'Comissão prevista - aguardando quitação';
      END IF;

      -- Criar comissão
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
        v_pedido.vendedor_id,
        v_pedido.id,
        v_pedido.valor_total,
        v_faixa.percentual,
        v_valor_comissao,
        v_mes_competencia,
        v_novo_status,
        v_regra_id,
        v_observacao
      );
    END IF;
  END LOOP;
END $$;
