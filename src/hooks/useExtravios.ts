import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type StatusRessarcimento = 'pendente' | 'aprovado' | 'negado';

export interface Extravio {
  id: string;
  numero_pedido: string;
  nome_cliente: string;
  email_cliente: string | null;
  telefone_cliente: string | null;
  valor_pedido: number;
  data_pedido_original: string | null;
  numero_rastreio: string | null;
  numero_chamado: string | null;
  numero_nf: string | null;
  chave_nf: string | null;
  transportadora: string | null;
  solicitado_ressarcimento: boolean;
  status_ressarcimento: StatusRessarcimento;
  motivo_negacao: string | null;
  valor_ressarcimento: number | null;
  observacao: string | null;
  data_resolucao: string | null;
  problema_origem_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface ExtravioFilters {
  search?: string;
  status_ressarcimento?: StatusRessarcimento;
  solicitado_ressarcimento?: boolean;
  dataInicio?: string;
  dataFim?: string;
}

export function useExtravios(filters?: ExtravioFilters) {
  return useQuery({
    queryKey: ['extravios', filters],
    queryFn: async () => {
      let query = supabase
        .from('extravios')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`numero_pedido.ilike.%${filters.search}%,nome_cliente.ilike.%${filters.search}%,numero_rastreio.ilike.%${filters.search}%`);
      }

      if (filters?.status_ressarcimento) {
        query = query.eq('status_ressarcimento', filters.status_ressarcimento);
      }

      if (filters?.solicitado_ressarcimento !== undefined) {
        query = query.eq('solicitado_ressarcimento', filters.solicitado_ressarcimento);
      }

      if (filters?.dataInicio) {
        query = query.gte('created_at', filters.dataInicio);
      }

      if (filters?.dataFim) {
        query = query.lte('created_at', filters.dataFim + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Extravio[];
    },
  });
}

export function useExtravio(id: string | undefined) {
  return useQuery({
    queryKey: ['extravio', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('extravios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Extravio;
    },
    enabled: !!id,
  });
}

export function useCreateExtravio() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<Extravio, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: result, error } = await supabase
        .from('extravios')
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
      queryClient.invalidateQueries({ queryKey: ['extravios'] });
      toast.success('Extravio registrado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao registrar extravio:', error);
      toast.error('Erro ao registrar extravio');
    },
  });
}

export function useUpdateExtravio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Extravio> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('extravios')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extravios'] });
      toast.success('Extravio atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar extravio:', error);
      toast.error('Erro ao atualizar extravio');
    },
  });
}

export function useDeleteExtravio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('extravios')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extravios'] });
      toast.success('Extravio excluído com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir extravio:', error);
      toast.error('Erro ao excluir extravio');
    },
  });
}

export async function checkExtravioDuplicado(
  numeroPedido: string,
  numeroRastreio?: string,
  excludeId?: string
): Promise<{ exists: boolean; record?: Extravio }> {
  // Check by order number
  let query = supabase
    .from('extravios')
    .select('*')
    .eq('numero_pedido', numeroPedido);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data: dataByOrder, error: errorByOrder } = await query.limit(1);

  if (errorByOrder) throw errorByOrder;

  if (dataByOrder && dataByOrder.length > 0) {
    return {
      exists: true,
      record: dataByOrder[0] as Extravio,
    };
  }

  // Check by tracking number if provided
  if (numeroRastreio) {
    let trackingQuery = supabase
      .from('extravios')
      .select('*')
      .eq('numero_rastreio', numeroRastreio);

    if (excludeId) {
      trackingQuery = trackingQuery.neq('id', excludeId);
    }

    const { data: dataByTracking, error: errorByTracking } = await trackingQuery.limit(1);

    if (errorByTracking) throw errorByTracking;

    if (dataByTracking && dataByTracking.length > 0) {
      return {
        exists: true,
        record: dataByTracking[0] as Extravio,
      };
    }
  }

  return { exists: false };
}
