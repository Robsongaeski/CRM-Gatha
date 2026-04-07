import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WhatsappConversation, useCreateSystemMessage } from '@/hooks/whatsapp/useWhatsappConversations';
import { useWhatsappMessages, useSendWhatsappMessage, useMarkMessagesAsRead } from '@/hooks/whatsapp/useWhatsappMessages';
import { useAssignConversation, useFinishConversation, useUpdateConversation } from '@/hooks/whatsapp/useWhatsappConversations';
import { useWhatsappQuickReplies } from '@/hooks/whatsapp/useWhatsappQuickReplies';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Users, UserPlus, CheckCircle2, RefreshCw, ArrowRightLeft, Smile, Paperclip, Image, FileText, X, Zap, ChevronRight, Search, WifiOff, Mic, Square, Trash2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import MessageBubble from './MessageBubble';
import TransferirAtendimentoDialog from './TransferirAtendimentoDialog';
import ForwardMessageDialog from './ForwardMessageDialog';

interface ChatAreaProps {
  conversation: WhatsappConversation;
  groupedConversations?: WhatsappConversation[];
  activeConversationId?: string;
  onTabChange?: (conversationId: string) => void;
}

const EMOJI_LIST = ['😀', '😂', '😍', '🥰', '😊', '👍', '👏', '🙏', '❤️', '🔥', '✅', '⭐', '🎉', '👋', '🤝', '💪'];

export default function ChatArea({ 
  conversation, 
  groupedConversations = [],
  activeConversationId,
  onTabChange 
}: ChatAreaProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending] = useState(false); // Mantido para compatibilidade visual
  const [showQuickRepliesPopover, setShowQuickRepliesPopover] = useState(false);
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [messageToForward, setMessageToForward] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<number | null>(null);

  const { data: messages = [], isLoading } = useWhatsappMessages(conversation.id);
  const { data: quickReplies = [] } = useWhatsappQuickReplies();
  const sendMessage = useSendWhatsappMessage();
  const assignConversation = useAssignConversation();
  const finishConversation = useFinishConversation();
  const updateConversation = useUpdateConversation();
  const markAsRead = useMarkMessagesAsRead();
  const createSystemMessage = useCreateSystemMessage();

  // Buscar perfil do usuário atual para ter o nome
  const { data: currentUserProfile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Normalizar telefone para buscar pedidos
  const normalizePhone = (phone: string | null | undefined): string => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
  };
  const contactPhoneNormalized = useMemo(() => normalizePhone(conversation.contact_phone), [conversation.contact_phone]);

  // Buscar pedido mais recente pelo telefone para substituição de variáveis
  const { data: linkedOrder } = useQuery({
    queryKey: ['chat-linked-order', contactPhoneNormalized],
    queryFn: async () => {
      if (!contactPhoneNormalized || contactPhoneNormalized.length < 8) return null;
      
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, created_at, total, status, customer_phone, delivery_estimate, tracking_code, pix_key')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Filtrar pelo telefone normalizado (últimos 8-9 dígitos)
      const matched = (data || []).find(order => {
        const orderPhone = normalizePhone(order.customer_phone);
        const minDigits = Math.min(contactPhoneNormalized.length, orderPhone.length, 8);
        return orderPhone.slice(-minDigits) === contactPhoneNormalized.slice(-minDigits);
      });
      
      return matched || null;
    },
    enabled: !!contactPhoneNormalized && contactPhoneNormalized.length >= 8,
  });

  // Buscar carrinho abandonado pelo telefone para substituição de variáveis
  const { data: abandonedCart } = useQuery({
    queryKey: ['chat-abandoned-cart', contactPhoneNormalized],
    queryFn: async () => {
      if (!contactPhoneNormalized || contactPhoneNormalized.length < 8) return null;
      
      const { data, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .eq('status', 'abandoned')
        .order('abandoned_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      
      // Filtrar pelo telefone normalizado
      const matched = (data || []).find(cart => {
        const cartPhone = normalizePhone(cart.customer_phone);
        if (!cartPhone || cartPhone.length < 8) return false;
        const minDigits = Math.min(contactPhoneNormalized.length, cartPhone.length, 8);
        return cartPhone.slice(-minDigits) === contactPhoneNormalized.slice(-minDigits);
      });
      
      return matched || null;
    },
    enabled: !!contactPhoneNormalized && contactPhoneNormalized.length >= 8,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read logic:
  // - Grupos: marca como lido ao abrir
  // - Individual: só marca como lido quando responder (no handleSend)
  useEffect(() => {
    if (conversation.unread_count > 0 && conversation.is_group) {
      markAsRead.mutate(conversation.id);
    }
  }, [conversation.id, conversation.is_group, conversation.unread_count]);

  // Foco automático no input ao abrir conversa
  useEffect(() => {
    inputRef.current?.focus();
  }, [conversation.id]);

  // Handle paste for images
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  // Clear preview URL when file changes
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Detectar atalho por "/" - autocomplete
  const showSuggestions = message.startsWith('/');
  const shortcutFilter = message.startsWith('/') ? message.slice(1).toLowerCase() : '';
  const suggestedReplies = quickReplies.filter(
    (r) =>
      r.atalho?.toLowerCase().includes(shortcutFilter) ||
      r.titulo.toLowerCase().includes(shortcutFilter)
  );

  // Quick buttons - apenas as que têm mostrar_botao = true
  const quickButtons = quickReplies.filter(r => r.mostrar_botao);

  // Filtrar respostas no popover
  const filteredQuickReplies = quickReplies.filter(
    (r) =>
      r.titulo.toLowerCase().includes(quickReplySearch.toLowerCase()) ||
      r.atalho?.toLowerCase().includes(quickReplySearch.toLowerCase()) ||
      r.conteudo.toLowerCase().includes(quickReplySearch.toLowerCase())
  );

  const messageContentById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of messages) {
      if (item.id && item.content) {
        map.set(item.id, item.content);
      }
    }
    return map;
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() && !selectedFile) return;

    // Capturar valores atuais imediatamente
    const currentMessage = message.trim();
    const currentFile = selectedFile;
    const currentPreviewUrl = previewUrl;

    // Limpar inputs IMEDIATAMENTE para permitir próxima mensagem
    setMessage('');
    setSelectedFile(null);
    setPreviewUrl(null);

    // Manter foco no input
    inputRef.current?.focus();

    // === VERIFICAÇÃO DE TRANSFERÊNCIA (síncrona, antes do envio) ===
    const isImplicitTransfer = conversation.assigned_to && 
                                conversation.assigned_to !== user?.id && 
                                conversation.status !== 'finished';

    console.log('[ChatArea] 🔄 handleSend - Verificando transferência:', {
      conversationId: conversation.id,
      assigned_to: conversation.assigned_to,
      userId: user?.id,
      status: conversation.status,
      isImplicitTransfer,
    });

    // Se é uma transferência implícita, processar ANTES de enviar a mensagem
    if (isImplicitTransfer) {
      try {
        // Buscar nome do usuário atual
        let userName = currentUserProfile?.nome;
        if (!userName) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', user?.id)
            .single();
          userName = profileData?.nome || 'Atendente';
        }
        
        console.log('[ChatArea] 📝 Criando mensagem de transferência para:', userName);
        
        // Criar mensagem de sistema
        await createSystemMessage.mutateAsync({
          conversationId: conversation.id,
          instanceId: conversation.instance_id,
          content: `👤 Sendo atendido por ${userName}`
        });

        // Atualizar atendente
        await updateConversation.mutateAsync({
          id: conversation.id,
          status: 'in_progress',
          assigned_to: user?.id,
        });
        
        console.log('[ChatArea] ✅ Transferência concluída');
      } catch (transferError) {
        console.error('[ChatArea] ❌ Erro na transferência:', transferError);
      }
    }
    // Se não tem atendente ou está finalizada, atribuir ao usuário atual AUTOMATICAMENTE (apenas para conversas privadas)
    else if ((!conversation.assigned_to || conversation.status === 'finished') && !conversation.is_group) {
      try {
        let userName = currentUserProfile?.nome;
        if (!userName) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('nome')
            .eq('id', user?.id)
            .single();
          userName = profileData?.nome || 'Atendente';
        }

        await createSystemMessage.mutateAsync({
          conversationId: conversation.id,
          instanceId: conversation.instance_id,
          content: `👋 Sendo atendido por ${userName}`
        });

        await updateConversation.mutateAsync({
          id: conversation.id,
          status: 'in_progress',
          assigned_to: user?.id,
        });
        console.log('[ChatArea] 👤 Conversa atribuída ao usuário atual automaticamente ao responder');
      } catch (assignError) {
        console.error('[ChatArea] ❌ Erro ao atribuir conversa:', assignError);
      }
    }

    // Capturar mensagem sendo respondida (evita ids temporarios otimizados)
    const replyId = String(replyingTo?.id || '').trim();
    const quotedMessageId =
      replyId && !replyId.startsWith('tmp-')
        ? replyId
        : (replyingTo?.message_id_external ? String(replyingTo.message_id_external) : undefined);
    setReplyingTo(null); // Limpar IMEDIATAMENTE a UI de resposta

    // Enviar em background (não bloqueia a UI)
    (async () => {
      try {
        // Limpar URL de preview
        if (currentPreviewUrl) {
          URL.revokeObjectURL(currentPreviewUrl);
        }

        // Preparar dados de mídia se houver arquivo
        let mediaBase64: string | undefined;
        let mediaMimeType: string | undefined;
        let mediaFilename: string | undefined;
        let messageType: 'text' | 'image' | 'video' | 'audio' | 'document' = 'text';

        if (currentFile) {
          // Converter arquivo para base64
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64Data = result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(currentFile);
          });

          mediaBase64 = base64;
          mediaMimeType = currentFile.type;
          mediaFilename = currentFile.name;

          if (currentFile.type.startsWith('image/')) messageType = 'image';
          else if (currentFile.type.startsWith('video/')) messageType = 'video';
          else if (currentFile.type.startsWith('audio/')) messageType = 'audio';
          else messageType = 'document';
        }

        await sendMessage.mutateAsync({
          conversationId: conversation.id,
          instanceId: conversation.instance_id,
          remoteJid: conversation.remote_jid,
          content: currentMessage,
          messageType,
          mediaBase64,
          mediaMimeType,
          mediaFilename,
          quotedMessageId,
          senderName: currentUserProfile?.nome || 'Atendente',
        });

        // Marcar como lido apenas após confirmar envio do atendente
        if (!conversation.is_group && conversation.unread_count > 0) {
          markAsRead.mutate(conversation.id);
        }
      } catch (error: unknown) {
        toast.error('Erro ao enviar mensagem', { description: sanitizeError(error) });
      }
    })();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAssign = async () => {
    try {
      if (!user?.id) {
        toast.error('Usuário não identificado para assumir o atendimento');
        return;
      }

      const wasUnassigned = !conversation.assigned_to;
      let userName = currentUserProfile?.nome;
      if (!userName) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', user?.id)
          .single();
        userName = profileData?.nome || 'Atendente';
      }

      await assignConversation.mutateAsync({ conversationId: conversation.id, userId: user.id });
      
      await createSystemMessage.mutateAsync({
        conversationId: conversation.id,
        instanceId: conversation.instance_id,
        content: wasUnassigned
          ? `🤖 Atendimento IA encerrado. 👤 Sendo atendido por ${userName}`
          : `👤 Sendo atendido por ${userName}`
      });

      toast.success(
        wasUnassigned
          ? 'Atendimento IA encerrado e conversa atribuída a você'
          : 'Conversa atribuída a você'
      );
    } catch (error: unknown) {
      toast.error('Erro ao atribuir conversa', { description: sanitizeError(error) });
    }
  };

  const handleFinish = async () => {
    try {
      const userName = currentUserProfile?.nome || 'Atendente';
      await finishConversation.mutateAsync({
        conversationId: conversation.id,
        instanceId: conversation.instance_id,
        userName,
      });
      toast.success('Atendimento finalizado');
    } catch (error: unknown) {
      toast.error('Erro ao finalizar atendimento', { description: sanitizeError(error) });
    }
  };

  const handleReactivate = async () => {
    try {
      await updateConversation.mutateAsync({
        id: conversation.id,
        status: 'in_progress',
        assigned_to: user?.id,
      });
      toast.success('Atendimento reativado');
    } catch (error: unknown) {
      toast.error('Erro ao reativar atendimento', { description: sanitizeError(error) });
    }
  };

  const handleQuickReply = (content: string) => {
    // Replace variables - com suporte a todas as variáveis
    let processedContent = content;
    const clientName = conversation.cliente?.nome_razao_social || conversation.contact_name;
    
    // Saudação baseada no horário
    const hour = new Date().getHours();
    const saudacao = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
    processedContent = processedContent.replace(/{saudacao}/gi, saudacao);
    
    if (clientName) {
      processedContent = processedContent.replace(/{nome}/gi, clientName);
      processedContent = processedContent.replace(/{primeiro_nome}/gi, clientName.split(' ')[0]);
    }
    
    // Variáveis de pedido - usar linkedOrder se disponível
    if (linkedOrder) {
      // Número do pedido
      processedContent = processedContent.replace(/{numero_pedido}/gi, linkedOrder.order_number);
      
      // Código de rastreio
      if (linkedOrder.tracking_code) {
        processedContent = processedContent.replace(/{codigo_rastreio}/gi, linkedOrder.tracking_code);
      }
      
      // Data de entrega e estimativa
      if (linkedOrder.delivery_estimate) {
        const date = new Date(linkedOrder.delivery_estimate + 'T12:00:00');
        const formattedDate = date.toLocaleDateString('pt-BR');
        processedContent = processedContent.replace(/{data_entrega}/gi, formattedDate);
        
        // Calcular dias úteis DE HOJE até a DATA DE ENTREGA
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataEntrega = new Date(linkedOrder.delivery_estimate + 'T12:00:00');
        dataEntrega.setHours(0, 0, 0, 0);
        
        // Contar dias úteis (excluindo hoje, começando do próximo dia)
        let diasUteis = 0;
        const current = new Date(hoje);
        current.setDate(current.getDate() + 1); // Começa do próximo dia
        
        while (current <= dataEntrega) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) diasUteis++;
          current.setDate(current.getDate() + 1);
        }
        
        // Calcular range de estimativa (margem de 5 dias úteis)
        if (diasUteis > 0) {
          const margemMinima = Math.max(1, diasUteis - 5);
          processedContent = processedContent.replace(/{estimativa_entrega}/gi, `${margemMinima} a ${diasUteis} dias úteis`);
        } else {
          processedContent = processedContent.replace(/{estimativa_entrega}/gi, 'em breve');
        }
      } else {
        processedContent = processedContent.replace(/{estimativa_entrega}/gi, '10 a 15 dias úteis');
      }
      
      // PIX - usar a chave do pedido se disponível
      if (processedContent.includes('{pix}')) {
        const pixValue = (linkedOrder as any).pix_key || 'pix@suaempresa.com.br';
        processedContent = processedContent.replace(/{pix}/gi, pixValue);
      }
    } else {
      // Sem pedido vinculado - usar valores padrão
      processedContent = processedContent.replace(/{estimativa_entrega}/gi, '5 a 7 dias úteis');
      processedContent = processedContent.replace(/{pix}/gi, 'pix@suaempresa.com.br');
    }
    
    // Variáveis de carrinho abandonado
    if (abandonedCart) {
      // Produtos do carrinho - lista formatada
      const items = Array.isArray(abandonedCart.items) 
        ? abandonedCart.items 
        : JSON.parse(String(abandonedCart.items) || '[]');
      
      const produtosLista = items.map((item: any) => 
        `• ${item.quantity || item.qtd || 1}x ${item.name || item.produto || 'Produto'}`
      ).join('\n');
      
      processedContent = processedContent.replace(/{produtos_carrinho}/gi, produtosLista || 'Nenhum produto');
      
      // Link do carrinho
      const linkCarrinho = abandonedCart.recovery_url || '';
      processedContent = processedContent.replace(/{link_carrinho}/gi, linkCarrinho);
    } else {
      // Sem carrinho abandonado - limpar variáveis
      processedContent = processedContent.replace(/{produtos_carrinho}/gi, '');
      processedContent = processedContent.replace(/{link_carrinho}/gi, '');
    }
    
    setMessage(processedContent);
    inputRef.current?.focus();
  };

  const handleSuggestionSelect = (content: string) => {
    handleQuickReply(content);
  };

  const handleQuickReplySelect = (content: string) => {
    handleQuickReply(content);
    setShowQuickRepliesPopover(false);
    setQuickReplySearch('');
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
    // Reset input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/ogg; codecs=opus' });
        if (audioBlob.size > 0) {
          const file = new File([audioBlob], `audio-${Date.now()}.ogg`, { type: 'audio/ogg' });
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(audioBlob));
        }
        
        // Limpar stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      toast.error('Erro ao acessar microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = []; // Limpar chunks para não processar no onstop
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      toast.info('Gravação cancelada');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const isAssignedToMe = conversation.assigned_to === user?.id;
  const isFinished = conversation.status === 'finished';
  const canTransferConversation = !isFinished;
  const canTakeOverConversation = !conversation.is_group && !isFinished && !isAssignedToMe;
  const takeOverLabel = conversation.assigned_to
    ? 'Assumir atendimento'
    : 'Encerrar atendimento IA e assumir';

  // Nome principal: cliente vinculado ou contato
  const mainName = conversation.cliente?.nome_razao_social || 
    (conversation.is_group ? conversation.group_name : conversation.contact_name || conversation.contact_phone);
  const secondaryInfo = conversation.assigned_user ? `Atendente: ${conversation.assigned_user.nome}` : conversation.instance?.nome;

  // Deduplica instâncias para as tabs - apenas uma tab por instance_id
  const uniqueInstanceConversations = useMemo(() => {
    const seen = new Map<string, WhatsappConversation>();
    groupedConversations.forEach(conv => {
      // Mantém apenas a primeira conversa de cada instância (mais recente já vem ordenada)
      if (!seen.has(conv.instance_id)) {
        seen.set(conv.instance_id, conv);
      }
    });
    return Array.from(seen.values());
  }, [groupedConversations]);

  // Verificar se há múltiplas instâncias
  const hasMultipleInstances = uniqueInstanceConversations.length > 1;
  return (
    <div className="flex flex-col h-full bg-[#efeae2]">
      {/* Header - WhatsApp style */}
      <div className="flex items-center justify-between h-[59px] px-4 bg-[#f0f2f5] border-b border-[#d1d7db] flex-shrink-0 cursor-pointer">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={conversation.is_group ? conversation.group_photo_url || undefined : conversation.contact_photo_url || undefined} />
            <AvatarFallback className="bg-[#dfe5e7] text-[#54656f]">
              {conversation.is_group ? (
                <Users className="h-5 w-5" />
              ) : (
                getInitials(mainName || '?')
              )}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-[#111b21] text-base truncate leading-tight">{mainName}</p>
            {/* Secundário: Nome da Instância + Atendente */}
            <p className="text-[13px] text-[#667781] truncate mb-1">
              {conversation.instance?.nome} {conversation.assigned_user ? `• Atendente: ${conversation.assigned_user.nome}` : ''}
            </p>
            
            {/* Tabs para múltiplas instâncias - Destacadas */}
            {hasMultipleInstances && (
              <div className="flex items-center gap-2 mt-0.5">
                {uniqueInstanceConversations.map((conv) => {
                  const isActive = conv.instance_id === conversation.instance_id;
                  const instanceName = conv.instance?.nome || 'Instância';
                  // Somar não lidos de todas conversas desta instância
                  const totalUnread = groupedConversations
                    .filter(c => c.instance_id === conv.instance_id)
                    .reduce((sum, c) => sum + (c.unread_count || 0), 0);
                  
                  return (
                    <button
                      key={conv.instance_id}
                      onClick={(e) => { e.stopPropagation(); onTabChange?.(conv.id); }}
                      className={cn(
                        'px-2 py-0.5 text-[11px] font-medium rounded-sm transition-all relative border',
                        isActive
                          ? 'bg-[#25d366] text-white border-[#25d366]'
                          : 'bg-white text-[#54656f] border-[#d1d7db] hover:border-[#25d366] hover:text-[#25d366]'
                      )}
                    >
                      {instanceName}
                      {totalUnread > 0 && !isActive && (
                        <span className="absolute -top-1 -right-1 min-w-4 h-4 bg-[#25d366] rounded-full flex items-center justify-center text-[9px] text-white font-bold px-1">
                          {totalUnread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0 text-[#54656f]">
          <Search className="h-5 w-5 cursor-pointer hover:text-[#3b4a54] mr-1" />

          {canTransferConversation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTransferDialog(true)}
              className="text-[#54656f] border-[#d1d7db] hover:bg-black/5 gap-1 h-8"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Transferir
            </Button>
          )}

          {canTakeOverConversation && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAssign}
              title={takeOverLabel}
              className="text-[#0f766e] border-[#99f6e4] hover:bg-[#ccfbf1]/60 gap-1 h-8"
            >
              {conversation.assigned_to ? (
                <UserPlus className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
              {conversation.assigned_to ? 'Assumir' : 'Encerrar IA'}
            </Button>
          )}
          
          {/* Botões mantidos fora do menu conforme solicitado */}
          {isFinished ? (
            <Button 
              variant="outline"
              size="sm" 
              onClick={handleReactivate}
              className="text-[#25d366] border-[#25d366] hover:bg-[#25d366]/10 gap-1 h-8"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reativar
            </Button>
          ) : (
            <Button 
              variant="outline"
              size="sm" 
              onClick={handleFinish}
              className="text-[#1da851] border-[#1da851] hover:bg-[#1da851]/10 gap-1 h-8 font-medium"
            >
              <CheckCircle2 className="h-4 w-4" />
              Finalizar
            </Button>
          )}
        </div>
      </div>

      {/* Aviso de instância desconectada */}
      {conversation.instance?.status !== 'connected' && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
          <WifiOff className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-700">
            <strong>Instância desconectada!</strong> A instância "{conversation.instance?.nome || 'WhatsApp'}" não está conectada. Verifique as configurações.
          </span>
        </div>
      )}

      {/* Messages area with WhatsApp doodle pattern - usa flex-1 e min-h-0 para não estourar */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto"
        ref={scrollRef}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#efeae2'
        }}
      >
        <div className="p-4 space-y-1 min-h-full flex flex-col justify-end">
          {isLoading ? (
            <div className="text-center text-[#667781]">Carregando mensagens...</div>
          ) : (
            <>
              {messages.map((msg, index) => {
                const currentDate = new Date(msg.created_at);
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const prevDate = prevMsg ? new Date(prevMsg.created_at) : null;
                
                let showDateDivider = false;
                if (!prevDate) {
                  showDateDivider = true;
                } else if (
                  currentDate.getDate() !== prevDate.getDate() ||
                  currentDate.getMonth() !== prevDate.getMonth() ||
                  currentDate.getFullYear() !== prevDate.getFullYear()
                ) {
                  showDateDivider = true;
                }

                const formatDateText = (date: Date) => {
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);
                  
                  if (date.toDateString() === today.toDateString()) {
                    return 'Hoje';
                  } else if (date.toDateString() === yesterday.toDateString()) {
                    return 'Ontem';
                  } else {
                    return format(date, "dd/MM/yyyy");
                  }
                };

                return (
                  <div key={msg.id} className="flex flex-col">
                    {showDateDivider && (
                      <div className="flex justify-center my-3">
                        <span className="bg-[#e7f3ff] text-[#3b5998] text-xs px-3 py-1 rounded-lg shadow-sm border border-[#d0e3f7]">
                          {formatDateText(currentDate)}
                        </span>
                      </div>
                    )}
                    <MessageBubble 
                      message={{
                        id: msg.id,
                        message_id_external: msg.message_id_external,
                        direction: msg.from_me ? 'outgoing' : 'incoming',
                        type: msg.message_type,
                        content: msg.content,
                        sender_phone: msg.sender_phone,
                        media_url: msg.media_url,
                        media_mimetype: msg.media_mime_type,
                        status: msg.status,
                        created_at: msg.created_at,
                        quoted_message:
                          (msg.quoted_content ||
                            (msg.quoted_message_id ? (messageContentById.get(msg.quoted_message_id) || null) : null))
                            ? {
                                content:
                                  msg.quoted_content ||
                                  (msg.quoted_message_id ? (messageContentById.get(msg.quoted_message_id) || '') : ''),
                              }
                            : null,
                      }} 
                      senderName={msg.sender_name}
                      isGroup={conversation.is_group}
                      instanceName={conversation.instance?.nome}
                      onReply={(msg) => {
                        setReplyingTo(msg);
                        inputRef.current?.focus();
                      }}
                      onForward={(msg) => {
                        setMessageToForward(msg);
                        setShowForwardDialog(true);
                      }}
                    />
                  </div>
                );
              })}
              
              {/* Mensagem interna de atendimento finalizado */}
              {conversation.status === 'finished' && conversation.finished_user && (
                <div className="flex justify-center my-2">
                  <div className="bg-[#fdf4e3] text-[#856404] text-xs px-4 py-2 rounded-lg shadow-sm border border-[#f5d185]">
                    🏁 Atendimento Finalizado por <strong>{conversation.finished_user.nome}</strong>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Input area - WhatsApp style - flex-shrink-0 para não comprimir */}
      <div className="flex-shrink-0 bg-[#f0f2f5] border-t border-[#d1d7db] relative">
        {/* Autocomplete suggestions - aparece ACIMA da área de input */}
        {showSuggestions && suggestedReplies.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-1 mx-4 bg-white border border-[#d1d7db] rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
            {suggestedReplies.map((reply) => (
              <button
                key={reply.id}
                onClick={() => handleSuggestionSelect(reply.conteudo)}
                className="w-full text-left p-2 hover:bg-[#f0f2f5] transition-colors flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-[#111b21]">{reply.titulo}</span>
                  <p className="text-xs text-[#667781] truncate">{reply.conteudo}</p>
                </div>
                {reply.atalho && (
                  <span className="text-xs text-[#667781] bg-[#f0f2f5] px-1.5 py-0.5 rounded ml-2">
                    /{reply.atalho}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Quoted message preview */}
        {replyingTo && (
          <div className="px-4 py-2 bg-[#f0f2f5] border-b border-[#00a884]/20 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex-1 min-w-0 border-l-4 border-[#00a884] pl-3 py-1 bg-white/50 rounded-r-md">
              <p className="text-xs font-semibold text-[#00a884] mb-0.5">
                {replyingTo.direction === 'outgoing' ? 'Você' : (replyingTo.sender_name || 'Contato')}
              </p>
              <p className="text-sm text-[#54656f] truncate">
                {replyingTo.content || (replyingTo.type === 'image' ? '📷 Foto' : replyingTo.type === 'video' ? '🎥 Vídeo' : replyingTo.type === 'audio' ? '🎵 Áudio' : '📄 Arquivo')}
              </p>
            </div>
            <button 
              onClick={() => setReplyingTo(null)}
              className="p-1.5 text-[#54656f] hover:bg-black/5 rounded-full transition-colors ml-2"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* File preview */}
        {selectedFile && (
          <div className="px-4 py-2 bg-white border-b border-[#d1d7db] flex items-center gap-3">
            {previewUrl ? (
              selectedFile.type.startsWith('image/') || selectedFile.type.startsWith('video/') ? (
                <img src={previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
              ) : (
                <div className="w-12 h-12 bg-[#00a884]/10 rounded flex items-center justify-center">
                  <Mic className="h-6 w-6 text-[#00a884]" />
                </div>
              )
            ) : (
              <div className="w-12 h-12 bg-[#f0f2f5] rounded flex items-center justify-center">
                <FileText className="h-6 w-6 text-[#54656f]" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#111b21] truncate">{selectedFile.name}</p>
              <p className="text-xs text-[#667781]">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClearFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className={cn("px-4 py-3", isRecording && "bg-[#f0f2f5]")}>
          <div className="flex items-center gap-2">
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between bg-white border border-[#d1d7db] rounded-[24px] px-4 py-2 h-[44px] shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-[#111b21] tabular-nums">{formatTime(recordingTime)}</span>
                  </div>
                  <span className="text-sm text-[#667781] hidden sm:inline">Gravando áudio...</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={cancelRecording}
                    className="p-2 text-[#ea4335] hover:bg-red-50 rounded-full transition-colors"
                    title="Cancelar"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={stopRecording}
                    className="p-2 text-[#00a884] hover:bg-green-50 rounded-full transition-colors"
                    title="Enviar áudio"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Emoji picker */}
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <button className="p-2 text-[#54656f] hover:text-[#3b4a54] transition-colors">
                      <Smile className="h-6 w-6" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" side="top" align="start">
                    <div className="grid grid-cols-8 gap-1">
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleEmojiSelect(emoji)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-[#f0f2f5] rounded text-xl"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* File attachment */}
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-2 text-[#54656f] hover:text-[#3b4a54] transition-colors">
                      <Paperclip className="h-6 w-6" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2" side="top" align="start">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = 'image/*,video/*';
                            fileInputRef.current.click();
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-[#f0f2f5] rounded text-sm text-[#111b21]"
                      >
                        <Image className="h-4 w-4 text-[#00a884]" />
                        Fotos e vídeos
                      </button>
                      <button
                        onClick={() => {
                          if (fileInputRef.current) {
                            fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,audio/*';
                            fileInputRef.current.click();
                          }
                        }}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-[#f0f2f5] rounded text-sm text-[#111b21]"
                      >
                        <FileText className="h-4 w-4 text-[#5f66cd]" />
                        Documento
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>

                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Mensagem"
                    className="w-full bg-white rounded-lg px-4 py-2 text-[#111b21] placeholder:text-[#667781] focus:outline-none resize-none min-h-[44px] max-h-32 shadow-sm"
                    rows={message.split('\n').length > 1 ? Math.min(message.split('\n').length, 5) : 1}
                  />
                </div>

                {message.trim() || selectedFile ? (
                  <button
                    onClick={handleSend}
                    disabled={isSending}
                    className="p-2 rounded-full text-[#111b21] hover:bg-[#e9edef] transition-colors"
                  >
                    <Send className="h-6 w-6 ml-0.5" />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    className="p-2 text-[#54656f] hover:text-[#3b4a54] transition-colors"
                    title="Gravar áudio"
                  >
                    <Mic className="h-6 w-6" />
                  </button>
                )}
              </>
            )}
          </div>
        {/* Quick replies bar - ABAIXO do input */}
        {quickReplies.length > 0 && (
          <div className="px-3 py-1.5 bg-[#f0f2f5] border-t border-[#d1d7db]">
            <div className="flex flex-wrap items-center gap-1">
              <Zap className="h-4 w-4 text-[#54656f] mr-1 flex-shrink-0" />
              
              {/* Quick action buttons */}
              {quickButtons.map((reply) => (
                <Button
                  key={reply.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQuickReplySelect(reply.conteudo)}
                  className="h-7 px-2 text-xs bg-white border border-[#d1d7db] hover:bg-[#e9edef] text-[#111b21] flex-shrink-0"
                >
                  {reply.titulo}
                </Button>
              ))}

              {/* Ver todas button */}
              <Popover open={showQuickRepliesPopover} onOpenChange={setShowQuickRepliesPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs bg-[#25d366] hover:bg-[#1da851] text-white gap-1 flex-shrink-0"
                  >
                    Todas
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start" side="top">
                  <div className="p-2 border-b">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar resposta..."
                        value={quickReplySearch}
                        onChange={(e) => setQuickReplySearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <ScrollArea className="h-64">
                    {filteredQuickReplies.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhum resultado
                      </div>
                    ) : (
                      <div className="p-1">
                        {filteredQuickReplies.map((reply) => (
                          <button
                            key={reply.id}
                            onClick={() => handleQuickReplySelect(reply.conteudo)}
                            className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{reply.titulo}</span>
                              {reply.atalho && (
                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  /{reply.atalho}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {reply.conteudo}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-xs text-[#667781] mt-1">
              Digite /atalho para enviar • Estas são suas respostas rápidas pessoais
            </p>
          </div>
        )}
      </div>

      {/* Transfer dialog */}
      <TransferirAtendimentoDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        conversationId={conversation.id}
        instanceId={conversation.instance_id}
      />

      {/* Forward dialog */}
      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
        message={messageToForward ? {
          content: messageToForward.content,
          type: messageToForward.type,
          media_url: messageToForward.media_url,
          media_mimetype: messageToForward.media_mimetype || messageToForward.media_mime_type
        } : null}
      />
    </div>
    </div>
  );
}
