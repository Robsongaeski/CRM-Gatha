import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentMonthStart, getNextMonthStart, getPreviousMonthStart } from '@/lib/monthUtils';

export interface DashboardGeralData {
  // Métricas Gerais Consolidadas
  total_pedidos_mes: number;
  total_vendas_mes: number;
  total_comissao_mes: number;
  ticket_medio: number;
  
  // Pedidos por Status (todos os vendedores)
  pedidos_em_producao: number;
  pedidos_prontos: number;
  pedidos_entregues: number;
  pedidos_cancelados: number;
  
  // Pagamentos Consolidados
  valor_aguardando_pagamento: number;
  valor_parcial: number;
  valor_quitado: number;
  
  // Comissões Consolidadas
  comissoes_pendentes: number;
  comissoes_pagas: number;
  comissoes_canceladas: number;
  comissoes_previstas: number;
  comissoes_confirmadas: number;
  
  // Últimos Pedidos (de todos os vendedores)
  ultimos_pedidos: any[];
  
  // Comparação com mês anterior
  crescimento_vendas: number;
  crescimento_pedidos: number;
  
  // Ranking de Vendedores (top 5)
  top_vendedores: Array<{
    vendedor_id: string;
    vendedor_nome: string;
    total_vendas: number;
    total_pedidos: number;
    ticket_medio: number;
  }>;
}

export function useDashboardGeral() {
  return useQuery({
    queryKey: ['dashboard-geral'],
    queryFn: async () => {
      const mesAtual = getCurrentMonthStart();
      const mesAnterior = getPreviousMonthStart();
      const proximoMesAtual = getNextMonthStart(mesAtual);
      const proximoMesAnterior = getNextMonthStart(mesAnterior);

      // 1. Buscar todos os pedidos do mês atual (não cancelados e não aguardando aprovação)
      const { data: pedidosMesAtual } = await supabase
        .from('pedidos')
        .select('*, clientes(nome_razao_social)')
        .neq('status', 'cancelado')
        .gte('data_pedido', mesAtual)
        .lt('data_pedido', proximoMesAtual);

      // 2. Buscar pedidos do mês anterior para comparação
      const { data: pedidosMesAnterior } = await supabase
        .from('pedidos')
        .select('valor_total')
        .neq('status', 'cancelado')
        .gte('data_pedido', mesAnterior)
        .lt('data_pedido', proximoMesAnterior);

      // 3. Buscar comissões do mês
      const { data: comissoes } = await supabase
        .from('comissoes')
        .select('*')
        .eq('mes_competencia', mesAtual);

      // 4. Buscar últimos 5 pedidos de todos os vendedores
      const { data: ultimosPedidos } = await supabase
        .from('pedidos')
        .select('*, clientes(nome_razao_social)')
        .order('data_pedido', { ascending: false })
        .limit(5);

      // 5. Buscar profiles dos vendedores para o ranking
      const { data: vendedores } = await supabase
        .from('profiles')
        .select('id, nome');

      // Calcular métricas
      const pedidosAtual = pedidosMesAtual || [];
      const pedidosAnterior = pedidosMesAnterior || [];
      const comissoesData = comissoes || [];

      const totalVendasMes = pedidosAtual.reduce((sum, p) => sum + Number(p.valor_total), 0);
      const totalVendasMesAnterior = pedidosAnterior.reduce((sum, p) => sum + Number(p.valor_total), 0);
      const totalComissaoMes = comissoesData.reduce((sum, c) => sum + Number(c.valor_comissao), 0);

      const ticketMedio = pedidosAtual.length > 0 ? totalVendasMes / pedidosAtual.length : 0;

      const crescimentoVendas = totalVendasMesAnterior > 0 
        ? ((totalVendasMes - totalVendasMesAnterior) / totalVendasMesAnterior) * 100 
        : 0;

      const crescimentoPedidos = pedidosAnterior.length > 0
        ? ((pedidosAtual.length - pedidosAnterior.length) / pedidosAnterior.length) * 100
        : 0;

      // Pedidos por status
      const pedidosEmProducao = pedidosAtual.filter(p => p.status === 'em_producao').length;
      const pedidosProntos = pedidosAtual.filter(p => p.status === 'pronto').length;
      const pedidosEntregues = pedidosAtual.filter(p => p.status === 'entregue').length;
      const pedidosCancelados = pedidosAtual.filter(p => p.status === 'cancelado').length;

      // Valores por status de pagamento
      const valorAguardando = pedidosAtual
        .filter(p => p.status_pagamento === 'aguardando')
        .reduce((sum, p) => sum + Number(p.valor_total), 0);
      
      const valorParcial = pedidosAtual
        .filter(p => p.status_pagamento === 'parcial')
        .reduce((sum, p) => sum + Number(p.valor_total), 0);
      
      const valorQuitado = pedidosAtual
        .filter(p => p.status_pagamento === 'quitado')
        .reduce((sum, p) => sum + Number(p.valor_total), 0);

      // Comissões por status
      const comissoesPendentes = comissoesData
        .filter(c => c.status === 'pendente')
        .reduce((sum, c) => sum + Number(c.valor_comissao), 0);
      
      const comissoesPagas = comissoesData
        .filter(c => c.status === 'paga')
        .reduce((sum, c) => sum + Number(c.valor_comissao), 0);
      
      const comissoesCanceladas = comissoesData
        .filter(c => c.status === 'cancelada')
        .reduce((sum, c) => sum + Number(c.valor_comissao), 0);

      // Comissões previstas (todos os pedidos não cancelados) e confirmadas (pedidos quitados)
      const comissoesPrevistas = comissoesData
        .filter(c => c.status !== 'cancelada')
        .reduce((sum, c) => sum + Number(c.valor_comissao), 0);
      
      const comissoesConfirmadas = comissoesData
        .filter(c => c.status === 'pendente' || c.status === 'paga')
        .reduce((sum, c) => sum + Number(c.valor_comissao), 0);

      // Calcular ranking de vendedores
      const vendedorStats = new Map<string, { vendedor_id: string; vendedor_nome: string; total_vendas: number; total_pedidos: number }>();
      
      pedidosAtual.forEach(pedido => {
        const stats = vendedorStats.get(pedido.vendedor_id) || {
          vendedor_id: pedido.vendedor_id,
          vendedor_nome: vendedores?.find(v => v.id === pedido.vendedor_id)?.nome || 'Desconhecido',
          total_vendas: 0,
          total_pedidos: 0,
        };
        
        stats.total_vendas += Number(pedido.valor_total);
        stats.total_pedidos += 1;
        vendedorStats.set(pedido.vendedor_id, stats);
      });

      const topVendedores = Array.from(vendedorStats.values())
        .map(v => ({
          ...v,
          ticket_medio: v.total_pedidos > 0 ? v.total_vendas / v.total_pedidos : 0,
        }))
        .sort((a, b) => b.total_vendas - a.total_vendas)
        .slice(0, 5);

      return {
        total_pedidos_mes: pedidosAtual.length,
        total_vendas_mes: totalVendasMes,
        total_comissao_mes: totalComissaoMes,
        ticket_medio: ticketMedio,
        
        pedidos_em_producao: pedidosEmProducao,
        pedidos_prontos: pedidosProntos,
        pedidos_entregues: pedidosEntregues,
        pedidos_cancelados: pedidosCancelados,
        
        valor_aguardando_pagamento: valorAguardando,
        valor_parcial: valorParcial,
        valor_quitado: valorQuitado,
        
        comissoes_pendentes: comissoesPendentes,
        comissoes_pagas: comissoesPagas,
        comissoes_canceladas: comissoesCanceladas,
        comissoes_previstas: comissoesPrevistas,
        comissoes_confirmadas: comissoesConfirmadas,
        
        ultimos_pedidos: ultimosPedidos || [],
        
        crescimento_vendas: crescimentoVendas,
        crescimento_pedidos: crescimentoPedidos,
        
        top_vendedores: topVendedores,
      } as DashboardGeralData;
    },
  });
}
