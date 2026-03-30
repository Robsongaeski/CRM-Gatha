import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface WhatsappMessage {
  id: string;
  conversation_id: string;
  instance_id: string | null;
  message_id_external: string | null;
  from_me: boolean;
  sender_phone: string | null;
  sender_name: string | null;
  content: string | null;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'reaction' | 'location' | 'contact' | 'poll';
  media_url: string | null;
  media_mime_type: string | null;
  media_filename: string | null;
  quoted_message_id: string | null;
  quoted_content: string | null;
  quoted_sender: string | null;
  reactions: unknown;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface SendWhatsappResponse {
  success?: boolean;
  queued?: boolean;
  message?: WhatsappMessage;
  error?: string;
}

interface SendWhatsappParams {
  conversationId: string;
  instanceId: string;
  remoteJid: string;
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mediaBase64?: string;
  mediaFilename?: string;
  mediaMimeType?: string;
  quotedMessageId?: string;
  senderName?: string;
}

interface SendMutationContext {
  tempMessageId: string;
}

const MESSAGE_LIMIT = 200;

export function useWhatsappMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_LIMIT);

      if (error) throw error;

      // Reverse because query comes newest-first.
      return (data as WhatsappMessage[]).reverse();
    },
    enabled: !!conversationId
  });

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`whatsapp-messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          queryClient.setQueryData(['whatsapp-messages', conversationId], (old: WhatsappMessage[] = []) => {
            const newMessage = payload.new as WhatsappMessage;
            if (old.some((message) => message.id === newMessage.id)) return old;
            return [...old, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          queryClient.setQueryData(['whatsapp-messages', conversationId], (old: WhatsappMessage[] = []) => {
            return old.map((message) =>
              message.id === payload.new.id ? (payload.new as WhatsappMessage) : message,
            );
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

export function useSendWhatsappMessage() {
  const queryClient = useQueryClient();

  const clearConversationFollowup = async (conversationId: string) => {
    const { error } = await supabase
      .from('whatsapp_conversations')
      .update({
        needs_followup: false,
        followup_reason: null,
        followup_color: null,
        followup_flagged_at: null,
      })
      .eq('id', conversationId)
      .eq('needs_followup', true);

    if (error) {
      // Nao interrompe o envio da mensagem se a limpeza do retorno falhar.
      console.warn('[useSendWhatsappMessage] Falha ao limpar follow-up da conversa:', error);
      return;
    }

    queryClient.setQueriesData(
      { queryKey: ['whatsapp-conversations'], exact: false },
      (old: Array<Record<string, unknown>> | undefined) => {
        if (!Array.isArray(old)) return old;
        return old.map((conversation) =>
          conversation.id === conversationId
            ? {
                ...conversation,
                needs_followup: false,
                followup_reason: null,
                followup_color: null,
                followup_flagged_at: null,
              }
            : conversation,
        );
      },
    );
  };

  return useMutation<SendWhatsappResponse, Error, SendWhatsappParams, SendMutationContext>({
    mutationFn: async (params) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          instanceId: params.instanceId,
          remoteJid: params.remoteJid,
          content: params.content,
          messageType: params.messageType || 'text',
          mediaUrl: params.mediaUrl,
          mediaBase64: params.mediaBase64,
          mediaFilename: params.mediaFilename,
          mediaMimeType: params.mediaMimeType,
          quotedMessageId: params.quotedMessageId,
          conversationId: params.conversationId,
          senderName: params.senderName
        }
      });

      // invoke can return status >= 400 in data, while network/CORS returns error.
      if (error) {
        const errMsg = (error as any)?.context?.body
          ? await (error as any).context.json?.().catch(() => null)
          : null;
        throw new Error(errMsg?.error || error.message || 'Erro de conexao com o servidor');
      }

      if (data && !data.success && !data.queued) {
        throw new Error(data.error || 'Erro ao processar envio da mensagem');
      }

      return (data ?? {}) as SendWhatsappResponse;
    },
    onMutate: async (variables) => {
      const tempMessageId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimisticMessage: WhatsappMessage = {
        id: tempMessageId,
        conversation_id: variables.conversationId,
        instance_id: variables.instanceId,
        message_id_external: null,
        from_me: true,
        sender_phone: null,
        sender_name: variables.senderName || null,
        content: variables.content || null,
        message_type: (variables.messageType || 'text') as WhatsappMessage['message_type'],
        media_url: variables.mediaUrl || null,
        media_mime_type: variables.mediaMimeType || null,
        media_filename: variables.mediaFilename || null,
        quoted_message_id: variables.quotedMessageId || null,
        quoted_content: null,
        quoted_sender: null,
        reactions: null,
        status: 'pending',
        error_message: null,
        created_at: new Date().toISOString(),
      };

      await queryClient.cancelQueries({ queryKey: ['whatsapp-messages', variables.conversationId] });
      queryClient.setQueryData(
        ['whatsapp-messages', variables.conversationId],
        (old: WhatsappMessage[] = []) => [...old, optimisticMessage],
      );

      return { tempMessageId };
    },
    onSuccess: async (data, variables, context) => {
      const finalStatus = data.queued ? 'queued' : 'sent';
      const savedMessage = data.message;

      queryClient.setQueryData(
        ['whatsapp-messages', variables.conversationId],
        (old: WhatsappMessage[] = []) => {
          if (!context?.tempMessageId) return old;

          if (savedMessage?.id) {
            const withoutTemp = old.filter((message) => message.id !== context.tempMessageId);
            const alreadyExists = withoutTemp.some((message) => message.id === savedMessage.id);
            if (alreadyExists) return withoutTemp;
            return [...withoutTemp, savedMessage];
          }

          return old.map((message) =>
            message.id === context.tempMessageId
              ? { ...message, status: finalStatus, error_message: null }
              : message,
          );
        },
      );

      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', variables.conversationId] });

      await clearConversationFollowup(variables.conversationId);

      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });

      if (data.queued) {
        toast.info('Mensagem adicionada a fila (instancia offline)');
      }
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData(
        ['whatsapp-messages', variables.conversationId],
        (old: WhatsappMessage[] = []) => {
          if (!context?.tempMessageId) return old;

          return old.map((message) =>
            message.id === context.tempMessageId
              ? { ...message, status: 'error', error_message: error.message || 'Erro ao enviar' }
              : message,
          );
        },
      );

      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    }
  });
}

export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    }
  });
}
