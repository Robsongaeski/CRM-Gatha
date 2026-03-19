import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Colaborador {
  id: string;
  user_id: string | null;
  nome: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  rg: string | null;
  data_nascimento: string | null;
  foto_url: string | null;
  data_admissao: string;
  data_demissao: string | null;
  cargo: string;
  setor_id: string | null;
  salario_atual: number;
  tipo_contrato: 'clt' | 'pj' | 'estagio' | 'temporario' | 'aprendiz';
  carga_horaria: number;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: 'corrente' | 'poupanca' | 'salario' | null;
  chave_pix: string | null;
  endereco_cep: string | null;
  endereco_logradouro: string | null;
  endereco_numero: string | null;
  endereco_complemento: string | null;
  endereco_bairro: string | null;
  endereco_cidade: string | null;
  endereco_estado: string | null;
  pontos_gamificacao: number;
  observacoes: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Relacionamentos
  setor?: { id: string; nome: string } | null;
  profile?: { id: string; nome: string; email: string } | null;
}

export interface ColaboradorInput {
  user_id?: string | null;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  cpf?: string | null;
  rg?: string | null;
  data_nascimento?: string | null;
  foto_url?: string | null;
  data_admissao: string;
  data_demissao?: string | null;
  cargo: string;
  setor_id?: string | null;
  salario_atual?: number;
  tipo_contrato: 'clt' | 'pj' | 'estagio' | 'temporario' | 'aprendiz';
  carga_horaria?: number;
  banco?: string | null;
  agencia?: string | null;
  conta?: string | null;
  tipo_conta?: 'corrente' | 'poupanca' | 'salario' | null;
  chave_pix?: string | null;
  endereco_cep?: string | null;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_estado?: string | null;
  observacoes?: string | null;
  ativo?: boolean;
}

export function useColaboradores(filters?: { ativo?: boolean; setor_id?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: colaboradores = [], isLoading, error } = useQuery({
    queryKey: ['colaboradores', filters],
    queryFn: async () => {
      let query = supabase
        .from('colaboradores')
        .select(`
          *,
          setor:setores(id, nome)
        `)
        .order('nome');

      if (filters?.ativo !== undefined) {
        query = query.eq('ativo', filters.ativo);
      }
      if (filters?.setor_id) {
        query = query.eq('setor_id', filters.setor_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Colaborador[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (input: ColaboradorInput) => {
      const { data, error } = await supabase
        .from('colaboradores')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({ title: 'Sucesso', description: 'Colaborador cadastrado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao cadastrar colaborador: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: ColaboradorInput & { id: string }) => {
      const { data, error } = await supabase
        .from('colaboradores')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({ title: 'Sucesso', description: 'Colaborador atualizado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao atualizar colaborador: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - apenas desativa
      const { error } = await supabase
        .from('colaboradores')
        .update({ ativo: false, data_demissao: new Date().toISOString().split('T')[0] })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
      toast({ title: 'Sucesso', description: 'Colaborador desativado com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao desativar colaborador: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  return {
    colaboradores,
    isLoading,
    error,
    createColaborador: createMutation.mutate,
    updateColaborador: updateMutation.mutate,
    deleteColaborador: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useColaborador(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['colaborador', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *,
          setor:setores(id, nome)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Colaborador;
    },
    enabled: !!user && !!id,
  });
}
