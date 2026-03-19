import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ComissaoRelatorio {
  comissao_id: string;
  pedido_id: string;
  numero_pedido: number;
  data_pedido: string;
  cliente_nome: string;
  vendedor_id: string;
  vendedor_nome: string;
  valor_pedido: number;
  pagamento_id?: string;
  valor_parcela: number;
  parcela_info?: string; // ex: "Parcela 1/3"
  data_aprovacao?: string;
  percentual_comissao: number;
  valor_comissao: number;
  status_comissao: 'prevista' | 'pendente' | 'paga' | 'cancelada';
  tipo_comissao: 'prevista' | 'efetiva';
  status_pedido: string;
  anomalias: Array<{
    tipo: 'pagamento_excedente' | 'sem_comissao' | 'valor_divergente';
    descricao: string;
    severidade: 'critico' | 'atencao' | 'informativo';
  }>;
}

export interface RelatorioComissoesData {
  comissoes: ComissaoRelatorio[];
  resumo: {
    total_vendas: number;
    total_comissoes: number;
    total_comissoes_previstas: number;
    total_comissoes_confirmadas: number;
    total_comissoes_pagas: number;
    percentual_medio: number;
    registros_com_anomalias: number;
  };
}

interface UseRelatorioComissoesParams {
  vendedorId?: string;
  mesCompetencia?: string; // formato: YYYY-MM
  statusFiltro?: 'todas' | 'prevista' | 'pendente' | 'paga';
}

export function useRelatorioComissoes({
  vendedorId,
  mesCompetencia,
  statusFiltro = 'todas',
}: UseRelatorioComissoesParams) {
  return useQuery({
    queryKey: ['relatorio-comissoes', vendedorId, mesCompetencia, statusFiltro],
    queryFn: async (): Promise<RelatorioComissoesData> => {
      // 1. Buscar comissões do período (filtrar por mes_competencia)
      let comissoesQuery = supabase
        .from('comissoes')
        .select('*')
        .neq('status', 'cancelada');

      if (vendedorId) {
        comissoesQuery = comissoesQuery.eq('vendedor_id', vendedorId);
      }

      if (mesCompetencia) {
        const mesCompetenciaDate = `${mesCompetencia}-01`;
        comissoesQuery = comissoesQuery.eq('mes_competencia', mesCompetenciaDate);
      }

      // Filtro de status
      if (statusFiltro === 'prevista') {
        comissoesQuery = comissoesQuery.eq('status', 'prevista');
      } else if (statusFiltro === 'pendente') {
        comissoesQuery = comissoesQuery.eq('status', 'pendente');
      } else if (statusFiltro === 'paga') {
        comissoesQuery = comissoesQuery.eq('status', 'paga');
      }

      const { data: comissoes, error: comissoesError } = await comissoesQuery;
      if (comissoesError) throw comissoesError;
      
      if (!comissoes || comissoes.length === 0) {
        return { 
          comissoes: [], 
          resumo: { 
            total_vendas: 0, 
            total_comissoes: 0, 
            total_comissoes_previstas: 0, 
            total_comissoes_confirmadas: 0, 
            total_comissoes_pagas: 0, 
            percentual_medio: 0, 
            registros_com_anomalias: 0 
          } 
        };
      }

      // 2. Buscar os pedidos relacionados
      const pedidosIds = [...new Set(comissoes.map(c => c.pedido_id))];
      const { data: pedidos, error: pedidosError } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          data_pedido,
          valor_total,
          status,
          vendedor_id,
          clientes!inner(nome_razao_social)
        `)
        .in('id', pedidosIds);

      if (pedidosError) throw pedidosError;

      // 3. Buscar vendedores
      const vendedorIds = [...new Set(comissoes.map(c => c.vendedor_id))];
      const { data: vendedores } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', vendedorIds);

      const vendedoresMap = new Map(vendedores?.map(v => [v.id, v.nome]) || []);

      // 4. Buscar pagamentos (para info de parcela)
      const pagamentoIds = comissoes
        .filter(c => c.pagamento_id)
        .map(c => c.pagamento_id);

      let pagamentosMap = new Map<string, any>();
      if (pagamentoIds.length > 0) {
        const { data: pagamentos } = await supabase
          .from('pagamentos')
          .select('id, valor, observacao, data_aprovacao, pedido_id')
          .in('id', pagamentoIds);

        pagamentos?.forEach(p => pagamentosMap.set(p.id, p));
      }

      // 5. Contar total de pagamentos por pedido (para info parcela X/Y)
      const { data: contPagamentos } = await supabase
        .from('pagamentos')
        .select('pedido_id')
        .in('pedido_id', pedidosIds)
        .eq('status', 'aprovado')
        .eq('estornado', false);

      const pagamentosPorPedido = new Map<string, number>();
      contPagamentos?.forEach(p => {
        pagamentosPorPedido.set(
          p.pedido_id, 
          (pagamentosPorPedido.get(p.pedido_id) || 0) + 1
        );
      });

      // 6. Processar cada comissão
      const pedidosMap = new Map(pedidos?.map(p => [p.id, p]) || []);
      
      const comissoesProcessadas: ComissaoRelatorio[] = comissoes.map((comissao, index) => {
        const pedido = pedidosMap.get(comissao.pedido_id);
        const pagamento = comissao.pagamento_id 
          ? pagamentosMap.get(comissao.pagamento_id) 
          : null;
        
        // Detectar anomalias
        const anomalias: ComissaoRelatorio['anomalias'] = [];

        // Determinar info de parcela
        let parcelaInfo: string | undefined;
        if (pagamento && comissao.tipo_comissao === 'efetiva') {
          const totalParcelas = pagamentosPorPedido.get(comissao.pedido_id) || 1;
          // Buscar ordem desta parcela
          const pagamentosMesmoPedido = Array.from(pagamentosMap.values())
            .filter(p => p.pedido_id === comissao.pedido_id)
            .sort((a, b) => new Date(a.data_aprovacao).getTime() - new Date(b.data_aprovacao).getTime());
          
          const indexParcela = pagamentosMesmoPedido.findIndex(p => p.id === pagamento.id);
          if (indexParcela >= 0 && totalParcelas > 1) {
            parcelaInfo = `Parcela ${indexParcela + 1}/${totalParcelas}`;
          }
        }

        return {
          comissao_id: comissao.id,
          pedido_id: comissao.pedido_id,
          numero_pedido: pedido?.numero_pedido || 0,
          data_pedido: pedido?.data_pedido || '',
          cliente_nome: (pedido?.clientes as any)?.nome_razao_social || '-',
          vendedor_id: comissao.vendedor_id,
          vendedor_nome: vendedoresMap.get(comissao.vendedor_id) || '-',
          valor_pedido: Number(comissao.valor_pedido),
          pagamento_id: comissao.pagamento_id || undefined,
          valor_parcela: comissao.tipo_comissao === 'efetiva' 
            ? Number(comissao.valor_pago || pagamento?.valor || 0)
            : Number(comissao.valor_pedido),
          parcela_info: parcelaInfo,
          data_aprovacao: pagamento?.data_aprovacao || undefined,
          percentual_comissao: Number(comissao.percentual_comissao),
          valor_comissao: Number(comissao.valor_comissao),
          status_comissao: comissao.status as ComissaoRelatorio['status_comissao'],
          tipo_comissao: (comissao.tipo_comissao || 'prevista') as 'prevista' | 'efetiva',
          status_pedido: pedido?.status || '',
          anomalias,
        };
      });

      // 7. Ordenar: efetivas primeiro, depois por data
      comissoesProcessadas.sort((a, b) => {
        // Efetivas primeiro
        if (a.tipo_comissao !== b.tipo_comissao) {
          return a.tipo_comissao === 'efetiva' ? -1 : 1;
        }
        // Por data de aprovação (efetivas) ou data do pedido (previstas)
        const dataA = a.data_aprovacao || a.data_pedido;
        const dataB = b.data_aprovacao || b.data_pedido;
        return new Date(dataB).getTime() - new Date(dataA).getTime();
      });

      // 8. Calcular resumo
      const resumo = {
        total_vendas: comissoesProcessadas.reduce((sum, c) => {
          // Para evitar duplicar, só somar valor_pedido das previstas
          // ou valor_parcela das efetivas
          if (c.tipo_comissao === 'prevista') {
            return sum + c.valor_pedido;
          }
          return sum + c.valor_parcela;
        }, 0),
        total_comissoes: comissoesProcessadas.reduce((sum, c) => sum + c.valor_comissao, 0),
        total_comissoes_previstas: comissoesProcessadas
          .filter(c => c.status_comissao === 'prevista')
          .reduce((sum, c) => sum + c.valor_comissao, 0),
        total_comissoes_confirmadas: comissoesProcessadas
          .filter(c => c.status_comissao === 'pendente')
          .reduce((sum, c) => sum + c.valor_comissao, 0),
        total_comissoes_pagas: comissoesProcessadas
          .filter(c => c.status_comissao === 'paga')
          .reduce((sum, c) => sum + c.valor_comissao, 0),
        percentual_medio: comissoesProcessadas.length > 0
          ? comissoesProcessadas.reduce((sum, c) => sum + c.percentual_comissao, 0) / comissoesProcessadas.length
          : 0,
        registros_com_anomalias: comissoesProcessadas.filter(c => c.anomalias.length > 0).length,
      };

      return {
        comissoes: comissoesProcessadas,
        resumo,
      };
    },
    enabled: true,
  });
}
