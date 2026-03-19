import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Setor {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SetorInput {
  nome: string;
  descricao?: string | null;
  ativo?: boolean;
}

export function useSetores(apenasAtivos = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: setores = [], isLoading, error } = useQuery({
    queryKey: ['setores', apenasAtivos],
    queryFn: async () => {
      let query = supabase
        .from('setores')
        .select('*')
        .order('nome');

      if (apenasAtivos) {
        query = query.eq('ativo', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Setor[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (input: SetorInput) => {
      const { data, error } = await supabase
        .from('setores')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      toast({ title: 'Sucesso', description: 'Setor criado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao criar setor: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: SetorInput & { id: string }) => {
      const { data, error } = await supabase
        .from('setores')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      toast({ title: 'Sucesso', description: 'Setor atualizado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao atualizar setor: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('setores')
        .update({ ativo: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setores'] });
      toast({ title: 'Sucesso', description: 'Setor desativado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao desativar setor: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  return {
    setores,
    isLoading,
    error,
    createSetor: createMutation.mutate,
    updateSetor: updateMutation.mutate,
    deleteSetor: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
