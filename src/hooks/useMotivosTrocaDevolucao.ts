import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MotivoTrocaDevolucao {
  id: string;
  nome: string;
  tipo: string; // Pode ser 'troca', 'devolucao', 'problema', 'ambos' ou JSON array
  ativo: boolean | null;
  ordem: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Função para normalizar e parsear o tipo JSON
function parseTipos(tipo: string): string[] {
  try {
    const parsed = JSON.parse(tipo);
    if (Array.isArray(parsed)) {
      // Normalizar: remover duplicatas e padronizar para lowercase
      const normalized = parsed.map(t => t.toLowerCase());
      return [...new Set(normalized)];
    }
    return [tipo.toLowerCase()];
  } catch {
    if (tipo === 'ambos') return ['troca', 'devolucao'];
    return [tipo.toLowerCase()];
  }
}

export function useMotivos(tipo?: 'troca' | 'devolucao' | 'problema') {
  return useQuery({
    queryKey: ['motivos-troca-devolucao', tipo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivos_troca_devolucao')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      
      // Filtrar por tipo se especificado
      if (tipo && data) {
        return (data as MotivoTrocaDevolucao[]).filter(motivo => {
          const tipos = parseTipos(motivo.tipo);
          return tipos.includes(tipo.toLowerCase());
        });
      }
      
      return data as MotivoTrocaDevolucao[];
    },
  });
}

export function useMotivo(id: string | undefined) {
  return useQuery({
    queryKey: ['motivo-troca-devolucao', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('motivos_troca_devolucao')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as MotivoTrocaDevolucao;
    },
    enabled: !!id,
  });
}

export function useCreateMotivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<MotivoTrocaDevolucao, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: result, error } = await supabase
        .from('motivos_troca_devolucao')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-troca-devolucao'] });
      toast.success('Motivo criado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar motivo:', error);
      toast.error('Erro ao criar motivo');
    },
  });
}

export function useUpdateMotivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<MotivoTrocaDevolucao> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('motivos_troca_devolucao')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-troca-devolucao'] });
      toast.success('Motivo atualizado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar motivo:', error);
      toast.error('Erro ao atualizar motivo');
    },
  });
}

export function useDeleteMotivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('motivos_troca_devolucao')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-troca-devolucao'] });
      toast.success('Motivo excluído com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir motivo:', error);
      toast.error('Erro ao excluir motivo');
    },
  });
}
