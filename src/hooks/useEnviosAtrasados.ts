import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, getOrderStatusLabel, getOrderStatusColor } from './useOrders';

// Mapeamento completo dos 16 status WBuy (individual, sem agrupamento)
export const STATUS_WBUY: Record<number, { label: string; status: string }> = {
  1: { label: 'Aguardando pagamento', status: 'pending' },
  2: { label: 'Pagamento em análise', status: 'pending' },
  3: { label: 'Pagamento efetuado', status: 'processing' },
  4: { label: 'Em produção', status: 'processing' },
  5: { label: 'Em expedição', status: 'processing' },
  6: { label: 'Em transporte', status: 'shipped' },
  7: { label: 'Saiu para entrega', status: 'shipped' },
  8: { label: 'Disponível para retirada', status: 'shipped' },
  9: { label: 'Pedido cancelado', status: 'cancelled' },
  10: { label: 'Pedido concluído', status: 'delivered' },
  11: { label: 'Pagamento negado', status: 'payment_denied' },
  12: { label: 'Sem retorno do cliente', status: 'cancelled' },
  13: { label: 'Devolvido', status: 'cancelled' },
  14: { label: 'Pedido em análise', status: 'pending' },
  15: { label: 'Fatura gerada', status: 'processing' },
  16: { label: 'Nota fiscal emitida', status: 'processing' },
};

export type TipoAtraso = 'transportadora' | 'envio' | 'sem_contato' | 'envio_bloqueado';

export const TIPOS_ATRASO: Record<TipoAtraso, { label: string; color: string }> = {
  transportadora: { label: 'Atraso Transportadora', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  envio: { label: 'Atraso de Envio', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  sem_contato: { label: 'Sem contato com o Cliente', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  envio_bloqueado: { label: 'Envio Bloqueado', color: 'bg-red-100 text-red-800 border-red-200' },
};

export interface EnvioAtrasado extends Order {
  dias_atraso: number;
  tipo_atraso: TipoAtraso;
  problema?: {
    id: string;
    status: 'pendente' | 'resolvido' | 'nao_resolvido';
    numero_chamado: string | null;
  } | null;
  extravio?: {
    id: string;
    status_ressarcimento: 'pendente' | 'aprovado' | 'negado';
  } | null;
}

export type SituacaoFiltro = 'todos' | 'sem_chamado' | 'com_chamado' | 'com_extravio';
export type TipoAtrasoFiltro = 'todos' | 'transportadora' | 'envio';

export interface FiltrosAtrasados {
  search?: string;
  situacao?: SituacaoFiltro;
  apenasDespachados?: boolean;
  apenasSemRastreio?: boolean;
  tipoAtraso?: TipoAtrasoFiltro;
}

export function calcularDiasAtraso(deliveryEstimate: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataEstimada = new Date(deliveryEstimate + 'T12:00:00');
  dataEstimada.setHours(0, 0, 0, 0);
  
  const diffTime = hoje.getTime() - dataEstimada.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

export function calcularDiasAtrasoEnvio(createdAt: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const dataCriacao = new Date(createdAt);
  dataCriacao.setHours(0, 0, 0, 0);
  
  const diffTime = hoje.getTime() - dataCriacao.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Dias de atraso = dias desde criação - 5 (tolerância)
  return Math.max(0, diffDays - 5);
}

// Status codes que indicam pedido finalizado (não deve aparecer em atrasados)
// 9=Cancelado, 10=Concluído, 11=Pagamento Negado, 13=Devolvido
const STATUS_FINALIZADOS = [9, 10, 11, 13];

// Status codes de pagamento confirmado (para atraso de envio)
const STATUS_PAGOS_SEM_DESPACHO = [3, 4, 5, 15, 16];

export async function atualizarTipoAtraso(orderId: string, tipoAtraso: TipoAtraso): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ 
      tipo_atraso_manual: tipoAtraso,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);
  
  if (error) throw error;
}

export async function marcarPedidoConcluido(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ 
      status: 'delivered',
      wbuy_status_code: 10,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);
  
  if (error) throw error;
}

// Função para atualizar status manualmente (qualquer status WBuy)
export async function atualizarStatusPedido(orderId: string, wbuyStatusCode: number): Promise<void> {
  const statusInfo = STATUS_WBUY[wbuyStatusCode];
  if (!statusInfo) {
    throw new Error(`Status WBuy inválido: ${wbuyStatusCode}`);
  }
  
  const { error } = await supabase
    .from('orders')
    .update({ 
      status: statusInfo.status as 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'payment_denied',
      wbuy_status_code: wbuyStatusCode,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId);
  
  if (error) throw error;
}

async function buscarProblemasExtravios(orderNumbers: string[]) {
  const [{ data: problemas, error: problemasError }, { data: extravios, error: extraviosError }] = await Promise.all([
    supabase
      .from('problemas_pedido')
      .select('id, numero_pedido, status, numero_chamado')
      .in('numero_pedido', orderNumbers),
    supabase
      .from('extravios')
      .select('id, numero_pedido, status_ressarcimento')
      .in('numero_pedido', orderNumbers),
  ]);

  if (problemasError) throw problemasError;
  if (extraviosError) throw extraviosError;

  const problemasMap = new Map(
    (problemas || []).map(p => [p.numero_pedido, { 
      id: p.id, 
      status: p.status as 'pendente' | 'resolvido' | 'nao_resolvido',
      numero_chamado: p.numero_chamado 
    }])
  );
  const extraviosMap = new Map(
    (extravios || []).map(e => [e.numero_pedido, { 
      id: e.id, 
      status_ressarcimento: e.status_ressarcimento as 'pendente' | 'aprovado' | 'negado' 
    }])
  );

  return { problemasMap, extraviosMap };
}

export function useEnviosAtrasados(filters?: FiltrosAtrasados) {
  return useQuery({
    queryKey: ['envios-atrasados', filters],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      
      // Data de 5 dias atrás para atraso de envio
      const cincoDiasAtras = new Date();
      cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);
      const dataCincoDias = cincoDiasAtras.toISOString();

      // === Query 1: Atraso na Transportadora (delivery_estimate ultrapassada) ===
      let transportadoraQuery = supabase
        .from('orders')
        .select('*')
        .lt('delivery_estimate', hoje)
        .not('status', 'in', '(delivered,cancelled)')
        .or('wbuy_status_code.is.null,wbuy_status_code.not.in.(9,10,11,13)')
        .order('delivery_estimate', { ascending: true });

      if (filters?.apenasDespachados) {
        transportadoraQuery = transportadoraQuery.not('tracking_code', 'is', null);
      }
      if (filters?.apenasSemRastreio) {
        transportadoraQuery = transportadoraQuery.is('tracking_code', null);
      }
      if (filters?.search) {
        transportadoraQuery = transportadoraQuery.or(`order_number.ilike.%${filters.search}%,tracking_code.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
      }

      // === Query 2: Atraso de Envio (sem rastreio após 5 dias, pagamento confirmado) ===
      let envioQuery = supabase
        .from('orders')
        .select('*')
        .lt('created_at', dataCincoDias)
        .is('tracking_code', null)
        .not('status', 'in', '(delivered,cancelled)')
        .in('wbuy_status_code', STATUS_PAGOS_SEM_DESPACHO)
        .order('created_at', { ascending: true });

      if (filters?.search) {
        envioQuery = envioQuery.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
      }

      // Decidir quais queries executar baseado no filtro de tipo
      const tipoAtraso = filters?.tipoAtraso || 'todos';
      
      let transportadoraOrders: any[] = [];
      let envioOrders: any[] = [];

      if (tipoAtraso === 'todos' || tipoAtraso === 'transportadora') {
        const { data, error } = await transportadoraQuery;
        if (error) throw error;
        transportadoraOrders = data || [];
      }

      if (tipoAtraso === 'todos' || tipoAtraso === 'envio') {
        // Se filtro apenasDespachados está ativo, não faz sentido buscar atraso de envio (sem rastreio)
        if (!filters?.apenasDespachados) {
          const { data, error } = await envioQuery;
          if (error) throw error;
          envioOrders = data || [];
        }
      }

      // Mesclar sem duplicatas (por id)
      const idsTransportadora = new Set(transportadoraOrders.map(o => o.id));
      const allOrders = [
        ...transportadoraOrders.map(o => ({ ...o, _tipo: 'transportadora' as TipoAtraso })),
        ...envioOrders
          .filter(o => !idsTransportadora.has(o.id))
          .map(o => ({ ...o, _tipo: 'envio' as TipoAtraso })),
      ];

      if (allOrders.length === 0) return [];

      // Buscar problemas e extravios
      const orderNumbers = allOrders.map(o => o.order_number);
      const { problemasMap, extraviosMap } = await buscarProblemasExtravios(orderNumbers);

      // Combinar dados
      let result: EnvioAtrasado[] = allOrders.map(order => ({
        ...order,
        items: order.items as any[],
        tipo_atraso: (order.tipo_atraso_manual as TipoAtraso) || order._tipo,
        dias_atraso: order._tipo === 'transportadora'
          ? (order.delivery_estimate ? calcularDiasAtraso(order.delivery_estimate) : 0)
          : calcularDiasAtrasoEnvio(order.created_at),
        problema: problemasMap.get(order.order_number) || null,
        extravio: extraviosMap.get(order.order_number) || null,
      }));

      // Aplicar filtro de situação
      if (filters?.situacao && filters.situacao !== 'todos') {
        switch (filters.situacao) {
          case 'sem_chamado':
            result = result.filter(r => !r.problema && !r.extravio);
            break;
          case 'com_chamado':
            result = result.filter(r => r.problema !== null);
            break;
          case 'com_extravio':
            result = result.filter(r => r.extravio !== null);
            break;
        }
      }

      return result;
    },
  });
}

export function getStatusSituacao(envio: EnvioAtrasado): {
  label: string;
  color: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  if (envio.extravio) {
    return {
      label: 'Extravio registrado',
      color: 'bg-red-100 text-red-800 border-red-200',
      variant: 'destructive',
    };
  }
  
  if (envio.problema) {
    if (envio.problema.status === 'resolvido') {
      return {
        label: 'Chamado resolvido',
        color: 'bg-green-100 text-green-800 border-green-200',
        variant: 'default',
      };
    }
    if (envio.problema.status === 'nao_resolvido') {
      return {
        label: 'Não resolvido',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        variant: 'secondary',
      };
    }
    return {
      label: 'Chamado aberto',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      variant: 'secondary',
    };
  }
  
  return {
    label: 'Sem chamado',
    color: 'bg-gray-100 text-gray-600 border-gray-200',
    variant: 'outline',
  };
}

export function getTipoAtrasoBadge(tipo: TipoAtraso): {
  label: string;
  color: string;
} {
  return TIPOS_ATRASO[tipo] || TIPOS_ATRASO.transportadora;
}

export { getOrderStatusLabel, getOrderStatusColor };
