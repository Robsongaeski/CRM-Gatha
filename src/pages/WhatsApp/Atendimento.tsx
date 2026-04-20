import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWhatsappConversations, ConversationFilters, WhatsappConversation } from '@/hooks/whatsapp/useWhatsappConversations';
import { useUserInstances } from '@/hooks/whatsapp/useWhatsappInstanceUsers';
import { useGroupedConversations, GroupedConversation } from '@/hooks/whatsapp/useGroupedConversations';
import ConversationList from '@/components/WhatsApp/ConversationList';
import ChatArea from '@/components/WhatsApp/ChatArea';
import ConversationInfo from '@/components/WhatsApp/ConversationInfo';
import SelecionarInstanciaDialog from '@/components/WhatsApp/SelecionarInstanciaDialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface DeepLinkData {
  telefone: string;
  nome: string;
  existingConversationInstanceId: string | null;
  existingConversationId: string | null;
}

const INITIAL_CONVERSATION_LIMIT = 100;
const CONVERSATION_LIMIT_STEP = 100;
const FOLLOWUP_OVERDUE_HOURS = 24;

export default function Atendimento() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { canAny, isAdmin } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const processedPhoneRef = useRef<string | null>(null);
  
  const [filters, setFilters] = useState<ConversationFilters>({
    assignment: 'mine_and_new',
    status: 'active',
    search: '',
  });
  const [conversationLimit, setConversationLimit] = useState(INITIAL_CONVERSATION_LIMIT);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedGroup, setSelectedGroup] = useState<GroupedConversation | null>(null);
  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(null);

  // Estado para o dialog de seleção de instância (deep link)
  const [instanceSelectDialog, setInstanceSelectDialog] = useState(false);
  const [deepLinkData, setDeepLinkData] = useState<DeepLinkData | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const canFilterByAttendant = isAdmin || canAny(
    'whatsapp.visualizar',
    'ecommerce.whatsapp.visualizar',
    'whatsapp.configurar',
    'ecommerce.whatsapp.configurar',
    'whatsapp.instancias.gerenciar'
  );

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

  const { data: attendants = [] } = useQuery({
    queryKey: ['whatsapp-attendants', allowedInstanceIds],
    queryFn: async () => {
      if (allowedInstanceIds.length === 0) return [];

      const { data: instanceUsers, error: instanceUsersError } = await supabase
        .from('whatsapp_instance_users')
        .select('user_id')
        .in('instance_id', allowedInstanceIds);

      if (instanceUsersError) throw instanceUsersError;

      const userIds = Array.from(new Set((instanceUsers || []).map((item) => item.user_id).filter(Boolean)));
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', userIds)
        .eq('ativo', true)
        .order('nome');

      if (profilesError) throw profilesError;
      return profiles || [];
    },
    enabled: canFilterByAttendant && allowedInstanceIds.length > 0,
  });

  // Buscar conversas apenas das instâncias permitidas
  const { data: conversationsData, isLoading: loadingConversations } = useWhatsappConversations(
    filters,
    allowedInstanceIds,
    { limit: conversationLimit, searchLimit: 5000 },
    canFilterByAttendant,
  );

  const conversations = conversationsData?.data || [];
  const totalConversations = conversationsData?.totalCount || 0;

  const isSearching = filters.search.trim().length > 0;
  const hasMoreConversations = !isSearching && conversations.length < totalConversations;

  useEffect(() => {
    setConversationLimit(INITIAL_CONVERSATION_LIMIT);
  }, [filters.assignment, filters.status, filters.search, filters.instanceId, filters.assignedUserId]);

  useEffect(() => {
    if (!canFilterByAttendant && (filters.assignment === 'all' || filters.assignedUserId)) {
      setFilters((prev) => ({
        ...prev,
        assignment: 'mine_and_new',
        assignedUserId: undefined,
      }));
    }
  }, [canFilterByAttendant, filters.assignment, filters.assignedUserId]);
  
  const groupedConversations = useGroupedConversations(conversations);
  const isFollowupOverdue = useCallback((flaggedAt: string | null) => {
    if (!flaggedAt) return false;
    const flaggedTime = new Date(flaggedAt).getTime();
    if (Number.isNaN(flaggedTime)) return false;
    return Date.now() - flaggedTime >= FOLLOWUP_OVERDUE_HOURS * 60 * 60 * 1000;
  }, []);

  const pendingFollowupsCount = useMemo(
    () => groupedConversations.filter((group) => group.hasFollowup).length,
    [groupedConversations]
  );

  const overdueFollowupsCount = useMemo(
    () => groupedConversations.filter((group) => group.hasFollowup && isFollowupOverdue(group.followupFlaggedAt)).length,
    [groupedConversations, isFollowupOverdue]
  );

  const buildTemporaryGroup = useCallback((conv: WhatsappConversation): GroupedConversation => {
    const contactPhone = conv.contact_phone || conv.remote_jid?.replace('@s.whatsapp.net', '') || '';
    const groupKey = contactPhone.slice(-8);

    return {
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
  }, []);

  const findConversationInCache = useCallback((conversationId: string): WhatsappConversation | null => {
    const cachedQueries = queryClient.getQueriesData<WhatsappConversation[]>({
      queryKey: ['whatsapp-conversations'],
    });

    for (const [, cachedConversations] of cachedQueries) {
      const conversation = cachedConversations?.find((c) => c.id === conversationId);
      if (conversation) return conversation;
    }

    return null;
  }, [queryClient]);

  const getConversationById = useCallback(async (conversationId: string): Promise<WhatsappConversation | null> => {
    const fromCache = findConversationInCache(conversationId);
    if (fromCache) return fromCache;

    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select(`
        *,
        instance:whatsapp_instances!left(id, nome, numero_whatsapp, status),
        assigned_user:profiles!whatsapp_conversations_assigned_to_fkey(id, nome),
        finished_user:profiles!whatsapp_conversations_finished_by_fkey(id, nome),
        cliente:clientes!left(id, nome_razao_social)
      `)
      .eq('id', conversationId)
      .maybeSingle();

    if (error) throw error;
    return (data as WhatsappConversation | null) ?? null;
  }, [findConversationInCache]);
  
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
      const legacyRemoteJid = `${normalizedPhone}@c.us`;
      const instanceIds = userInstances.map(i => i.id);
      
      try {
        // Buscar conversas existentes pelo telefone normalizado em instâncias CONECTADAS
        const { data: existingConversations } = await supabase
          .from('whatsapp_conversations')
          .select('id, instance_id, contact_phone, remote_jid')
          .or(`contact_phone.eq.${normalizedPhone},remote_jid.eq.${remoteJid},remote_jid.eq.${legacyRemoteJid}`)
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
        toast.error('Nenhuma instância conectada', { 
          description: 'Conecte uma instância para iniciar conversas' 
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
        
        await queryClient.refetchQueries({ queryKey: ['whatsapp-conversations'] });
        
        const conv = await getConversationById(existingConversationId);
        
        if (conv) {
          setSelectedGroup(buildTemporaryGroup(conv));
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
      
      await queryClient.refetchQueries({ queryKey: ['whatsapp-conversations'] });
      
      const conv = await getConversationById(newConv.id);
      
      if (conv) {
        setSelectedGroup(buildTemporaryGroup(conv));
        setActiveInstanceId(newConv.id);
      } else {
        // Fallback: construir grupo mínimo se não encontrar no cache
        const groupKey = phone.slice(-8);
        const minimalConversation = {
          id: newConv.id,
          instance_id: instanceId,
          remote_jid: remoteJid,
          contact_name: contactName,
          contact_phone: phone,
          contact_photo_url: null,
          is_group: false,
          status: 'pending' as const,
          unread_count: 0,
          last_message_at: new Date().toISOString(),
          last_message_preview: null,
          assigned_to: null,
          cliente_id: null,
          created_at: new Date().toISOString(),
          instance: connectedInstances.find(i => i.id === instanceId) || null,
          cliente: null,
          assigned_user: null,
        };
        
        const tempGroup: GroupedConversation = {
          groupKey,
          mainName: contactName,
          photoUrl: null,
          isGroup: false,
          conversations: [minimalConversation] as unknown as WhatsappConversation[],
          lastMessageAt: new Date().toISOString(),
          lastMessagePreview: null,
          totalUnread: 0,
          cliente: null,
          assignedUser: null,
          instances: [],
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
  }, [buildTemporaryGroup, connectedInstances, getConversationById, queryClient]);

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
    await queryClient.refetchQueries({ queryKey: ['whatsapp-conversations'] });

    const conversation = await getConversationById(conversationId);
    if (!conversation) return;

    setSelectedGroup(buildTemporaryGroup(conversation));
    setActiveInstanceId(conversationId);
  }, [buildTemporaryGroup, getConversationById, queryClient]);

  // Instâncias para o filtro (todas, não só conectadas)
  const allInstances = userInstances;

  // Ordenar conversas agrupadas
  const visibleGroups = groupedConversations.filter((group) => {
    if (filters.status === 'followup_pending') return group.hasFollowup;
    return true;
  });

  const sortedGroups = [...visibleGroups].sort((a, b) => {
    if (filters.status === 'followup_pending') {
      const aTime = a.followupFlaggedAt ? new Date(a.followupFlaggedAt).getTime() : 0;
      const bTime = b.followupFlaggedAt ? new Date(b.followupFlaggedAt).getTime() : 0;
      return aTime - bTime;
    }

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

  // Sincronizar conversa ativa com a URL para suportar o botão "Voltar" do navegador/celular
  useEffect(() => {
    const cid = searchParams.get('cid');
    
    if (cid) {
      if (cid !== activeInstanceId) {
        setActiveInstanceId(cid);
      }
      
      // Se tivermos um ID na URL mas nenhum grupo selecionado (ex: refresh ou link direto)
      // tentamos encontrar o grupo que contém essa conversa
      if (!selectedGroup && groupedConversations.length > 0) {
        const group = groupedConversations.find(g => 
          g.conversations.some(c => c.id === cid)
        );
        if (group) {
          setSelectedGroup(group);
        }
      }
    } else if (activeInstanceId) {
      // Se o CID sumiu da URL (botão voltar), limpamos o estado local
      setActiveInstanceId(null);
      setSelectedGroup(null);
    }
  }, [searchParams, groupedConversations, activeInstanceId, selectedGroup]);

  const handleSelectGroup = (group: GroupedConversation) => {
    const firstConvId = group.conversations[0]?.id;
    if (firstConvId) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('cid', firstConvId);
        return next;
      });
    }
    setSelectedGroup(group);
    setActiveInstanceId(firstConvId || null);
  };

  const handleTabChange = (conversationId: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('cid', conversationId);
      return next;
    });
    setActiveInstanceId(conversationId);
  };

  const handleClearConversation = () => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('cid');
      return next;
    });
    setActiveInstanceId(null);
    setSelectedGroup(null);
  };

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden bg-[#f0f2f5]',
        isMobile ? 'h-full min-h-0' : 'h-[calc(100vh-120px)] -m-6'
      )}
    >
      {pendingFollowupsCount > 0 && (!isMobile || !activeConversation) && (
        <div className="flex items-center justify-between gap-3 border-b border-red-200 bg-white px-4 py-2">
          <div className="text-sm text-red-600">
            <button
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, status: 'followup_pending' }))}
              className={`hover:underline ${filters.status === 'followup_pending' ? 'font-semibold underline text-red-700' : ''}`}
            >
              Você tem {pendingFollowupsCount} retorno{pendingFollowupsCount !== 1 ? 's' : ''} pendente{pendingFollowupsCount !== 1 ? 's' : ''}
            </button>
            {overdueFollowupsCount > 0 && (
              <span>, {overdueFollowupsCount} atrasado{overdueFollowupsCount !== 1 ? 's' : ''}</span>
            )}
            {filters.status === 'followup_pending' && (
              <>
                <span>, </span>
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, status: 'active' }))}
                  className="text-slate-600 hover:underline"
                >
                  Limpar
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden relative">
      {/* Lista de conversas */}
      <div className={cn(
        "w-full md:w-[380px] flex-shrink-0 border-r border-[#d1d7db] flex-col h-full",
        activeConversation ? "hidden md:flex" : "flex"
      )}>
        <ConversationList
          conversations={conversations}
          groupedConversations={sortedGroups}
          loading={loadingConversations || loadingInstances}
          loadingMore={loadingConversations && conversationLimit > INITIAL_CONVERSATION_LIMIT}
          hasMore={hasMoreConversations}
          onLoadMore={() => setConversationLimit((prev) => prev + CONVERSATION_LIMIT_STEP)}
          filters={filters}
          onFiltersChange={setFilters}
          canFilterByAttendant={canFilterByAttendant}
          attendants={attendants}
          selectedGroupKey={selectedGroup?.groupKey}
          onSelectGroup={handleSelectGroup}
          instances={allInstances}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onConversationOpened={handleConversationOpened}
        />
      </div>

      {/* Área de chat */}
      <div className={cn(
        "flex-1 flex-col min-w-0 h-full w-full absolute md:relative z-10 bg-[#f0f2f5]",
        activeConversation ? "flex" : "hidden md:flex"
      )}>
        {activeConversation && selectedGroup ? (
          <ChatArea
            conversation={activeConversation}
            groupedConversations={selectedGroup.conversations}
            activeConversationId={activeInstanceId || activeConversation.id}
            onTabChange={handleTabChange}
            onBack={handleClearConversation}
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

      {/* Painel de informações - visível no desktop */}
      {activeConversation && (
        <div className="hidden lg:block w-[320px] flex-shrink-0 border-l border-[#d1d7db] bg-white h-full overflow-y-auto">
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
    </div>
  );
}
