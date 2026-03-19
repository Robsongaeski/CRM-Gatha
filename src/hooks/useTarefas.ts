import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

export type TarefaTipoConteudo = 'texto' | 'checklist';
export type TarefaPrioridade = 'baixa' | 'media' | 'alta';
export type TarefaStatus = 'pendente' | 'em_andamento' | 'aguardando_validacao' | 'concluida' | 'reaberta';

export interface Tarefa {
  id: string;
  titulo: string;
  tipo_conteudo: TarefaTipoConteudo;
  descricao: string | null;
  prioridade: TarefaPrioridade;
  data_limite: string;
  status: TarefaStatus;
  criador_id: string;
  executor_id: string;
  concluida_em: string | null;
  validada_em: string | null;
  visualizada_em: string | null;
  excluida_em: string | null;
  recorrente: boolean;
  tipo_recorrencia: string | null;
  ativa_recorrencia: boolean;
  tarefa_origem_id: string | null;
  created_at: string;
  updated_at: string;
  criador?: { id: string; nome: string; email: string };
  executor?: { id: string; nome: string; email: string };
}

export interface TarefaChecklistItem {
  id: string;
  tarefa_id: string;
  descricao: string;
  concluido: boolean;
  ordem: number;
  concluido_em: string | null;
  created_at: string;
}

export interface TarefaObservacao {
  id: string;
  tarefa_id: string;
  usuario_id: string;
  mensagem: string;
  lida_por: string[];
  created_at: string;
  usuario?: { id: string; nome: string; email: string };
}

export interface TarefaAnexo {
  id: string;
  tarefa_id: string;
  nome_arquivo: string;
  url: string;
  tipo_mime: string | null;
  tamanho: number | null;
  uploaded_by: string;
  created_at: string;
}

export interface TarefaFilters {
  view: 'para_mim' | 'criadas_por_mim' | 'todas';
  status: TarefaStatus | 'todas' | 'atrasadas' | 'pendentes_ativas';
  prioridade: TarefaPrioridade | 'todas';
}

export interface TarefaInput {
  titulo: string;
  tipo_conteudo: TarefaTipoConteudo;
  descricao?: string;
  prioridade: TarefaPrioridade;
  data_limite: string;
  executor_id: string;
  checklist_itens?: string[];
}

// Hook principal para listar tarefas
export function useTarefas(filters: TarefaFilters) {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();

  return useQuery({
    queryKey: ['tarefas', filters, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('tarefas')
        .select(`
          *,
          criador:profiles!tarefas_criador_id_fkey(id, nome, email),
          executor:profiles!tarefas_executor_id_fkey(id, nome, email)
        `)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      // Filtro por visualização
      if (filters.view === 'para_mim') {
        query = query.eq('executor_id', user.id);
      } else if (filters.view === 'criadas_por_mim') {
        query = query.eq('criador_id', user.id);
      }
      // 'todas' só funciona para admin (RLS garante isso)

      // Filtro por status
      if (filters.status === 'atrasadas') {
        query = query
          .lt('data_limite', new Date().toISOString().split('T')[0])
          .not('status', 'eq', 'concluida');
      } else if (filters.status === 'pendentes_ativas') {
        // Todas exceto concluídas
        query = query.not('status', 'eq', 'concluida');
      } else if (filters.status !== 'todas') {
        query = query.eq('status', filters.status);
      }

      // Filtro por prioridade
      if (filters.prioridade !== 'todas') {
        query = query.eq('prioridade', filters.prioridade);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Tarefa[];
    },
    enabled: !!user?.id,
  });
}

// Hook para buscar uma tarefa específica
export function useTarefa(id: string | undefined) {
  return useQuery({
    queryKey: ['tarefa', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('tarefas')
        .select(`
          *,
          criador:profiles!tarefas_criador_id_fkey(id, nome, email),
          executor:profiles!tarefas_executor_id_fkey(id, nome, email)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Tarefa | null;
    },
    enabled: !!id,
  });
}

// Hook para criar tarefa
export function useCreateTarefa() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: TarefaInput) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Criar tarefa
      const { data: tarefa, error } = await supabase
        .from('tarefas')
        .insert({
          titulo: input.titulo,
          tipo_conteudo: input.tipo_conteudo,
          descricao: input.descricao,
          prioridade: input.prioridade,
          data_limite: input.data_limite,
          executor_id: input.executor_id,
          criador_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Se for checklist, criar itens
      if (input.tipo_conteudo === 'checklist' && input.checklist_itens?.length) {
        const itens = input.checklist_itens.map((descricao, index) => ({
          tarefa_id: tarefa.id,
          descricao,
          ordem: index,
        }));

        const { error: itensError } = await supabase
          .from('tarefa_checklist_itens')
          .insert(itens);

        if (itensError) throw itensError;
      }

      return tarefa;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-count'] });
      toast.success('Tarefa criada com sucesso');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao criar tarefa', { description: sanitizeError(error) });
    },
  });
}

// Hook para atualizar tarefa
export function useUpdateTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Tarefa> & { id: string }) => {
      const { error } = await supabase
        .from('tarefas')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefa', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-count'] });
    },
    onError: (error: unknown) => {
      toast.error('Erro ao atualizar tarefa', { description: sanitizeError(error) });
    },
  });
}

// Hook para marcar tarefa como concluída (executor)
export function useMarcarTarefaConcluida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from('tarefas')
        .update({
          status: 'aguardando_validacao',
          concluida_em: new Date().toISOString(),
        })
        .eq('id', tarefaId);

      if (error) throw error;
    },
    onSuccess: (_, tarefaId) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefa', tarefaId] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-count'] });
      toast.success('Tarefa enviada para validação');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao concluir tarefa', { description: sanitizeError(error) });
    },
  });
}

// Hook para validar conclusão (criador)
export function useValidarTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from('tarefas')
        .update({
          status: 'concluida',
          validada_em: new Date().toISOString(),
        })
        .eq('id', tarefaId);

      if (error) throw error;
    },
    onSuccess: (_, tarefaId) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefa', tarefaId] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-count'] });
      toast.success('Tarefa validada com sucesso');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao validar tarefa', { description: sanitizeError(error) });
    },
  });
}

// Hook para reabrir tarefa (criador)
export function useReabrirTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from('tarefas')
        .update({
          status: 'reaberta',
          concluida_em: null,
        })
        .eq('id', tarefaId);

      if (error) throw error;
    },
    onSuccess: (_, tarefaId) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefa', tarefaId] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-count'] });
      toast.success('Tarefa reaberta');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao reabrir tarefa', { description: sanitizeError(error) });
    },
  });
}

// Hook para inativar tarefa (em vez de excluir - criador ou admin)
export function useInativarTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefaId: string) => {
      // Usar ativo = false em vez de excluida_em
      // Isso evita o problema de RLS porque a tarefa continua visível durante o UPDATE
      const { error } = await supabase
        .from('tarefas')
        .update({ ativo: false })
        .eq('id', tarefaId);

      if (error) {
        console.error('[InativarTarefa] Erro:', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-count'] });
      toast.success('Tarefa removida com sucesso');
    },
    onError: (error: unknown) => {
      toast.error('Erro ao remover tarefa', { description: sanitizeError(error) });
    },
  });
}

// Alias para manter compatibilidade com código existente
export const useExcluirTarefa = useInativarTarefa;

// Hook para iniciar trabalho na tarefa
export function useIniciarTarefa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from('tarefas')
        .update({ status: 'em_andamento' })
        .eq('id', tarefaId);

      if (error) throw error;
    },
    onSuccess: (_, tarefaId) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefa', tarefaId] });
    },
  });
}

// Hook para marcar tarefa como visualizada
export function useMarcarTarefaVisualizada() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from('tarefas')
        .update({ visualizada_em: new Date().toISOString() })
        .eq('id', tarefaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-count'] });
    },
  });
}

// Hook para contagem de tarefas (para badge do menu)
export function useTarefasCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tarefas-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return { novas: 0, atrasadas: 0, naoLidas: 0 };

      const hoje = new Date().toISOString().split('T')[0];

      // Tarefas novas não visualizadas
      const { count: novas } = await supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .eq('executor_id', user.id)
        .is('visualizada_em', null)
        .eq('ativo', true);

      // Tarefas atrasadas
      const { count: atrasadas } = await supabase
        .from('tarefas')
        .select('*', { count: 'exact', head: true })
        .eq('executor_id', user.id)
        .lt('data_limite', hoje)
        .not('status', 'eq', 'concluida')
        .eq('ativo', true);

      // Observações não lidas
      const { data: observacoes } = await supabase
        .from('tarefa_observacoes')
        .select('id, lida_por, tarefa_id')
        .not('lida_por', 'cs', `{${user.id}}`);

      // Filtrar apenas observações de tarefas do usuário
      const { data: minhasTarefas } = await supabase
        .from('tarefas')
        .select('id')
        .or(`executor_id.eq.${user.id},criador_id.eq.${user.id}`)
        .eq('ativo', true);

      const minhasTarefasIds = new Set(minhasTarefas?.map(t => t.id) || []);
      const naoLidas = observacoes?.filter(o => minhasTarefasIds.has(o.tarefa_id)).length || 0;

      return {
        novas: novas || 0,
        atrasadas: atrasadas || 0,
        naoLidas,
        total: (novas || 0) + (atrasadas || 0) + naoLidas,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000, // 60s em vez de 30s
  });
}

// Hook para checklist
export function useTarefaChecklist(tarefaId: string | undefined) {
  return useQuery({
    queryKey: ['tarefa-checklist', tarefaId],
    queryFn: async () => {
      if (!tarefaId) return [];

      const { data, error } = await supabase
        .from('tarefa_checklist_itens')
        .select('*')
        .eq('tarefa_id', tarefaId)
        .order('ordem', { ascending: true });

      if (error) throw error;
      return data as TarefaChecklistItem[];
    },
    enabled: !!tarefaId,
  });
}

// Hook para toggle item do checklist
export function useToggleChecklistItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, concluido }: { itemId: string; concluido: boolean }) => {
      const { error } = await supabase
        .from('tarefa_checklist_itens')
        .update({
          concluido,
          concluido_em: concluido ? new Date().toISOString() : null,
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefa-checklist'] });
    },
  });
}

// Hook para observações
export function useTarefaObservacoes(tarefaId: string | undefined) {
  return useQuery({
    queryKey: ['tarefa-observacoes', tarefaId],
    queryFn: async () => {
      if (!tarefaId) return [];

      const { data, error } = await supabase
        .from('tarefa_observacoes')
        .select(`
          *,
          usuario:usuario_id(id, nome, email)
        `)
        .eq('tarefa_id', tarefaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as TarefaObservacao[];
    },
    enabled: !!tarefaId,
  });
}

// Hook para adicionar observação
export function useAdicionarObservacao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ tarefaId, mensagem }: { tarefaId: string; mensagem: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('tarefa_observacoes')
        .insert({
          tarefa_id: tarefaId,
          usuario_id: user.id,
          mensagem,
          lida_por: [user.id],
        });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tarefa-observacoes', variables.tarefaId] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-count'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar observação: ${error.message}`);
    },
  });
}

// Hook para marcar observações como lidas
export function useMarcarObservacoesLidas() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tarefaId: string) => {
      if (!user?.id) return;

      // Buscar observações não lidas pelo usuário
      const { data: observacoes } = await supabase
        .from('tarefa_observacoes')
        .select('id, lida_por')
        .eq('tarefa_id', tarefaId)
        .not('lida_por', 'cs', `{${user.id}}`);

      if (!observacoes?.length) return;

      // Marcar cada uma como lida
      for (const obs of observacoes) {
        await supabase
          .from('tarefa_observacoes')
          .update({ lida_por: [...(obs.lida_por || []), user.id] })
          .eq('id', obs.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarefas-count'] });
    },
  });
}

// Hook para duplicar tarefa
export function useDuplicarTarefa() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tarefaId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar tarefa original
      const { data: original, error: fetchError } = await supabase
        .from('tarefas')
        .select('*')
        .eq('id', tarefaId)
        .single();

      if (fetchError || !original) throw new Error('Tarefa não encontrada');

      // Criar nova tarefa duplicada
      const { data: novaTarefa, error: createError } = await supabase
        .from('tarefas')
        .insert({
          titulo: `${original.titulo} (cópia)`,
          tipo_conteudo: original.tipo_conteudo,
          descricao: original.descricao,
          prioridade: original.prioridade,
          data_limite: original.data_limite,
          executor_id: original.executor_id,
          criador_id: user.id,
          status: 'pendente',
          recorrente: false,
          ativa_recorrencia: true,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Se for checklist, duplicar itens
      if (original.tipo_conteudo === 'checklist') {
        const { data: itens } = await supabase
          .from('tarefa_checklist_itens')
          .select('*')
          .eq('tarefa_id', tarefaId)
          .order('ordem');

        if (itens?.length) {
          const novosItens = itens.map((item) => ({
            tarefa_id: novaTarefa.id,
            descricao: item.descricao,
            ordem: item.ordem,
            concluido: false,
          }));

          await supabase.from('tarefa_checklist_itens').insert(novosItens);
        }
      }

      return novaTarefa;
    },
    onSuccess: (novaTarefa) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefas-count'] });
      toast.success('Tarefa duplicada com sucesso');
      return novaTarefa;
    },
    onError: (error: Error) => {
      toast.error(`Erro ao duplicar tarefa: ${error.message}`);
    },
  });
}

// Hook para ativar/desativar recorrência diária
export function useToggleRecorrencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tarefaId, ativar }: { tarefaId: string; ativar: boolean }) => {
      const { error } = await supabase
        .from('tarefas')
        .update({
          recorrente: ativar,
          tipo_recorrencia: ativar ? 'diaria' : null,
          ativa_recorrencia: ativar,
        })
        .eq('id', tarefaId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefa', variables.tarefaId] });
      toast.success(variables.ativar ? 'Recorrência diária ativada' : 'Recorrência desativada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar recorrência: ${error.message}`);
    },
  });
}

// Hook para encerrar ciclo de recorrência (manter tarefa atual mas parar de gerar novas)
export function useEncerrarRecorrencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tarefaId: string) => {
      const { error } = await supabase
        .from('tarefas')
        .update({
          ativa_recorrencia: false,
        })
        .eq('id', tarefaId);

      if (error) throw error;
    },
    onSuccess: (_, tarefaId) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefa', tarefaId] });
      toast.success('Ciclo de recorrência encerrado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao encerrar recorrência: ${error.message}`);
    },
  });
}

// Interface para edição de tarefa
export interface TarefaEditInput {
  titulo?: string;
  descricao?: string;
  prioridade?: TarefaPrioridade;
  data_limite?: string;
  executor_id?: string;
}

// Hook para editar tarefa com log automático nas observações
export function useEditarTarefaComLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const adicionarObservacao = useAdicionarObservacao();

  return useMutation({
    mutationFn: async ({ 
      tarefaId, 
      tarefaOriginal, 
      alteracoes 
    }: { 
      tarefaId: string; 
      tarefaOriginal: Tarefa; 
      alteracoes: TarefaEditInput;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Atualizar tarefa
      const { error } = await supabase
        .from('tarefas')
        .update(alteracoes)
        .eq('id', tarefaId);

      if (error) throw error;

      // Gerar mensagem de log
      const mudancas: string[] = [];
      
      if (alteracoes.titulo && alteracoes.titulo !== tarefaOriginal.titulo) {
        mudancas.push(`Título: "${tarefaOriginal.titulo}" → "${alteracoes.titulo}"`);
      }
      if (alteracoes.descricao !== undefined && alteracoes.descricao !== tarefaOriginal.descricao) {
        mudancas.push('Descrição alterada');
      }
      if (alteracoes.prioridade && alteracoes.prioridade !== tarefaOriginal.prioridade) {
        const prioridadeLabel: Record<TarefaPrioridade, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
        mudancas.push(`Prioridade: ${prioridadeLabel[tarefaOriginal.prioridade]} → ${prioridadeLabel[alteracoes.prioridade]}`);
      }
      if (alteracoes.data_limite && alteracoes.data_limite !== tarefaOriginal.data_limite) {
        mudancas.push(`Data limite: ${tarefaOriginal.data_limite} → ${alteracoes.data_limite}`);
      }
      if (alteracoes.executor_id && alteracoes.executor_id !== tarefaOriginal.executor_id) {
        mudancas.push('Executor alterado');
      }

      // Adicionar observação automática se houve mudanças
      if (mudancas.length > 0) {
        const mensagemLog = `📝 Tarefa editada:\n${mudancas.join('\n')}`;
        await adicionarObservacao.mutateAsync({ tarefaId, mensagem: mensagemLog });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tarefas'] });
      queryClient.invalidateQueries({ queryKey: ['tarefa', variables.tarefaId] });
      toast.success('Tarefa atualizada');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao editar tarefa: ${error.message}`);
    },
  });
}
