import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

function buildDraftWorkflowName(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `Fluxo sem nome ${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export interface AutomationWorkflow {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: 'ecommerce' | 'leads' | 'whatsapp' | 'comercial' | 'geral';
  ativo: boolean;
  flow_data: any;
  trigger_config: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationWorkflowExecution {
  id: string;
  workflow_id: string;
  trigger_entity: string;
  trigger_entity_id: string;
  trigger_data: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled' | 'waiting';
  current_node_id: string | null;
  execution_path: any[];
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface AutomationWorkflowVersion {
  id: string;
  workflow_id: string;
  version_number: number;
  snapshot: any;
  created_by: string | null;
  created_at: string;
  profiles?: {
    nome: string;
  } | null;
}

export interface AutomationMessageTemplate {
  id: string;
  nome: string;
  tipo: 'whatsapp' | 'email';
  assunto: string | null;
  conteudo: string;
  variaveis: string[];
  ativo: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Hook para listar workflows
export function useAutomationWorkflows(filters?: { tipo?: string; ativo?: boolean }) {
  return useQuery({
    queryKey: ['automation-workflows', filters],
    queryFn: async () => {
      let query = supabase
        .from('automation_workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.tipo && filters.tipo !== 'all') {
        query = query.eq('tipo', filters.tipo as any);
      }
      if (filters?.ativo !== undefined) {
        query = query.eq('ativo', filters.ativo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AutomationWorkflow[];
    },
  });
}

// Hook para buscar um workflow específico
export function useAutomationWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: ['automation-workflow', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as AutomationWorkflow;
    },
    enabled: !!id,
  });
}

// Hook para salvar workflow
export function useSaveWorkflow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (workflow: Partial<AutomationWorkflow> & { id?: string }) => {
      const normalizedName = workflow.nome?.trim() || buildDraftWorkflowName();

      if (workflow.id) {
        const { data, error } = await supabase
          .from('automation_workflows')
          .update({
            nome: normalizedName,
            descricao: workflow.descricao,
            tipo: workflow.tipo,
            flow_data: workflow.flow_data,
            trigger_config: workflow.trigger_config,
          })
          .eq('id', workflow.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('automation_workflows')
          .insert({
            nome: normalizedName,
            descricao: workflow.descricao,
            tipo: workflow.tipo || 'geral',
            flow_data: workflow.flow_data || { nodes: [], edges: [] },
            trigger_config: workflow.trigger_config,
            created_by: user?.id,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['automation-workflow'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-versions'] });
      toast.success('Fluxo salvo com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar fluxo: ' + error.message);
    },
  });
}

export function useWorkflowVersions(workflowId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-versions', workflowId],
    queryFn: async () => {
      if (!workflowId) return [];

      const { data, error } = await (supabase as any)
        .from('automation_workflow_versions')
        .select('id, workflow_id, version_number, snapshot, created_by, created_at, profiles:created_by(nome)')
        .eq('workflow_id', workflowId)
        .order('version_number', { ascending: false })
        .limit(30);

      if (error) throw error;
      return (data || []) as AutomationWorkflowVersion[];
    },
    enabled: !!workflowId,
    staleTime: 30000,
  });
}

export function useRestoreWorkflowVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, versionId }: { workflowId: string; versionId: string }) => {
      const { data, error } = await (supabase as any).rpc('automation_restore_workflow_version', {
        p_workflow_id: workflowId,
        p_version_id: versionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['automation-workflow', variables.workflowId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-versions', variables.workflowId] });
      toast.success('Versao restaurada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao restaurar versao: ' + error.message);
    },
  });
}

// Hook para ativar/desativar workflow
export function useToggleWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('automation_workflows')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success(ativo ? 'Fluxo ativado!' : 'Fluxo desativado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });
}

// Hook para excluir workflow
export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('automation_workflows')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      toast.success('Fluxo excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir fluxo: ' + error.message);
    },
  });
}

// Hook para duplicar workflow
export function useDuplicateWorkflow() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (workflow: AutomationWorkflow) => {
      const copyName = `${String(workflow.nome || '').trim() || 'Fluxo'} (Copia)`;
      const { data, error } = await supabase
        .from('automation_workflows')
        .insert({
          nome: copyName,
          descricao: workflow.descricao,
          tipo: workflow.tipo,
          ativo: false,
          flow_data: workflow.flow_data || { nodes: [], edges: [] },
          trigger_config: workflow.trigger_config || {},
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AutomationWorkflow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['automation-workflows'] });
      queryClient.invalidateQueries({ queryKey: ['automation-workflow'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-versions'] });
      toast.success('Fluxo duplicado com sucesso!');
      return data;
    },
    onError: (error: any) => {
      toast.error('Erro ao duplicar fluxo: ' + error.message);
    },
  });
}

// Hook para listar execuções de um workflow
export function useWorkflowExecutions(workflowId: string | undefined) {
  return useQuery({
    queryKey: ['workflow-executions', workflowId],
    queryFn: async () => {
      if (!workflowId) return [];
      const { data, error } = await supabase
        .from('automation_workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AutomationWorkflowExecution[];
    },
    enabled: !!workflowId,
    staleTime: 30000,
    refetchInterval: 60000, // Atualizar a cada 60s (era 10s)
  });
}

// Hook para buscar logs detalhados de uma execução
export function useExecutionLogs(executionId: string | undefined) {
  return useQuery({
    queryKey: ['execution-logs', executionId],
    queryFn: async () => {
      if (!executionId) return [];
      const { data, error } = await supabase
        .from('automation_execution_logs')
        .select('*')
        .eq('execution_id', executionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!executionId,
  });
}

// Hook para estatísticas de execuções
export function useWorkflowStats(workflowId?: string) {
  return useQuery({
    queryKey: ['workflow-stats', workflowId],
    queryFn: async () => {
      let query = supabase
        .from('automation_workflow_executions')
        .select('status, started_at');

      if (workflowId) {
        query = query.eq('workflow_id', workflowId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = {
        total: data?.length || 0,
        completed: data?.filter(e => e.status === 'completed').length || 0,
        failed: data?.filter(e => e.status === 'failed').length || 0,
        running: data?.filter(e => e.status === 'running').length || 0,
        today: data?.filter(e => new Date(e.started_at) >= today).length || 0,
      };

      return stats;
    },
  });
}

// Hook para templates de mensagem
export function useMessageTemplates(tipo?: 'whatsapp' | 'email') {
  return useQuery({
    queryKey: ['automation-templates', tipo],
    queryFn: async () => {
      let query = supabase
        .from('automation_message_templates')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (tipo) {
        query = query.eq('tipo', tipo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AutomationMessageTemplate[];
    },
  });
}

// Hook para salvar template
export function useSaveTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: Partial<AutomationMessageTemplate> & { id?: string }) => {
      if (template.id) {
        const { error } = await supabase
          .from('automation_message_templates')
          .update({
            nome: template.nome,
            tipo: template.tipo,
            assunto: template.assunto,
            conteudo: template.conteudo,
            variaveis: template.variaveis,
          })
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('automation_message_templates')
          .insert({
            nome: template.nome,
            tipo: template.tipo,
            assunto: template.assunto,
            conteudo: template.conteudo,
            variaveis: template.variaveis || [],
            created_by: user?.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automation-templates'] });
      toast.success('Template salvo com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar template: ' + error.message);
    },
  });
}
