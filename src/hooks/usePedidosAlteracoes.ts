import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

export interface PedidoAlteracaoSolicitacao {
  id: string;
  pedido_id: string;
  solicitado_por: string;
  analisado_por?: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado';
  motivo_solicitacao?: string | null;
  observacao_solicitante?: string | null;
  observacao_aprovador?: string | null;
  dados_anteriores: any;
  dados_propostos: any;
  data_solicitacao: string;
  data_analise?: string | null;
  pedido?: {
    id: string;
    numero_pedido: number;
    status: string;
    vendedor_id: string;
    cliente?: {
      nome_razao_social: string;
    } | null;
    vendedor?: {
      nome: string;
      email?: string | null;
    } | null;
  };
  solicitante?: {
    nome: string;
    email?: string | null;
  } | null;
  analista?: {
    nome: string;
    email?: string | null;
  } | null;
}

const enrichSolicitacoes = async (solicitacoes: PedidoAlteracaoSolicitacao[]) => {
  if (!solicitacoes.length) return solicitacoes;

  const pedidoIds = [...new Set(solicitacoes.map((s) => s.pedido_id))];
  const userIds = [...new Set(
    solicitacoes
      .flatMap((s) => [s.solicitado_por, s.analisado_por])
      .filter(Boolean)
  )] as string[];

  const [{ data: pedidos }, { data: profiles }] = await Promise.all([
    supabase
      .from('pedidos')
      .select(`
        id,
        numero_pedido,
        status,
        vendedor_id,
        cliente:clientes(nome_razao_social),
        vendedor:profiles!pedidos_vendedor_id_fkey(nome, email)
      `)
      .in('id', pedidoIds),
    userIds.length
      ? supabase
          .from('profiles')
          .select('id, nome, email')
          .in('id', userIds)
      : Promise.resolve({ data: [] as any[] } as any),
  ]);

  const pedidosMap = new Map((pedidos || []).map((p: any) => [p.id, p]));
  const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));

  return solicitacoes.map((s) => ({
    ...s,
    pedido: pedidosMap.get(s.pedido_id) || undefined,
    solicitante: profilesMap.get(s.solicitado_por)
      ? {
          nome: profilesMap.get(s.solicitado_por).nome,
          email: profilesMap.get(s.solicitado_por).email,
        }
      : null,
    analista: s.analisado_por && profilesMap.get(s.analisado_por)
      ? {
          nome: profilesMap.get(s.analisado_por).nome,
          email: profilesMap.get(s.analisado_por).email,
        }
      : null,
  }));
};

export function usePedidosAlteracoesPendentes() {
  return useQuery({
    queryKey: ['pedidos-alteracoes-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_alteracoes_pendentes' as any)
        .select('*')
        .eq('status', 'pendente')
        .order('data_solicitacao', { ascending: false });

      if (error) throw error;
      return enrichSolicitacoes((data || []) as PedidoAlteracaoSolicitacao[]);
    },
  });
}

export function usePedidoAlteracoes(pedidoId?: string) {
  return useQuery({
    queryKey: ['pedido-alteracoes', pedidoId],
    queryFn: async () => {
      if (!pedidoId) return [];

      const { data, error } = await supabase
        .from('pedidos_alteracoes_pendentes' as any)
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('data_solicitacao', { ascending: false });

      if (error) throw error;
      return enrichSolicitacoes((data || []) as PedidoAlteracaoSolicitacao[]);
    },
    enabled: !!pedidoId,
  });
}

export function usePedidoAlteracaoPendente(pedidoId?: string) {
  return useQuery({
    queryKey: ['pedido-alteracao-pendente', pedidoId],
    queryFn: async () => {
      if (!pedidoId) return null;

      const { data, error } = await supabase
        .from('pedidos_alteracoes_pendentes' as any)
        .select('*')
        .eq('pedido_id', pedidoId)
        .eq('status', 'pendente')
        .maybeSingle();

      if (error) throw error;
      return (data || null) as PedidoAlteracaoSolicitacao | null;
    },
    enabled: !!pedidoId,
  });
}

export function useCreateSolicitacaoAlteracaoPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      pedido_id: string;
      solicitado_por: string;
      motivo_solicitacao?: string;
      observacao_solicitante?: string;
      dados_anteriores: any;
      dados_propostos: any;
    }) => {
      const { data: pendenteAtual, error: pendenteError } = await supabase
        .from('pedidos_alteracoes_pendentes' as any)
        .select('id, solicitado_por')
        .eq('pedido_id', data.pedido_id)
        .eq('status', 'pendente')
        .maybeSingle();

      if (pendenteError) throw pendenteError;

      if (pendenteAtual && pendenteAtual.solicitado_por !== data.solicitado_por) {
        throw new Error('Ja existe uma solicitacao pendente para este pedido aguardando analise.');
      }

      if (pendenteAtual) {
        const { error: updateError } = await supabase
          .from('pedidos_alteracoes_pendentes' as any)
          .update({
            motivo_solicitacao: data.motivo_solicitacao || null,
            observacao_solicitante: data.observacao_solicitante || null,
            dados_anteriores: data.dados_anteriores,
            dados_propostos: data.dados_propostos,
            solicitado_por: data.solicitado_por,
            data_solicitacao: new Date().toISOString(),
          })
          .eq('id', pendenteAtual.id);

        if (updateError) throw updateError;
        return { id: pendenteAtual.id, status: 'updated' };
      }

      const { data: inserted, error: insertError } = await supabase
        .from('pedidos_alteracoes_pendentes' as any)
        .insert({
          pedido_id: data.pedido_id,
          solicitado_por: data.solicitado_por,
          motivo_solicitacao: data.motivo_solicitacao || null,
          observacao_solicitante: data.observacao_solicitante || null,
          dados_anteriores: data.dados_anteriores,
          dados_propostos: data.dados_propostos,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-alteracoes-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-alteracao-pendente'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-alteracoes'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-historico'] });
      toast.success('Solicitacao de alteracao enviada para aprovacao.');
    },
    onError: (error: unknown) => {
      toast.error(sanitizeError(error));
    },
  });
}

export function useProcessarSolicitacaoAlteracaoPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      solicitacao_id: string;
      aprovar: boolean;
      observacao?: string;
    }) => {
      const { data: response, error } = await supabase.rpc('processar_solicitacao_alteracao_pedido' as any, {
        p_solicitacao_id: data.solicitacao_id,
        p_aprovar: data.aprovar,
        p_observacao: data.observacao || null,
      });

      if (error) throw error;
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-alteracoes-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-alteracao-pendente'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-alteracoes'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-historico'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-geral'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-vendedor'] });

      toast.success(
        variables.aprovar
          ? 'Alteracao aprovada e aplicada no pedido.'
          : 'Solicitacao de alteracao rejeitada.'
      );
    },
    onError: (error: unknown) => {
      toast.error(sanitizeError(error));
    },
  });
}
