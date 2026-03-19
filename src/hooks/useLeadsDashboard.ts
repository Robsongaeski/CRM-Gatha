import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, subDays } from 'date-fns';

interface LeadResumoSemanal {
  totalLeads: number;
  leadsNovos: number;
  leadsEmContato: number;
  leadsConvertidos: number;
  retornosHoje: number;
  leadsSemContato20Dias: number;
  interacoesRealizadas: number;
}

interface LeadPendente {
  id: string;
  nome: string;
  telefone?: string;
  whatsapp?: string;
  data_retorno?: string;
  ultima_interacao?: string;
  status: string;
  tipo: 'retorno_hoje' | 'retorno_atrasado' | 'sem_contato';
  dias_sem_contato?: number;
  segmento?: {
    nome: string;
    cor: string;
    icone?: string;
  };
}

// Hook principal com suporte a vendedor selecionado (para admins)
export function useLeadsDashboardVendedor(vendedorIdSelecionado?: string) {
  const { user } = useAuth();

  // Se houver vendedor selecionado, usar esse; senão, usar o usuário logado
  const vendedorId = vendedorIdSelecionado || user?.id;

  return useQuery({
    queryKey: ['leads-dashboard-vendedor', vendedorId],
    queryFn: async (): Promise<LeadResumoSemanal> => {
      if (!vendedorId) {
        return {
          totalLeads: 0,
          leadsNovos: 0,
          leadsEmContato: 0,
          leadsConvertidos: 0,
          retornosHoje: 0,
          leadsSemContato20Dias: 0,
          interacoesRealizadas: 0,
        };
      }

      const hoje = new Date();
      const inicioHoje = startOfDay(hoje);
      const fimHoje = endOfDay(hoje);
      const inicioSemana = startOfWeek(hoje, { weekStartsOn: 1 });
      const fimSemana = endOfWeek(hoje, { weekStartsOn: 1 });
      const limite20Dias = subDays(hoje, 20);

      // Total de leads do vendedor
      const { count: totalLeads } = await supabase
        .from('leads' as any)
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_id', vendedorId)
        .eq('ativo', true);

      // Leads novos (status = novo)
      const { count: leadsNovos } = await supabase
        .from('leads' as any)
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_id', vendedorId)
        .eq('status', 'novo')
        .eq('ativo', true);

      // Leads em contato (qualquer lead que o vendedor esteja trabalhando)
      const { count: leadsEmContato } = await supabase
        .from('leads' as any)
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_id', vendedorId)
        .eq('status', 'contatando')
        .eq('ativo', true);

      // Leads convertidos esta semana
      const { count: leadsConvertidos } = await supabase
        .from('leads' as any)
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_id', vendedorId)
        .eq('status', 'convertido')
        .gte('updated_at', inicioSemana.toISOString())
        .lte('updated_at', fimSemana.toISOString());

      // Retornos para hoje (leads que o vendedor precisa contatar hoje)
      const { count: retornosHoje } = await supabase
        .from('leads' as any)
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_id', vendedorId)
        .eq('ativo', true)
        .gte('data_retorno', inicioHoje.toISOString())
        .lte('data_retorno', fimHoje.toISOString())
        .in('status', ['contatando', 'qualificado']);

      // Leads sem contato há mais de 20 dias (apenas leads atribuídos ao vendedor)
      const { count: leadsSemContato20Dias } = await supabase
        .from('leads' as any)
        .select('*', { count: 'exact', head: true })
        .eq('vendedor_id', vendedorId)
        .eq('ativo', true)
        .in('status', ['contatando', 'qualificado'])
        .or(`ultima_interacao.is.null,ultima_interacao.lt.${limite20Dias.toISOString()}`);

      // Interações realizadas esta semana
      const { count: interacoesRealizadas } = await supabase
        .from('leads_interacoes' as any)
        .select('*', { count: 'exact', head: true })
        .eq('created_by', vendedorId)
        .gte('created_at', inicioSemana.toISOString())
        .lte('created_at', fimSemana.toISOString());

      return {
        totalLeads: totalLeads || 0,
        leadsNovos: leadsNovos || 0,
        leadsEmContato: leadsEmContato || 0,
        leadsConvertidos: leadsConvertidos || 0,
        retornosHoje: retornosHoje || 0,
        leadsSemContato20Dias: leadsSemContato20Dias || 0,
        interacoesRealizadas: interacoesRealizadas || 0,
      };
    },
    enabled: !!vendedorId,
    staleTime: 60000,
    refetchInterval: 120000, // 2 minutos em vez de 1
  });
}

// Hook para leads pendentes (apenas leads ATRIBUÍDOS ao vendedor com prazo vencido)
export function useLeadsPendentesVendedor(vendedorIdSelecionado?: string) {
  const { user } = useAuth();
  const vendedorId = vendedorIdSelecionado || user?.id;

  return useQuery({
    queryKey: ['leads-pendentes-vendedor', vendedorId],
    queryFn: async (): Promise<LeadPendente[]> => {
      if (!vendedorId) return [];

      const hoje = new Date();
      const inicioHoje = startOfDay(hoje);
      const fimHoje = endOfDay(hoje);
      const limite20Dias = subDays(hoje, 20);

      // Buscar retornos de hoje e atrasados (apenas status contatando/qualificado - já sendo trabalhados)
      const { data: retornos } = await supabase
        .from('leads' as any)
        .select(`
          id, nome, telefone, whatsapp, data_retorno, ultima_interacao, status,
          segmento:segmentos(nome, cor, icone)
        `)
        .eq('vendedor_id', vendedorId)
        .eq('ativo', true)
        .not('data_retorno', 'is', null)
        .lte('data_retorno', fimHoje.toISOString())
        .in('status', ['contatando', 'qualificado'])
        .order('data_retorno', { ascending: true })
        .limit(20);

      // Buscar leads sem contato há 20+ dias (apenas leads sendo trabalhados pelo vendedor)
      const { data: semContato } = await supabase
        .from('leads' as any)
        .select(`
          id, nome, telefone, whatsapp, data_retorno, ultima_interacao, status, created_at,
          segmento:segmentos(nome, cor, icone)
        `)
        .eq('vendedor_id', vendedorId)
        .eq('ativo', true)
        .is('data_retorno', null)
        .in('status', ['contatando', 'qualificado'])
        .or(`ultima_interacao.lt.${limite20Dias.toISOString()}`)
        .order('ultima_interacao', { ascending: true, nullsFirst: true })
        .limit(10);

      const leadsPendentes: LeadPendente[] = [];

      // Processar retornos
      for (const lead of (retornos || []) as any[]) {
        const dataRetorno = new Date(lead.data_retorno);
        const isHoje = dataRetorno >= inicioHoje && dataRetorno <= fimHoje;
        const isAtrasado = dataRetorno < inicioHoje;

        leadsPendentes.push({
          ...lead,
          tipo: isHoje ? 'retorno_hoje' : isAtrasado ? 'retorno_atrasado' : 'retorno_hoje',
          segmento: lead.segmento,
        });
      }

      // Processar leads sem contato há 20+ dias
      for (const lead of (semContato || []) as any[]) {
        const dataRef = lead.ultima_interacao ? new Date(lead.ultima_interacao) : new Date(lead.created_at);
        const diasSemContato = Math.floor((hoje.getTime() - dataRef.getTime()) / (1000 * 60 * 60 * 24));

        // Só incluir se realmente passou 20+ dias e não está duplicado
        if (diasSemContato >= 20 && !leadsPendentes.find(l => l.id === lead.id)) {
          leadsPendentes.push({
            ...lead,
            tipo: 'sem_contato',
            dias_sem_contato: diasSemContato,
            segmento: lead.segmento,
          });
        }
      }

      return leadsPendentes;
    },
    enabled: !!vendedorId,
    staleTime: 60000,
    refetchInterval: 120000,
  });
}
