-- Remover trigger obsoleto que referencia coluna valor_restante que não existe mais
DROP TRIGGER IF EXISTS trigger_atualizar_valor_restante ON pedidos;

-- Remover função obsoleta
DROP FUNCTION IF EXISTS atualizar_valor_restante();