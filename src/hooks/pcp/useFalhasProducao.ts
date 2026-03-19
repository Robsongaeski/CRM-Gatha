import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { sanitizeError } from '@/lib/errorHandling';

type FalhaProducao = Tables<'falha_producao'>;
type FalhaProducaoInsert = Omit<TablesInsert<'falha_producao'>, 'registrado_por'>;

export function useFalhasProducao() {
  const queryClient = useQueryClient();

  const { data: falhas = [], isLoading } = useQuery({
    queryKey: ['falhas-producao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('falha_producao')
        .select(`
          *,
          pedido:pedidos(numero_pedido),
          categoria:categoria_falha(nome_categoria),
          tipo:tipo_falha(nome_falha)
        `)
        .order('data_falha', { ascending: false });

      if (error) throw error;

      // Buscar nomes dos usuários separadamente
      const userIds = [...new Set(data.map(f => f.registrado_por))];
      const { data: users } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', userIds);

      const usersMap = new Map(users?.map(u => [u.id, u.nome]) || []);

      return data.map(falha => ({
        ...falha,
        registrado: { nome: usersMap.get(falha.registrado_por) || 'Desconhecido' }
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (falha: FalhaProducaoInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('falha_producao')
        .insert({
          ...falha,
          registrado_por: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['falhas-producao'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pcp'] });
      toast.success('Falha registrada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const resolverMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('falha_producao')
        .update({ 
          resolvido: true,
          data_resolucao: new Date().toISOString().split('T')[0]
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['falhas-producao'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pcp'] });
      toast.success('Falha marcada como resolvida');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    falhas,
    isLoading,
    createFalha: createMutation.mutateAsync,
    resolverFalha: resolverMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}
