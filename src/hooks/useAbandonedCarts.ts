import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AbandonedCartItem {
  name: string;
  sku: string;
  quantity: number;
  price: number;
  color?: string;
  size?: string;
}

export interface AbandonedCart {
  id: string;
  external_id: string;
  store_id: string | null;
  store_code: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_document: string | null;
  total: number;
  items: AbandonedCartItem[];
  recovery_url: string | null;
  status: 'abandoned' | 'recovered' | 'expired';
  recovered_order_id: string | null;
  abandoned_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  ecommerce_stores?: {
    nome: string;
    cor: string;
  } | null;
}

export interface AbandonedCartsFilters {
  storeCode?: string;
  status?: 'abandoned' | 'recovered' | 'expired' | 'all';
  search?: string;
  startDate?: string;
  endDate?: string;
}

export function useAbandonedCarts(filters: AbandonedCartsFilters = {}) {
  const queryClient = useQueryClient();

  const cartsQuery = useQuery({
    queryKey: ['abandoned-carts', filters],
    queryFn: async () => {
      let query = supabase
        .from('abandoned_carts')
        .select(`
          *,
          ecommerce_stores (
            nome,
            cor
          )
        `)
        .order('abandoned_at', { ascending: false });

      // Apply filters
      if (filters.storeCode && filters.storeCode !== 'all') {
        query = query.eq('store_code', filters.storeCode);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.startDate) {
        query = query.gte('abandoned_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('abandoned_at', filters.endDate);
      }

      // Search is now done client-side to also cover product names in JSONB items

      const { data, error } = await query;

      if (error) throw error;
      
      // Parse items from JSONB
      const parsed = (data || []).map(cart => ({
        ...cart,
        items: Array.isArray(cart.items) ? cart.items : JSON.parse(cart.items as string || '[]'),
      })) as AbandonedCart[];

      // Client-side search covering customer fields AND product names
      if (filters.search) {
        const term = filters.search.toLowerCase();
        return parsed.filter(cart =>
          cart.customer_name?.toLowerCase().includes(term) ||
          cart.customer_email?.toLowerCase().includes(term) ||
          cart.customer_phone?.includes(term) ||
          cart.items.some((item: AbandonedCartItem) => item.name?.toLowerCase().includes(term))
        );
      }

      return parsed;
    },
  });

  // Statistics query
  const statsQuery = useQuery({
    queryKey: ['abandoned-carts-stats', filters.storeCode],
    queryFn: async () => {
      let query = supabase
        .from('abandoned_carts')
        .select('status, total');

      if (filters.storeCode && filters.storeCode !== 'all') {
        query = query.eq('store_code', filters.storeCode);
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats = {
        totalAbandoned: 0,
        totalRecovered: 0,
        valueAbandoned: 0,
        valueRecovered: 0,
        recoveryRate: 0,
      };

      (data || []).forEach(cart => {
        if (cart.status === 'abandoned') {
          stats.totalAbandoned++;
          stats.valueAbandoned += Number(cart.total) || 0;
        } else if (cart.status === 'recovered') {
          stats.totalRecovered++;
          stats.valueRecovered += Number(cart.total) || 0;
        }
      });

      const total = stats.totalAbandoned + stats.totalRecovered;
      stats.recoveryRate = total > 0 ? (stats.totalRecovered / total) * 100 : 0;

      return stats;
    },
  });

  // Mark as expired mutation
  const markAsExpiredMutation = useMutation({
    mutationFn: async (cartId: string) => {
      const { error } = await supabase
        .from('abandoned_carts')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', cartId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abandoned-carts'] });
      queryClient.invalidateQueries({ queryKey: ['abandoned-carts-stats'] });
      toast.success('Carrinho marcado como expirado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar carrinho: ${error.message}`);
    },
  });

  return {
    carts: cartsQuery.data || [],
    isLoading: cartsQuery.isLoading,
    error: cartsQuery.error,
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    markAsExpired: markAsExpiredMutation.mutate,
    refetch: cartsQuery.refetch,
  };
}

// Helper to get webhook URL for abandoned carts
export function getAbandonedCartWebhookUrl(storeCode: string): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lyjzutjrmvgoeibaoizz.supabase.co';
  return `${supabaseUrl}/functions/v1/wbuy-abandoned-cart?store=${storeCode}`;
}
