import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sanitizeError } from '@/lib/errorHandling';

export interface RegraComissao {
  id: string;
  vendedor_id: string;
  nome_regra: string;
  ativo: boolean;
  data_inicio: string;
  data_fim?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
}

export interface FaixaComissaoVendedor {
  id: string;
  regra_id: string;
  ordem: number;
  valor_minimo: number;
  valor_maximo?: number;
  percentual: number;
  descricao?: string;
  created_at: string;
}

export interface RegraComissaoFormData {
  vendedor_id: string;
  nome_regra: string;
  data_inicio: string;
  data_fim?: string;
  observacao?: string;
  faixas: Omit<FaixaComissaoVendedor, 'id' | 'regra_id' | 'created_at'>[];
}

// Buscar regras de comissão
export function useRegrasComissao(vendedorId?: string) {
  return useQuery({
    queryKey: ['regras-comissao', vendedorId],
    queryFn: async () => {
      let query = supabase
        .from('regras_comissao_vendedor')
        .select('*, profiles!inner(nome)')
        .order('created_at', { ascending: false });

      if (vendedorId) {
        query = query.eq('vendedor_id', vendedorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RegraComissao[];
    },
  });
}

// Buscar faixas de uma regra específica
export function useFaixasRegraComissao(regraId?: string) {
  return useQuery({
    queryKey: ['faixas-regra-comissao', regraId],
    queryFn: async () => {
      if (!regraId) return [];
      
      const { data, error } = await supabase
        .from('faixas_comissao_vendedor')
        .select('*')
        .eq('regra_id', regraId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as FaixaComissaoVendedor[];
    },
    enabled: !!regraId,
  });
}

// Criar regra de comissão
export function useCreateRegraComissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: RegraComissaoFormData) => {
      // 1. Desativar outras regras ativas do vendedor
      await supabase
        .from('regras_comissao_vendedor')
        .update({ ativo: false })
        .eq('vendedor_id', data.vendedor_id)
        .eq('ativo', true);

      // 2. Criar nova regra
      const { data: novaRegra, error: regraError } = await supabase
        .from('regras_comissao_vendedor')
        .insert({
          vendedor_id: data.vendedor_id,
          nome_regra: data.nome_regra,
          data_inicio: data.data_inicio,
          data_fim: data.data_fim,
          observacao: data.observacao,
          ativo: true,
        })
        .select()
        .single();

      if (regraError) throw regraError;

      // 3. Inserir faixas
      const faixasComRegraId = data.faixas.map(faixa => ({
        ...faixa,
        regra_id: novaRegra.id,
      }));

      const { error: faixasError } = await supabase
        .from('faixas_comissao_vendedor')
        .insert(faixasComRegraId);

      if (faixasError) throw faixasError;

      return novaRegra;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-comissao'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-comissao'] });
      toast({ title: 'Sucesso', description: 'Regra de comissão criada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: sanitizeError(error), variant: 'destructive' });
    },
  });
}

// Atualizar regra de comissão
export function useUpdateRegraComissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ regraId, data }: { regraId: string; data: Partial<RegraComissaoFormData> }) => {
      const { error } = await supabase
        .from('regras_comissao_vendedor')
        .update({
          nome_regra: data.nome_regra,
          data_inicio: data.data_inicio,
          data_fim: data.data_fim,
          observacao: data.observacao,
        })
        .eq('id', regraId);

      if (error) throw error;

      // Se houver faixas, atualizar
      if (data.faixas) {
        // Deletar faixas antigas
        await supabase
          .from('faixas_comissao_vendedor')
          .delete()
          .eq('regra_id', regraId);

        // Inserir novas faixas
        const faixasComRegraId = data.faixas.map(faixa => ({
          ...faixa,
          regra_id: regraId,
        }));

        await supabase
          .from('faixas_comissao_vendedor')
          .insert(faixasComRegraId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-comissao'] });
      queryClient.invalidateQueries({ queryKey: ['faixas-regra-comissao'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-comissao'] });
      toast({ title: 'Sucesso', description: 'Regra de comissão atualizada!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: sanitizeError(error), variant: 'destructive' });
    },
  });
}

// Ativar/Desativar regra de comissão
export function useToggleRegraComissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ regraId, ativo, vendedorId }: { regraId: string; ativo: boolean; vendedorId: string }) => {
      // Se ativando, desativar outras do mesmo vendedor
      if (ativo) {
        await supabase
          .from('regras_comissao_vendedor')
          .update({ ativo: false })
          .eq('vendedor_id', vendedorId)
          .eq('ativo', true)
          .neq('id', regraId);
      }

      const { error } = await supabase
        .from('regras_comissao_vendedor')
        .update({ ativo })
        .eq('id', regraId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-comissao'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-comissao'] });
      toast({ title: 'Sucesso', description: 'Status da regra atualizado!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: sanitizeError(error), variant: 'destructive' });
    },
  });
}

// Deletar regra de comissão
export function useDeleteRegraComissao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (regraId: string) => {
      const { error } = await supabase
        .from('regras_comissao_vendedor')
        .delete()
        .eq('id', regraId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-comissao'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-comissao'] });
      toast({ title: 'Sucesso', description: 'Regra de comissão excluída!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: sanitizeError(error), variant: 'destructive' });
    },
  });
}
