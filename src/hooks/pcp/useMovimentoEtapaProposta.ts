import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeError } from '@/lib/errorHandling';

interface MoverPropostaParams {
  propostaId: string;
  etapaNovaId: string;
  etapaAnteriorId: string | null;
  observacao?: string;
}

export function useMovimentoEtapaProposta() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const moverPropostaMutation = useMutation({
    mutationFn: async ({ propostaId, etapaNovaId, etapaAnteriorId, observacao }: MoverPropostaParams) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar informações da nova etapa
      const { data: etapa, error: etapaError } = await supabase
        .from('etapa_producao')
        .select('nome_etapa, tipo_etapa')
        .eq('id', etapaNovaId)
        .single();

      if (etapaError) throw etapaError;

      // Buscar informações da etapa anterior para verificar se saiu de Revisão
      let saiuDeRevisao = false;
      if (etapaAnteriorId) {
        const { data: etapaAnterior } = await supabase
          .from('etapa_producao')
          .select('nome_etapa')
          .eq('id', etapaAnteriorId)
          .single();
        
        saiuDeRevisao = etapaAnterior?.nome_etapa === 'Revisão';
      }

      // 1. Atualizar etapa de aprovação da proposta
      const { data: updatedProposta, error: updateError } = await supabase
        .from('propostas')
        .update({ etapa_aprovacao_id: etapaNovaId })
        .eq('id', propostaId)
        .select('id')
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updatedProposta) {
        throw new Error('Voce nao tem permissao para mover esta proposta.');
      }

      // 2. Registrar movimento
      const { error: movimentoError } = await supabase
        .from('movimento_etapa_proposta')
        .insert({
          proposta_id: propostaId,
          etapa_anterior_id: etapaAnteriorId,
          etapa_nova_id: etapaNovaId,
          usuario_id: user.id,
          observacao,
        });

      if (movimentoError) throw movimentoError;

      // 3. Se saiu de "Revisão" para "Layout Criado", adicionar tag "Revisão"
      if (saiuDeRevisao && etapa?.nome_etapa === 'Layout Criado') {
        await supabase
          .from('proposta_tags')
          .insert({
            proposta_id: propostaId,
            nome: 'Revisão',
            cor: '#ef4444',
          });
      }

      // 4. Enviar notificações
      await enviarNotificacoes(propostaId, etapa?.nome_etapa || '', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
      toast.success('Proposta movida com sucesso');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    moverProposta: moverPropostaMutation.mutateAsync,
    isMoving: moverPropostaMutation.isPending,
  };
}

async function enviarNotificacoes(propostaId: string, nomeEtapaNova: string, usuarioAtualId: string) {
  try {
    // Buscar dados da proposta
    const { data: proposta, error: propostaError } = await supabase
      .from('propostas')
      .select('vendedor_id, cliente:clientes(nome_razao_social)')
      .eq('id', propostaId)
      .single();

    if (propostaError) throw propostaError;

    const nomeCliente = (proposta.cliente as any)?.nome_razao_social || 'Cliente';

    if (nomeEtapaNova === 'Layout Criado') {
      // Notificar o vendedor que criou a proposta
      if (proposta.vendedor_id && proposta.vendedor_id !== usuarioAtualId) {
        await supabase.from('notificacoes').insert({
          user_id: proposta.vendedor_id,
          tipo: 'proposta_layout_criado',
          mensagem: `Layout da proposta para ${nomeCliente} foi criado e está pronto para aprovação`,
          link: `/pcp/kanban`,
        });
      }
    } else if (nomeEtapaNova === 'Revisão') {
      // Notificar todos os designers (usuários com permissão pcp.kanban.aprovacao.movimentar)
      const { data: usersComPermissao } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          system_profiles!inner(
            profile_permissions!inner(
              permission_id
            )
          )
        `);

      // Filtrar apenas usuários com a permissão de movimentar aprovação
      const designerIds = usersComPermissao
        ?.filter(up => {
          const permissions = (up.system_profiles as any)?.profile_permissions || [];
          return permissions.some((p: any) => 
            p.permission_id === 'pcp.kanban.aprovacao.movimentar' ||
            p.permission_id === 'pcp.kanban.aprovacao.editar'
          );
        })
        .map(up => up.user_id)
        .filter(id => id !== usuarioAtualId) || [];

      // Criar notificações para cada designer
      if (designerIds.length > 0) {
        const notificacoes = designerIds.map(userId => ({
          user_id: userId,
          tipo: 'proposta_revisao',
          mensagem: `Proposta para ${nomeCliente} precisa de revisão no layout`,
          link: `/pcp/kanban`,
        }));

        await supabase.from('notificacoes').insert(notificacoes);
      }
    }
  } catch (error) {
    console.error('Erro ao enviar notificações:', error);
  }
}
