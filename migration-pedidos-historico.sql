-- =====================================================
-- MIGRATION: Sistema de Auditoria para Pedidos
-- =====================================================
-- 
-- INSTRUÇÕES:
-- 1. Copie todo este SQL
-- 2. Acesse o Supabase Dashboard do projeto
-- 3. Vá em "SQL Editor"
-- 4. Cole o SQL e execute
--
-- Esta migration cria:
-- - Tabela pedidos_historico para registrar todas as alterações
-- - Função pode_editar_pedido para verificar permissões
-- - Trigger automático para capturar alterações nos pedidos
-- - Políticas RLS para segurança
--
-- =====================================================

-- Tabela de histórico de alterações nos pedidos
CREATE TABLE IF NOT EXISTS public.pedidos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo_alteracao TEXT NOT NULL, -- 'criacao', 'edicao', 'status', 'exclusao'
  campo_alterado TEXT, -- qual campo foi alterado
  valor_anterior TEXT, -- valor antes da alteração
  valor_novo TEXT, -- valor depois da alteração
  descricao TEXT NOT NULL, -- descrição legível da alteração
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pedidos_historico_pedido ON public.pedidos_historico(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_historico_usuario ON public.pedidos_historico(usuario_id);

-- Habilitar RLS
ALTER TABLE public.pedidos_historico ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver o histórico de pedidos que têm acesso
CREATE POLICY "Ver histórico de pedidos visíveis"
ON public.pedidos_historico
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos
    WHERE pedidos.id = pedidos_historico.pedido_id
    AND (pedidos.vendedor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Policy: Sistema pode inserir no histórico (authenticated users)
CREATE POLICY "Sistema pode inserir histórico"
ON public.pedidos_historico
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Função para verificar se pedido pode ser editado
CREATE OR REPLACE FUNCTION public.pode_editar_pedido(p_pedido_id UUID, p_usuario_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_tem_pagamento_aprovado BOOLEAN;
BEGIN
  -- 1) Admin pode sempre editar
  SELECT public.is_admin(p_usuario_id) INTO v_is_admin;
  
  IF v_is_admin THEN
    RETURN TRUE;
  END IF;
  
  -- 2) Verificar se existe algum pagamento aprovado (não estornado)
  SELECT EXISTS(
    SELECT 1 
    FROM public.pagamentos
    WHERE pedido_id = p_pedido_id
      AND status = 'aprovado'
      AND estornado = false
  ) INTO v_tem_pagamento_aprovado;
  
  -- 3) Se tem pagamento aprovado, NÃO pode editar (para não-admin)
  IF v_tem_pagamento_aprovado THEN
    RETURN FALSE;
  END IF;
  
  -- 4) Sem pagamento aprovado => PODE editar
  RETURN TRUE;
END;
$$;

-- Trigger para registrar alterações automaticamente
CREATE OR REPLACE FUNCTION public.registrar_historico_pedido()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  -- Garante que sempre teremos um usuario_id válido
  v_usuario_id := COALESCE(auth.uid(), NEW.vendedor_id, OLD.vendedor_id);
  
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.pedidos_historico (
      pedido_id, usuario_id, tipo_alteracao, descricao
    ) VALUES (
      NEW.id, v_usuario_id, 'criacao', 
      'Pedido criado'
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Status do pedido alterado
    IF OLD.status != NEW.status THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'status', 'status',
        OLD.status, NEW.status,
        'Status alterado de "' || OLD.status || '" para "' || NEW.status || '"'
      );
    END IF;
    
    -- Data de entrega alterada
    IF (OLD.data_entrega IS DISTINCT FROM NEW.data_entrega) THEN
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
    
    -- Valor total alterado
    IF OLD.valor_total != NEW.valor_total THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'valor_total',
        OLD.valor_total::TEXT, NEW.valor_total::TEXT,
        'Valor total alterado de R$ ' || OLD.valor_total || ' para R$ ' || NEW.valor_total
      );
    END IF;
    
    -- Status de pagamento alterado
    IF OLD.status_pagamento != NEW.status_pagamento THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'status_pagamento',
        OLD.status_pagamento, NEW.status_pagamento,
        'Status de pagamento alterado de "' || OLD.status_pagamento || '" para "' || NEW.status_pagamento || '"'
      );
    END IF;
    
    -- Observação alterada
    IF (OLD.observacao IS DISTINCT FROM NEW.observacao) THEN
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
    
    -- Cliente alterado
    IF OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'cliente_id',
        OLD.cliente_id::TEXT, 
        NEW.cliente_id::TEXT,
        'Cliente alterado'
      );
    END IF;
    
    -- Vendedor alterado
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
    INSERT INTO public.pedidos_historico (
      pedido_id, usuario_id, tipo_alteracao, descricao
    ) VALUES (
      OLD.id, v_usuario_id, 'exclusao',
      'Pedido excluído'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_registrar_historico_pedido ON public.pedidos;
CREATE TRIGGER trigger_registrar_historico_pedido
AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_pedido();

-- =====================================================
-- TRIGGER PARA PEDIDO_ITENS
-- =====================================================

-- Função para registrar alterações nos itens do pedido
CREATE OR REPLACE FUNCTION public.registrar_historico_pedido_itens()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_pedido_id UUID;
  v_produto_nome TEXT;
BEGIN
  v_pedido_id := COALESCE(NEW.pedido_id, OLD.pedido_id);
  v_usuario_id := COALESCE(auth.uid(), (SELECT vendedor_id FROM public.pedidos WHERE id = v_pedido_id));
  
  -- Buscar nome do produto
  SELECT nome INTO v_produto_nome
  FROM public.produtos
  WHERE id = COALESCE(NEW.produto_id, OLD.produto_id);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.pedidos_historico (
      pedido_id, usuario_id, tipo_alteracao, campo_alterado, valor_novo, descricao
    ) VALUES (
      NEW.pedido_id, v_usuario_id, 'edicao', 'item_adicionado',
      NEW.quantidade || 'x R$ ' || NEW.valor_unitario,
      'Item adicionado: ' || COALESCE(v_produto_nome, 'Produto') || ' (' || NEW.quantidade || 'x R$ ' || NEW.valor_unitario || ')'
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Registra se quantidade ou valor mudou
    IF (OLD.quantidade IS DISTINCT FROM NEW.quantidade) OR (OLD.valor_unitario IS DISTINCT FROM NEW.valor_unitario) THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado, 
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.pedido_id, v_usuario_id, 'edicao', 'item',
        OLD.quantidade || 'x R$ ' || OLD.valor_unitario,
        NEW.quantidade || 'x R$ ' || NEW.valor_unitario,
        COALESCE(v_produto_nome, 'Produto') || ': ' ||
        (CASE WHEN OLD.quantidade IS DISTINCT FROM NEW.quantidade 
              THEN 'quantidade: ' || OLD.quantidade || ' → ' || NEW.quantidade 
              ELSE '' END) ||
        (CASE WHEN OLD.valor_unitario IS DISTINCT FROM NEW.valor_unitario THEN
              (CASE WHEN OLD.quantidade IS DISTINCT FROM NEW.quantidade THEN ', ' ELSE '' END) ||
              'valor: R$ ' || OLD.valor_unitario || ' → R$ ' || NEW.valor_unitario
         ELSE '' END)
      );
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.pedidos_historico (
      pedido_id, usuario_id, tipo_alteracao, campo_alterado, valor_anterior, descricao
    ) VALUES (
      OLD.pedido_id, v_usuario_id, 'edicao', 'item_removido',
      OLD.quantidade || 'x R$ ' || OLD.valor_unitario,
      'Item removido: ' || COALESCE(v_produto_nome, 'Produto') || ' (' || OLD.quantidade || 'x R$ ' || OLD.valor_unitario || ')'
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Criar trigger para pedido_itens
DROP TRIGGER IF EXISTS trigger_registrar_historico_pedido_itens ON public.pedido_itens;
CREATE TRIGGER trigger_registrar_historico_pedido_itens
AFTER INSERT OR UPDATE OR DELETE ON public.pedido_itens
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_pedido_itens();

-- =====================================================
-- FIM DA MIGRATION
-- =====================================================
