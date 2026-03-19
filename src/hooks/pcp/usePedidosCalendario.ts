import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function usePedidosCalendario(dataReferencia: Date, modo: 'semana' | 'mes' = 'mes') {
  const inicio = modo === 'semana' 
    ? startOfWeek(dataReferencia, { locale: ptBR }) 
    : startOfMonth(dataReferencia);
  
  const fim = modo === 'semana' 
    ? endOfWeek(dataReferencia, { locale: ptBR }) 
    : endOfMonth(dataReferencia);

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['pedidos-calendario', inicio.toISOString(), fim.toISOString(), modo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          data_pedido,
          data_entrega,
          status,
          valor_total,
          observacao,
          cliente:clientes(id, nome_razao_social),
          etapa:etapa_producao(id, nome_etapa, cor_hex),
          itens:pedido_itens(id, quantidade, foto_modelo_url, produto:produtos(nome))
        `)
        .not('status', 'eq', 'cancelado')
        .gte('data_entrega', inicio.toISOString())
        .lte('data_entrega', fim.toISOString())
        .order('data_entrega', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  return {
    pedidos,
    isLoading,
  };
}
