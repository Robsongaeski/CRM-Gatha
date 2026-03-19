import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FiltrosPropostaKanban {
  busca?: string;
  clienteId?: string;
  vendedorId?: string;
}

export function usePropostasKanban(filtros?: FiltrosPropostaKanban) {
  // Buscar etapas de aprovação de arte
  const { data: etapasAprovacao = [], isLoading: loadingEtapas } = useQuery({
    queryKey: ['etapas-aprovacao-kanban'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('etapa_producao')
        .select('*')
        .eq('ativa', true)
        .eq('tipo_etapa', 'aprovacao_arte')
        .order('ordem');

      if (error) throw error;
      return data;
    },
  });

  // Buscar propostas com criar_previa = true e status ativo (não ganha/perdida)
  const { data: propostas = [], isLoading: loadingPropostas } = useQuery({
    queryKey: ['propostas-kanban', filtros],
    queryFn: async () => {
      let query = supabase
        .from('propostas')
        .select(`
          id,
          cliente_id,
          vendedor_id,
          status,
          valor_total,
          observacoes,
          criar_previa,
          caminho_arquivos,
          descricao_criacao,
          imagem_aprovacao_url,
          imagem_referencia_url,
          etapa_aprovacao_id,
          created_at,
          updated_at,
          cliente:clientes(id, nome_razao_social, telefone, whatsapp),
          vendedor:profiles!vendedor_id(id, nome),
          proposta_tags:proposta_tags(id, nome, cor)
        `)
        .eq('criar_previa', true)
        .not('status', 'in', '(ganha,perdida)');

      // Filtro por cliente
      if (filtros?.clienteId) {
        query = query.eq('cliente_id', filtros.clienteId);
      }

      // Filtro por vendedor
      if (filtros?.vendedorId) {
        query = query.eq('vendedor_id', filtros.vendedorId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      // Filtro por busca (nome do cliente)
      let resultados = data || [];
      if (filtros?.busca) {
        const busca = filtros.busca.toLowerCase();
        resultados = resultados.filter((p) => {
          const nomeCliente = (p.cliente as any)?.nome_razao_social?.toLowerCase() || '';
          return nomeCliente.includes(busca);
        });
      }

      return resultados;
    },
  });

  // Agrupar propostas por etapa
  const propostasPorEtapa = etapasAprovacao.map(etapa => ({
    etapa,
    propostas: propostas.filter(p => p.etapa_aprovacao_id === etapa.id),
  }));

  // Propostas sem etapa definida
  const propostasSemEtapa = propostas.filter(p => !p.etapa_aprovacao_id);

  return {
    etapasAprovacao,
    propostas,
    propostasPorEtapa,
    propostasSemEtapa,
    isLoading: loadingEtapas || loadingPropostas,
  };
}
