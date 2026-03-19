import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
export interface WhatsappConversation {
  id: string;
  instance_id: string;
  remote_jid: string;
  is_group: boolean;
  group_name: string | null;
  group_photo_url: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_photo_url: string | null;
  cliente_id: string | null;
  status: 'pending' | 'in_progress' | 'finished';
  assigned_to: string | null;
  finished_by: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  internal_notes: string | null;
  created_at: string;
  instance?: {
    id: string;
    nome: string;
    numero_whatsapp: string | null;
    status: string | null;
  };
  assigned_user?: {
    id: string;
    nome: string;
  };
  finished_user?: {
    id: string;
    nome: string;
  };
  cliente?: {
    id: string;
    nome_razao_social: string;
  };
}

export interface ConversationFilters {
  assignment: 'mine' | 'mine_and_new' | 'all';
  status: 'all' | 'active' | 'unread' | 'finished';
  search: string;
  instanceId?: string;
}

export function useWhatsappConversations(filters: ConversationFilters, allowedInstanceIds?: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['whatsapp-conversations', filters, allowedInstanceIds],
    queryFn: async () => {
      // Usar left join para manter conversas mesmo se instância foi removida
      // Hint necessário pois profiles tem 2 FK (assigned_to e finished_by)
      let query = supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          instance:whatsapp_instances!left(id, nome, numero_whatsapp, status),
          assigned_user:profiles!whatsapp_conversations_assigned_to_fkey(id, nome),
          finished_user:profiles!whatsapp_conversations_finished_by_fkey(id, nome),
          cliente:clientes!left(id, nome_razao_social)
        `)
        .order('last_message_at', { ascending: false });

      // Filtro de atribuição
      if (filters.assignment === 'mine' && user) {
        // "mine" mostra APENAS minhas conversas
        query = query.eq('assigned_to', user.id);
      } else if (filters.assignment === 'mine_and_new' && user) {
        // "mine_and_new" mostra minhas + sem atribuição (novas)
        query = query.or(`assigned_to.eq.${user.id},assigned_to.is.null`);
      }

      // Filtro de status
      if (filters.status === 'unread') {
        query = query.gt('unread_count', 0);
      } else if (filters.status === 'finished') {
        query = query.eq('status', 'finished');
      } else if (filters.status === 'active') {
        query = query.neq('status', 'finished');
      }
      // status === 'all' não aplica filtro

      // Filtro de instância (do filtro UI)
      if (filters.instanceId) {
        query = query.eq('instance_id', filters.instanceId);
      }
      // Filtro de instâncias permitidas (baseado em vínculos do usuário)
      else if (allowedInstanceIds && allowedInstanceIds.length > 0) {
        query = query.in('instance_id', allowedInstanceIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Busca client-side para nome/telefone/preview
      let results = data as WhatsappConversation[];
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        results = results.filter(conv => 
          conv.contact_name?.toLowerCase().includes(searchLower) ||
          conv.contact_phone?.includes(filters.search) ||
          conv.group_name?.toLowerCase().includes(searchLower) ||
          conv.last_message_preview?.toLowerCase().includes(searchLower) ||
          conv.cliente?.nome_razao_social?.toLowerCase().includes(searchLower)
        );
      }

      return results;
    }
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WhatsappConversation> & { id: string }) => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    }
  });
}

export function useAssignConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, userId }: { conversationId: string; userId?: string }) => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ 
          assigned_to: userId || user?.id,
          status: 'in_progress'
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    }
  });
}

export function useFinishConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ conversationId, instanceId, userName }: {
      conversationId: string;
      instanceId: string;
      userName: string;
    }) => {
      const now = new Date();
      const formattedDate = format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      
      // 1. Criar mensagem de sistema sobre encerramento
      await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          instance_id: instanceId,
          from_me: true,
          message_type: 'system',
          content: `✅ Atendimento encerrado por ${userName} em ${formattedDate}`,
          status: 'delivered'
        });
      
      // 2. Atualizar conversa - limpar assigned_to para permitir qualquer atendente no futuro
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ 
          status: 'finished', 
          unread_count: 0,
          finished_by: user?.id,
          assigned_to: null
        })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
    }
  });
}

// Hook para criar mensagem de sistema interna
export function useCreateSystemMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ conversationId, instanceId, content }: {
      conversationId: string;
      instanceId: string;
      content: string;
    }) => {
      const { error } = await supabase
        .from('whatsapp_messages')
        .insert({
          conversation_id: conversationId,
          instance_id: instanceId,
          from_me: true,
          message_type: 'system',
          content,
          status: 'delivered'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
    }
  });
}

export function useSaveInternalNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, notes }: { conversationId: string; notes: string }) => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ internal_notes: notes })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    }
  });
}
