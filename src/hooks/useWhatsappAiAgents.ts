import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export type AiProvider = 'openai' | 'gemini';
export type AiHandoffMode = 'round_robin' | 'specific_user';
export type AiTriageField = 'produto' | 'quantidade' | 'ideia';

export interface WhatsappAiAgentMetadata {
  features?: {
    humanize_style?: boolean;
    auto_sanitize?: boolean;
    use_llm_triage?: boolean;
    split_greeting_question?: boolean;
  };
  triage?: {
    enabled?: boolean;
    required_fields?: AiTriageField[];
  };
  handoff?: {
    send_transition_message?: boolean;
    transition_message?: string | null;
    price_request_handoff_threshold?: number;
    min_customer_messages_before_handoff?: number;
  };
}

export interface WhatsappAiAgent {
  id: string;
  agent_key: string;
  name: string;
  description: string | null;
  provider: AiProvider;
  model: string;
  fallback_provider: AiProvider | null;
  fallback_model: string | null;
  system_prompt: string;
  temperature: number;
  max_output_tokens: number;
  max_context_messages: number;
  confidence_threshold: number;
  max_auto_replies: number;
  handoff_mode: AiHandoffMode;
  handoff_user_id: string | null;
  eligible_user_ids: string[];
  metadata: WhatsappAiAgentMetadata | null;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

export interface WhatsappAiKnowledgeItem {
  id: string;
  agent_id: string;
  title: string | null;
  content: string;
  tags: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type AgentPayload = Partial<WhatsappAiAgent> & { id?: string };
type KnowledgePayload = Partial<WhatsappAiKnowledgeItem> & { id?: string; agent_id: string };

function normalizeProvider(value: unknown, fallback: AiProvider): AiProvider {
  return String(value || '').toLowerCase() === 'gemini' ? 'gemini' : fallback;
}

function normalizeHandoffMode(value: unknown): AiHandoffMode {
  return String(value || '').toLowerCase() === 'specific_user' ? 'specific_user' : 'round_robin';
}

export function useWhatsappAiAgents() {
  return useQuery({
    queryKey: ['whatsapp-ai-agents'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('whatsapp_ai_agents')
        .select(`
          id,
          agent_key,
          name,
          description,
          provider,
          model,
          fallback_provider,
          fallback_model,
          system_prompt,
          temperature,
          max_output_tokens,
          max_context_messages,
          confidence_threshold,
          max_auto_replies,
          handoff_mode,
          handoff_user_id,
          eligible_user_ids,
          metadata,
          is_active,
          created_at,
          updated_at
        `)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []) as WhatsappAiAgent[];
    },
  });
}

export function useSaveWhatsappAiAgent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (agent: AgentPayload) => {
      const payload = {
        agent_key: String(agent.agent_key || '').trim(),
        name: String(agent.name || '').trim(),
        description: String(agent.description || '').trim() || null,
        provider: normalizeProvider(agent.provider, 'openai'),
        model: String(agent.model || '').trim(),
        fallback_provider: agent.fallback_provider
          ? normalizeProvider(agent.fallback_provider, 'gemini')
          : null,
        fallback_model: String(agent.fallback_model || '').trim() || null,
        system_prompt: String(agent.system_prompt || '').trim(),
        temperature: Number.isFinite(Number(agent.temperature)) ? Number(agent.temperature) : 0.2,
        max_output_tokens: Number.isFinite(Number(agent.max_output_tokens)) ? Number(agent.max_output_tokens) : 350,
        max_context_messages: Number.isFinite(Number(agent.max_context_messages)) ? Number(agent.max_context_messages) : 12,
        confidence_threshold: Number.isFinite(Number(agent.confidence_threshold))
          ? Number(agent.confidence_threshold)
          : 0.7,
        max_auto_replies: Number.isFinite(Number(agent.max_auto_replies)) ? Number(agent.max_auto_replies) : 2,
        handoff_mode: normalizeHandoffMode(agent.handoff_mode),
        handoff_user_id: String(agent.handoff_user_id || '').trim() || null,
        eligible_user_ids: Array.isArray(agent.eligible_user_ids) ? agent.eligible_user_ids : [],
        metadata: agent.metadata && typeof agent.metadata === 'object' ? agent.metadata : {},
        is_active: agent.is_active !== false,
      };

      if (!payload.agent_key) throw new Error('agent_key obrigatorio');
      if (!payload.name) throw new Error('nome obrigatorio');
      if (!payload.model) throw new Error('model obrigatorio');
      if (!payload.system_prompt) throw new Error('system_prompt obrigatorio');

      if (agent.id) {
        const { data, error } = await (supabase as any)
          .from('whatsapp_ai_agents')
          .update(payload)
          .eq('id', agent.id)
          .select('id')
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await (supabase as any)
        .from('whatsapp_ai_agents')
        .insert({
          ...payload,
          created_by: user?.id || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-ai-agents'] });
      queryClient.invalidateQueries({ queryKey: ['automation-ai-agent-options'] });
      toast.success('Agente IA salvo com sucesso');
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar agente IA: ${error?.message || 'desconhecido'}`);
    },
  });
}

export function useDeleteWhatsappAiAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      const { error } = await (supabase as any)
        .from('whatsapp_ai_agents')
        .delete()
        .eq('id', agentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-ai-agents'] });
      queryClient.invalidateQueries({ queryKey: ['automation-ai-agent-options'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-ai-knowledge-items'] });
      toast.success('Agente IA removido');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover agente IA: ${error?.message || 'desconhecido'}`);
    },
  });
}

export function useWhatsappAiKnowledgeItems(agentId?: string | null) {
  return useQuery({
    queryKey: ['whatsapp-ai-knowledge-items', agentId || 'none'],
    enabled: Boolean(agentId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('whatsapp_ai_knowledge_items')
        .select('id, agent_id, title, content, tags, priority, is_active, created_at, updated_at')
        .eq('agent_id', agentId)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as WhatsappAiKnowledgeItem[];
    },
  });
}

export function useSaveWhatsappAiKnowledgeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: KnowledgePayload) => {
      const payload = {
        agent_id: item.agent_id,
        title: String(item.title || '').trim() || null,
        content: String(item.content || '').trim(),
        tags: Array.isArray(item.tags) ? item.tags : [],
        priority: Number.isFinite(Number(item.priority)) ? Number(item.priority) : 100,
        is_active: item.is_active !== false,
      };
      if (!payload.agent_id) throw new Error('agent_id obrigatorio');
      if (!payload.content) throw new Error('conteudo obrigatorio');

      if (item.id) {
        const { data, error } = await (supabase as any)
          .from('whatsapp_ai_knowledge_items')
          .update(payload)
          .eq('id', item.id)
          .select('id')
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await (supabase as any)
        .from('whatsapp_ai_knowledge_items')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-ai-knowledge-items', variables.agent_id] });
      toast.success('Base de conhecimento salva');
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar conhecimento: ${error?.message || 'desconhecido'}`);
    },
  });
}

export function useDeleteWhatsappAiKnowledgeItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; agent_id: string }) => {
      const { error } = await (supabase as any)
        .from('whatsapp_ai_knowledge_items')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-ai-knowledge-items', variables.agent_id] });
      toast.success('Item removido');
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover item: ${error?.message || 'desconhecido'}`);
    },
  });
}
