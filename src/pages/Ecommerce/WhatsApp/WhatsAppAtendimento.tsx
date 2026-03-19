import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWhatsappConversations, ConversationFilters, WhatsappConversation } from '@/hooks/whatsapp/useWhatsappConversations';
import { useUserInstances } from '@/hooks/whatsapp/useWhatsappInstanceUsers';
import { useGroupedConversations, GroupedConversation } from '@/hooks/whatsapp/useGroupedConversations';
import ConversationList from '@/components/WhatsApp/ConversationList';
import ChatArea from '@/components/WhatsApp/ChatArea';
import ConversationInfo from '@/components/WhatsApp/ConversationInfo';
import SelecionarInstanciaDialog from '@/components/WhatsApp/SelecionarInstanciaDialog';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

interface DeepLinkData {
  telefone: string;
  nome: string;
  existingConversationInstanceId: string | null;
  existingConversationId: string | null;
}

export default function WhatsAppAtendimento() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const processedPhoneRef = useRef<string | null>(null);
  
  const [filters, setFilters] = useState<ConversationFilters>({
    assignment: 'mine_and_new',
    status: 'active',
    search: '',
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedGroup, setSelectedGroup] = useState<GroupedConversation | null>(null);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);

  // Estado para o dialog de seleção de instância (deep link)
  const [instanceSelectDialog, setInstanceSelectDialog] = useState(false);
  const [deepLinkData, setDeepLinkData] = useState<DeepLinkData | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);

  // Buscar instâncias que o usuário tem acesso
  const { data: userInstances = [], isLoading: loadingInstances } = useUserInstances();
  
  // Instâncias conectadas
  const connectedInstances = useMemo(() => 
    userInstances.filter(i => i.status === 'connected'),
    [userInstances]
  );
  
  // IDs das instâncias permitidas
  const allowedInstanceIds = useMemo(() => 
    userInstances.map(i => i.id),
    [userInstances]
  );

  // Buscar conversas apenas das instâncias permitidas
  const { data: conversations = [], isLoading: loadingConversations } = useWhatsappConversations(
    filters,
    allowedInstanceIds.length > 0 ? allowedInstanceIds : undefined
  );
  
  const groupedConversations = useGroupedConversations(conversations);
  
  // Normaliza telefone para formato com código de país
  const normalizePhone = useCallback((phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length >= 10 && numbers.length <= 11 && !numbers.startsWith('55')) {
      return '55' + numbers;
    }
    return numbers;
  }, []);

  // Processar parâmetros da URL (telefone e nome vindos de outras telas)
  useEffect(() => {
    const telefone = searchParams.get('telefone');
    const nome = searchParams.get('nome');
    
    // Evitar reprocessamento do mesmo telefone
    if (!telefone || telefone === processedPhoneRef.current) return;
    if (userInstances.length === 0) return;
    
    processedPhoneRef.current = telefone;
    
    // Limpar os parâmetros da URL para evitar reprocessamento
    setSearchParams({}, { replace: true });
    
    const checkExistingAndPrompt = async () => {
      const normalizedPhone = normalizePhone(telefone);
      const remoteJid = `${normalizedPhone}@s.whatsapp.net`;
      const instanceIds = userInstances.map(i => i.id);
      
      try {
        // Buscar conversas existentes pelo telefone normalizado em instâncias CONECTADAS
        const { data: existingConversations } = await supabase
          .from('whatsapp_conversations')
          .select('id, instance_id, contact_phone, remote_jid')
          .or(`contact_phone.eq.${normalizedPhone},remote_jid.eq.${remoteJid}`)
          .in('instance_id', instanceIds)
          .order('updated_at', { ascending: false });

        // Verificar se existe conversa em alguma instância conectada
        const existingInConnected = existingConversations?.find(c => 
          connectedInstances.some(i => i.id === c.instance_id)
        );

        const contactName = nome ? decodeURIComponent(nome) : normalizedPhone;

        // Se tem apenas 1 instância conectada, processa automaticamente
        if (connectedInstances.length === 1) {
          await handleInstanceSelected(
            connectedInstances[0].id,
            normalizedPhone,
            contactName,
            existingInConnected?.id || null
          );
          return;
        }

        // Se tem mais de uma instância conectada, mostra dialog
        if (connectedInstances.length > 1) {
          setDeepLinkData({
            telefone: normalizedPhone,
            nome: contactName,
            existingConversationInstanceId: existingInConnected?.instance_id || null,
            existingConversationId: existingInConnected?.id || null,
          });
          setInstanceSelectDialog(true);
          return;
        }

        // Nenhuma instância conectada
        toast.error('WhatsApp desconectado', { 
          description: 'Conecte uma instância do WhatsApp para iniciar conversas.' 
        });
      } catch (error: unknown) {
        console.error('Erro ao verificar conversa:', error);
        toast.error('Erro ao verificar conversa', { description: sanitizeError(error) });
      }
    };

    checkExistingAndPrompt();
  }, [searchParams, userInstances, connectedInstances, normalizePhone, setSearchParams]);

  // Handler quando usuário seleciona instância no dialog
  const handleInstanceSelected = useCallback(async (
    instanceId: string,
    phone: string,
    contactName: string,
    existingConversationId: string | null
  ) => {
    setCreatingConversation(true);
    
    try {
      // Se já existe conversa, apenas abre
      if (existingConversationId) {
        toast.info('Abrindo conversa existente');
        
        await queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        
        const updatedConversations = queryClient.getQueryData<WhatsappConversation[]>(['whatsapp-conversations']);
        const conv = updatedConversations?.find(c => c.id === existingConversationId);
        
        if (conv) {
          const contactPhone = conv.contact_phone || conv.remote_jid?.replace('@s.whatsapp.net', '') || '';
          const groupKey = contactPhone.slice(-8);
          
          const tempGroup: GroupedConversation = {
            groupKey,
            mainName: conv.contact_name || contactPhone,
            photoUrl: conv.contact_photo_url || null,
            isGroup: conv.is_group,
            conversations: [conv],
            lastMessageAt: conv.last_message_at || new Date().toISOString(),
            lastMessagePreview: conv.last_message_preview || null,
            totalUnread: conv.unread_count || 0,
            cliente: conv.cliente,
            assignedUser: conv.assigned_user,
            instances: conv.instance ? [{ id: conv.instance.id, nome: conv.instance.nome, status: conv.instance.status }] : [],
          };
          
          setSelectedGroup(tempGroup);
          setActiveInstanceId(existingConversationId);
        }
        
        setInstanceSelectDialog(false);
        setDeepLinkData(null);
        return;
      }

      // Criar nova conversa
      const remoteJid = `${phone}@s.whatsapp.net`;
      
      const { data: newConv, error } = await supabase
        .from('whatsapp_conversations')
        .insert({
          instance_id: instanceId,
          remote_jid: remoteJid,
          contact_name: contactName,
          contact_phone: phone,
          status: 'pending',
          unread_count: 0,
        })
        .select('id, instance_id')
        .single();

      if (error) throw error;

      toast.success('Nova conversa criada', { description: `Conversa com ${contactName}` });
      
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      
      const updatedConversations = queryClient.getQueryData<WhatsappConversation[]>(['whatsapp-conversations']);
      const conv = updatedConversations?.find(c => c.id === newConv.id);
      
      if (conv) {
        const contactPhone = conv.contact_phone || conv.remote_jid?.replace('@s.whatsapp.net', '') || '';
        const groupKey = contactPhone.slice(-8);
        
        const tempGroup: GroupedConversation = {
          groupKey,
          mainName: conv.contact_name || contactPhone,
          photoUrl: conv.contact_photo_url || null,
          isGroup: conv.is_group,
          conversations: [conv],
          lastMessageAt: conv.last_message_at || new Date().toISOString(),
          lastMessagePreview: conv.last_message_preview || null,
          totalUnread: conv.unread_count || 0,
          cliente: conv.cliente,
          assignedUser: conv.assigned_user,
          instances: conv.instance ? [{ id: conv.instance.id, nome: conv.instance.nome, status: conv.instance.status }] : [],
        };
        
        setSelectedGroup(tempGroup);
        setActiveInstanceId(newConv.id);
      }
      
      setInstanceSelectDialog(false);
      setDeepLinkData(null);
    } catch (error: unknown) {
      console.error('Erro ao criar conversa:', error);
      toast.error('Erro ao criar conversa', { description: sanitizeError(error) });
    } finally {
      setCreatingConversation(false);
    }
  }, [queryClient]);

  // Handler do dialog de seleção
  const handleDialogConfirm = useCallback((instanceId: string) => {
    if (!deepLinkData) return;
    
    handleInstanceSelected(
      instanceId,
      deepLinkData.telefone,
      deepLinkData.nome,
      deepLinkData.existingConversationId
    );
  }, [deepLinkData, handleInstanceSelected]);
  
  // Callback quando uma conversa é aberta via dialog (nova ou existente)
  const handleConversationOpened = useCallback(async (conversationId: string, _instanceId: string) => {
    // Primeiro, atualiza os dados e aguarda o refetch
    await queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    
    // Busca os dados atualizados do cache
    const updatedConversations = queryClient.getQueryData<WhatsappConversation[]>(['whatsapp-conversations']);
    
    if (updatedConversations) {
      // Encontra a conversa recém-criada
      const newConversation = updatedConversations.find(c => c.id === conversationId);
      
      if (newConversation) {
        // Cria um grupo temporário para esta conversa (será atualizado pelo useEffect quando groupedConversations mudar)
        const contactPhone = newConversation.contact_phone || newConversation.remote_jid?.replace('@s.whatsapp.net', '') || '';
        const groupKey = contactPhone.slice(-8);
        
        const tempGroup: GroupedConversation = {
          groupKey,
          mainName: newConversation.contact_name || contactPhone,
          photoUrl: newConversation.contact_photo_url || null,
          isGroup: newConversation.is_group,
          conversations: [newConversation],
          lastMessageAt: newConversation.last_message_at || new Date().toISOString(),
          lastMessagePreview: newConversation.last_message_preview || null,
          totalUnread: newConversation.unread_count || 0,
          cliente: newConversation.cliente,
          assignedUser: newConversation.assigned_user,
          instances: newConversation.instance ? [{ id: newConversation.instance.id, nome: newConversation.instance.nome, status: newConversation.instance.status }] : [],
        };
        
        setSelectedGroup(tempGroup);
        setActiveInstanceId(conversationId);
      }
    }
  }, [queryClient]);

  // Instâncias para o filtro (todas, não só conectadas)
  const allInstances = userInstances;

  // Ordenar conversas agrupadas
  const sortedGroups = [...groupedConversations].sort((a, b) => {
    const dateA = new Date(a.lastMessageAt).getTime();
    const dateB = new Date(b.lastMessageAt).getTime();
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Conversa ativa (baseada na aba selecionada)
  const activeConversation = selectedGroup?.conversations.find(c => c.id === activeInstanceId) 
    || selectedGroup?.conversations[0] 
    || null;

  // Atualizar grupo selecionado quando dados mudam
  useEffect(() => {
    if (selectedGroup) {
      const updatedGroup = groupedConversations.find(g => g.groupKey === selectedGroup.groupKey);
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
        // Manter a instância ativa se ainda existir
        if (activeInstanceId && !updatedGroup.conversations.find(c => c.id === activeInstanceId)) {
          setActiveInstanceId(updatedGroup.conversations[0]?.id || null);
        }
      }
    }
  }, [groupedConversations]);

  const handleSelectGroup = (group: GroupedConversation) => {
    setSelectedGroup(group);
    // Ao selecionar, começa pela primeira conversa
    setActiveInstanceId(group.conversations[0]?.id || null);
  };

  const handleTabChange = (conversationId: string) => {
    setActiveInstanceId(conversationId);
  };

  return (
    <div className="flex h-[calc(100vh-112px)] overflow-hidden bg-[#f0f2f5] -m-6">
      {/* Lista de conversas */}
      <div className="w-[380px] flex-shrink-0 border-r border-[#d1d7db] flex flex-col h-full">
        <ConversationList
          conversations={conversations}
          groupedConversations={sortedGroups}
          loading={loadingConversations || loadingInstances}
          filters={filters}
          onFiltersChange={setFilters}
          selectedGroupKey={selectedGroup?.groupKey}
          onSelectGroup={handleSelectGroup}
          instances={allInstances}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onConversationOpened={handleConversationOpened}
        />
      </div>

      {/* Área de chat */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {activeConversation && selectedGroup ? (
          <ChatArea
            conversation={activeConversation}
            groupedConversations={selectedGroup.conversations}
            activeConversationId={activeInstanceId || activeConversation.id}
            onTabChange={handleTabChange}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
            <div className="text-center">
              <div className="w-64 h-64 mx-auto mb-6 opacity-30">
                <svg viewBox="0 0 303 172" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                  <path fillRule="evenodd" clipRule="evenodd" d="M229.565 160.229C262.212 149.245 286.931 118.241 283.39 73.4194C278.009 5.31929 210.87 -7.50989 152.261 3.29638C93.6512 14.1027 34.2135 35.0692 20.2634 72.9765C8.53086 104.267 24.9647 136.166 59.0314 150.316C93.0982 164.466 196.918 171.213 229.565 160.229Z" fill="#DAF5E4"/>
                  <path d="M152.5 83.5C152.5 115.138 126.638 141 95 141C63.3622 141 37.5 115.138 37.5 83.5C37.5 51.8622 63.3622 26 95 26C126.638 26 152.5 51.8622 152.5 83.5Z" fill="white" stroke="#E2E8F0"/>
                  <path d="M265.5 83.5C265.5 115.138 239.638 141 208 141C176.362 141 150.5 115.138 150.5 83.5C150.5 51.8622 176.362 26 208 26C239.638 26 265.5 51.8622 265.5 83.5Z" fill="white" stroke="#E2E8F0"/>
                </svg>
              </div>
              <h3 className="text-[#41525d] text-3xl font-light mb-2">WhatsApp Web</h3>
              <p className="text-[#667781] text-sm max-w-md">
                Selecione uma conversa para começar a enviar e receber mensagens
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Painel de informações - sempre visível */}
      {activeConversation && (
        <div className="w-[320px] flex-shrink-0 border-l border-[#d1d7db] bg-white h-full overflow-y-auto">
          <ConversationInfo
            conversation={activeConversation}
          />
        </div>
      )}

      {/* Dialog de seleção de instância (deep link) */}
      <SelecionarInstanciaDialog
        open={instanceSelectDialog}
        onOpenChange={setInstanceSelectDialog}
        instances={userInstances}
        contactName={deepLinkData?.nome || ''}
        contactPhone={deepLinkData?.telefone || ''}
        existingConversationInstanceId={deepLinkData?.existingConversationInstanceId}
        onConfirm={handleDialogConfirm}
        loading={creatingConversation}
      />
    </div>
  );
}
