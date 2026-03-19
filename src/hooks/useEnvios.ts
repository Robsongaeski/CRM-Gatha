import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type StatusEnvio = 'aguardando_despacho' | 'despachado' | 'reprocessado' | 'cancelado';

export interface OrderEnvio {
  id: string;
  external_id: string | null;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  status: string;
  total: number;
  carrier: string | null;
  tracking_code: string | null;
  chave_nfe: string | null;
  status_envio: StatusEnvio;
  data_despacho: string | null;
  despachado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnvioLog {
  id: string;
  order_id: string;
  usuario_id: string;
  acao: string;
  status_anterior: StatusEnvio | null;
  status_novo: StatusEnvio;
  chave_nfe_lida: string | null;
  created_at: string;
  usuario?: {
    nome: string;
  };
}

export interface EnvioFilters {
  search?: string;
  status_envio?: StatusEnvio;
  startDate?: string;
  endDate?: string;
  carrier?: string;
  page?: number;
  pageSize?: number;
}

// Validar formato da chave NF-e (44 dígitos numéricos)
export function validarChaveNfe(chave: string): boolean {
  const cleaned = chave.replace(/\D/g, '');
  return cleaned.length === 44;
}

// Normalizar chave NF-e (remover espaços e caracteres não numéricos)
export function normalizarChaveNfe(chave: string): string {
  return chave.replace(/\D/g, '');
}

export function useEnviosOrders(filters?: EnvioFilters) {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 50;
  
  return useQuery({
    queryKey: ['envios-orders', filters],
    queryFn: async () => {
      // First, get total count
      let countQuery = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

      if (filters?.status_envio) {
        countQuery = countQuery.eq('status_envio', filters.status_envio);
      }
      if (filters?.carrier) {
        countQuery = countQuery.eq('carrier', filters.carrier);
      }
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        countQuery = countQuery.or(`order_number.ilike.${searchTerm},customer_name.ilike.${searchTerm},chave_nfe.ilike.${searchTerm}`);
      }

      const { count: totalCount, error: countError } = await countQuery;
      if (countError) throw countError;

      // Then get paginated data
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters?.status_envio) {
        query = query.eq('status_envio', filters.status_envio);
      }
      if (filters?.carrier) {
        query = query.eq('carrier', filters.carrier);
      }
      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`order_number.ilike.${searchTerm},customer_name.ilike.${searchTerm},chave_nfe.ilike.${searchTerm}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return {
        orders: (data || []) as unknown as OrderEnvio[],
        totalCount: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / pageSize),
        currentPage: page,
        pageSize,
      };
    },
  });
}

// Hook para despacho manual em lote
export function useDespacharLote() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      orderIds, 
      statusEnvio = 'despachado' as StatusEnvio,
    }: { 
      orderIds: string[]; 
      statusEnvio?: StatusEnvio;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      if (orderIds.length === 0) throw new Error('Nenhum pedido selecionado');

      const now = new Date().toISOString();
      
      // Buscar pedidos para obter status anterior
      const { data: orders, error: fetchError } = await supabase
        .from('orders')
        .select('id, status_envio')
        .in('id', orderIds);

      if (fetchError) throw fetchError;

      // Atualizar pedidos
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status_envio: statusEnvio,
          data_despacho: now,
          despachado_por: user.id,
        })
        .in('id', orderIds);

      if (updateError) throw updateError;

      // Registrar logs
      const logs = (orders || []).map(order => ({
        order_id: order.id,
        usuario_id: user.id,
        acao: 'despacho_manual',
        status_anterior: order.status_envio,
        status_novo: statusEnvio,
        chave_nfe_lida: null,
      }));

      if (logs.length > 0) {
        const { error: logError } = await supabase
          .from('envios_log')
          .insert(logs);

        if (logError) {
          console.error('Erro ao registrar logs:', logError);
        }
      }

      return { 
        status: 'SUCCESS', 
        count: orderIds.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['envios-orders'] });
      toast.success(`${result.count} pedido(s) atualizado(s) com sucesso!`);
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}

export function useEnvioByChaveNfe(chaveNfe: string | null) {
  return useQuery({
    queryKey: ['envio-by-chave', chaveNfe],
    queryFn: async () => {
      if (!chaveNfe) return null;

      const normalized = normalizarChaveNfe(chaveNfe);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('chave_nfe', normalized)
        .maybeSingle();

      if (error) throw error;
      return data as unknown as OrderEnvio | null;
    },
    enabled: !!chaveNfe,
  });
}

export function useDespachar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      chaveNfe, 
      forceReprocess = false 
    }: { 
      chaveNfe: string; 
      forceReprocess?: boolean;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const normalized = normalizarChaveNfe(chaveNfe);

      // Buscar pedido pela chave NF-e
      const { data: order, error: findError } = await supabase
        .from('orders')
        .select('*')
        .eq('chave_nfe', normalized)
        .maybeSingle();

      if (findError) throw findError;

      if (!order) {
        throw new Error('NOT_FOUND');
      }

      const orderTyped = order as unknown as OrderEnvio;

      // Verificar se já foi despachado
      if (orderTyped.status_envio === 'despachado' && !forceReprocess) {
        return { 
          status: 'ALREADY_DISPATCHED', 
          order: orderTyped 
        };
      }

      const now = new Date().toISOString();
      const statusAnterior = orderTyped.status_envio;
      const novoStatus = forceReprocess ? 'reprocessado' : 'despachado';

      // Atualizar pedido
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status_envio: novoStatus,
          data_despacho: now,
          despachado_por: user.id,
        })
        .eq('id', orderTyped.id);

      if (updateError) throw updateError;

      // Registrar no log
      const { error: logError } = await supabase
        .from('envios_log')
        .insert({
          order_id: orderTyped.id,
          usuario_id: user.id,
          acao: forceReprocess ? 'reprocessamento' : 'despacho',
          status_anterior: statusAnterior,
          status_novo: novoStatus as StatusEnvio,
          chave_nfe_lida: normalized,
        });

      if (logError) {
        console.error('Erro ao registrar log:', logError);
        // Não falhar por erro no log
      }

      return { 
        status: 'SUCCESS', 
        order: { ...orderTyped, status_envio: novoStatus as StatusEnvio } 
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envios-orders'] });
    },
  });
}

export function useEnvioLog(orderId: string | undefined) {
  return useQuery({
    queryKey: ['envio-log', orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from('envios_log')
        .select(`
          *,
          usuario:profiles!envios_log_usuario_id_fkey(nome)
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as EnvioLog[];
    },
    enabled: !!orderId,
  });
}

export function useEnviosCarriers() {
  return useQuery({
    queryKey: ['envios-carriers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('carrier')
        .not('carrier', 'is', null);

      if (error) throw error;

      // Extrair transportadoras únicas
      const carriers = [...new Set(data.map(d => d.carrier).filter(Boolean))] as string[];
      return carriers.sort();
    },
  });
}

// Relatórios
export function useEnviosRelatorio(filters: {
  startDate: string;
  endDate: string;
  tipo: 'por_dia' | 'por_transportadora' | 'pendentes_nf' | 'sem_tracking';
}) {
  return useQuery({
    queryKey: ['envios-relatorio', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .gte('created_at', filters.startDate)
        .lte('created_at', filters.endDate + 'T23:59:59');

      const { data, error } = await query;

      if (error) throw error;

      const orders = (data || []) as unknown as OrderEnvio[];

      switch (filters.tipo) {
        case 'por_dia': {
          // Agrupar despachados por dia
          const despachados = orders.filter(o => o.status_envio === 'despachado' || o.status_envio === 'reprocessado');
          const porDia: Record<string, number> = {};
          
          despachados.forEach(o => {
            if (o.data_despacho) {
              const dia = o.data_despacho.split('T')[0];
              porDia[dia] = (porDia[dia] || 0) + 1;
            }
          });
          
          return Object.entries(porDia)
            .map(([data, quantidade]) => ({ data, quantidade }))
            .sort((a, b) => a.data.localeCompare(b.data));
        }
        
        case 'por_transportadora': {
          const despachados = orders.filter(o => o.status_envio === 'despachado' || o.status_envio === 'reprocessado');
          const porTransportadora: Record<string, number> = {};
          
          despachados.forEach(o => {
            const carrier = o.carrier || 'Não informada';
            porTransportadora[carrier] = (porTransportadora[carrier] || 0) + 1;
          });
          
          return Object.entries(porTransportadora)
            .map(([transportadora, quantidade]) => ({ transportadora, quantidade }))
            .sort((a, b) => b.quantidade - a.quantidade);
        }
        
        case 'pendentes_nf': {
          // Pedidos com NF emitida mas não despachados
          return orders.filter(o => 
            o.chave_nfe && 
            o.status_envio === 'aguardando_despacho'
          );
        }
        
        case 'sem_tracking': {
          // Despachados sem código de rastreio
          return orders.filter(o => 
            (o.status_envio === 'despachado' || o.status_envio === 'reprocessado') &&
            !o.tracking_code
          );
        }
        
        default:
          return [];
      }
    },
    enabled: !!filters.startDate && !!filters.endDate,
  });
}

// Hook para atualizar chave NF-e manualmente
export function useAtualizarChaveNfe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      orderId, 
      chaveNfe,
    }: { 
      orderId: string; 
      chaveNfe: string;
    }) => {
      const normalized = normalizarChaveNfe(chaveNfe);
      
      if (!validarChaveNfe(normalized)) {
        throw new Error('Chave NF-e inválida. Deve conter 44 dígitos numéricos.');
      }

      const { data, error } = await supabase
        .from('orders')
        .update({ chave_nfe: normalized })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as OrderEnvio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envios-orders'] });
      toast.success('Chave NF-e atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });
}
