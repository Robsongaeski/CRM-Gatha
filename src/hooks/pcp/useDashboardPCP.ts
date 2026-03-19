import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useDashboardPCP() {
  const { data: pedidosPorEtapa = [], isLoading: loadingEtapas } = useQuery({
    queryKey: ['dashboard-pcp-etapas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          etapa_producao_id,
          etapa_producao:etapa_producao(nome_etapa, cor_hex)
        `)
        .in('status', ['em_producao']);

      if (error) throw error;

      // Agrupar por etapa
      const grouped = data.reduce((acc: any, pedido: any) => {
        const etapaNome = pedido.etapa_producao?.nome_etapa || 'Sem etapa';
        if (!acc[etapaNome]) {
          acc[etapaNome] = {
            etapa: etapaNome,
            cor: pedido.etapa_producao?.cor_hex || '#94a3b8',
            quantidade: 0,
          };
        }
        acc[etapaNome].quantidade += 1;
        return acc;
      }, {});

      return Object.values(grouped);
    },
  });

  const { data: falhasHoje = 0, isLoading: loadingFalhas } = useQuery({
    queryKey: ['dashboard-pcp-falhas-hoje'],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('falha_producao')
        .select('*', { count: 'exact', head: true })
        .eq('data_falha', hoje);

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: impressoesHoje = 0, isLoading: loadingImpressoes } = useQuery({
    queryKey: ['dashboard-pcp-impressoes-hoje'],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0];
      const { count, error } = await supabase
        .from('impressao_pedido')
        .select('*', { count: 'exact', head: true })
        .eq('data_impressao', hoje);

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: pedidosUrgentes = [], isLoading: loadingUrgentes } = useQuery({
    queryKey: ['dashboard-pcp-urgentes'],
    queryFn: async () => {
      const proximosDias = new Date();
      proximosDias.setDate(proximosDias.getDate() + 3);

      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          data_entrega,
          cliente:clientes(nome_razao_social),
          etapa_producao:etapa_producao(nome_etapa)
        `)
        .eq('status', 'em_producao')
        .lte('data_entrega', proximosDias.toISOString())
        .order('data_entrega', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  const { data: falhasPorCategoria = [], isLoading: loadingFalhasCat } = useQuery({
    queryKey: ['dashboard-pcp-falhas-categoria'],
    queryFn: async () => {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      const { data, error } = await supabase
        .from('falha_producao')
        .select(`
          id,
          categoria_falha:categoria_falha(nome_categoria)
        `)
        .gte('data_falha', seteDiasAtras.toISOString().split('T')[0]);

      if (error) throw error;

      // Agrupar por categoria
      const grouped = data.reduce((acc: any, falha: any) => {
        const categoria = falha.categoria_falha?.nome_categoria || 'Outros';
        if (!acc[categoria]) {
          acc[categoria] = { categoria, quantidade: 0 };
        }
        acc[categoria].quantidade += 1;
        return acc;
      }, {});

      return Object.values(grouped);
    },
  });

  return {
    pedidosPorEtapa,
    falhasHoje,
    impressoesHoje,
    pedidosUrgentes,
    falhasPorCategoria,
    isLoading: loadingEtapas || loadingFalhas || loadingImpressoes || loadingUrgentes || loadingFalhasCat,
  };
}
