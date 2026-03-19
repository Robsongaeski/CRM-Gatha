import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import { sanitizeError } from '@/lib/errorHandling';

export interface LeadInteracao {
  id: string;
  lead_id: string;
  tipo: 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'outro';
  resultado?: 'sem_resposta' | 'retornar' | 'interessado' | 'nao_interessado' | 'agendado' | 'convertido';
  descricao: string;
  proxima_acao?: string;
  data_proxima_acao?: string;
  created_by: string;
  created_at: string;
  created_by_profile?: { nome: string; };
}

export function useLeadInteracoes(leadId?: string) {
  return useQuery({
    queryKey: ['leads-interacoes', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      // Buscar interações
      const { data: interacoes, error } = await supabase
        .from('leads_interacoes' as any)
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (!interacoes || interacoes.length === 0) return [];
      
      // Buscar nomes dos criadores
      const createdByIds = [...new Set((interacoes as any[]).map(i => i.created_by).filter(Boolean))];
      
      if (createdByIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', createdByIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.id, p.nome]));
        
        return (interacoes as any[]).map(i => ({
          ...i,
          created_by_profile: i.created_by ? { nome: profileMap.get(i.created_by) || 'Usuário' } : null,
        })) as LeadInteracao[];
      }
      
      return interacoes as any as LeadInteracao[];
    },
    enabled: !!leadId,
  });
}

export function useRegistrarInteracao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (interacao: Omit<LeadInteracao, 'id' | 'created_at' | 'created_by_profile' | 'created_by'> & { atualizar_data_retorno?: boolean; data_retorno_lead?: string }) => {
      const { atualizar_data_retorno, data_retorno_lead, ...interacaoData } = interacao;

      const { data, error } = await supabase
        .from('leads_interacoes' as any)
        .insert({
          ...interacaoData,
          created_by: user?.id,
        } as any)
        .select()
        .single();
      
      if (error) throw error;

      // Buscar lead atual para verificar se precisa atribuir vendedor
      const { data: leadAtual } = await supabase
        .from('leads' as any)
        .select('vendedor_id')
        .eq('id', interacao.lead_id)
        .single();

      // Atualizar status do lead baseado no resultado
      let novoStatus = undefined;
      if (interacao.resultado === 'interessado') {
        novoStatus = 'qualificado';
      } else if (interacao.resultado === 'nao_interessado') {
        novoStatus = 'nao_qualificado';
      } else if (interacao.resultado === 'sem_resposta' || interacao.resultado === 'retornar') {
        novoStatus = 'contatando';
      }

      const updateData: any = {};
      if (novoStatus) {
        updateData.status = novoStatus;
      }
      
      // Se o lead não tem vendedor atribuído, atribuir ao usuário que está registrando o contato
      if (leadAtual && !(leadAtual as any).vendedor_id && user?.id) {
        updateData.vendedor_id = user.id;
      }
      
      // Definir data de retorno e resetar lembrete
      if (atualizar_data_retorno && data_retorno_lead) {
        updateData.data_retorno = data_retorno_lead;
        updateData.lembrete_enviado = false;
      }
      
      // Sempre atualizar ultima_interacao para controle de leads sem retorno
      updateData.ultima_interacao = new Date().toISOString();

      if (Object.keys(updateData).length > 0) {
        await supabase
          .from('leads' as any)
          .update(updateData)
          .eq('id', interacao.lead_id);
      }

      // Criar notificação se data de retorno foi definida
      if (atualizar_data_retorno && data_retorno_lead && user?.id) {
        // Buscar dados do lead para a notificação
        const { data: leadData } = await supabase
          .from('leads' as any)
          .select('nome, vendedor_id')
          .eq('id', interacao.lead_id)
          .single();

        if (leadData) {
          const leadInfo = leadData as unknown as { nome: string; vendedor_id?: string };
          const vendedorId = leadInfo.vendedor_id || user.id;
          const dataFormatada = new Date(data_retorno_lead).toLocaleDateString('pt-BR');
          
          await supabase
            .from('notificacoes')
            .insert({
              user_id: vendedorId,
              tipo: 'retorno_lead_agendado',
              mensagem: `Retorno agendado para ${dataFormatada}: ${leadInfo.nome}`,
              link: `/leads/${interacao.lead_id}`,
              lida: false,
            });
        }
      }

      return data as any;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leads-interacoes', variables.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['retornos-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      toast({
        title: 'Contato registrado',
        description: 'Interação salva com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}
