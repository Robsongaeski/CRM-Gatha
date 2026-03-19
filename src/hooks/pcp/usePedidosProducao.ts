import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePedidosProducao() {
  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos-producao'],
    queryFn: async () => {
      // Buscar pedidos não cancelados/entregues
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          data_pedido,
          status,
          cliente:clientes(id, nome_razao_social),
          itens:pedido_itens(
            id,
            quantidade,
            observacoes,
            produto:produtos(id, nome)
          )
        `)
        .not('status', 'in', '("cancelado","entregue")')
        .order('numero_pedido', { ascending: false });

      if (error) throw error;

      // Buscar IDs de pedidos que já têm expedição
      const { data: expedicoes } = await supabase
        .from('expedicao_registro')
        .select('pedido_id')
        .not('pedido_id', 'is', null);

      const pedidosComExpedicao = new Set(expedicoes?.map(e => e.pedido_id) || []);

      // Filtrar pedidos que não têm expedição
      const pedidosSemExpedicao = data?.filter(p => !pedidosComExpedicao.has(p.id)) || [];

      return pedidosSemExpedicao;
    },
  });

  return {
    pedidos,
    isLoading,
  };
}
