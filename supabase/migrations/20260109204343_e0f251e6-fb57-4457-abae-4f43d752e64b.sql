-- Atualizar o trigger de pedido_itens para verificar se o pedido ainda existe
-- antes de tentar inserir no histórico durante DELETE
CREATE OR REPLACE FUNCTION public.registrar_historico_pedido_itens()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID;
  v_pedido_id UUID;
  v_produto_nome TEXT;
  v_pedido_exists BOOLEAN;
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
    -- Verificar se o pedido ainda existe (não está sendo deletado em cascata)
    SELECT EXISTS(SELECT 1 FROM public.pedidos WHERE id = OLD.pedido_id) INTO v_pedido_exists;
    
    -- Só registra no histórico se o pedido ainda existe (exclusão manual do item)
    IF v_pedido_exists THEN
      INSERT INTO public.pedidos_historico (
        pedido_id, usuario_id, tipo_alteracao, campo_alterado, valor_anterior, descricao
      ) VALUES (
        OLD.pedido_id, v_usuario_id, 'edicao', 'item_removido',
        OLD.quantidade || 'x R$ ' || OLD.valor_unitario,
        'Item removido: ' || COALESCE(v_produto_nome, 'Produto') || ' (' || OLD.quantidade || 'x R$ ' || OLD.valor_unitario || ')'
      );
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;