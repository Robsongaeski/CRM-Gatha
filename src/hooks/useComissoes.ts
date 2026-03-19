import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { sanitizeError } from '@/lib/errorHandling';

export interface Comissao {
  id: string;
  vendedor_id: string;
  pedido_id: string;
  pagamento_id?: string;
  valor_pedido: number;
  valor_pago: number;
  percentual_comissao: number;
  valor_comissao: number;
  mes_competencia: string;
  data_geracao: string;
  status: 'pendente' | 'paga' | 'cancelada' | 'prevista';
  tipo_comissao: 'prevista' | 'efetiva';
  data_pagamento?: string;
  observacao?: string;
  regra_id?: string;
}

export interface FaixaComissao {
  id: string;
  ordem: number;
  valor_minimo: number;
  valor_maximo?: number;
  percentual: number;
  descricao: string;
  ativo: boolean;
}

export interface DashboardComissaoData {
  mes_atual: string;
  total_vendido: number;
  total_comissao_prevista: number;
  total_comissao_confirmada: number;
  total_comissao_paga: number;
  faixa_atual?: FaixaComissao | any;
  proxima_faixa?: FaixaComissao | any;
  valor_falta_proxima_faixa?: number;
  percentual_progresso: number;
  comissoes: Comissao[];
}

// Buscar comissões do vendedor
export function useComissoes(vendedorId?: string, mesCompetencia?: string) {
  return useQuery({
    queryKey: ['comissoes', vendedorId, mesCompetencia],
    queryFn: async () => {
      let query = supabase
        .from('comissoes')
        .select('*')
        .order('data_geracao', { ascending: false });

      if (vendedorId) {
        query = query.eq('vendedor_id', vendedorId);
      }

      if (mesCompetencia) {
        query = query.eq('mes_competencia', mesCompetencia);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Comissao[];
    },
    enabled: !!vendedorId,
  });
}

// Buscar faixas de comissão padrão
export function useFaixasComissao() {
  return useQuery({
    queryKey: ['faixas-comissao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faixas_comissao')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as FaixaComissao[];
    },
  });
}

// Dashboard de comissão do vendedor
export function useDashboardComissao(vendedorIdParam?: string, mesCompetencia?: string) {
  const { user } = useAuth();
  const vendedorId = vendedorIdParam || user?.id;

  return useQuery({
    queryKey: ['dashboard-comissao', vendedorId, mesCompetencia],
    queryFn: async () => {
      if (!vendedorId) return null;

      const mesAtual = mesCompetencia || (new Date().toISOString().slice(0, 7) + '-01');
      const primeiroDiaMes = new Date(mesAtual);
      const ultimoDiaMes = new Date(primeiroDiaMes);
      ultimoDiaMes.setMonth(ultimoDiaMes.getMonth() + 1);

      // 1. Buscar total vendido no mês (todos os pedidos não cancelados)
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select('valor_total')
        .eq('vendedor_id', vendedorId)
        .neq('status', 'cancelado')
        .gte('data_pedido', mesAtual)
        .lt('data_pedido', ultimoDiaMes.toISOString());

      if (pedidosError) throw pedidosError;

      const totalVendido = pedidos?.reduce((sum, p) => sum + Number(p.valor_total), 0) || 0;

      // 2. Buscar regra ativa do vendedor
      const { data: regraAtiva } = await supabase
        .from('regras_comissao_vendedor')
        .select('id')
        .eq('vendedor_id', vendedorId)
        .eq('ativo', true)
        .lte('data_inicio', new Date().toISOString().split('T')[0])
        .or(`data_fim.is.null,data_fim.gte.${new Date().toISOString().split('T')[0]}`)
        .order('data_inicio', { ascending: false })
        .limit(1)
        .maybeSingle();

      let faixas: any[] = [];

      if (regraAtiva) {
        // Usar faixas personalizadas
        const { data: faixasPersonalizadas } = await supabase
          .from('faixas_comissao_vendedor')
          .select('*')
          .eq('regra_id', regraAtiva.id)
          .order('ordem', { ascending: true });
        faixas = faixasPersonalizadas || [];
      } else {
        // Usar faixas padrão
        const { data: faixasPadrao } = await supabase
          .from('faixas_comissao')
          .select('*')
          .eq('ativo', true)
          .order('ordem', { ascending: true });
        faixas = faixasPadrao || [];
      }

      // 3. Determinar faixa atual
      const faixaAtual = [...faixas].reverse().find(f => 
        totalVendido >= f.valor_minimo && 
        (f.valor_maximo === null || totalVendido <= f.valor_maximo)
      ) || faixas[0];

      // 4. Determinar próxima faixa
      const proximaFaixa = faixas.find(f => f.ordem === (faixaAtual?.ordem || 0) + 1);
      const valorFaltaProximaFaixa = proximaFaixa 
        ? Math.max(0, proximaFaixa.valor_minimo - totalVendido)
        : 0;

      // 5. Calcular percentual de progresso
      let percentualProgresso = 100;
      if (proximaFaixa) {
        const rangeInicio = faixaAtual?.valor_minimo || 0;
        const rangeFim = proximaFaixa.valor_minimo;
        percentualProgresso = ((totalVendido - rangeInicio) / (rangeFim - rangeInicio)) * 100;
      }

      // 6. Buscar comissões do mês (competência)
      const { data: comissoes, error: comissoesError } = await supabase
        .from('comissoes')
        .select('*')
        .eq('vendedor_id', vendedorId)
        .eq('mes_competencia', mesAtual)
        .neq('status', 'cancelada');

      if (comissoesError) throw comissoesError;

      // 7. Calcular totais por tipo
      const totalComissaoPrevista = comissoes
        ?.filter(c => c.tipo_comissao === 'prevista' && c.status === 'prevista')
        .reduce((sum, c) => sum + Number(c.valor_comissao), 0) || 0;

      const totalComissaoConfirmada = comissoes
        ?.filter(c => c.tipo_comissao === 'efetiva' && c.status === 'pendente')
        .reduce((sum, c) => sum + Number(c.valor_comissao), 0) || 0;

      const totalComissaoPaga = comissoes
        ?.filter(c => c.status === 'paga')
        .reduce((sum, c) => sum + Number(c.valor_comissao), 0) || 0;

      return {
        mes_atual: mesAtual,
        total_vendido: totalVendido,
        total_comissao_prevista: totalComissaoPrevista,
        total_comissao_confirmada: totalComissaoConfirmada,
        total_comissao_paga: totalComissaoPaga,
        faixa_atual: faixaAtual,
        proxima_faixa: proximaFaixa,
        valor_falta_proxima_faixa: valorFaltaProximaFaixa,
        percentual_progresso: Math.min(100, Math.max(0, percentualProgresso)),
        comissoes: comissoes || [],
      } as DashboardComissaoData;
    },
    enabled: !!vendedorId,
  });
}

// Marcar comissão como paga (admin apenas)
export function useMarcarComissaoPaga() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comissaoId: string) => {
      const { error } = await supabase
        .from('comissoes')
        .update({
          status: 'paga',
          data_pagamento: new Date().toISOString(),
        })
        .eq('id', comissaoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-comissao'] });
      queryClient.invalidateQueries({ queryKey: ['relatorio-comissoes'] });
      toast({ title: 'Sucesso', description: 'Comissão marcada como paga!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: sanitizeError(error), variant: 'destructive' });
    },
  });
}

// Marcar múltiplas comissões como pagas
export function useMarcarComissoesPagas() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comissaoIds: string[]) => {
      const { error } = await supabase
        .from('comissoes')
        .update({
          status: 'paga',
          data_pagamento: new Date().toISOString(),
        })
        .in('id', comissaoIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-comissao'] });
      queryClient.invalidateQueries({ queryKey: ['relatorio-comissoes'] });
      toast({ title: 'Sucesso', description: 'Comissões marcadas como pagas!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: sanitizeError(error), variant: 'destructive' });
    },
  });
}
