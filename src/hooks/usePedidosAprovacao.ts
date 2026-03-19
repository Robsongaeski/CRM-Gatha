import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

export interface PedidoAprovacao {
  id: string;
  pedido_id: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  motivo_solicitacao: string;
  observacao_vendedor?: string;
  observacao_admin?: string;
  solicitado_por: string;
  analisado_por?: string;
  data_solicitacao: string;
  data_analise?: string;
  pedido?: {
    numero_pedido: number;
    vendedor: {
      nome: string;
    };
    cliente: {
      nome_razao_social: string;
    };
  };
}

export function usePedidosAprovacaoPendentes() {
  return useQuery({
    queryKey: ['pedidos-aprovacao-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_aprovacao')
        .select(`
          *,
          pedido:pedidos!inner(
            numero_pedido,
            vendedor:profiles!pedidos_vendedor_id_fkey(nome),
            cliente:clientes!inner(nome_razao_social)
          )
        `)
        .eq('status', 'pendente')
        .order('data_solicitacao', { ascending: false });

      if (error) throw error;
      return data as PedidoAprovacao[];
    },
  });
}

export function usePedidoAprovacao(pedidoId?: string) {
  return useQuery({
    queryKey: ['pedido-aprovacao', pedidoId],
    queryFn: async () => {
      if (!pedidoId) return null;

      const { data, error } = await supabase
        .from('pedidos_aprovacao')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('data_solicitacao', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PedidoAprovacao | null;
    },
    enabled: !!pedidoId,
  });
}

export function useCreateSolicitacaoAprovacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      pedido_id: string;
      motivo_solicitacao: string;
      observacao_vendedor?: string;
      solicitado_por: string;
    }) => {
      // Deletar solicitações pendentes anteriores do mesmo pedido
      await supabase
        .from('pedidos_aprovacao')
        .delete()
        .eq('pedido_id', data.pedido_id)
        .eq('status', 'pendente');

      // Criar nova solicitação
      const { error } = await supabase
        .from('pedidos_aprovacao')
        .insert([data]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-aprovacao-pendentes'] });
      toast.success('Solicitação de aprovação enviada!');
    },
    onError: (error: any) => {
      toast.error(sanitizeError(error));
    },
  });
}

export function useAprovarRejeitarSolicitacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      status: 'aprovado' | 'rejeitado';
      observacao_admin?: string;
      analisado_por: string;
    }) => {
      // Buscar informações da solicitação
      const { data: solicitacao, error: solicitacaoError } = await supabase
        .from('pedidos_aprovacao')
        .select('pedido_id')
        .eq('id', data.id)
        .single();

      if (solicitacaoError) throw solicitacaoError;

      // Atualizar status da solicitação
      const { error } = await supabase
        .from('pedidos_aprovacao')
        .update({
          status: data.status,
          observacao_admin: data.observacao_admin,
          analisado_por: data.analisado_por,
          data_analise: new Date().toISOString(),
        })
        .eq('id', data.id);

      if (error) throw error;

      if (data.status === 'aprovado') {
        // Remove a flag de aprovação do pedido
        await supabase
          .from('pedidos')
          .update({ requer_aprovacao_preco: false })
          .eq('id', solicitacao.pedido_id);
        
        // Invalidar dashboards para que as estatísticas sejam atualizadas
        queryClient.invalidateQueries({ queryKey: ['dashboard-geral'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-vendedor'] });
      } else if (data.status === 'rejeitado') {
        // Buscar observação atual do pedido
        const { data: pedidoAtual } = await supabase
          .from('pedidos')
          .select('observacao')
          .eq('id', solicitacao.pedido_id)
          .single();

        // Cancelar o pedido e adicionar observação
        const observacaoAtual = pedidoAtual?.observacao || '';
        const motivoRejeicao = data.observacao_admin 
          ? `Pedido rejeitado por preços fora da política. Motivo: ${data.observacao_admin}`
          : 'Pedido rejeitado por preços fora da política comercial.';
        
        const novaObservacao = observacaoAtual 
          ? `${observacaoAtual}\n\n${motivoRejeicao}`
          : motivoRejeicao;

        await supabase
          .from('pedidos')
          .update({ 
            status: 'cancelado',
            observacao: novaObservacao,
            requer_aprovacao_preco: false
          })
          .eq('id', solicitacao.pedido_id);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-aprovacao-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-geral'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-vendedor'] });
      toast.success(
        variables.status === 'aprovado'
          ? 'Pedido aprovado com sucesso! Agora conta nas estatísticas.'
          : 'Pedido rejeitado e cancelado automaticamente.'
      );
    },
    onError: (error: any) => {
      toast.error(sanitizeError(error));
    },
  });
}
