import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PeriodoFiltro {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface MetricasEnvios {
  totalPedidos: number;
  entregaAtrasada: number;
  envioAtrasado: number;
  entregues: number;
  percentualEntregaAtrasada: number;
  percentualEnvioAtrasado: number;
}

export interface MetricasComparativo {
  atual: MetricasEnvios;
  anterior: MetricasEnvios;
}

// Status finalizados
const STATUS_FINALIZADOS = [9, 10, 11, 13];
const STATUS_PAGOS_SEM_DESPACHO = [3, 4, 5, 15, 16];

async function buscarMetricasPeriodo(startDate: string, endDate: string): Promise<MetricasEnvios> {
  const endDateFull = endDate + 'T23:59:59';

  // Pedidos criados no período
  const { count: totalPedidos } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDateFull);

  // Pedidos entregues no período
  const { count: entregues } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDateFull)
    .eq('status', 'delivered');

  // Entrega atrasada: delivery_estimate ultrapassada, não finalizado
  const { count: entregaAtrasada } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDateFull)
    .not('delivery_estimate', 'is', null)
    .lt('delivery_estimate', new Date().toISOString().split('T')[0])
    .not('status', 'in', '(delivered,cancelled)')
    .or('wbuy_status_code.is.null,wbuy_status_code.not.in.(9,10,11,13)');

  // Atraso de envio: sem rastreio após 5 dias, pagamento confirmado
  const cincoDiasAtras = new Date();
  cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);
  
  const { count: envioAtrasado } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', startDate)
    .lte('created_at', endDateFull)
    .lt('created_at', cincoDiasAtras.toISOString())
    .is('tracking_code', null)
    .not('status', 'in', '(delivered,cancelled)')
    .in('wbuy_status_code', STATUS_PAGOS_SEM_DESPACHO);

  const total = totalPedidos || 0;
  const atrasadaCount = entregaAtrasada || 0;
  const envioCount = envioAtrasado || 0;

  return {
    totalPedidos: total,
    entregaAtrasada: atrasadaCount,
    envioAtrasado: envioCount,
    entregues: entregues || 0,
    percentualEntregaAtrasada: total > 0 ? (atrasadaCount / total) * 100 : 0,
    percentualEnvioAtrasado: total > 0 ? (envioCount / total) * 100 : 0,
  };
}

function calcularPeriodoAnterior(startDate: string, endDate: string): { startDate: string; endDate: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  
  const anteriorEnd = new Date(start.getTime() - 1); // dia anterior ao início
  const anteriorStart = new Date(anteriorEnd.getTime() - diffMs);
  
  return {
    startDate: anteriorStart.toISOString().split('T')[0],
    endDate: anteriorEnd.toISOString().split('T')[0],
  };
}

export function useEnviosDashboardMetrics(periodo: PeriodoFiltro) {
  return useQuery({
    queryKey: ['envios-dashboard-metrics', periodo],
    queryFn: async () => {
      const periodoAnterior = calcularPeriodoAnterior(periodo.startDate, periodo.endDate);
      
      const [atual, anterior] = await Promise.all([
        buscarMetricasPeriodo(periodo.startDate, periodo.endDate),
        buscarMetricasPeriodo(periodoAnterior.startDate, periodoAnterior.endDate),
      ]);

      return { atual, anterior } as MetricasComparativo;
    },
    enabled: !!periodo.startDate && !!periodo.endDate,
  });
}

// Métricas em tempo real (sem filtro de período - estado atual)
export function useEnviosDashboardRealtime() {
  return useQuery({
    queryKey: ['envios-dashboard-realtime'],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const hojeStart = hoje + 'T00:00:00';
      const hojeEnd = hoje + 'T23:59:59';

      const cincoDiasAtras = new Date();
      cincoDiasAtras.setDate(cincoDiasAtras.getDate() - 5);

      const [
        { count: aguardandoDespacho },
        { count: entregaAtrasada },
        { count: envioAtrasado },
        { count: semRastreio },
        { count: semNfe },
      ] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .eq('status_envio', 'aguardando_despacho'),
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .not('delivery_estimate', 'is', null)
          .lt('delivery_estimate', hoje)
          .not('status', 'in', '(delivered,cancelled)')
          .or('wbuy_status_code.is.null,wbuy_status_code.not.in.(9,10,11,13)'),
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .lt('created_at', cincoDiasAtras.toISOString())
          .is('tracking_code', null)
          .not('status', 'in', '(delivered,cancelled)')
          .in('wbuy_status_code', [3, 4, 5, 15, 16]),
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .is('tracking_code', null)
          .not('status', 'in', '(cancelled,delivered)')
          .not('status', 'eq', 'pending'),
        supabase.from('orders').select('id', { count: 'exact', head: true })
          .is('chave_nfe', null)
          .not('status', 'in', '(cancelled)')
          .not('status', 'eq', 'pending'),
      ]);

      return {
        aguardandoDespacho: aguardandoDespacho || 0,
        entregaAtrasada: entregaAtrasada || 0,
        envioAtrasado: envioAtrasado || 0,
        semRastreio: semRastreio || 0,
        semNfe: semNfe || 0,
      };
    },
  });
}
