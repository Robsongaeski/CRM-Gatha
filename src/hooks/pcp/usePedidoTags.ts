import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

export interface PedidoTag {
  id: string;
  pedido_id: string;
  nome: string;
  cor: string;
  created_at: string;
}

export function usePedidoTags(pedidoId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['pedido-tags', pedidoId],
    queryFn: async () => {
      if (!pedidoId) return [];
      
      const { data, error } = await supabase
        .from('pedido_tags')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as PedidoTag[];
    },
    enabled: !!pedidoId,
  });

  const addTagMutation = useMutation({
    mutationFn: async ({ pedidoId, nome, cor }: { pedidoId: string; nome: string; cor: string }) => {
      const { error } = await supabase
        .from('pedido_tags')
        .insert({ pedido_id: pedidoId, nome, cor });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido-tags', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });
      toast.success('Tag adicionada');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('pedido_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido-tags', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });
      toast.success('Tag removida');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    tags,
    isLoading,
    addTag: addTagMutation.mutateAsync,
    removeTag: removeTagMutation.mutateAsync,
    isAdding: addTagMutation.isPending,
    isRemoving: removeTagMutation.isPending,
  };
}
