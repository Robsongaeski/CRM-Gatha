import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Devolucao {
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
  comprovante_url: string | null;
  observacao: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  motivo?: {
    id: string;
    nome: string;
  };
}

interface DevolucaoFilters {
  search?: string;
  motivo_id?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function useDevolucoes(filters?: DevolucaoFilters) {
  return useQuery({
    queryKey: ['devolucoes', filters],
    queryFn: async () => {
      let query = supabase
        .from('devolucoes')
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
      return data as Devolucao[];
    },
  });
}

export function useDevolucao(id: string | undefined) {
  return useQuery({
    queryKey: ['devolucao', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('devolucoes')
        .select(`
          *,
          motivo:motivos_troca_devolucao(id, nome)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Devolucao;
    },
    enabled: !!id,
  });
}

export function useCreateDevolucao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<Devolucao, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'motivo'>) => {
      const { data: result, error } = await supabase
        .from('devolucoes')
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
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      toast.success('Devolução registrada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao registrar devolução:', error);
      toast.error('Erro ao registrar devolução');
    },
  });
}

export function useUpdateDevolucao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Devolucao> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('devolucoes')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      toast.success('Devolução atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar devolução:', error);
      toast.error('Erro ao atualizar devolução');
    },
  });
}

export function useDeleteDevolucao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('devolucoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devolucoes'] });
      toast.success('Devolução excluída com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir devolução:', error);
      toast.error('Erro ao excluir devolução');
    },
  });
}

export async function checkDevolucaoDuplicada(numeroPedido: string, excludeId?: string): Promise<{ exists: boolean; record?: Devolucao }> {
  let query = supabase
    .from('devolucoes')
    .select('*')
    .eq('numero_pedido', numeroPedido);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.limit(1);

  if (error) throw error;
  
  return {
    exists: data && data.length > 0,
    record: data?.[0] as Devolucao | undefined,
  };
}

export async function uploadComprovante(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `comprovantes/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('comprovantes-devolucao')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('comprovantes-devolucao')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}
