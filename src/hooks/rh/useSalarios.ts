import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface HistoricoSalario {
  id: string;
  colaborador_id: string;
  data_reajuste: string;
  valor_anterior: number;
  valor_novo: number;
  motivo: string | null;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
  colaborador?: { id: string; nome: string; cargo: string } | null;
  registrador?: { id: string; nome: string } | null;
}

export interface SalarioInput {
  colaborador_id: string;
  data_reajuste: string;
  valor_anterior: number;
  valor_novo: number;
  motivo?: string;
  observacao?: string;
}

export function useSalarios(colaboradorId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: salarios = [], isLoading, error } = useQuery({
    queryKey: ['salarios', colaboradorId],
    queryFn: async () => {
      let query = supabase
        .from('colaborador_salarios')
        .select(`
          *,
          colaborador:colaboradores(id, nome, cargo),
          registrador:profiles!colaborador_salarios_registrado_por_fkey(id, nome)
        `)
        .order('data_reajuste', { ascending: false });

      if (colaboradorId) {
        query = query.eq('colaborador_id', colaboradorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HistoricoSalario[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (input: SalarioInput) => {
      const { data, error } = await supabase
        .from('colaborador_salarios')
        .insert({
          ...input,
          registrado_por: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Atualizar salário atual do colaborador
      await supabase
        .from('colaboradores')
        .update({ salario_atual: input.valor_novo })
        .eq('id', input.colaborador_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salarios'] });
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({ title: 'Sucesso', description: 'Reajuste salarial registrado!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao registrar reajuste: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  return {
    salarios,
    isLoading,
    error,
    createSalario: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}

export function useEvolucaoSalarial(colaboradorId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['evolucao-salarial', colaboradorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaborador_salarios')
        .select('data_reajuste, valor_novo')
        .eq('colaborador_id', colaboradorId)
        .order('data_reajuste', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!colaboradorId,
  });
}
