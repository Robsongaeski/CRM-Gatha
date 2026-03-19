import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { sanitizeError } from '@/lib/errorHandling';

type ExpedicaoRegistro = Tables<'expedicao_registro'>;
type ExpedicaoRegistroInsert = Omit<TablesInsert<'expedicao_registro'>, 'registrado_por' | 'created_at' | 'updated_at' | 'origem'>;

export function useExpedicao() {
  const queryClient = useQueryClient();

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['expedicao-registros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expedicao_registro')
        .select(`
          *,
          pedido:pedidos(
            numero_pedido,
            cliente:clientes(nome_razao_social)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (registro: ExpedicaoRegistroInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('expedicao_registro')
        .insert({
          ...registro,
          registrado_por: userData.user.id,
          origem: 'pcp',
        })
        .select()
        .single();

      if (error) throw error;

      // Se vinculado a pedido, atualizar status para 'entregue'
      if (registro.pedido_id && registro.tipo_lancamento === 'pedido') {
        const { error: pedidoError } = await supabase
          .from('pedidos')
          .update({ status: 'entregue' })
          .eq('id', registro.pedido_id);

        if (pedidoError) {
          console.error('Erro ao atualizar status do pedido:', pedidoError);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expedicao-registros'] });
      toast.success('Expedição registrada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ExpedicaoRegistro> & { id: string }) => {
      const { error } = await supabase
        .from('expedicao_registro')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expedicao-registros'] });
      toast.success('Expedição atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    registros,
    isLoading,
    createExpedicao: createMutation.mutateAsync,
    updateExpedicao: updateMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
