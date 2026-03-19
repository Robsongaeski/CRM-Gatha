import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FiltrosKanban {
  busca?: string;
  clienteId?: string;
  urgentesOnly?: boolean;
  dataEntregaInicio?: Date;
  dataEntregaFim?: Date;
  mostrarEntregues?: boolean;
}

export function usePedidosKanban(filtros?: FiltrosKanban) {
  const { data: etapas = [], isLoading: loadingEtapas } = useQuery({
    queryKey: ['etapas-kanban-producao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('etapa_producao')
        .select('*')
        .eq('ativa', true)
        .neq('tipo_etapa', 'aprovacao_arte')
        .order('ordem');

      if (error) throw error;
      return data;
    },
  });

  const { data: pedidos = [], isLoading: loadingPedidos } = useQuery({
    queryKey: ['pedidos-kanban', filtros],
    queryFn: async () => {
      let query = supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          data_pedido,
          data_entrega,
          status,
          valor_total,
          observacao,
          etapa_producao_id,
          requer_aprovacao_preco,
          imagem_aprovacao_url,
          imagem_aprovada,
          cliente:clientes(id, nome_razao_social),
          vendedor:profiles!vendedor_id(id, nome),
          pedido_itens(
            quantidade,
            foto_modelo_url,
            tipo_estampa:tipo_estampa(id, nome_tipo_estampa)
          ),
          pedido_tags:pedido_tags(id, nome, cor)
        `)
        .in('status', filtros?.mostrarEntregues ? ['em_producao', 'pronto', 'entregue'] : ['em_producao', 'pronto'])
        .eq('requer_aprovacao_preco', false);

      // Filtro por cliente
      if (filtros?.clienteId) {
        query = query.eq('cliente_id', filtros.clienteId);
      }

      // Filtro por período de entrega
      if (filtros?.dataEntregaInicio) {
        query = query.gte('data_entrega', filtros.dataEntregaInicio.toISOString());
      }
      if (filtros?.dataEntregaFim) {
        query = query.lte('data_entrega', filtros.dataEntregaFim.toISOString());
      }

      query = query.order('data_entrega', { ascending: true, nullsFirst: false });

      const { data, error } = await query;
      if (error) throw error;

      // Filtro por urgentes (< 3 dias)
      let resultados = data || [];
      if (filtros?.urgentesOnly) {
        const tresDias = new Date();
        tresDias.setDate(tresDias.getDate() + 3);
        resultados = resultados.filter((p) => {
          if (!p.data_entrega) return false;
          return new Date(p.data_entrega) <= tresDias;
        });
      }

      // Filtro por busca (número do pedido ou nome do cliente)
      if (filtros?.busca) {
        const busca = filtros.busca.toLowerCase();
        resultados = resultados.filter((p) => {
          const numeroPedido = p.numero_pedido.toString();
          const nomeCliente = p.cliente?.nome_razao_social?.toLowerCase() || '';
          return numeroPedido.includes(busca) || nomeCliente.includes(busca);
        });
      }

      return resultados;
    },
  });

  // Agrupar pedidos por etapa
  const pedidosPorEtapa = etapas.map(etapa => ({
    etapa,
    pedidos: pedidos.filter(p => p.etapa_producao_id === etapa.id),
  }));

  // Pedidos sem etapa definida
  const pedidosSemEtapa = pedidos.filter(p => !p.etapa_producao_id);

  return {
    etapas,
    pedidos,
    pedidosPorEtapa,
    pedidosSemEtapa,
    isLoading: loadingEtapas || loadingPedidos,
  };
}
