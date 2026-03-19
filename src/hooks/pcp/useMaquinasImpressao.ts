import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { sanitizeError } from '@/lib/errorHandling';

type MaquinaImpressao = Tables<'maquina_impressao'>;
type MaquinaImpressaoInsert = TablesInsert<'maquina_impressao'>;
type MaquinaImpressaoUpdate = TablesUpdate<'maquina_impressao'>;

export function useMaquinasImpressao() {
  const queryClient = useQueryClient();

  const { data: maquinas = [], isLoading } = useQuery({
    queryKey: ['maquinas-impressao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maquina_impressao')
        .select('*')
        .order('nome_maquina');

      if (error) throw error;
      return data as MaquinaImpressao[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (maquina: MaquinaImpressaoInsert) => {
      const { data, error } = await supabase
        .from('maquina_impressao')
        .insert(maquina)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maquinas-impressao'] });
      toast.success('Máquina criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: MaquinaImpressaoUpdate & { id: string }) => {
      const { error } = await supabase
        .from('maquina_impressao')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maquinas-impressao'] });
      toast.success('Máquina atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maquina_impressao')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maquinas-impressao'] });
      toast.success('Máquina inativada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    maquinas,
    isLoading,
    createMaquina: createMutation.mutateAsync,
    updateMaquina: updateMutation.mutateAsync,
    deleteMaquina: deleteMutation.mutateAsync,
  };
}
