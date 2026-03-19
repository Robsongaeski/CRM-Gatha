import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Dependente {
  id: string;
  colaborador_id: string;
  nome: string;
  parentesco: string;
  data_nascimento: string | null;
  cpf: string | null;
  created_at: string;
}

export interface DependenteInput {
  colaborador_id: string;
  nome: string;
  parentesco: string;
  data_nascimento?: string | null;
  cpf?: string | null;
}

export function useDependentes(colaboradorId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: dependentes = [], isLoading, error } = useQuery({
    queryKey: ['dependentes', colaboradorId],
    queryFn: async () => {
      if (!colaboradorId) return [];
      
      const { data, error } = await supabase
        .from('colaborador_dependentes')
        .select('*')
        .eq('colaborador_id', colaboradorId)
        .order('nome');

      if (error) throw error;
      return data as Dependente[];
    },
    enabled: !!user && !!colaboradorId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: DependenteInput) => {
      const { data, error } = await supabase
        .from('colaborador_dependentes')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependentes', colaboradorId] });
      toast({ title: 'Sucesso', description: 'Dependente adicionado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao adicionar dependente: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colaborador_dependentes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dependentes', colaboradorId] });
      toast({ title: 'Sucesso', description: 'Dependente removido com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao remover dependente: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  return {
    dependentes,
    isLoading,
    error,
    addDependente: createMutation.mutate,
    removeDependente: deleteMutation.mutate,
    isAdding: createMutation.isPending,
    isRemoving: deleteMutation.isPending,
  };
}
