-- Limpar etapa_producao_id de pedidos entregues ou cancelados
-- Esses pedidos não devem mostrar etapa de produção na lista
UPDATE public.pedidos
SET etapa_producao_id = NULL
WHERE status IN ('entregue', 'cancelado')
  AND etapa_producao_id IS NOT NULL;