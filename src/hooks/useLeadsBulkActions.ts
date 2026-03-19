import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sanitizeError } from '@/lib/errorHandling';

export function useDesativarLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('leads' as any)
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Sucesso',
        description: `${ids.length} lead(s) desativado(s).`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useExcluirLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('leads' as any)
        .delete()
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Sucesso',
        description: `${ids.length} lead(s) excluído(s) permanentemente.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useAtualizarStatusLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('leads' as any)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Status atualizado',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}
