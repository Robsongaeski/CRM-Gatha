import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AtendenteMetrics {
  id: string;
  nome: string;
  total_conversas: number;
  finalizadas_total: number;
  finalizadas_hoje: number;
  finalizadas_semana: number;
  em_andamento: number;
  pendentes: number;
  total_nao_lidas: number;
  tempo_medio_resposta_minutos: number | null;
  total_mensagens_enviadas: number;
}

export interface DashboardMetrics {
  totalConversas: number;
  conversasHoje: number;
  conversasSemana: number;
  finalizadasHoje: number;
  finalizadasSemana: number;
  tempoMedioGeralMinutos: number | null;
  atendenteRanking: AtendenteMetrics[];
}

export function useWhatsappDashboard(allowedInstanceIds?: string[]) {
  return useQuery({
    queryKey: ['whatsapp-dashboard-metrics', allowedInstanceIds],
    queryFn: async (): Promise<DashboardMetrics> => {
      // Buscar conversas com campos mínimos necessários
      let query = supabase
        .from('whatsapp_conversations')
        .select('id, status, assigned_to, unread_count, last_message_at, created_at, instance_id');
      
      if (allowedInstanceIds && allowedInstanceIds.length > 0) {
        query = query.in('instance_id', allowedInstanceIds);
      }
      
      const { data: atendenteData, error: atendenteError } = await query;
      if (atendenteError) throw atendenteError;

      // Buscar perfis apenas dos atendentes que têm conversas
      const assignedIds = [...new Set(atendenteData.filter(c => c.assigned_to).map(c => c.assigned_to!))];
      
      let profileMap = new Map<string, string>();
      if (assignedIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', assignedIds);
        if (profiles) {
          profileMap = new Map(profiles.map(p => [p.id, p.nome]));
        }
      }

      // Calcular datas
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(hoje.getDate() - hoje.getDay());

      // Contar mensagens enviadas por atendente usando COUNT agrupado por conversation
      // Em vez de buscar TODAS as mensagens, contamos por conversa atribuída
      const conversationAssignMap = new Map(
        atendenteData
          .filter(c => c.assigned_to)
          .map(c => [c.id, c.assigned_to!])
      );

      // Buscar contagem de mensagens enviadas por conversa (apenas conversas com atendente)
      const conversationIds = [...conversationAssignMap.keys()];
      const mensagensPorAtendente = new Map<string, number>();
      
      if (conversationIds.length > 0) {
        // Buscar em lotes para evitar query muito grande
        for (let i = 0; i < conversationIds.length; i += 200) {
          const batch = conversationIds.slice(i, i + 200);
          const { count } = await supabase
            .from('whatsapp_messages')
            .select('conversation_id', { count: 'exact', head: false })
            .eq('from_me', true)
            .in('conversation_id', batch);
          
          // Como não podemos agrupar com o SDK, fazemos uma abordagem mais eficiente:
          // Contar total por atendente usando head: true por atendente
        }
        
        // Abordagem simplificada: contar por atendente diretamente
        for (const atendenteId of assignedIds) {
          const convIds = atendenteData
            .filter(c => c.assigned_to === atendenteId)
            .map(c => c.id);
          
          if (convIds.length > 0) {
            const { count } = await supabase
              .from('whatsapp_messages')
              .select('*', { count: 'exact', head: true })
              .eq('from_me', true)
              .in('conversation_id', convIds);
            
            mensagensPorAtendente.set(atendenteId, count || 0);
          }
        }
      }

      // Agregar por atendente
      const atendenteMap = new Map<string, AtendenteMetrics>();

      atendenteData.forEach(conv => {
        if (!conv.assigned_to) return;

        if (!atendenteMap.has(conv.assigned_to)) {
          atendenteMap.set(conv.assigned_to, {
            id: conv.assigned_to,
            nome: profileMap.get(conv.assigned_to) || 'Desconhecido',
            total_conversas: 0,
            finalizadas_total: 0,
            finalizadas_hoje: 0,
            finalizadas_semana: 0,
            em_andamento: 0,
            pendentes: 0,
            total_nao_lidas: 0,
            tempo_medio_resposta_minutos: null,
            total_mensagens_enviadas: mensagensPorAtendente.get(conv.assigned_to) || 0
          });
        }

        const metrics = atendenteMap.get(conv.assigned_to)!;
        metrics.total_conversas++;
        metrics.total_nao_lidas += conv.unread_count || 0;

        if (conv.status === 'finished') {
          metrics.finalizadas_total++;
          const lastMessage = new Date(conv.last_message_at);
          if (lastMessage >= hoje) metrics.finalizadas_hoje++;
          if (lastMessage >= inicioSemana) metrics.finalizadas_semana++;
        } else if (conv.status === 'in_progress') {
          metrics.em_andamento++;
        } else {
          metrics.pendentes++;
        }
      });

      const atendenteRanking = Array.from(atendenteMap.values())
        .sort((a, b) => b.finalizadas_total - a.finalizadas_total);

      const totalConversas = atendenteData.length;
      const conversasHoje = atendenteData.filter(c => new Date(c.created_at) >= hoje).length;
      const conversasSemana = atendenteData.filter(c => new Date(c.created_at) >= inicioSemana).length;
      const finalizadasHoje = atendenteData.filter(c => 
        c.status === 'finished' && new Date(c.last_message_at) >= hoje
      ).length;
      const finalizadasSemana = atendenteData.filter(c => 
        c.status === 'finished' && new Date(c.last_message_at) >= inicioSemana
      ).length;

      return {
        totalConversas,
        conversasHoje,
        conversasSemana,
        finalizadasHoje,
        finalizadasSemana,
        tempoMedioGeralMinutos: null,
        atendenteRanking
      };
    },
    staleTime: 60000,
    refetchInterval: 120000 // 2 minutos em vez de 30s
  });
}
