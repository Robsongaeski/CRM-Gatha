-- Corrigir a FK de pedidos_historico para permitir exclusão em cascata
-- Isso permite que quando um pedido é deletado, o histórico seja deletado junto

-- Primeiro remover a constraint existente
ALTER TABLE public.pedidos_historico 
DROP CONSTRAINT IF EXISTS pedidos_historico_pedido_id_fkey;

-- Recriar com ON DELETE CASCADE
ALTER TABLE public.pedidos_historico 
ADD CONSTRAINT pedidos_historico_pedido_id_fkey 
FOREIGN KEY (pedido_id) 
REFERENCES public.pedidos(id) 
ON DELETE CASCADE;

-- Também precisamos alterar o trigger para NÃO registrar histórico na exclusão
-- pois o registro seria deletado junto com o pedido de qualquer forma
CREATE OR REPLACE FUNCTION public.registrar_historico_pedido()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_descricao TEXT;
  v_campos_alterados TEXT[];
BEGIN
  -- Obter o usuário atual
  v_usuario_id := auth.uid();
  
  IF v_usuario_id IS NULL THEN
    v_usuario_id := '00000000-0000-0000-0000-000000000000'::UUID;
  END IF;
  
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.pedidos_historico (
      pedido_id, usuario_id, tipo_alteracao, descricao
    ) VALUES (
      NEW.id, v_usuario_id, 'criacao',
      'Pedido #' || NEW.numero_pedido || ' criado'
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Verificar e registrar alterações em cada campo relevante
    
    -- Status do pedido
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'status',
        OLD.status::TEXT, NEW.status::TEXT,
        'Status alterado de "' || OLD.status || '" para "' || NEW.status || '"'
      );
    END IF;
    
    -- Status de pagamento
    IF OLD.status_pagamento IS DISTINCT FROM NEW.status_pagamento THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'status_pagamento',
        OLD.status_pagamento::TEXT, NEW.status_pagamento::TEXT,
        'Status de pagamento alterado de "' || OLD.status_pagamento || '" para "' || NEW.status_pagamento || '"'
      );
    END IF;
    
    -- Valor total
    IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'valor_total',
        OLD.valor_total::TEXT, NEW.valor_total::TEXT,
        'Valor total alterado de R$ ' || OLD.valor_total || ' para R$ ' || NEW.valor_total
      );
    END IF;
    
    -- Data de entrega
    IF OLD.data_entrega IS DISTINCT FROM NEW.data_entrega THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'data_entrega',
        COALESCE(OLD.data_entrega::TEXT, 'não definida'), 
        COALESCE(NEW.data_entrega::TEXT, 'não definida'),
        'Data de entrega alterada'
      );
    END IF;
    
    -- Cliente
    IF OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'cliente_id',
        OLD.cliente_id::TEXT, NEW.cliente_id::TEXT,
        'Cliente alterado'
      );
    END IF;
    
    -- Observação
    IF OLD.observacao IS DISTINCT FROM NEW.observacao THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'observacao',
        COALESCE(OLD.observacao, ''), 
        COALESCE(NEW.observacao, ''),
        'Observação alterada'
      );
    END IF;
    
    -- Etapa de produção
    IF OLD.etapa_producao_id IS DISTINCT FROM NEW.etapa_producao_id THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'etapa_producao_id',
        COALESCE(OLD.etapa_producao_id::TEXT, 'nenhuma'), 
        COALESCE(NEW.etapa_producao_id::TEXT, 'nenhuma'),
        'Etapa de produção alterada'
      );
    END IF;
    
    -- Vendedor
    IF OLD.vendedor_id IS DISTINCT FROM NEW.vendedor_id THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'vendedor_id',
        OLD.vendedor_id::TEXT, 
        NEW.vendedor_id::TEXT,
        'Vendedor alterado'
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF (TG_OP = 'DELETE') THEN
    -- NÃO registrar histórico na exclusão pois o pedido será deletado
    -- e o histórico será removido em cascata pela FK
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;