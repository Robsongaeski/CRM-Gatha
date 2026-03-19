import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { differenceInDays, parseISO, addYears } from 'date-fns';

export interface Ferias {
  id: string;
  colaborador_id: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  data_inicio: string | null;
  data_fim: string | null;
  dias: number;
  tipo: 'normal' | 'fracionada';
  abono_pecuniario: boolean | null;
  status: 'agendada' | 'cancelada' | 'concluida' | 'em_gozo';
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
  colaborador?: { id: string; nome: string; cargo: string; data_admissao: string } | null;
}

export interface FeriasInput {
  colaborador_id: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  data_inicio?: string;
  data_fim?: string;
  dias?: number;
  tipo?: 'normal' | 'fracionada';
  abono_pecuniario?: boolean;
  status?: 'agendada' | 'cancelada' | 'concluida' | 'em_gozo';
  observacao?: string;
}

export function useFerias(filters?: { colaborador_id?: string; status?: 'agendada' | 'cancelada' | 'concluida' | 'em_gozo' }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ferias = [], isLoading, error } = useQuery({
    queryKey: ['ferias', filters],
    queryFn: async () => {
      let query = supabase
        .from('colaborador_ferias')
        .select(`
          *,
          colaborador:colaboradores(id, nome, cargo, data_admissao)
        `)
        .order('periodo_aquisitivo_fim', { ascending: false });

      if (filters?.colaborador_id) {
        query = query.eq('colaborador_id', filters.colaborador_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Ferias[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (input: FeriasInput) => {
      const insertData = {
        colaborador_id: input.colaborador_id,
        periodo_aquisitivo_inicio: input.periodo_aquisitivo_inicio,
        periodo_aquisitivo_fim: input.periodo_aquisitivo_fim,
        data_inicio: input.data_inicio,
        data_fim: input.data_fim,
        dias: input.dias,
        tipo: input.tipo,
        abono_pecuniario: input.abono_pecuniario,
        status: input.status || 'agendada',
        observacao: input.observacao,
      };

      const { data, error } = await supabase
        .from('colaborador_ferias')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias'] });
      toast({ title: 'Sucesso', description: 'Período de férias registrado!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao registrar férias: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: FeriasInput & { id: string }) => {
      const { data, error } = await supabase
        .from('colaborador_ferias')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ferias'] });
      toast({ title: 'Sucesso', description: 'Férias atualizadas!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro', 
        description: 'Erro ao atualizar férias: ' + error.message,
        variant: 'destructive'
      });
    },
  });

  return {
    ferias,
    isLoading,
    error,
    createFerias: createMutation.mutate,
    updateFerias: updateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}

// Hook para buscar férias vencendo nos próximos X dias
export function useFeriasVencendo(diasAntecedencia: number = 90) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['ferias-vencendo', diasAntecedencia],
    queryFn: async () => {
      const hoje = new Date();
      
      const { data: colaboradores, error } = await supabase
        .from('colaboradores')
        .select('id, nome, cargo, data_admissao')
        .eq('ativo', true);

      if (error) throw error;

      // Calcular férias vencendo para cada colaborador
      const feriasVencendo = colaboradores?.map(colab => {
        const admissao = parseISO(colab.data_admissao);
        const anosEmpresa = differenceInDays(hoje, admissao) / 365;
        
        // Calcula próximo período aquisitivo que vence
        const anosCompletos = Math.floor(anosEmpresa);
        const proximoVencimento = addYears(admissao, anosCompletos + 1);
        const diasParaVencer = differenceInDays(proximoVencimento, hoje);
        
        return {
          ...colab,
          anosEmpresa: anosCompletos,
          proximoVencimento,
          diasParaVencer,
          status: diasParaVencer < 0 ? 'vencido' : 
                  diasParaVencer <= diasAntecedencia ? 'a_vencer' : 'ok'
        };
      }).filter(c => c.diasParaVencer <= diasAntecedencia);

      return feriasVencendo || [];
    },
    enabled: !!user,
  });
}
