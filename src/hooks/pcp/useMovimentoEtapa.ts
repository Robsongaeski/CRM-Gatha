import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeError } from '@/lib/errorHandling';

interface MoverPedidoParams {
  pedidoId: string;
  etapaNovaId: string;
  etapaAnteriorId: string | null;
  observacao?: string;
}

export function useMovimentoEtapa() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const moverPedidoMutation = useMutation({
    mutationFn: async ({ pedidoId, etapaNovaId, etapaAnteriorId, observacao }: MoverPedidoParams) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar informações da nova etapa
      const { data: etapa, error: etapaError } = await supabase
        .from('etapa_producao')
        .select('tipo_etapa')
        .eq('id', etapaNovaId)
        .single();

      if (etapaError) throw etapaError;

      // Determinar o novo status baseado no tipo da etapa
      let novoStatus: 'em_producao' | 'pronto' | 'entregue' = 'em_producao';
      if (etapa?.tipo_etapa === 'final') {
        novoStatus = 'pronto';
      }

      // 1. Atualizar etapa e status do pedido
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({ 
          etapa_producao_id: etapaNovaId,
          status: novoStatus
        })
        .eq('id', pedidoId);

      if (updateError) throw updateError;

      // 2. Registrar movimento
      const { error: movimentoError } = await supabase
        .from('movimento_etapa_producao')
        .insert({
          pedido_id: pedidoId,
          etapa_anterior_id: etapaAnteriorId,
          etapa_nova_id: etapaNovaId,
          usuario_id: user.id,
          observacao,
        });

      if (movimentoError) throw movimentoError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-pcp'] });
      toast.success('Pedido movido com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    moverPedido: moverPedidoMutation.mutateAsync,
    isMoving: moverPedidoMutation.isPending,
  };
}
