import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type TipoProblema = 'atraso_entrega' | 'sem_tentativa_entrega' | 'entregue_nao_recebido' | 'outro';
export type StatusProblema = 'pendente' | 'resolvido' | 'nao_resolvido';

export interface ProblemaPedido {
  id: string;
  numero_pedido: string;
  codigo_rastreio: string | null;
  numero_chamado: string | null;
  tipo_problema: TipoProblema;
  motivo_id: string | null;
  problema_outro: string | null;
  transportadora: string | null;
  observacao: string | null;
  status: StatusProblema;
  data_resolucao: string | null;
  extravio_gerado_id: string | null;
  nome_cliente: string | null;
  email_cliente: string | null;
  telefone_cliente: string | null;
  endereco_cliente: string | null;
  valor_pedido: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Campos calculados
  horas_uteis?: number;
  cor_alerta?: 'normal' | 'amarelo' | 'vermelho';
}

interface ProblemaFilters {
  search?: string;
  tipo_problema?: TipoProblema;
  status?: StatusProblema;
  incluirResolvidos?: boolean;
  dataInicio?: string;
  dataFim?: string;
}

// Função para calcular dias úteis no frontend (backup)
function calcularHorasUteis(dataInicio: string): number {
  const inicio = new Date(dataInicio);
  const fim = new Date();
  let horasUteis = 0;
  const dataAtual = new Date(inicio);

  while (dataAtual < fim) {
    const diaSemana = dataAtual.getDay();
    // Excluir sábados (6) e domingos (0)
    if (diaSemana !== 0 && diaSemana !== 6) {
      horasUteis += 24;
    }
    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  return horasUteis;
}

function getCorAlerta(horasUteis: number, status: StatusProblema): 'normal' | 'amarelo' | 'vermelho' {
  if (status === 'resolvido') return 'normal';
  if (horasUteis >= 96) return 'vermelho';
  if (horasUteis >= 48) return 'amarelo';
  return 'normal';
}

export function useProblemasPedido(filters?: ProblemaFilters) {
  return useQuery({
    queryKey: ['problemas-pedido', filters],
    queryFn: async () => {
      let query = supabase
        .from('problemas_pedido')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`numero_pedido.ilike.%${filters.search}%,codigo_rastreio.ilike.%${filters.search}%,numero_chamado.ilike.%${filters.search}%,nome_cliente.ilike.%${filters.search}%,telefone_cliente.ilike.%${filters.search}%`);
      }

      if (filters?.tipo_problema) {
        query = query.eq('tipo_problema', filters.tipo_problema);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else if (!filters?.incluirResolvidos) {
        // Por padrão, não mostrar resolvidos
        query = query.neq('status', 'resolvido');
      }

      if (filters?.dataInicio) {
        query = query.gte('created_at', filters.dataInicio);
      }

      if (filters?.dataFim) {
        query = query.lte('created_at', filters.dataFim + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Adicionar campos calculados
      const problemasComCalculos = (data as ProblemaPedido[]).map((problema) => {
        const horasUteis = calcularHorasUteis(problema.created_at);
        return {
          ...problema,
          horas_uteis: horasUteis,
          cor_alerta: getCorAlerta(horasUteis, problema.status),
        };
      });

      return problemasComCalculos;
    },
  });
}

export function useProblemaPedido(id: string | undefined) {
  return useQuery({
    queryKey: ['problema-pedido', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('problemas_pedido')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const problema = data as ProblemaPedido;
      const horasUteis = calcularHorasUteis(problema.created_at);

      return {
        ...problema,
        horas_uteis: horasUteis,
        cor_alerta: getCorAlerta(horasUteis, problema.status),
      };
    },
    enabled: !!id,
  });
}

export function useCreateProblemaPedido() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<ProblemaPedido, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'horas_uteis' | 'cor_alerta'>) => {
      const { data: result, error } = await supabase
        .from('problemas_pedido')
        .insert({
          ...data,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problemas-pedido'] });
      toast.success('Problema registrado com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao registrar problema:', error);
      toast.error('Erro ao registrar problema');
    },
  });
}

export function useUpdateProblemaPedido() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ProblemaPedido> & { id: string }) => {
      // Se status está mudando para 'nao_resolvido', criar extravio
      if (data.status === 'nao_resolvido') {
        // Buscar dados do problema atual
        const { data: problemaAtual, error: problemaError } = await supabase
          .from('problemas_pedido')
          .select('*')
          .eq('id', id)
          .single();

        if (problemaError) throw problemaError;

        // Criar registro de extravio
        const { data: extravioData, error: extravioError } = await supabase
          .from('extravios')
          .insert({
            numero_pedido: problemaAtual.numero_pedido,
            nome_cliente: problemaAtual.nome_cliente || 'A verificar',
            email_cliente: problemaAtual.email_cliente,
            telefone_cliente: problemaAtual.telefone_cliente,
            valor_pedido: problemaAtual.valor_pedido,
            numero_rastreio: problemaAtual.codigo_rastreio,
            numero_chamado: problemaAtual.numero_chamado,
            transportadora: problemaAtual.transportadora,
            observacao: `Gerado automaticamente a partir do problema #${problemaAtual.numero_pedido}. ${problemaAtual.observacao || ''}`,
            problema_origem_id: id,
            created_by: user?.id,
          })
          .select()
          .single();

        if (extravioError) throw extravioError;

        // Atualizar problema com o ID do extravio gerado
        data.extravio_gerado_id = extravioData.id;
        data.data_resolucao = new Date().toISOString().split('T')[0];
      }

      if (data.status === 'resolvido') {
        data.data_resolucao = new Date().toISOString().split('T')[0];
      }

      const { data: result, error } = await supabase
        .from('problemas_pedido')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['problemas-pedido'] });
      queryClient.invalidateQueries({ queryKey: ['extravios'] });
      
      if (variables.status === 'nao_resolvido') {
        toast.success('Problema marcado como não resolvido. Extravio criado automaticamente.');
      } else {
        toast.success('Problema atualizado com sucesso');
      }
    },
    onError: (error) => {
      console.error('Erro ao atualizar problema:', error);
      toast.error('Erro ao atualizar problema');
    },
  });
}

export function useDeleteProblemaPedido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('problemas_pedido')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['problemas-pedido'] });
      toast.success('Problema excluído com sucesso');
    },
    onError: (error) => {
      console.error('Erro ao excluir problema:', error);
      toast.error('Erro ao excluir problema');
    },
  });
}
