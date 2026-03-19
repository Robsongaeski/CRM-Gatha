import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { sanitizeError } from '@/lib/errorHandling';

type EtapaProducao = Tables<'etapa_producao'>;
type EtapaProducaoInsert = TablesInsert<'etapa_producao'>;
type EtapaProducaoUpdate = TablesUpdate<'etapa_producao'>;

export function useEtapasProducao() {
  const queryClient = useQueryClient();

  const { data: etapas = [], isLoading } = useQuery({
    queryKey: ['etapas-producao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('etapa_producao')
        .select('*')
        .order('ordem');

      if (error) throw error;
      return data as EtapaProducao[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (etapa: EtapaProducaoInsert) => {
      const { data, error } = await supabase
        .from('etapa_producao')
        .insert(etapa)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapas-producao'] });
      toast.success('Etapa criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: EtapaProducaoUpdate & { id: string }) => {
      const { error } = await supabase
        .from('etapa_producao')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapas-producao'] });
      toast.success('Etapa atualizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('etapa_producao')
        .update({ ativa: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['etapas-producao'] });
      toast.success('Etapa inativada com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    etapas,
    isLoading,
    createEtapa: createMutation.mutateAsync,
    updateEtapa: updateMutation.mutateAsync,
    deleteEtapa: deleteMutation.mutateAsync,
  };
}
