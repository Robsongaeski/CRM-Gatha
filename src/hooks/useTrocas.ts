import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Troca {
  id: string;
  numero_pedido: string;
  nome_cliente: string;
  email_cliente: string | null;
  telefone_cliente: string | null;
  valor_pedido: number;
  data_pedido_original: string | null;
  motivo_id: string | null;
  motivo_outro: string | null;
  transportadora: string | null;
  observacao: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  motivo?: {
    id: string;
    nome: string;
  };
}

interface TrocaFilters {
  search?: string;
  motivo_id?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function useTrocas(filters?: TrocaFilters) {
  return useQuery({
    queryKey: ['trocas', filters],
    queryFn: async () => {
      let query = supabase
        .from('trocas')
        .select(`
          *,
          motivo:motivos_troca_devolucao(id, nome)
        `)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`numero_pedido.ilike.%${filters.search}%,nome_cliente.ilike.%${filters.search}%`);
      }

      if (filters?.motivo_id) {
        query = query.eq('motivo_id', filters.motivo_id);
      }

      if (filters?.dataInicio) {
        query = query.gte('created_at', filters.dataInicio);
      }

      if (filters?.dataFim) {
        query = query.lte('created_at', filters.dataFim + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Troca[];
    },
  });
}

export function useTroca(id: string | undefined) {
  return useQuery({
    queryKey: ['troca', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('trocas')
        .select(`
          *,
          motivo:motivos_troca_devolucao(id, nome)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Troca;
    },
    enabled: !!id,
  });
}

export function useCreateTroca() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<Troca, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'motivo'>) => {
      const { data: result, error } = await supabase
        .from('trocas')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas'] });
      toast.success('Troca registrada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao registrar troca:', error);
      toast.error('Erro ao registrar troca');
    },
  });
}

export function useUpdateTroca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Troca> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('trocas')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas'] });
      toast.success('Troca atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar troca:', error);
      toast.error('Erro ao atualizar troca');
    },
  });
}

export function useDeleteTroca() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trocas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trocas'] });
      toast.success('Troca excluída com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir troca:', error);
      toast.error('Erro ao excluir troca');
    },
  });
}
