import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface RegraBonificacao {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  tipo: 'fixo' | 'percentual';
  aplicavel_a: 'todos' | 'setor' | 'cargo';
  setor_id: string | null;
  cargo: string | null;
  ativo: boolean;
  created_at: string;
}

export interface ColaboradorBonificacao {
  id: string;
  colaborador_id: string;
  regra_id: string | null;
  mes_referencia: string;
  valor: number;
  recebeu: boolean;
  justificativa: string | null;
  registrado_por: string | null;
  created_at: string;
  colaborador?: {
    id: string;
    nome: string;
    cargo: string;
  };
  regra?: RegraBonificacao | null;
}

export function useRegrasBonificacao() {
  return useQuery({
    queryKey: ['regras-bonificacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_bonificacao')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as RegraBonificacao[];
    },
  });
}

export function useCreateRegraBonificacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (regra: Omit<RegraBonificacao, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('regras_bonificacao')
        .insert(regra)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-bonificacao'] });
      toast.success('Regra de bonificação criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar regra: ' + error.message);
    },
  });
}

export function useUpdateRegraBonificacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...regra }: Partial<RegraBonificacao> & { id: string }) => {
      const { data, error } = await supabase
        .from('regras_bonificacao')
        .update(regra)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-bonificacao'] });
      toast.success('Regra atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar regra: ' + error.message);
    },
  });
}

export function useBonificacoesColaborador(mesReferencia?: string) {
  return useQuery({
    queryKey: ['bonificacoes-colaborador', mesReferencia],
    queryFn: async () => {
      let query = supabase
        .from('colaborador_bonificacao')
        .select(`
          *,
          colaborador:colaboradores(id, nome, cargo),
          regra:regras_bonificacao(*)
        `)
        .order('created_at', { ascending: false });

      if (mesReferencia) {
        query = query.eq('mes_referencia', mesReferencia);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ColaboradorBonificacao[];
    },
  });
}

export function useRegistrarBonificacao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (bonificacao: {
      colaborador_id: string;
      regra_id?: string;
      mes_referencia: string;
      valor: number;
      recebeu: boolean;
      justificativa?: string;
    }) => {
      const { data, error } = await supabase
        .from('colaborador_bonificacao')
        .insert({
          ...bonificacao,
          registrado_por: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonificacoes-colaborador'] });
      toast.success('Bonificação registrada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar bonificação: ' + error.message);
    },
  });
}
