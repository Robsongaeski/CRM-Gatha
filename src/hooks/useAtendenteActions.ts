import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sanitizeError } from '@/lib/errorHandling';
import { StatusPedido } from './usePedidos';

export const useAlterarStatusPedido = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      pedidoId, 
      novoStatus, 
      observacao 
    }: { 
      pedidoId: string; 
      novoStatus: StatusPedido; 
      observacao?: string 
    }) => {
      // Validar que não é cancelado
      if (novoStatus === 'cancelado') {
        throw new Error('Atendentes não podem cancelar pedidos');
      }
      
      const updateData: any = { status: novoStatus };
      
      if (observacao) {
        const { data: pedidoAtual } = await supabase
          .from('pedidos')
          .select('observacao')
          .eq('id', pedidoId)
          .single();
        
        const obsAtual = pedidoAtual?.observacao || '';
        const dataHora = new Date().toLocaleString('pt-BR');
        updateData.observacao = obsAtual 
          ? `${obsAtual}\n\n[${dataHora}] ${observacao}`
          : `[${dataHora}] ${observacao}`;
      }
      
      const { error } = await supabase
        .from('pedidos')
        .update(updateData)
        .eq('id', pedidoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entrega-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      toast({ title: 'Status atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar status', 
        description: sanitizeError(error),
        variant: 'destructive' 
      });
    },
  });
};

export const useAdicionarObservacaoPedido = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      pedidoId, 
      observacao 
    }: { 
      pedidoId: string; 
      observacao: string 
    }) => {
      const { data: pedidoAtual } = await supabase
        .from('pedidos')
        .select('observacao')
        .eq('id', pedidoId)
        .single();
      
      const obsAtual = pedidoAtual?.observacao || '';
      const dataHora = new Date().toLocaleString('pt-BR');
      const novaObs = obsAtual 
        ? `${obsAtual}\n\n[${dataHora}] ${observacao}`
        : `[${dataHora}] ${observacao}`;
      
      const { error } = await supabase
        .from('pedidos')
        .update({ observacao: novaObs })
        .eq('id', pedidoId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entrega-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido'] });
      toast({ title: 'Observação adicionada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao adicionar observação', 
        description: sanitizeError(error),
        variant: 'destructive' 
      });
    },
  });
};
