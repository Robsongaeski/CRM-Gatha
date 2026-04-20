import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { sanitizeError } from '@/lib/errorHandling';

export type StatusPedido = 'rascunho' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado';
export type StatusPagamento = 'aguardando' | 'parcial' | 'quitado';
export type FormaPagamento = 'pix' | 'cartao' | 'boleto' | 'dinheiro';

export interface PedidoItemGrade {
  codigo: string;
  nome: string;
  quantidade: number;
}

export interface DetalheItem {
  tipo_detalhe: string;
  valor: string;
}

export interface PedidoItem {
  id?: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  valor_total?: number;
  observacoes?: string;
  foto_modelo_url?: string;
  tipo_estampa_id?: string;
  grades?: PedidoItemGrade[];
  detalhes?: DetalheItem[];
}

export interface PedidoFormData {
  data_pedido?: string;
  cliente_id: string;
  data_entrega?: string;
  observacao?: string;
  caminho_arquivos?: string;
  desconto_percentual?: number;
  desconto_aguardando_aprovacao?: boolean;
  status: StatusPedido;
  itens: PedidoItem[];
}

async function resolveEtapaInicialProducaoId(): Promise<string | null> {
  try {
    const { data: etapaInicial, error: inicialError } = await supabase
      .from('etapa_producao')
      .select('id')
      .eq('ativa', true)
      .eq('tipo_etapa', 'inicial')
      .order('ordem', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (inicialError) throw inicialError;
    if (etapaInicial?.id) return etapaInicial.id;

    const { data: etapaFallback, error: fallbackError } = await supabase
      .from('etapa_producao')
      .select('id')
      .eq('ativa', true)
      .neq('tipo_etapa', 'aprovacao_arte')
      .order('ordem', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fallbackError) throw fallbackError;
    return etapaFallback?.id ?? null;
  } catch (error) {
    console.error('Erro ao buscar etapa inicial de producao:', error);
    return null;
  }
}

// Buscar lista de pedidos com filtros
export const usePedidos = (filters?: {
  status?: StatusPedido | StatusPedido[];
  statusPagamento?: StatusPagamento | string[];
  clienteId?: string;
  vendedorId?: string;
  busca?: string; // Busca por número do pedido ou nome do cliente
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  pageSize?: number;
}) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['pedidos', filters],
    queryFn: async () => {
      let query = supabase
        .from('pedidos')
        .select(`
          *,
          imagem_aprovacao_url,
          imagem_aprovada,
          cliente:clientes(id, nome_razao_social, telefone, whatsapp),
          vendedor:profiles(id, nome),
          etapa_producao:etapa_producao(id, nome_etapa, cor_hex),
          itens:pedido_itens(id, foto_modelo_url, produto:produtos(id, nome))
        `, { count: 'exact' });

      const page = filters?.page || 0;
      const pageSize = filters?.pageSize || 20;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status as StatusPedido[]);
        } else {
          query = query.eq('status', filters.status);
        }
      }
      if (filters?.statusPagamento) {
        if (Array.isArray(filters.statusPagamento)) {
          query = query.in('status_pagamento', filters.statusPagamento as StatusPagamento[]);
        } else {
          query = query.eq('status_pagamento', filters.statusPagamento);
        }
        // Excluir pedidos com valor zero ao filtrar por status de pagamento
        query = query.gt('valor_total', 0);
      }
      if (filters?.clienteId) {
        query = query.eq('cliente_id', filters.clienteId);
      }
      if (filters?.vendedorId) {
        query = query.eq('vendedor_id', filters.vendedorId);
      }
      if (filters?.dataInicio) {
        query = query.gte('data_pedido', `${filters.dataInicio}T00:00:00`);
      }
      if (filters?.dataFim) {
        const dataFimDate = new Date(filters.dataFim);
        dataFimDate.setDate(dataFimDate.getDate() + 1);
        const dataFimFormatada = dataFimDate.toISOString().split('T')[0];
        query = query.lt('data_pedido', `${dataFimFormatada}T00:00:00`);
      }

      // Busca no servidor (Filtro por número do pedido ou nome do cliente)
      if (filters?.busca) {
        const buscaClean = filters.busca.trim();
        const buscaNumero = parseInt(buscaClean);
        const buscaLike = `%${buscaClean}%`;
        
        if (!isNaN(buscaNumero)) {
          // Busca exata pelo número OU parcial pelo nome do cliente
          query = query.or(`numero_pedido.eq.${buscaNumero},cliente_nome_razao_social_temp.ilike.${buscaLike}`);
        } else {
          query = query.ilike('clientes.nome_razao_social', buscaLike);
        }
      }

      const { data, error, count } = await query
        .order('numero_pedido', { ascending: false })
        .order('data_pedido', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      return {
        data: data || [],
        totalCount: count || 0
      };
    },
  });
};

// Buscar pedido específico
export const usePedido = (id?: string) => {
  return useQuery({
    queryKey: ['pedido', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(*),
          vendedor:profiles(*),
          etapa_producao:etapa_producao(id, nome_etapa, cor_hex),
          itens:pedido_itens(
            *,
            produto:produtos(*),
            tipo_estampa:tipo_estampa(id, nome_tipo_estampa),
            detalhes:pedido_item_detalhes(*),
            grades:pedido_item_grades(*)
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

// Criar novo pedido
export const useCreatePedido = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: PedidoFormData) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { itens, ...pedidoData } = formData;
      const etapaInicialProducaoId =
        pedidoData.status === 'em_producao' ? await resolveEtapaInicialProducaoId() : null;

      // Corrigir datas: enviar com T12:00:00 para evitar shift de timezone
      const pedidoPayload = {
        ...pedidoData,
        data_pedido: pedidoData.data_pedido ? `${pedidoData.data_pedido}T12:00:00` : undefined,
        data_entrega: pedidoData.data_entrega ? `${pedidoData.data_entrega}T12:00:00` : undefined,
        vendedor_id: user.id,
        ...(etapaInicialProducaoId ? { etapa_producao_id: etapaInicialProducaoId } : {}),
      };

      // Inserir o pedido
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert(pedidoPayload)
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Inserir os itens
      const itensComPedidoId = itens.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        observacoes: item.observacoes || null,
        foto_modelo_url: item.foto_modelo_url || null,
        tipo_estampa_id: item.tipo_estampa_id || null, // Converter string vazia para null
      }));

      const { data: itensData, error: itensError } = await supabase
        .from('pedido_itens')
        .insert(itensComPedidoId)
        .select();

      if (itensError) throw itensError;

      // Inserir grades de tamanhos e detalhes se houver
      for (let i = 0; i < itens.length; i++) {
        const item = itens[i];
        const itemData = itensData?.[i];
        
        if (itemData) {
          // Grades
          if (item.grades && item.grades.length > 0) {
            const { error: gradesError } = await supabase
              .from('pedido_item_grades')
              .insert(
                item.grades.map((grade) => ({
                  pedido_item_id: itemData.id,
                  tamanho_codigo: grade.codigo,
                  tamanho_nome: grade.nome,
                  quantidade: grade.quantidade,
                }))
              );

            if (gradesError) throw gradesError;
          }

          // Detalhes
          if (item.detalhes && item.detalhes.length > 0) {
            const { error: detalhesError } = await supabase
              .from('pedido_item_detalhes')
              .insert(
                item.detalhes.map((detalhe) => ({
                  pedido_item_id: itemData.id,
                  tipo_detalhe: detalhe.tipo_detalhe,
                  valor: detalhe.valor,
                }))
              );

            if (detalhesError) throw detalhesError;
          }
        }
      }

      // Calcular valor total dos itens
      const valorTotal = itens.reduce((sum, item) => 
        sum + (item.quantidade * item.valor_unitario), 0
      );

      // Pagamento não é mais criado automaticamente
      // Vendedor deve lançar manualmente os pagamentos

      return pedido;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast({
        title: 'Sucesso',
        description: 'Pedido criado com sucesso!',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao criar pedido',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
};

// Atualizar pedido
export const useUpdatePedido = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: PedidoFormData) => {
      // Validar permissao de edicao
      const { data: userResponse } = await supabase.auth.getUser();
      if (!userResponse.user) throw new Error('Usuario nao autenticado');

      const isMasterAdmin = userResponse.user.email?.toLowerCase() === 'robsongaeski@gmail.com';

      // Tenta usar a RPC principal; se nao existir, aplica fallback robusto
      let podeEditar = isMasterAdmin;
      const permRes = isMasterAdmin
        ? ({ data: true, error: null } as any)
        : await supabase.rpc('pode_editar_pedido' as any, {
            p_pedido_id: id,
            p_usuario_id: userResponse.user.id,
          });

      if (permRes.error) {
        // Fallback robusto para QUALQUER erro na RPC
        console.warn('RPC pode_editar_pedido falhou, aplicando fallback:', permRes.error);

        // 1) Admin pode sempre editar
        try {
          const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin' as any, {
            _user_id: userResponse.user.id,
          });

          if (!adminError && isAdmin) {
            podeEditar = true;
          } else {
            // 1.5) Permissao granular de edicao total
            const { data: podeEditarTodos, error: permError } = await supabase.rpc('has_permission' as any, {
              _user_id: userResponse.user.id,
              _permission_id: 'pedidos.editar_todos',
            });

            if (!permError && podeEditarTodos) {
              podeEditar = true;
            } else {
              // 2) Nao-admin: verificar se tem pagamento aprovado
              const { data: pagamentosAprovados, error: pagError } = await supabase
                .from('pagamentos')
                .select('id')
                .eq('pedido_id', id)
                .eq('status', 'aprovado')
                .eq('estornado', false)
                .limit(1);

              if (pagError) {
                console.error('Erro ao verificar pagamentos:', pagError);
                podeEditar = false;
              } else {
                // Pode editar se NAO tiver pagamento aprovado
                podeEditar = !pagamentosAprovados || pagamentosAprovados.length === 0;
              }
            }
          }
        } catch (e) {
          console.error('Erro no fallback:', e);
          podeEditar = false;
        }
      } else {
        podeEditar = permRes.data || false;
      }

      if (!podeEditar) {
        throw new Error('Este pedido possui pagamentos aprovados e nao pode ser editado. Apenas administradores podem editar pedidos com pagamentos.');
      }

      const { itens, ...pedidoData } = formData;

      // Preservar vendedor atual para evitar limpeza indevida ao salvar
      const { data: pedidoMeta, error: pedidoMetaError } = await supabase
        .from('pedidos')
        .select('vendedor_id, etapa_producao_id, status')
        .eq('id', id)
        .single();

      if (pedidoMetaError) throw pedidoMetaError;

      let etapaProducaoIdForcada: string | null = null;
      if (pedidoData.status === 'em_producao') {
        let etapaAtualTipo: string | null = null;

        if (pedidoMeta?.etapa_producao_id) {
          const { data: etapaAtual } = await supabase
            .from('etapa_producao')
            .select('tipo_etapa')
            .eq('id', pedidoMeta.etapa_producao_id)
            .maybeSingle();

          etapaAtualTipo = etapaAtual?.tipo_etapa ?? null;
        }

        const precisaNormalizarEtapa =
          !pedidoMeta?.etapa_producao_id || etapaAtualTipo === 'aprovacao_arte';

        if (precisaNormalizarEtapa) {
          etapaProducaoIdForcada = await resolveEtapaInicialProducaoId();
        }
      }

      // Corrigir datas: enviar com T12:00:00 para evitar shift de timezone
      const pedidoPayload = {
        ...pedidoData,
        data_pedido: pedidoData.data_pedido ? `${pedidoData.data_pedido}T12:00:00` : undefined,
        data_entrega: pedidoData.data_entrega ? `${pedidoData.data_entrega}T12:00:00` : undefined,
        vendedor_id: pedidoMeta?.vendedor_id,
        ...(etapaProducaoIdForcada ? { etapa_producao_id: etapaProducaoIdForcada } : {}),
      };

      // Atualizar o pedido (triggers SQL registram mudancas automaticamente)
      const { error: pedidoError } = await supabase
        .from('pedidos')
        .update(pedidoPayload)
        .eq('id', id);

      if (pedidoError) throw pedidoError;

      // Sincronizar itens usando ID do item (nao produto_id) para suportar multiplos itens do mesmo produto
      const { data: itensAntigos, error: itensAntigosError } = await supabase
        .from('pedido_itens')
        .select('id, produto_id, quantidade, valor_unitario, observacoes, tipo_estampa_id, foto_modelo_url')
        .eq('pedido_id', id);

      if (itensAntigosError) throw itensAntigosError;

      // Mapear itens antigos por ID
      const antigoPorId = new Map<string, any>((itensAntigos || []).map((i: any) => [i.id, i]));

      // Separar itens existentes (tem id) e novos (nao tem id)
      const itensExistentes = (itens || []).filter((i) => i.id && antigoPorId.has(i.id));
      const itensNovos = (itens || []).filter((i) => !i.id);

      // IDs dos itens que continuam no formulario
      const idsNoFormulario = new Set(itensExistentes.map((i) => i.id!));

      // Itens a remover: estao no banco mas nao no formulario
      const idsParaRemover = (itensAntigos || [])
        .filter((i: any) => !idsNoFormulario.has(i.id))
        .map((i: any) => i.id);

      // Atualizar itens existentes
      for (const item of itensExistentes) {
        const oldItem = antigoPorId.get(item.id!);
        if (!oldItem) continue;

        // Atualizar o item
        await supabase
          .from('pedido_itens')
          .update({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            observacoes: item.observacoes || null,
            foto_modelo_url: item.foto_modelo_url || null,
            tipo_estampa_id: item.tipo_estampa_id || null,
          })
          .eq('id', item.id);

        // Recriar grades
        await supabase.from('pedido_item_grades').delete().eq('pedido_item_id', item.id);

        if (item.grades && item.grades.length > 0) {
          await supabase.from('pedido_item_grades').insert(
            item.grades.map((grade) => ({
              pedido_item_id: item.id,
              tamanho_codigo: grade.codigo,
              tamanho_nome: grade.nome,
              quantidade: grade.quantidade,
            }))
          );
        }

        // Recriar detalhes
        await supabase.from('pedido_item_detalhes').delete().eq('pedido_item_id', item.id);

        if (item.detalhes && item.detalhes.length > 0) {
          await supabase.from('pedido_item_detalhes').insert(
            item.detalhes.map((detalhe) => ({
              pedido_item_id: item.id,
              tipo_detalhe: detalhe.tipo_detalhe,
              valor: detalhe.valor,
            }))
          );
        }
      }

      // Remover itens que nao estao mais no formulario
      if (idsParaRemover.length > 0) {
        await supabase.from('pedido_item_grades').delete().in('pedido_item_id', idsParaRemover);
        await supabase.from('pedido_item_detalhes').delete().in('pedido_item_id', idsParaRemover);

        const { error: deleteError } = await supabase.from('pedido_itens').delete().in('id', idsParaRemover);
        if (deleteError) throw deleteError;
      }

      // Inserir novos itens
      if (itensNovos.length > 0) {
        const itensParaInserir = itensNovos.map((item) => ({
          pedido_id: id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          observacoes: item.observacoes || null,
          foto_modelo_url: item.foto_modelo_url || null,
          tipo_estampa_id: item.tipo_estampa_id || null,
        }));

        const { data: novosItensData, error: insertError } = await supabase
          .from('pedido_itens')
          .insert(itensParaInserir)
          .select();
        if (insertError) throw insertError;

        // Inserir grades e detalhes dos novos itens
        for (let i = 0; i < itensNovos.length; i++) {
          const item = itensNovos[i];
          const itemData = novosItensData?.[i];

          if (itemData) {
            if (item.grades && item.grades.length > 0) {
              await supabase.from('pedido_item_grades').insert(
                item.grades.map((grade) => ({
                  pedido_item_id: itemData.id,
                  tamanho_codigo: grade.codigo,
                  tamanho_nome: grade.nome,
                  quantidade: grade.quantidade,
                }))
              );
            }

            if (item.detalhes && item.detalhes.length > 0) {
              await supabase.from('pedido_item_detalhes').insert(
                item.detalhes.map((detalhe) => ({
                  pedido_item_id: itemData.id,
                  tipo_detalhe: detalhe.tipo_detalhe,
                  valor: detalhe.valor,
                }))
              );
            }
          }
        }
      }

      // ===== VERIFICACAO AUTOMATICA DE PRECOS APOS EDICAO =====
      // Buscar se o pedido tinha flag de aprovacao
      const { data: pedidoAtual } = await supabase
        .from('pedidos')
        .select('requer_aprovacao_preco, desconto_percentual')
        .eq('id', id)
        .single();

      if (pedidoAtual?.requer_aprovacao_preco) {
        // Verificar se todos os precos estao dentro da faixa agora
        let todosOk = true;
        const descontoAtual = Number(
          (pedidoData as any).desconto_percentual ?? pedidoAtual.desconto_percentual ?? 0
        );
        const descontoDentroLimite = descontoAtual <= 3;

        for (const item of itens || []) {
          const { data: faixaData } = await supabase.rpc('buscar_faixa_preco', {
            p_produto_id: item.produto_id,
            p_quantidade: item.quantidade,
          });

          if (faixaData && faixaData.length > 0) {
            const faixa = faixaData[0];
            const precoMin = Number(faixa.preco_minimo);
            const valor = Number(item.valor_unitario);

            if (valor < precoMin) {
              todosOk = false;
              break;
            }
          }
        }

        // Se todos os precos estao OK e desconto dentro do limite, remover flag e aprovar automaticamente
        if (todosOk && descontoDentroLimite) {
          await supabase
            .from('pedidos')
            .update({ requer_aprovacao_preco: false, desconto_aguardando_aprovacao: false })
            .eq('id', id);

          // Buscar solicitacao pendente e aprovar automaticamente
          const { data: solicitacaoPendente } = await supabase
            .from('pedidos_aprovacao')
            .select('id')
            .eq('pedido_id', id)
            .eq('status', 'pendente')
            .maybeSingle();

          if (solicitacaoPendente) {
            await supabase
              .from('pedidos_aprovacao')
              .update({
                status: 'aprovado',
                observacao_admin: 'Aprovado automaticamente apos correcao dos precos pelo vendedor.',
                analisado_por: userResponse.user.id,
                data_analise: new Date().toISOString(),
              })
              .eq('id', solicitacaoPendente.id);

            // Adicionar observacao no pedido
            const { data: pedidoObs } = await supabase
              .from('pedidos')
              .select('observacao')
              .eq('id', id)
              .single();

            const obsAtual = pedidoObs?.observacao || '';
            const novaObs = obsAtual
              ? `${obsAtual}\n\nPrecos corrigidos pelo vendedor. Aprovacao automatica concedida.`
              : 'Precos corrigidos pelo vendedor. Aprovacao automatica concedida.';

            await supabase.from('pedidos').update({ observacao: novaObs }).eq('id', id);
          }

          toast({
            title: 'Politica comercial regularizada!',
            description:
              'Precos e desconto estao dentro da politica permitida. A solicitacao de aprovacao foi removida automaticamente.',
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido', id] });
      queryClient.invalidateQueries({ queryKey: ['pedido-historico', id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-aprovacao-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-aprovacao'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-geral'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-vendedor'] });
      toast({
        title: 'Sucesso',
        description: 'Pedido atualizado com sucesso!',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar pedido',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
};

// Deletar pedido
export const useDeletePedido = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Validar permissão de exclusão (apenas admin)
      const { data: userResponse } = await supabase.auth.getUser();
      if (!userResponse.user) throw new Error('Usuário não autenticado');

      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin' as any, {
        _user_id: userResponse.user.id
      });

      if (adminError) throw adminError;
      if (!isAdmin) {
        throw new Error('Apenas administradores podem excluir pedidos.');
      }

      const { error } = await supabase.from('pedidos').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      toast({
        title: 'Sucesso',
        description: 'Pedido deletado com sucesso!',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao excluir pedido',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
};

