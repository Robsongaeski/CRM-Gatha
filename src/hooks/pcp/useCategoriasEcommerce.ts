import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategoriaEcommerce {
  id: string;
  nome: string;
  codigos: string[];
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export function useCategoriasEcommerce() {
  return useQuery({
    queryKey: ['categorias-ecommerce'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categoria_produto_ecommerce')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as CategoriaEcommerce[];
    },
  });
}

export function useTodasCategoriasEcommerce() {
  return useQuery({
    queryKey: ['categorias-ecommerce-todas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categoria_produto_ecommerce')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as CategoriaEcommerce[];
    },
  });
}

export function useCriarCategoriaEcommerce() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoria: Omit<CategoriaEcommerce, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('categoria_produto_ecommerce')
        .insert(categoria)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-ecommerce'] });
      queryClient.invalidateQueries({ queryKey: ['categorias-ecommerce-todas'] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao criar categoria:', error);
      toast.error('Erro ao criar categoria');
    },
  });
}

export function useAtualizarCategoriaEcommerce() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CategoriaEcommerce> & { id: string }) => {
      const { data, error } = await supabase
        .from('categoria_produto_ecommerce')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-ecommerce'] });
      queryClient.invalidateQueries({ queryKey: ['categorias-ecommerce-todas'] });
      toast.success('Categoria atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao atualizar categoria:', error);
      toast.error('Erro ao atualizar categoria');
    },
  });
}

export function useExcluirCategoriaEcommerce() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categoria_produto_ecommerce')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias-ecommerce'] });
      queryClient.invalidateQueries({ queryKey: ['categorias-ecommerce-todas'] });
      toast.success('Categoria excluída com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir categoria:', error);
      toast.error('Erro ao excluir categoria');
    },
  });
}

// Função utilitária para classificar um produto pelo código
export function classificarProdutoPorCodigo(
  codigoProduto: string,
  categorias: CategoriaEcommerce[]
): { categoria: string; categoriaId: string | null } {
  if (!codigoProduto || !categorias?.length) {
    return { categoria: 'Outros', categoriaId: null };
  }

  const codigoUpper = codigoProduto.toUpperCase();
  
  // Ordenar por prioridade (ordem)
  const sorted = [...categorias].sort((a, b) => a.ordem - b.ordem);
  
  for (const cat of sorted) {
    for (const prefixo of cat.codigos) {
      if (codigoUpper.startsWith(prefixo.toUpperCase())) {
        return { categoria: cat.nome, categoriaId: cat.id };
      }
    }
  }
  
  return { categoria: 'Outros', categoriaId: null };
}
