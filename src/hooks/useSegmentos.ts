import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sanitizeError } from '@/lib/errorHandling';

export interface Segmento {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string;
  icone?: string;
  ativo: boolean;
}

// Hook para buscar apenas segmentos ativos (para usar em selects e formulários)
export function useSegmentos() {
  return useQuery({
    queryKey: ['segmentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('segmentos')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as Segmento[];
    },
  });
}

// Hook para buscar TODOS os segmentos (ativos e inativos) - para usar em listas administrativas
export function useAllSegmentos() {
  return useQuery({
    queryKey: ['segmentos', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('segmentos')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as Segmento[];
    },
  });
}

export function useSaveSegmento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segmento: Partial<Segmento>) => {
      console.log('🔧 Hook useSaveSegmento - Iniciando:', segmento);
      
      if (segmento.id) {
        console.log('📝 Atualizando segmento existente:', segmento.id);
        const { data, error } = await supabase
          .from('segmentos')
          .update(segmento)
          .eq('id', segmento.id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Erro ao atualizar:', error);
          throw error;
        }
        console.log('✅ Segmento atualizado:', data);
        return data;
      } else {
      console.log('➕ Criando novo segmento');
      // Remove id field to let database auto-generate it
      const { id, ...segmentoSemId } = segmento;
      const { data, error } = await supabase
        .from('segmentos')
        .insert([segmentoSemId as any])
        .select()
        .single();
        
        if (error) {
          console.error('❌ Erro ao criar:', error);
          throw error;
        }
        console.log('✅ Segmento criado:', data);
        return data;
      }
    },
    onSuccess: () => {
      console.log('🎉 Sucesso - Invalidando queries');
      queryClient.invalidateQueries({ queryKey: ['segmentos'] });
      toast({
        title: 'Sucesso',
        description: 'Segmento salvo com sucesso.',
      });
    },
    onError: (error: Error) => {
      console.error('❌ Erro no hook:', error);
      toast({
        title: 'Erro',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

// Toggle do status ativo/inativo do segmento
export function useToggleSegmento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Buscar o segmento atual para verificar o status
      const { data: segmento, error: fetchError } = await supabase
        .from('segmentos')
        .select('ativo')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Alternar o status
      const novoStatus = !segmento.ativo;
      
      const { error } = await supabase
        .from('segmentos')
        .update({ ativo: novoStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      return novoStatus;
    },
    onSuccess: (novoStatus) => {
      queryClient.invalidateQueries({ queryKey: ['segmentos'] });
      toast({
        title: 'Sucesso',
        description: novoStatus 
          ? 'Segmento ativado com sucesso.' 
          : 'Segmento desativado com sucesso.',
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
