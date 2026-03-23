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
  // Instâncias envolvidas (com status)
  instances: Array<{ id: string; nome: string; status?: string | null }>;
}

// Normaliza telefone para agrupamento
function normalizePhoneForGrouping(phone: string | null): string {
  if (!phone) return '';
  // Remove tudo que não é número
  const cleaned = phone.replace(/\D/g, '');
  // Remove código do país 55 se presente para normalizar
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    // Pode ter 9 dígito ou não, normalizar para formato consistente
    const withoutCountry = cleaned.slice(2);
    // Se tem 11 dígitos (DDD + 9 + número), é celular
    // Se tem 10 dígitos (DDD + número), pode ser fixo ou celular antigo
    return withoutCountry;
  }
  return cleaned;
}

// Verifica se um nome parece ser o nome de uma instância/atendente ao invés do cliente
function isInstanceOrAgentName(name: string, instanceName: string | null | undefined): boolean {
  if (!name) return true;
  const lowerName = name.toLowerCase().trim();
  
  // Nomes genéricos que indicam que é a instância ou atendente
  const genericPatterns = ['atendimento', 'suporte', 'contato', 'vendas', 'sac'];
  
  for (const pattern of genericPatterns) {
    if (lowerName.includes(pattern)) return true;
  }
  
  // Se o nome for igual ao da instância (ex: "4715", "Ana atendimento")
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
        // Grupos: agrupar pelo JID do grupo (não agrupa, cada grupo é único)
        groupKey = conv.remote_jid;
      } else {
        // Contatos individuais: agrupar pelo telefone normalizado
        // IMPORTANTE: Ignorar telefones inválidos (muito curtos, muito longos, ou que parecem ser LID)
        const phone = conv.contact_phone || '';
        const normalizedPhone = normalizePhoneForGrouping(phone);
        
        // Validar se é um telefone brasileiro válido (10-11 dígitos após remover código país)
        // Se o remote_jid contém @lid, o contact_phone pode ser inválido (número do LID)
        const isLidJid = conv.remote_jid?.includes('@lid');
        const isValidPhone = normalizedPhone.length >= 10 && normalizedPhone.length <= 11 && !isLidJid;
        
        if (isValidPhone) {
          groupKey = normalizedPhone;
        } else {
          // Se não tem telefone válido ou é LID, usa remote_jid (cada conversa é única)
          groupKey = conv.remote_jid;
        }
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(conv);
    });

    // Converter para array de grupos
    const result: GroupedConversation[] = [];

    groups.forEach((convs, groupKey) => {
      // Ordenar por última mensagem
      convs.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      const primary = convs[0]; // Conversa principal (mais recente)
      
      // Para nome, priorizar cliente vinculado, depois tentar encontrar o contact_name mais confiável
      // Filtrar nomes que parecem ser da instância/atendente
      let bestContactName: string | null = null;
      if (!primary.is_group) {
        for (const conv of convs) {
          const name = conv.contact_name;
          const instanceName = conv.instance?.nome;
          
          // Ignorar nomes que parecem ser da instância/atendente
          if (name && !isInstanceOrAgentName(name, instanceName)) {
            bestContactName = name;
            break;
          }
        }
      }

      // Se ainda não temos um nome válido, usar telefone formatado
      // Verificar se o telefone é válido (10-11 dígitos) independente de ser @lid
      const displayPhone = primary.contact_phone || '';
      
      // Normalizar e validar telefone para exibição (10-11 dígitos após remover código país)
      const normalizedDisplayPhone = normalizePhoneForGrouping(displayPhone);
      const isValidDisplayPhone = normalizedDisplayPhone.length >= 10 && 
                                   normalizedDisplayPhone.length <= 11;
      const formattedPhone = isValidDisplayPhone ? displayPhone : null;

      // Prioridade para nome:
      // 1. Para grupos: group_name
      // 2. Para individuais: bestContactName (nome real do contato do WhatsApp)
      // 3. Fallback: cliente vinculado (pode estar errado se vinculação automática falhou)
      // 4. Último fallback: telefone formatado ou "Contato"
      const displayName = primary.is_group 
        ? primary.group_name 
        : (bestContactName || primary.cliente?.nome_razao_social || formattedPhone || 'Contato');

      // Deduplica instâncias por ID para evitar abas repetidas
      const uniqueInstancesMap = new Map<string, { id: string; nome: string; status?: string | null }>();
      convs.forEach(c => {
        if (c.instance?.id && !uniqueInstancesMap.has(c.instance.id)) {
          uniqueInstancesMap.set(c.instance.id, {
            id: c.instance.id,
            nome: c.instance.nome,
            status: c.instance.status
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
        instances: Array.from(uniqueInstancesMap.values()),
      });
    });

    // Ordenar por última mensagem
    result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    return result;
  }, [conversations]);
}
