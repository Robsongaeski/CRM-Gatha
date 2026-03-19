import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DashboardVendedorData {
  // Métricas Gerais
  total_pedidos_mes: number;
  total_vendas_mes: number;
  total_comissao_mes: number;
  ticket_medio: number;
  
  // Pedidos por Status
  pedidos_em_producao: number;
  pedidos_prontos: number;
  pedidos_entregues: number;
  pedidos_cancelados: number;
  
  // Pagamentos
  valor_aguardando_pagamento: number;
  valor_parcial: number;
  valor_quitado: number;
  
  // Comissões
  comissoes_pendentes: number;
  comissoes_pagas: number;
  comissoes_canceladas: number;
  comissoes_previstas: number;
  comissoes_confirmadas: number;
  
  // Últimos Pedidos
  ultimos_pedidos: any[];
  
  // Propostas Abertas (para follow-up)
  propostas_abertas: any[];

  // Grades de prova vencidas
  grades_vencidas: any[];
  
  // Comparação com mês anterior
  crescimento_vendas: number;
  crescimento_pedidos: number;
}

export function useDashboardVendedor(vendedorIdParam?: string) {
  const { user } = useAuth();
  const vendedorId = vendedorIdParam || user?.id;

  return useQuery({
    queryKey: ['dashboard-vendedor', vendedorId],
    queryFn: async () => {
      if (!vendedorId) return null;

      const mesAtual = new Date().toISOString().slice(0, 7) + '-01';
      const mesAnterior = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7) + '-01';
      const primeiroDiaMesAtual = new Date(mesAtual);
      const ultimoDiaMesAtual = new Date(primeiroDiaMesAtual);
      ultimoDiaMesAtual.setMonth(ultimoDiaMesAtual.getMonth() + 1);
      
      const primeiroDiaMesAnterior = new Date(mesAnterior);
      const ultimoDiaMesAnterior = new Date(primeiroDiaMesAnterior);
      ultimoDiaMesAnterior.setMonth(ultimoDiaMesAnterior.getMonth() + 1);

      // 1. Buscar todos os pedidos do mês atual (excluir cancelados e aguardando aprovação)
      const { data: pedidosMesAtual } = await supabase
        .from('pedidos')
        .select('*')
        .eq('vendedor_id', vendedorId)
        .neq('status', 'cancelado')
        .or('requer_aprovacao_preco.is.null,requer_aprovacao_preco.eq.false')
        .gte('data_pedido', mesAtual)
        .lt('data_pedido', ultimoDiaMesAtual.toISOString());

      // 2. Buscar pedidos do mês anterior para comparação
      const { data: pedidosMesAnterior } = await supabase
        .from('pedidos')
        .select('valor_total')
        .eq('vendedor_id', vendedorId)
        .neq('status', 'cancelado')
        .or('requer_aprovacao_preco.is.null,requer_aprovacao_preco.eq.false')
        .gte('data_pedido', mesAnterior)
        .lt('data_pedido', ultimoDiaMesAnterior.toISOString());

      // 3. Buscar comissões do mês
      const { data: comissoes } = await supabase
        .from('comissoes')
        .select('*')
        .eq('vendedor_id', vendedorId)
        .eq('mes_competencia', mesAtual);

      // 4. Buscar últimos 5 pedidos com detalhes
      const { data: ultimosPedidos } = await supabase
        .from('pedidos')
        .select('*, clientes(nome_razao_social)')
        .eq('vendedor_id', vendedorId)
        .order('data_pedido', { ascending: false })
        .limit(5);

      // 5. Buscar propostas abertas (pendente ou em follow-up) para follow-up
      const { data: propostasAbertas } = await supabase
        .from('propostas')
        .select('*, clientes(nome_razao_social, whatsapp, telefone)')
        .eq('vendedor_id', vendedorId)
        .in('status', ['pendente', 'follow_up'])
        .order('data_follow_up', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(10);

      // 6. Buscar grades de prova vencidas
      const hoje = new Date().toISOString().split('T')[0];
      const { data: gradesVencidas } = await supabase
        .from('emprestimos_grade_prova')
        .select('*, clientes(nome_razao_social, whatsapp)')
        .eq('vendedor_id', vendedorId)
        .eq('status', 'emprestado')
        .lt('data_prevista_devolucao', hoje)
        .order('data_prevista_devolucao', { ascending: true });

      // Calcular métricas
      const pedidosAtual = pedidosMesAtual || [];
      const pedidosAnterior = pedidosMesAnterior || [];
      const comissoesData = comissoes || [];

      const totalVendasMes = pedidosAtual.reduce((sum, p) => sum + Number(p.valor_total), 0);
      const totalVendasMesAnterior = pedidosAnterior.reduce((sum, p) => sum + Number(p.valor_total), 0);
      const totalComissaoMes = comissoesData.reduce((sum, c) => sum + Number(c.valor_comissao), 0);

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

      // Calcular ticket médio
      const ticketMedio = pedidosAtual.length > 0 ? totalVendasMes / pedidosAtual.length : 0;

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
        propostas_abertas: propostasAbertas || [],
        grades_vencidas: gradesVencidas || [],
        
        crescimento_vendas: crescimentoVendas,
        crescimento_pedidos: crescimentoPedidos,
      } as DashboardVendedorData;
    },
    enabled: !!vendedorId,
  });
}
