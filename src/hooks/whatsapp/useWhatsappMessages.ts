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

const MESSAGE_LIMIT = 200;

export function useWhatsappMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['whatsapp-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error, count } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(MESSAGE_LIMIT);

      if (error) throw error;

      // Inverter para ordem cronológica
      return (data as WhatsappMessage[]).reverse();
    },
    enabled: !!conversationId
  });

  // Realtime subscription
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
            // Evitar duplicatas
            if (old.some(m => m.id === newMessage.id)) return old;
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
            return old.map(m => m.id === payload.new.id ? payload.new as WhatsappMessage : m);
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

  return useMutation({
    mutationFn: async (params: {
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
    }) => {
      const { data, error } = await supabase.functions
        .invoke('send-whatsapp', {
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
            conversationId: params.conversationId
          }
        });

      // supabase.functions.invoke coloca resposta em data mesmo com status >= 400
      // mas pode retornar error se houve falha de rede/CORS
      if (error) {
        // Tentar extrair mensagem do erro
        const errMsg = (error as any)?.context?.body 
          ? await (error as any).context.json?.().catch(() => null)
          : null;
        throw new Error(errMsg?.error || error.message || 'Erro de conexão com o servidor');
      }
      
      if (data && !data.success && !data.queued) {
        // Mensagem de erro vinda da edge function - já é amigável
        throw new Error(data.error || 'Erro ao processar envio da mensagem');
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      
      if (data.queued) {
        toast.info('Mensagem adicionada à fila (instância offline)');
      }
    },
    onError: (error: Error) => {
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
