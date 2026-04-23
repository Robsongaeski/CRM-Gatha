import { useMemo } from 'react';
import { WhatsappConversation } from './useWhatsappConversations';

export interface GroupedConversation {
  // Chave de agrupamento (telefone normalizado ou remote_jid para grupos)
  groupKey: string;
  // Conversas agrupadas (cada uma de uma instância diferente)
  conversations: WhatsappConversation[];
  // Dados consolidados para exibição
  mainName: string;
  photoUrl: string | null;
  isGroup: boolean;
  // Soma de não lidos de todas as instâncias
  totalUnread: number;
  // Última mensagem mais recente
  lastMessageAt: string;
  lastMessagePreview: string | null;
  // Cliente vinculado (se houver)
  cliente: WhatsappConversation['cliente'];
  // Atendente (usa o primeiro atribuído)
  assignedUser: WhatsappConversation['assigned_user'];
  // Marcação visual de follow-up
  hasFollowup: boolean;
  followupColor: string | null;
  followupReason: string | null;
  followupFlaggedAt: string | null;
  // Instâncias envolvidas (com status)
  instances: Array<{ id: string; nome: string; status?: string | null }>;
}

function normalizePhoneForGrouping(phone: string | null): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    return cleaned.slice(2);
  }
  return cleaned;
}

function isInstanceOrAgentName(name: string, instanceName: string | null | undefined): boolean {
  if (!name) return true;
  const lowerName = name.toLowerCase().trim();

  const genericPatterns = ['atendimento', 'suporte', 'contato', 'vendas', 'sac'];
  for (const pattern of genericPatterns) {
    if (lowerName.includes(pattern)) return true;
  }

  if (instanceName) {
    const lowerInstance = instanceName.toLowerCase().trim();
    if (lowerName === lowerInstance || lowerName.includes(lowerInstance)) return true;
  }

  return false;
}

export function useGroupedConversations(conversations: WhatsappConversation[]): GroupedConversation[] {
  return useMemo(() => {
    const groups = new Map<string, WhatsappConversation[]>();

    conversations.forEach(conv => {
      let groupKey: string;

      if (conv.is_group) {
        groupKey = conv.remote_jid;
      } else {
        const phone = conv.contact_phone || '';
        const normalizedPhone = normalizePhoneForGrouping(phone);
        const isValidPhone = normalizedPhone.length >= 10 && normalizedPhone.length <= 11;
        groupKey = isValidPhone ? normalizedPhone : conv.remote_jid;
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(conv);
    });

    const result: GroupedConversation[] = [];

    groups.forEach((convs, groupKey) => {
      convs.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      const primary = convs[0];
      const followupConversation = convs
        .filter(c => c.needs_followup && c.status !== 'finished')
        .sort((a, b) => {
          const aTime = a.followup_flagged_at ? new Date(a.followup_flagged_at).getTime() : 0;
          const bTime = b.followup_flagged_at ? new Date(b.followup_flagged_at).getTime() : 0;
          return bTime - aTime;
        })[0] || null;

      let bestContactName: string | null = null;
      if (!primary.is_group) {
        for (const conv of convs) {
          const name = conv.contact_name;
          const instanceName = conv.instance?.nome;
          if (name && !isInstanceOrAgentName(name, instanceName)) {
            bestContactName = name;
            break;
          }
        }
      }

      const displayPhone = primary.contact_phone || '';
      const normalizedDisplayPhone = normalizePhoneForGrouping(displayPhone);
      const isValidDisplayPhone = normalizedDisplayPhone.length >= 10 && normalizedDisplayPhone.length <= 11;
      const formattedPhone = isValidDisplayPhone ? displayPhone : null;

      const displayName = primary.is_group
        ? primary.group_name
        : (bestContactName || primary.cliente?.nome_razao_social || formattedPhone || 'Contato');

      const uniqueInstancesMap = new Map<string, { id: string; nome: string; status?: string | null }>();
      convs.forEach(c => {
        if (c.instance?.id && !uniqueInstancesMap.has(c.instance.id)) {
          uniqueInstancesMap.set(c.instance.id, {
            id: c.instance.id,
            nome: c.instance.nome,
            status: c.instance.status,
          });
        }
      });

      result.push({
        groupKey,
        conversations: convs,
        mainName: displayName,
        photoUrl: primary.is_group ? primary.group_photo_url : primary.contact_photo_url,
        isGroup: primary.is_group,
        totalUnread: convs.reduce((sum, c) => sum + (c.unread_count || 0), 0),
        lastMessageAt: primary.last_message_at,
        lastMessagePreview: primary.last_message_preview,
        cliente: primary.cliente,
        assignedUser: primary.is_group ? null : (convs.find(c => c.assigned_user)?.assigned_user || null),
        hasFollowup: Boolean(followupConversation?.needs_followup),
        followupColor: followupConversation?.followup_color || null,
        followupReason: followupConversation?.followup_reason || null,
        followupFlaggedAt: followupConversation?.followup_flagged_at || null,
        instances: Array.from(uniqueInstancesMap.values()),
      });
    });

    result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return result;
  }, [conversations]);
}
