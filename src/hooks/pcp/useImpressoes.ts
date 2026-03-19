import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { sanitizeError } from '@/lib/errorHandling';

type ImpressaoPedido = Tables<'impressao_pedido'>;
type ImpressaoPedidoInsert = TablesInsert<'impressao_pedido'>;

export function useImpressoes() {
  const queryClient = useQueryClient();

  const { data: impressoes = [], isLoading } = useQuery({
    queryKey: ['impressoes-pedido'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('impressao_pedido')
        .select(`
          *,
          tipo_estampa:tipo_estampa(id, nome_tipo_estampa),
          maquina:maquina_impressao(id, nome_maquina),
          pedido:pedidos(id, numero_pedido, cliente:clientes(nome_razao_social)),
          item:pedido_itens(id, produto:produtos(nome))
        `)
        .order('data_impressao', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar nomes dos operadores separadamente
      const operadorIds = [...new Set(data.map(d => d.operador_id))];
      const { data: operadores } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', operadorIds);

      const operadoresMap = new Map(operadores?.map(o => [o.id, o]) || []);

      return data.map(imp => ({
        ...imp,
        operador: operadoresMap.get(imp.operador_id),
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (impressao: ImpressaoPedidoInsert) => {
      const { data, error } = await supabase
        .from('impressao_pedido')
        .insert(impressao)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impressoes-pedido'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pcp'] });
      toast.success('Impressão registrada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ImpressaoPedido> & { id: string }) => {
      const { error } = await supabase
        .from('impressao_pedido')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['impressoes-pedido'] });
      toast.success('Impressão atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    impressoes,
    isLoading,
    createImpressao: createMutation.mutateAsync,
    updateImpressao: updateMutation.mutateAsync,
  };
}
