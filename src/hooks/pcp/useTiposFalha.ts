import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { sanitizeError } from '@/lib/errorHandling';

type TipoFalha = Tables<'tipo_falha'>;
type TipoFalhaInsert = TablesInsert<'tipo_falha'>;
type TipoFalhaUpdate = TablesUpdate<'tipo_falha'>;

export function useTiposFalha() {
  const queryClient = useQueryClient();

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ['tipos-falha'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipo_falha')
        .select(`
          *,
          categoria:categoria_falha(id, nome_categoria)
        `)
        .order('nome_falha');

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (tipo: TipoFalhaInsert) => {
      const { data, error } = await supabase
        .from('tipo_falha')
        .insert(tipo)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-falha'] });
      toast.success('Tipo de falha criado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: TipoFalhaUpdate & { id: string }) => {
      const { error } = await supabase
        .from('tipo_falha')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-falha'] });
      toast.success('Tipo de falha atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tipo_falha')
        .update({ ativa: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-falha'] });
      toast.success('Tipo de falha inativado com sucesso');
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
