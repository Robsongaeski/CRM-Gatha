import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

export interface Order {
  id: string;
  external_id: string | null;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_document: string | null;
  status: OrderStatus;
  wbuy_status_code: number | null;
  total: number;
  items: any[];
  shipping_address: string | null;
  delivery_estimate: string | null;
  tracking_code: string | null;
  carrier: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
  pix_key: string | null;
  chave_nfe: string | null;
  status_envio: string | null;
  data_despacho: string | null;
  // Multi-store fields
  store_id: string | null;
  store_code: string | null;
  // Enrichment fields (from WBuy API)
  payment_method: string | null;
  payment_installments: number | null;
  subtotal: number | null;
  shipping_cost: number | null;
  discount: number | null;
  coupon_code: string | null;
  wbuy_customer_id: string | null;
  order_date: string | null;
  nfe_number: string | null;
  nfe_series: string | null;
  enriched_at: string | null;
}

// Mapeamento de código WBuy para labels exatos
export const wbuyStatusLabels: Record<number, string> = {
  1: 'Aguardando pagamento',
  2: 'Pagamento em análise',
  3: 'Pagamento efetuado',
  4: 'Em produção',
  5: 'Em expedição',
  6: 'Em transporte',
  7: 'Saiu para entrega',
  8: 'Disponível para retirada',
  9: 'Pedido cancelado',
  10: 'Pedido concluído',
  11: 'Pagamento negado',
  12: 'Sem Retorno do Cliente',
  13: 'Devolvido',
  14: 'Pedido em análise',
  15: 'Fatura gerada',
  16: 'Nota fiscal emitida',
};

export const wbuyStatusColors: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-yellow-100 text-yellow-800',
  3: 'bg-green-100 text-green-800',
  4: 'bg-blue-100 text-blue-800',
  5: 'bg-blue-100 text-blue-800',
  6: 'bg-purple-100 text-purple-800',
  7: 'bg-purple-100 text-purple-800',
  8: 'bg-purple-100 text-purple-800',
  9: 'bg-red-100 text-red-800',
  10: 'bg-green-100 text-green-800',
  11: 'bg-orange-100 text-orange-800',
  12: 'bg-red-100 text-red-800',
  13: 'bg-red-100 text-red-800',
  14: 'bg-yellow-100 text-yellow-800',
  15: 'bg-blue-100 text-blue-800',
  16: 'bg-blue-100 text-blue-800',
};

// Função para obter label do status
export function getOrderStatusLabel(order: Order): string {
  if (order.wbuy_status_code && wbuyStatusLabels[order.wbuy_status_code]) {
    return wbuyStatusLabels[order.wbuy_status_code];
  }
  // Fallback para status interno
  const fallbackLabels: Record<OrderStatus, string> = {
    pending: 'Aguardando Pagamento',
    processing: 'Processando',
    shipped: 'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
    payment_denied: 'Pagamento Negado',
  };
  return fallbackLabels[order.status];
}

// Função para obter cor do status
export function getOrderStatusColor(order: Order): string {
  if (order.wbuy_status_code && wbuyStatusColors[order.wbuy_status_code]) {
    return wbuyStatusColors[order.wbuy_status_code];
  }
  // Fallback para status interno
  const fallbackColors: Record<OrderStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    payment_denied: 'bg-orange-100 text-orange-800',
  };
  return fallbackColors[order.status];
}

export interface OrderFilters {
  search?: string;
  status?: OrderStatus;
  wbuyStatusCode?: number;
  startDate?: string;
  endDate?: string;
  deliveryStatus?: 'all' | 'ontime' | 'overdue';
  storeCode?: string; // Multi-store filter
}

// Mapeamento de formas de pagamento baseado no wbuy_status_code
export const paymentMethodLabels: Record<number, string> = {
  1: 'PIX',
  2: 'PIX',
  3: 'PIX',
  // Pode ser estendido conforme necessário
};

// Helper para obter forma de pagamento a partir do código
export function getPaymentMethod(order: Order): string {
  // Por padrão, WBuy usa PIX como principal
  return 'PIX';
}

export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`);
      }

      if (filters?.wbuyStatusCode) {
        query = query.eq('wbuy_status_code', filters.wbuyStatusCode);
      } else if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate + 'T23:59:59');
      }

      // Multi-store filter
      if (filters?.storeCode) {
        query = query.eq('store_code', filters.storeCode);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Order[];
    },
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Order;
    },
    enabled: !!id,
  });
}

// Helper to check if order is overdue
export function isOrderOverdue(order: Order): boolean {
  if (order.status === 'delivered' || order.status === 'cancelled') {
    return false;
  }
  
  if (!order.delivery_estimate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deliveryDate = new Date(order.delivery_estimate + 'T12:00:00');
  deliveryDate.setHours(0, 0, 0, 0);

  return today > deliveryDate;
}
