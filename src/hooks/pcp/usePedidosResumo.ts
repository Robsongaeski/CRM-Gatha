import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface FiltrosResumo {
  dataInicio?: Date;
  dataFim?: Date;
  busca?: string;
}

export function usePedidosResumo(filtros: FiltrosResumo = {}) {
  const { data: pedidos = [], isLoading, refetch } = useQuery({
    queryKey: ['pedidos-resumo', filtros],
    queryFn: async () => {
      let query = supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          data_entrega,
          observacao,
          cliente:clientes(
            id, 
            nome_razao_social, 
            telefone, 
            whatsapp
          ),
          itens:pedido_itens(
            id,
            quantidade,
            observacoes,
            foto_modelo_url,
            produto:produtos(nome),
            grades:pedido_item_grades(
              tamanho_nome, 
              tamanho_codigo, 
              quantidade
            ),
            detalhes:pedido_item_detalhes(
              tipo_detalhe, 
              valor
            )
          )
        `)
        .eq('status', 'em_producao')
        .order('data_entrega', { ascending: true })
        .order('numero_pedido', { ascending: true });

      // Filtro por data
      if (filtros.dataInicio) {
        const dataInicioStr = format(filtros.dataInicio, 'yyyy-MM-dd');
        query = query.gte('data_entrega', dataInicioStr);
      }
      
      if (filtros.dataFim) {
        const dataFimStr = format(filtros.dataFim, 'yyyy-MM-dd');
        query = query.lte('data_entrega', dataFimStr);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtro por busca (cliente ou número de pedido)
      let pedidosFiltrados = data || [];
      
      if (filtros.busca && filtros.busca.trim()) {
        const buscaLower = filtros.busca.toLowerCase().trim();
        pedidosFiltrados = pedidosFiltrados.filter(p => {
          const numeroMatch = p.numero_pedido.toString().includes(buscaLower);
          const clienteMatch = p.cliente?.nome_razao_social?.toLowerCase().includes(buscaLower);
          return numeroMatch || clienteMatch;
        });
      }

      return pedidosFiltrados;
    },
  });

  return {
    pedidos,
    isLoading,
    refetch,
  };
}
