import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Fechamento {
  id: string;
  colaborador_id: string;
  mes_referencia: string;
  faltas: number | null;
  horas_extras: number | null;
  valor_horas_extras: number | null;
  bonificacoes: number | null;
  descontos: number | null;
  observacoes: string | null;
  status: 'rascunho' | 'fechado';
  fechado_por: string | null;
  data_fechamento: string | null;
  created_at: string;
  updated_at: string;
  colaborador?: { id: string; nome: string; cargo: string; salario_atual: number | null } | null;
  fechador?: { id: string; nome: string } | null;
}

export interface FechamentoInput {
  colaborador_id: string;
  mes_referencia: string;
  faltas?: number;
  horas_extras?: number;
  valor_horas_extras?: number;
  bonificacoes?: number;
  descontos?: number;
  observacoes?: string;
  status?: 'rascunho' | 'fechado';
}

export function useFechamentos(filters?: { mes_referencia?: string; colaborador_id?: string; status?: 'rascunho' | 'fechado' }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: fechamentos = [], isLoading, error } = useQuery({
    queryKey: ['fechamentos', filters],
    queryFn: async () => {
      let query = supabase
        .from('colaborador_fechamento')
        .select(`
          *,
          colaborador:colaboradores(id, nome, cargo, salario_atual),
          fechador:profiles!colaborador_fechamento_fechado_por_fkey(id, nome)
        `)
        .order('mes_referencia', { ascending: false });

      if (filters?.mes_referencia) {
        query = query.eq('mes_referencia', filters.mes_referencia);
      }
      if (filters?.colaborador_id) {
        query = query.eq('colaborador_id', filters.colaborador_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Fechamento[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (input: FechamentoInput) => {
      const { data, error } = await supabase
        .from('colaborador_fechamento')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
      toast({ title: 'Sucesso', description: 'Fechamento criado!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao criar fechamento: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: FechamentoInput & { id: string }) => {
      const { data, error } = await supabase
        .from('colaborador_fechamento')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
      toast({ title: 'Sucesso', description: 'Fechamento atualizado!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao atualizar fechamento: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  const fecharMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('colaborador_fechamento')
        .update({
          status: 'fechado',
          fechado_por: user?.id,
          data_fechamento: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
      toast({ title: 'Sucesso', description: 'Fechamento confirmado!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao fechar: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colaborador_fechamento')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fechamentos'] });
      toast({ title: 'Sucesso', description: 'Fechamento excluído!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao excluir: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  return {
    fechamentos,
    isLoading,
    error,
    createFechamento: createMutation.mutate,
    updateFechamento: updateMutation.mutate,
    fecharFechamento: fecharMutation.mutate,
    deleteFechamento: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isFechando: fecharMutation.isPending,
  };
}

// Hook para buscar resumo de fechamentos por mês
export function useResumoFechamento(mesReferencia: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['resumo-fechamento', mesReferencia],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaborador_fechamento')
        .select(`
          *,
          colaborador:colaboradores(id, nome, cargo, salario_atual)
        `)
        .eq('mes_referencia', mesReferencia);

      if (error) throw error;

      const resumo = {
        total: data?.length || 0,
        rascunhos: data?.filter(f => f.status === 'rascunho').length || 0,
        fechados: data?.filter(f => f.status === 'fechado').length || 0,
        totalFaltas: data?.reduce((acc, f) => acc + (f.faltas || 0), 0) || 0,
        totalHorasExtras: data?.reduce((acc, f) => acc + (f.horas_extras || 0), 0) || 0,
        totalBonificacoes: data?.reduce((acc, f) => acc + (f.bonificacoes || 0), 0) || 0,
        totalDescontos: data?.reduce((acc, f) => acc + (f.descontos || 0), 0) || 0,
      };

      return resumo;
    },
    enabled: !!user && !!mesReferencia,
  });
}
