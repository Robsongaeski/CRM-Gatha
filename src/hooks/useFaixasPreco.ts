import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

export interface FaixaPreco {
  id: string;
  produto_id: string;
  quantidade_minima: number;
  quantidade_maxima: number | null;
  preco_minimo: number;
  preco_maximo: number;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface FaixaPrecoFormData {
  quantidade_minima: number;
  quantidade_maxima: number | null;
  preco_minimo: number;
  preco_maximo: number;
  ordem: number;
}

export function useFaixasPreco(produtoId?: string) {
  return useQuery({
    queryKey: ['faixas-preco', produtoId],
    queryFn: async () => {
      if (!produtoId) return [];
      
      const { data, error } = await supabase
        .from('faixas_preco_produto')
        .select('*')
        .eq('produto_id', produtoId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as FaixaPreco[];
    },
    enabled: !!produtoId,
  });
}

export function useFaixaPrecoPorQuantidade(produtoId?: string, quantidade?: number) {
  return useQuery({
    queryKey: ['faixa-preco-quantidade', produtoId, quantidade],
    queryFn: async () => {
      if (!produtoId || !quantidade) return null;

      const { data, error } = await supabase.rpc('buscar_faixa_preco', {
        p_produto_id: produtoId,
        p_quantidade: quantidade,
      });

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!produtoId && !!quantidade && quantidade > 0,
  });
}

export function useCreateFaixaPreco(produtoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FaixaPrecoFormData) => {
      const { error } = await supabase
        .from('faixas_preco_produto')
        .insert([{ ...data, produto_id: produtoId }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faixas-preco', produtoId] });
      toast.success('Faixa de preço criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(sanitizeError(error));
    },
  });
}

export function useUpdateFaixaPreco(produtoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FaixaPrecoFormData }) => {
      const { error } = await supabase
        .from('faixas_preco_produto')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faixas-preco', produtoId] });
      toast.success('Faixa de preço atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(sanitizeError(error));
    },
  });
}

export function useDeleteFaixaPreco(produtoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('faixas_preco_produto')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faixas-preco', produtoId] });
      toast.success('Faixa de preço deletada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(sanitizeError(error));
    },
  });
}
