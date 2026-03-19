import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { sanitizeError } from '@/lib/errorHandling';

type TipoEstampa = Tables<'tipo_estampa'>;
type TipoEstampaInsert = TablesInsert<'tipo_estampa'>;
type TipoEstampaUpdate = TablesUpdate<'tipo_estampa'>;

export function useTiposEstampa() {
  const queryClient = useQueryClient();

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ['tipos-estampa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipo_estampa')
        .select(`
          *,
          maquina_padrao:maquina_impressao(id, nome_maquina)
        `)
        .order('nome_tipo_estampa');

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (tipo: TipoEstampaInsert) => {
      const { data, error } = await supabase
        .from('tipo_estampa')
        .insert(tipo)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-estampa'] });
      toast.success('Tipo de estampa criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: TipoEstampaUpdate & { id: string }) => {
      const { error } = await supabase
        .from('tipo_estampa')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-estampa'] });
      toast.success('Tipo de estampa atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tipo_estampa')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-estampa'] });
      toast.success('Tipo de estampa inativado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    tipos,
    isLoading,
    createTipo: createMutation.mutateAsync,
    updateTipo: updateMutation.mutateAsync,
    deleteTipo: deleteMutation.mutateAsync,
  };
}
