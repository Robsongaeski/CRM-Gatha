import { useQuery } from '@tanstack/react-query';
import {
  eachDayOfInterval,
  endOfDay,
  format,
  parseISO,
  startOfDay,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const PAGE_SIZE = 1000;
const ID_BATCH_SIZE = 200;

type ReportMessage = {
  id: string;
  conversation_id: string;
  created_at: string | null;
  from_me: boolean | null;
};

type ConversationStarter = {
  conversation_id: string;
  first_message_at: string | null;
  started_by_attendant: boolean | null;
};

type ReportConversation = {
  id: string;
  assigned_to: string | null;
  finished_by: string | null;
  created_at: string | null;
};

type ReportOrder = {
  id: string;
  vendedor_id: string;
  data_pedido: string;
  valor_total: number;
  status: string;
};

export interface AtendimentoDailyMetrics {
  date: string;
  label: string;
  totalConversations: number;
  attendedConversations: number;
  startedByAttendant: number;
  startedByCustomer: number;
  closedOrders: number;
  closedOrdersValue: number;
}

export interface AtendimentoSummaryMetrics {
  totalConversations: number;
  attendedConversations: number;
  startedByAttendant: number;
  startedByCustomer: number;
  closedOrders: number;
  closedOrdersValue: number;
}

export interface AtendimentoAttendantMetrics extends AtendimentoSummaryMetrics {
  attendantId: string;
}

export interface AtendimentoAdminReport {
  summary: AtendimentoSummaryMetrics;
  daily: AtendimentoDailyMetrics[];
  byAttendant: AtendimentoAttendantMetrics[];
}

export interface AtendimentoAdminReportFilters {
  startDate: string;
  endDate: string;
  attendantIds: string[];
}

async function fetchOrdersForRange(attendantIds: string[], startDate: string, endDate: string) {
  const rows: ReportOrder[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, vendedor_id, data_pedido, valor_total, status')
      .in('vendedor_id', attendantIds)
      .neq('status', 'cancelado')
      .gte('data_pedido', startDate)
      .lte('data_pedido', endDate)
      .order('data_pedido', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = (data || []) as ReportOrder[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchConversationsForAttendants(
  attendantIds: string[],
  startIso: string,
  endIso: string,
) {
  const rows: ReportConversation[] = [];
  let from = 0;
  const formattedIds = attendantIds.join(',');

  while (true) {
    const { data, error } = await supabase
      .from('whatsapp_conversations')
      .select('id, assigned_to, finished_by, created_at')
      .or(`assigned_to.in.(${formattedIds}),finished_by.in.(${formattedIds})`)
      .gte('last_message_at', startIso)
      .lte('created_at', endIso)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    rows.push(...((data || []) as ReportConversation[]));

    if ((data || []).length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function fetchMessagesForConversationIdsAndRange(
  conversationIds: string[],
  startIso: string,
  endIso: string,
) {
  const rows: ReportMessage[] = [];

  for (let index = 0; index < conversationIds.length; index += ID_BATCH_SIZE) {
    const batchIds = conversationIds.slice(index, index + ID_BATCH_SIZE);
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id, conversation_id, created_at, from_me')
        .in('conversation_id', batchIds)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      const batch = (data || []) as ReportMessage[];
      rows.push(...batch);

      if (batch.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  return rows;
}

async function fetchFirstMessagesByConversationIds(conversationIds: string[]) {
  const firstMessageMap = new Map<string, ConversationStarter>();

  for (let index = 0; index < conversationIds.length; index += ID_BATCH_SIZE) {
    const batchIds = conversationIds.slice(index, index + ID_BATCH_SIZE);
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id, conversation_id, created_at, from_me')
        .in('conversation_id', batchIds)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw error;

      const batch = (data || []) as ReportMessage[];
      batch.forEach((message) => {
        if (!firstMessageMap.has(message.conversation_id)) {
          firstMessageMap.set(message.conversation_id, {
            conversation_id: message.conversation_id,
            first_message_at: message.created_at,
            started_by_attendant: Boolean(message.from_me),
          });
        }
      });

      if (batch.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  return firstMessageMap;
}

async function fetchConversationStarters(conversationIds: string[]) {
  if (conversationIds.length === 0) {
    return new Map<string, ConversationStarter>();
  }

  const startersMap = new Map<string, ConversationStarter>();

  for (let index = 0; index < conversationIds.length; index += ID_BATCH_SIZE) {
    const batchIds = conversationIds.slice(index, index + ID_BATCH_SIZE);
    try {
      const { data, error } = await supabase.rpc(
        'get_whatsapp_conversation_starters' as any,
        { _conversation_ids: batchIds },
      );

      if (error) throw error;

      ((data || []) as ConversationStarter[]).forEach((starter) => {
        if (starter.conversation_id) {
          startersMap.set(starter.conversation_id, starter);
        }
      });
    } catch {
      const fallbackMap = await fetchFirstMessagesByConversationIds(batchIds);
      fallbackMap.forEach((starter, conversationId) => {
        startersMap.set(conversationId, starter);
      });
    }
  }

  return startersMap;
}

function buildEmptyReport(attendantIds: string[], startDate: string, endDate: string): AtendimentoAdminReport {
  const days = eachDayOfInterval({
    start: startOfDay(parseISO(startDate)),
    end: endOfDay(parseISO(endDate)),
  });

  return {
    summary: {
      totalConversations: 0,
      attendedConversations: 0,
      startedByAttendant: 0,
      startedByCustomer: 0,
      closedOrders: 0,
      closedOrdersValue: 0,
    },
    daily: days.map((date) => ({
      date: format(date, 'yyyy-MM-dd'),
      label: format(date, 'dd/MM', { locale: ptBR }),
      totalConversations: 0,
      attendedConversations: 0,
      startedByAttendant: 0,
      startedByCustomer: 0,
      closedOrders: 0,
      closedOrdersValue: 0,
    })),
    byAttendant: attendantIds.map((attendantId) => ({
      attendantId,
      totalConversations: 0,
      attendedConversations: 0,
      startedByAttendant: 0,
      startedByCustomer: 0,
      closedOrders: 0,
      closedOrdersValue: 0,
    })),
  };
}

export function useAtendimentoAdminReport(filters: AtendimentoAdminReportFilters | null) {
  return useQuery({
    queryKey: ['admin-atendimento-report', filters],
    enabled:
      Boolean(filters?.startDate) &&
      Boolean(filters?.endDate) &&
      Boolean(filters?.attendantIds?.length),
    queryFn: async (): Promise<AtendimentoAdminReport> => {
      if (!filters || filters.attendantIds.length === 0) {
        const today = format(new Date(), 'yyyy-MM-dd');
        return buildEmptyReport([], today, today);
      }

      const { startDate, endDate } = filters;
      const attendantIdSet = new Set(filters.attendantIds);
      const emptyReport = buildEmptyReport(filters.attendantIds, startDate, endDate);
      const dailyMap = new Map(emptyReport.daily.map((item) => [item.date, { ...item }]));
      const byAttendantMap = new Map(emptyReport.byAttendant.map((item) => [item.attendantId, { ...item }]));
      const startIso = startOfDay(parseISO(startDate)).toISOString();
      const endIso = endOfDay(parseISO(endDate)).toISOString();
      const [conversations, orderRows] = await Promise.all([
        fetchConversationsForAttendants(filters.attendantIds, startIso, endIso),
        fetchOrdersForRange(filters.attendantIds, startDate, endDate),
      ]);

      const conversationAttendantMap = new Map<string, string>();
      conversations.forEach((conversation) => {
        const attendantId = conversation.assigned_to || conversation.finished_by;
        if (attendantId && attendantIdSet.has(attendantId)) {
          conversationAttendantMap.set(conversation.id, attendantId);
        }
      });

      const scopedConversationIds = Array.from(
        conversationAttendantMap.keys(),
      );
      const [scopedMessages, conversationStartersMap] = scopedConversationIds.length > 0
        ? await Promise.all([
          fetchMessagesForConversationIdsAndRange(scopedConversationIds, startIso, endIso),
          fetchConversationStarters(scopedConversationIds),
        ])
        : [[], new Map<string, ConversationStarter>()];

      const dailyAllConversationSets = new Map<string, Set<string>>();
      const dailyAttendedConversationSets = new Map<string, Set<string>>();
      const attendantAllConversationSets = new Map<string, Set<string>>();
      const attendantAttendedConversationSets = new Map<string, Set<string>>();

      scopedMessages.forEach((message) => {
        if (!message.created_at) return;

        const attendantId = conversationAttendantMap.get(message.conversation_id);
        if (!attendantId) return;

        const dateKey = format(parseISO(message.created_at), 'yyyy-MM-dd');

        if (!dailyAllConversationSets.has(dateKey)) {
          dailyAllConversationSets.set(dateKey, new Set<string>());
        }
        dailyAllConversationSets.get(dateKey)?.add(message.conversation_id);

        if (!attendantAllConversationSets.has(attendantId)) {
          attendantAllConversationSets.set(attendantId, new Set<string>());
        }
        attendantAllConversationSets.get(attendantId)?.add(message.conversation_id);

        if (message.from_me) {
          if (!dailyAttendedConversationSets.has(dateKey)) {
            dailyAttendedConversationSets.set(dateKey, new Set<string>());
          }
          dailyAttendedConversationSets.get(dateKey)?.add(message.conversation_id);

          if (!attendantAttendedConversationSets.has(attendantId)) {
            attendantAttendedConversationSets.set(attendantId, new Set<string>());
          }
          attendantAttendedConversationSets.get(attendantId)?.add(message.conversation_id);
        }
      });

      dailyAllConversationSets.forEach((conversationIds, dateKey) => {
        const item = dailyMap.get(dateKey);
        if (item) item.totalConversations = conversationIds.size;
      });

      dailyAttendedConversationSets.forEach((conversationIds, dateKey) => {
        const item = dailyMap.get(dateKey);
        if (item) item.attendedConversations = conversationIds.size;
      });

      attendantAllConversationSets.forEach((conversationIds, attendantId) => {
        const item = byAttendantMap.get(attendantId);
        if (item) item.totalConversations = conversationIds.size;
      });

      attendantAttendedConversationSets.forEach((conversationIds, attendantId) => {
        const item = byAttendantMap.get(attendantId);
        if (item) item.attendedConversations = conversationIds.size;
      });

      conversationStartersMap.forEach((starter, conversationId) => {
        if (!starter.first_message_at) return;

        const attendantId = conversationAttendantMap.get(conversationId);
        if (!attendantId) return;

        const firstDateKey = format(parseISO(starter.first_message_at), 'yyyy-MM-dd');
        const dailyItem = dailyMap.get(firstDateKey);
        const attendantItem = byAttendantMap.get(attendantId);
        if (!attendantItem) return;
        if (!dailyItem) return;

        if (starter.started_by_attendant) {
          attendantItem.startedByAttendant += 1;
          dailyItem.startedByAttendant += 1;
          return;
        }

        attendantItem.startedByCustomer += 1;
        dailyItem.startedByCustomer += 1;
      });

      orderRows.forEach((order) => {
        const attendantItem = byAttendantMap.get(order.vendedor_id);
        if (!attendantItem) return;

        const dateKey = format(parseISO(order.data_pedido), 'yyyy-MM-dd');
        const dailyItem = dailyMap.get(dateKey);

        attendantItem.closedOrders += 1;
        attendantItem.closedOrdersValue += Number(order.valor_total || 0);

        if (dailyItem) {
          dailyItem.closedOrders += 1;
          dailyItem.closedOrdersValue += Number(order.valor_total || 0);
        }
      });

      const byAttendant = Array.from(byAttendantMap.values()).sort((a, b) => {
        if (b.closedOrdersValue !== a.closedOrdersValue) {
          return b.closedOrdersValue - a.closedOrdersValue;
        }
        return b.attendedConversations - a.attendedConversations;
      });

      const summary = byAttendant.reduce<AtendimentoSummaryMetrics>(
        (accumulator, item) => ({
          totalConversations: accumulator.totalConversations + item.totalConversations,
          attendedConversations: accumulator.attendedConversations + item.attendedConversations,
          startedByAttendant: accumulator.startedByAttendant + item.startedByAttendant,
          startedByCustomer: accumulator.startedByCustomer + item.startedByCustomer,
          closedOrders: accumulator.closedOrders + item.closedOrders,
          closedOrdersValue: accumulator.closedOrdersValue + item.closedOrdersValue,
        }),
        {
          totalConversations: 0,
          attendedConversations: 0,
          startedByAttendant: 0,
          startedByCustomer: 0,
          closedOrders: 0,
          closedOrdersValue: 0,
        },
      );

      return {
        summary,
        daily: Array.from(dailyMap.values()),
        byAttendant,
      };
    },
    staleTime: 60_000,
  });
}
