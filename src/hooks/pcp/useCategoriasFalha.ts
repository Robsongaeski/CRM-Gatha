import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { sanitizeError } from '@/lib/errorHandling';

type CategoriaFalha = Tables<'categoria_falha'>;
type CategoriaFalhaInsert = TablesInsert<'categoria_falha'>;
type CategoriaFalhaUpdate = TablesUpdate<'categoria_falha'>;

export function useCategoriasFalha() {
  const queryClient = useQueryClient();

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias-falha'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categoria_falha')
        .select('*')
        .order('nome_categoria');

      if (error) throw error;
      return data as CategoriaFalha[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (categoria: CategoriaFalhaInsert) => {
      const { data, error } = await supabase
        .from('categoria_falha')
        .insert(categoria)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-falha'] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: CategoriaFalhaUpdate & { id: string }) => {
      const { error } = await supabase
        .from('categoria_falha')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-falha'] });
      toast.success('Categoria atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categoria_falha')
        .update({ ativa: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-falha'] });
      toast.success('Categoria inativada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    categorias,
    isLoading,
    createCategoria: createMutation.mutateAsync,
    updateCategoria: updateMutation.mutateAsync,
    deleteCategoria: deleteMutation.mutateAsync,
  };
}
