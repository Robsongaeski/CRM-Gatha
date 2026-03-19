import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface OcasiaoMimo {
  id: string;
  nome: string;
  tipo: 'fixa' | 'personalizada';
  ativo: boolean;
  created_at: string;
}

export interface ColaboradorMimo {
  id: string;
  colaborador_id: string;
  ocasiao_id: string | null;
  data_entrega: string;
  descricao: string | null;
  valor_estimado: number | null;
  ano_referencia: number;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
  colaborador?: {
    id: string;
    nome: string;
    cargo: string;
  };
  ocasiao?: OcasiaoMimo | null;
}

export function useOcasioesMimo() {
  return useQuery({
    queryKey: ['ocasioes-mimo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ocasioes_mimo')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data as OcasiaoMimo[];
    },
  });
}

export function useCreateOcasiaoMimo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ocasiao: { nome: string; tipo: 'fixa' | 'personalizada' }) => {
      const { data, error } = await supabase
        .from('ocasioes_mimo')
        .insert(ocasiao)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ocasioes-mimo'] });
      toast.success('Ocasião criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar ocasião: ' + error.message);
    },
  });
}

export function useMimosColaborador(anoReferencia?: number) {
  const ano = anoReferencia || new Date().getFullYear();

  return useQuery({
    queryKey: ['mimos-colaborador', ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaborador_mimos')
        .select(`
          *,
          colaborador:colaboradores(id, nome, cargo),
          ocasiao:ocasioes_mimo(*)
        `)
        .eq('ano_referencia', ano)
        .order('data_entrega', { ascending: false });

      if (error) throw error;
      return data as ColaboradorMimo[];
    },
  });
}

export function useRegistrarMimo() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (mimo: {
      colaborador_id: string;
      ocasiao_id?: string;
      data_entrega: string;
      descricao?: string;
      valor_estimado?: number;
      ano_referencia: number;
      observacao?: string;
    }) => {
      const { data, error } = await supabase
        .from('colaborador_mimos')
        .insert({
          ...mimo,
          registrado_por: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mimos-colaborador'] });
      toast.success('Mimo registrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao registrar mimo: ' + error.message);
    },
  });
}

export function useDeleteMimo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colaborador_mimos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mimos-colaborador'] });
      toast.success('Mimo removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover mimo: ' + error.message);
    },
  });
}

export function useResumoMimosAno(ano: number) {
  return useQuery({
    queryKey: ['resumo-mimos', ano],
    queryFn: async () => {
      // Get all employees
      const { data: colaboradores, error: colabError } = await supabase
        .from('colaboradores')
        .select('id, nome, cargo, data_nascimento')
        .eq('ativo', true);

      if (colabError) throw colabError;

      // Get all ocasioes
      const { data: ocasioes, error: ocaError } = await supabase
        .from('ocasioes_mimo')
        .select('*')
        .eq('ativo', true);

      if (ocaError) throw ocaError;

      // Get all mimos for the year
      const { data: mimos, error: mimosError } = await supabase
        .from('colaborador_mimos')
        .select('colaborador_id, ocasiao_id')
        .eq('ano_referencia', ano);

      if (mimosError) throw mimosError;

      // Calculate who received what
      const resumo = colaboradores.map((colab) => {
        const mimosRecebidos = mimos.filter((m) => m.colaborador_id === colab.id);
        const ocasioesRecebidas = mimosRecebidos.map((m) => m.ocasiao_id);
        const ocasioesFaltantes = ocasioes.filter((o) => !ocasioesRecebidas.includes(o.id));

        return {
          ...colab,
          mimosRecebidos: mimosRecebidos.length,
          ocasioesFaltantes,
        };
      });

      return {
        colaboradores: resumo,
        ocasioes,
        totalMimos: mimos.length,
      };
    },
  });
}
