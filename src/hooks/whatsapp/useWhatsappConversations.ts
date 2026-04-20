import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DEFAULT_CONVERSATION_LIST_LIMIT = 1000;
const CONVERSATION_SEARCH_LIMIT = 2000;

function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

function getPhoneSearchVariants(value: string | null | undefined): string[] {
  const rawDigits = onlyDigits(value);
  if (!rawDigits) return [];

  const variants = new Set<string>();
  variants.add(rawDigits);

  let nationalDigits = rawDigits;
  if (nationalDigits.startsWith('55') && nationalDigits.length > 11) {
    nationalDigits = nationalDigits.slice(2);
    variants.add(nationalDigits);
  }

  if (nationalDigits.length === 11 && nationalDigits[2] === '9') {
    variants.add(`${nationalDigits.slice(0, 2)}${nationalDigits.slice(3)}`);
  }

  if (nationalDigits.length === 10) {
    variants.add(`${nationalDigits.slice(0, 2)}9${nationalDigits.slice(2)}`);
  }

  if (nationalDigits.length >= 8) {
    variants.add(nationalDigits.slice(-8));
  }

  if (nationalDigits.length >= 9) {
    variants.add(nationalDigits.slice(-9));
  }

  return Array.from(variants).filter(Boolean);
}

function matchesPhoneSearch(
  searchValue: string,
  ...candidatePhones: Array<string | null | undefined>
): boolean {
  const searchVariants = getPhoneSearchVariants(searchValue);
  if (searchVariants.length === 0) return false;

  return candidatePhones.some((candidate) => {
    const candidateVariants = getPhoneSearchVariants(candidate);
    if (candidateVariants.length === 0) return false;

    return candidateVariants.some((candidateVariant) =>
      searchVariants.some((searchVariant) =>
        candidateVariant.includes(searchVariant) || searchVariant.includes(candidateVariant)
      )
    );
  });
}
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
  needs_followup?: boolean;
  followup_color?: string | null;
  followup_reason?: string | null;
  followup_flagged_at?: string | null;
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
  status: 'all' | 'active' | 'unread' | 'finished' | 'followup_pending';
  search: string;
  instanceId?: string;
  assignedUserId?: string;
}

interface ConversationQueryOptions {
  limit?: number;
  searchLimit?: number;
}

interface WhatsappConversationsResult {
  data: WhatsappConversation[];
  totalCount: number;
}

export function useWhatsappConversations(
  filters: ConversationFilters,
  allowedInstanceIds?: string[],
  options?: ConversationQueryOptions,
  canViewAllConversations = false,
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastInvalidateAtRef = useRef(0);

  const query = useQuery({
    queryKey: [
      'whatsapp-conversations',
      filters,
      allowedInstanceIds,
      options?.limit ?? null,
      options?.searchLimit ?? null,
      canViewAllConversations,
    ],
    queryFn: async (): Promise<WhatsappConversationsResult> => {
      const hasInstanceFilter = Array.isArray(allowedInstanceIds);
      const filteredInstanceIds = hasInstanceFilter
        ? Array.from(new Set((allowedInstanceIds || []).filter(Boolean)))
        : [];

      // Evita vazar conversas quando o usuário não possui instâncias vinculadas.
      if (hasInstanceFilter && filteredInstanceIds.length === 0) {
        return { data: [], totalCount: 0 };
      }
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
        `, { count: 'exact' })
        .order('last_message_at', { ascending: false });

      const searchTerm = filters.search.trim();
      const hasSearch = searchTerm.length > 0;
      const effectiveAssignment = canViewAllConversations ? filters.assignment : 'mine_and_new';
      const effectiveAssignedUserId = canViewAllConversations ? filters.assignedUserId : undefined;
      let matchedClienteIdsFromSearch: string[] = [];

      // Filtro de atribuição
      if (!hasSearch && effectiveAssignment === 'mine' && user) {
        // "mine" mostra APENAS minhas conversas + grupos
        query = query.or(`assigned_to.eq.${user.id},is_group.eq.true`);
      } else if (!hasSearch && effectiveAssignment === 'mine_and_new' && user) {
        // "mine_and_new" mostra minhas + sem atribuição (novas) + grupos
        query = query.or(`assigned_to.eq.${user.id},assigned_to.is.null,is_group.eq.true`);
      }

      // Filtro de status
      if (filters.status === 'unread') {
        query = query.gt('unread_count', 0);
      } else if (filters.status === 'finished') {
        query = query.eq('status', 'finished');
      } else if (filters.status === 'active') {
        query = query.neq('status', 'finished');
      } else if (filters.status === 'followup_pending') {
        query = query.eq('needs_followup', true);
      }
      // status === 'all' não aplica filtro

      // Filtro de instância (do filtro UI)
      if (filters.instanceId) {
        if (hasInstanceFilter && !filteredInstanceIds.includes(filters.instanceId)) {
          return { data: [], totalCount: 0 };
        }
        query = query.eq('instance_id', filters.instanceId);
      }

      if (effectiveAssignedUserId) {
        query = query.eq('assigned_to', effectiveAssignedUserId);
      }
      // Filtro de instâncias permitidas (baseado em vínculos do usuário)
      else if (hasInstanceFilter) {
        query = query.in('instance_id', filteredInstanceIds);
      }

      if (hasSearch) {
        const serverSearchTerm = searchTerm
          .replace(/[(),'"]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const searchClauses = new Set<string>();
        const matchedClienteIds = new Set<string>();

        if (serverSearchTerm) {
          searchClauses.add(`contact_name.ilike.%${serverSearchTerm}%`);
          searchClauses.add(`group_name.ilike.%${serverSearchTerm}%`);
          searchClauses.add(`last_message_preview.ilike.%${serverSearchTerm}%`);
        }

        const phoneVariants = getPhoneSearchVariants(searchTerm).filter((variant) => variant.length >= 4);
        phoneVariants.forEach((variant) => {
          searchClauses.add(`contact_phone.like.%${variant}%`);
          searchClauses.add(`remote_jid.like.%${variant}%`);
        });

        if (serverSearchTerm) {
          const { data: matchedClientes } = await supabase
            .from('clientes')
            .select('id')
            .ilike('nome_razao_social', `%${serverSearchTerm}%`)
            .limit(100);

          const clienteIds = (matchedClientes || [])
            .map((cliente) => cliente.id)
            .filter(Boolean);

          clienteIds.forEach((clienteId) => matchedClienteIds.add(clienteId));
        }

        const orderNumberDigits = onlyDigits(searchTerm);
        if (orderNumberDigits.length > 0) {
          const parsedOrderNumber = Number.parseInt(orderNumberDigits, 10);

          if (Number.isFinite(parsedOrderNumber)) {
            const { data: matchedPedidos } = await supabase
              .from('pedidos')
              .select('cliente_id')
              .eq('numero_pedido', parsedOrderNumber)
              .not('cliente_id', 'is', null)
              .limit(100);

            (matchedPedidos || []).forEach((pedido) => {
              if (pedido.cliente_id) {
                matchedClienteIds.add(pedido.cliente_id);
              }
            });
          }
        }

        matchedClienteIdsFromSearch = Array.from(matchedClienteIds);
        if (matchedClienteIdsFromSearch.length > 0) {
          searchClauses.add(`cliente_id.in.(${matchedClienteIdsFromSearch.join(',')})`);
        }

        if (searchClauses.size > 0) {
          query = query.or(Array.from(searchClauses).join(','));
        }
      }

      const fetchLimit = hasSearch
        ? (options?.searchLimit ?? CONVERSATION_SEARCH_LIMIT)
        : (options?.limit ?? DEFAULT_CONVERSATION_LIST_LIMIT);
      const { data, error, count } = await query.limit(fetchLimit + 1);
      if (error) throw error;

      // Busca client-side final (normalizacao e consistencia de filtros)
      let results = (data || []) as WhatsappConversation[];

      if (effectiveAssignedUserId) {
        results = results.filter((conv) => conv.assigned_to === effectiveAssignedUserId);
      } else if (effectiveAssignment === 'mine' && user) {
        results = results.filter((conv) =>
          conv.is_group || conv.assigned_to === user.id
        );
      } else if (effectiveAssignment === 'mine_and_new' && user) {
        results = results.filter((conv) =>
          conv.is_group || conv.assigned_to === user.id || !conv.assigned_to
        );
      }

      if (hasSearch) {
        const normalizedSearch = normalizeSearchText(searchTerm);
        const matchedClienteIdSet = new Set(matchedClienteIdsFromSearch);

        results = results.filter((conv) => {
          const matchesText =
            normalizedSearch.length > 0 &&
            (
              normalizeSearchText(conv.contact_name).includes(normalizedSearch) ||
              normalizeSearchText(conv.group_name).includes(normalizedSearch) ||
              normalizeSearchText(conv.last_message_preview).includes(normalizedSearch) ||
              normalizeSearchText(conv.cliente?.nome_razao_social).includes(normalizedSearch)
            );

          const matchesPhone = matchesPhoneSearch(
            searchTerm,
            conv.contact_phone,
            conv.remote_jid,
          );

          const matchesOrderCliente =
            !!conv.cliente_id && matchedClienteIdSet.has(conv.cliente_id);

          return matchesText || matchesPhone || matchesOrderCliente;
        });
      }

      return {
        data: results.slice(0, fetchLimit),
        totalCount: count || 0
      };
    },
  });

  // Realtime subscription - granular para evitar cascata de re-renders
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-conversations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_conversations'
        },
        () => {
          // Para INSERT, fazemos refetch pois a nova conversa pode precisar do join
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'], refetchType: 'active' });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_conversations'
        },
        (payload) => {
          // Para UPDATE, atualiza diretamente no cache sem recarregar tudo
          queryClient.setQueriesData(
            { queryKey: ['whatsapp-conversations'], exact: false },
            (old: WhatsappConversationsResult | undefined) => {
              if (!old || !old.data) return old;
              return {
                ...old,
                data: old.data.map(conv =>
                  conv.id === payload.new.id
                    ? { ...conv, ...(payload.new as Partial<WhatsappConversation>) }
                    : conv
                )
              };
            }
          );

          // Conversas fora do limite atual nao entram apenas com setQueriesData.
          // Forca um refetch com throttle para trazer conversas antigas que ficaram ativas.
          const now = Date.now();
          if (now - lastInvalidateAtRef.current > 1500) {
            lastInvalidateAtRef.current = now;
            queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'], refetchType: 'active' });
          }
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
