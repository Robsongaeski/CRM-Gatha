import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

export type StatusPagamento = 'aguardando' | 'aprovado' | 'rejeitado';
export type TipoPagamento = 'entrada' | 'parcial' | 'quitacao' | 'estorno';
export type FormaPagamento = 'pix' | 'cartao' | 'boleto' | 'dinheiro';

export interface Pagamento {
  id: string;
  pedido_id: string;
  tipo: TipoPagamento;
  valor: number;
  forma_pagamento: FormaPagamento;
  data_pagamento: string;
  data_vencimento_boleto?: string;
  comprovante_url?: string;
  observacao?: string;
  status: StatusPagamento;
  aprovado_por?: string;
  data_aprovacao?: string;
  motivo_rejeicao?: string;
  estornado: boolean;
  estornado_por?: string;
  data_estorno?: string;
  motivo_estorno?: string;
  criado_por: string;
  created_at: string;
  updated_at: string;
}

export interface PagamentoFormData {
  pedido_id: string;
  tipo: TipoPagamento;
  valor: number;
  forma_pagamento: FormaPagamento;
  data_pagamento: string;
  data_vencimento_boleto?: string;
  comprovante_url?: string;
  observacao?: string;
}

// Listar pagamentos de um pedido
export function usePagamentos(pedidoId?: string) {
  return useQuery({
    queryKey: ['pagamentos', pedidoId],
    queryFn: async () => {
      if (!pedidoId) return [];

      const { data, error } = await supabase
        .from('pagamentos')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar pagamentos:', error);
        throw error;
      }

      // Buscar criadores separadamente
      const criadorIds = [...new Set(data?.map(p => p.criado_por).filter(Boolean))];
      
      if (criadorIds.length > 0) {
        const { data: criadores } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', criadorIds);

        const criadoresMap = new Map(criadores?.map(c => [c.id, c]) || []);
        
        data.forEach((p: any) => {
          if (p.criado_por) {
            p.criador = criadoresMap.get(p.criado_por);
          }
        });
      }

      return data as Pagamento[];
    },
    enabled: !!pedidoId,
  });
}

// Listar todos os pagamentos pendentes (para financeiro)
export function usePagamentosPendentes() {
  return useQuery({
    queryKey: ['pagamentos-pendentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagamentos')
        .select(`
          *,
          pedidos (
            id,
            numero_pedido,
            data_pedido,
            valor_total,
            observacao,
            data_entrega,
            clientes (
              id,
              nome_razao_social,
              telefone,
              whatsapp,
              email,
              cpf_cnpj,
              endereco
            ),
            vendedor:profiles (id, nome, email)
          )
        `)
        .eq('status', 'aguardando')
        .eq('estornado', false)
        .order('pedido_id', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Buscar criadores separadamente
      const criadorIds = [...new Set(data?.map(p => p.criado_por).filter(Boolean))];
      
      if (criadorIds.length > 0) {
        const { data: criadores } = await supabase
          .from('profiles')
          .select('id, nome, email')
          .in('id', criadorIds);

        const criadoresMap = new Map(criadores?.map(c => [c.id, c]) || []);
        
        data.forEach((p: any) => {
          if (p.criado_por) {
            p.criador = criadoresMap.get(p.criado_por);
          }
        });
      }

      return data;
    },
  });
}

// Listar histórico financeiro completo
export function useHistoricoFinanceiroCompleto() {
  return useQuery({
    queryKey: ['historico-financeiro-completo'],
    queryFn: async () => {
      // 1. Buscar todos os pagamentos
      const { data: pagamentos, error: pagamentosError } = await supabase
        .from('pagamentos')
        .select('*')
        .order('created_at', { ascending: false });

      if (pagamentosError) {
        console.error('Erro ao buscar pagamentos:', pagamentosError);
        throw pagamentosError;
      }

      if (!pagamentos || pagamentos.length === 0) {
        return [];
      }

      // 2. Buscar pedidos únicos
      const pedidoIds = [...new Set(pagamentos.map(p => p.pedido_id))];
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, numero_pedido, valor_total, cliente_id, vendedor_id')
        .in('id', pedidoIds);

      // 3. Buscar clientes únicos
      const clienteIds = [...new Set(pedidos?.map(p => p.cliente_id).filter(Boolean) || [])];
      const { data: clientes } = clienteIds.length > 0 
        ? await supabase
            .from('clientes')
            .select('id, nome_razao_social')
            .in('id', clienteIds)
        : { data: [] };

      // 4. Buscar vendedores únicos
      const vendedorIds = [...new Set(pedidos?.map(p => p.vendedor_id).filter(Boolean) || [])];
      const { data: vendedores } = vendedorIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, nome')
            .in('id', vendedorIds)
        : { data: [] };

      // 5. Buscar criadores dos pagamentos
      const criadorIds = [...new Set(pagamentos.map(p => p.criado_por).filter(Boolean))];
      const { data: criadores } = criadorIds.length > 0
        ? await supabase
            .from('profiles')
            .select('id, nome')
            .in('id', criadorIds)
        : { data: [] };

      // 6. Montar maps para lookup eficiente
      const pedidosMap = new Map(pedidos?.filter(p => p.id).map(p => [p.id, p] as const) || []);
      const clientesMap = new Map(clientes?.filter(c => c.id).map(c => [c.id, c] as const) || []);
      const vendedoresMap = new Map(vendedores?.filter(v => v.id).map(v => [v.id, v] as const) || []);
      const criadoresMap = new Map(criadores?.filter(c => c.id).map(c => [c.id, c] as const) || []);

      // 7. Combinar todos os dados
      return pagamentos.map(pagamento => {
        const pedido = pedidosMap.get(pagamento.pedido_id);
        return {
          ...pagamento,
          pedido: pedido ? {
            ...pedido,
            cliente: pedido.cliente_id ? clientesMap.get(pedido.cliente_id) : null,
            vendedor: pedido.vendedor_id ? vendedoresMap.get(pedido.vendedor_id) : null,
          } : null,
          criador: pagamento.criado_por ? criadoresMap.get(pagamento.criado_por) : null,
        };
      });
    },
  });
}

// Criar novo pagamento
export function useCreatePagamento() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PagamentoFormData) => {
      if (!user) throw new Error('Usuário não autenticado');

      // VALIDAÇÃO: Verificar status do pedido e buscar pagamentos existentes
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .select('status, requer_aprovacao_preco, numero_pedido, valor_total')
        .eq('id', data.pedido_id)
        .single();

      if (pedidoError) throw new Error('Pedido não encontrado');

      // Bloquear se pedido está cancelado
      if (pedido.status === 'cancelado') {
        throw new Error(`Não é possível registrar pagamento. O pedido #${pedido.numero_pedido} está cancelado.`);
      }

      // Bloquear se pedido aguarda aprovação
      if (pedido.requer_aprovacao_preco) {
        throw new Error(`Não é possível registrar pagamento. O pedido #${pedido.numero_pedido} aguarda aprovação de preço.`);
      }

      // NOVA VALIDAÇÃO: Buscar TODOS os pagamentos existentes (pendentes + aprovados, não estornados)
      const { data: pagamentosExistentes } = await supabase
        .from('pagamentos')
        .select('id, valor, status, estornado')
        .eq('pedido_id', data.pedido_id)
        .eq('estornado', false)
        .in('status', ['aguardando', 'aprovado']);

      // Calcular totais
      const totalAprovado = pagamentosExistentes?.filter(p => p.status === 'aprovado')
        .reduce((sum, p) => sum + Number(p.valor), 0) || 0;
      
      const totalPendente = pagamentosExistentes?.filter(p => p.status === 'aguardando')
        .reduce((sum, p) => sum + Number(p.valor), 0) || 0;

      // Saldo real disponível
      const valorPedido = Number(pedido.valor_total);
      const saldoDisponivel = valorPedido - totalAprovado - totalPendente;

      // VALIDAÇÃO 1: Verificar se valor excede saldo disponível
      if (data.valor > saldoDisponivel + 0.01) { // tolerância de 1 centavo
        throw new Error(
          `Valor excede o saldo disponível.\n` +
          `Valor do pedido: R$ ${valorPedido.toFixed(2)}\n` +
          `Já aprovado: R$ ${totalAprovado.toFixed(2)}\n` +
          `Pendente aprovação: R$ ${totalPendente.toFixed(2)}\n` +
          `Saldo disponível: R$ ${saldoDisponivel.toFixed(2)}`
        );
      }

      // VALIDAÇÃO 2: Verificar duplicatas (mesmo valor, status aguardando)
      // EXCEÇÃO: Boletos parcelados podem ter múltiplas parcelas com mesmo valor
      // Só bloquear duplicatas se NÃO for boleto
      if (data.forma_pagamento !== 'boleto') {
        const duplicado = pagamentosExistentes?.find(p => 
          p.status === 'aguardando' && 
          Math.abs(Number(p.valor) - data.valor) < 0.01
        );

        if (duplicado) {
          throw new Error(
            `Já existe um pagamento pendente de R$ ${data.valor.toFixed(2)} para este pedido.\n` +
            `Aguarde a aprovação ou rejeição antes de registrar outro.`
          );
        }
      }

      const { data: pagamento, error } = await supabase
        .from('pagamentos')
        .insert([{
          pedido_id: data.pedido_id,
          tipo: data.tipo,
          valor: data.valor,
          forma_pagamento: data.forma_pagamento,
          data_pagamento: data.data_pagamento,
          data_vencimento_boleto: data.data_vencimento_boleto || null,
          comprovante_url: data.comprovante_url,
          observacao: data.observacao,
          criado_por: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return pagamento;
    },
    onSuccess: (_, variables) => {
      toast.success('Pagamento registrado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['pagamentos', variables.pedido_id] });
      queryClient.invalidateQueries({ queryKey: ['pagamentos-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['historico-financeiro'] });
      queryClient.invalidateQueries({ queryKey: ['pedido', variables.pedido_id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });
}

// Aprovar pagamento
export function useAprovarPagamento() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, observacao }: { id: string; observacao?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!can('pagamentos.aprovar')) throw new Error('Você não tem permissão para aprovar pagamentos');

      // NOVA VALIDAÇÃO: Buscar dados do pagamento e pedido
      const { data: pagamento, error: pagamentoError } = await supabase
        .from('pagamentos')
        .select('*, pedidos(valor_total, numero_pedido)')
        .eq('id', id)
        .single();

      if (pagamentoError || !pagamento) throw new Error('Pagamento não encontrado');

      // VALIDAÇÃO 1: Verificar se já está aprovado (prevenir dupla aprovação)
      if (pagamento.status === 'aprovado') {
        throw new Error('Este pagamento já foi aprovado anteriormente.');
      }

      // VALIDAÇÃO 2: Verificar se foi estornado
      if (pagamento.estornado) {
        throw new Error('Este pagamento foi estornado e não pode ser aprovado.');
      }

      // VALIDAÇÃO 3: Verificar se foi rejeitado
      if (pagamento.status === 'rejeitado') {
        throw new Error('Este pagamento foi rejeitado e não pode ser aprovado.');
      }

      // VALIDAÇÃO 4: Calcular total já aprovado
      const { data: pagamentosAprovados } = await supabase
        .from('pagamentos')
        .select('valor')
        .eq('pedido_id', pagamento.pedido_id)
        .eq('status', 'aprovado')
        .eq('estornado', false);

      const totalJaAprovado = pagamentosAprovados?.reduce((sum, p) => sum + Number(p.valor), 0) || 0;
      const novoTotal = totalJaAprovado + Number(pagamento.valor);
      const valorPedido = Number(pagamento.pedidos.valor_total);

      // VALIDAÇÃO 5: Verificar se aprovação excederia o valor do pedido
      if (novoTotal > valorPedido + 0.01) { // tolerância de 1 centavo
        throw new Error(
          `Não é possível aprovar este pagamento.\n` +
          `Valor do pedido: R$ ${valorPedido.toFixed(2)}\n` +
          `Já aprovado: R$ ${totalJaAprovado.toFixed(2)}\n` +
          `Este pagamento: R$ ${Number(pagamento.valor).toFixed(2)}\n` +
          `Total excederia em R$ ${(novoTotal - valorPedido).toFixed(2)}`
        );
      }

      const { data, error } = await supabase
        .from('pagamentos')
        .update({
          status: 'aprovado',
          aprovado_por: user.id,
          data_aprovacao: new Date().toISOString(),
          observacao: observacao || null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, variables) => {
      toast.success('Pagamento aprovado com sucesso');
      
      // Buscar o pagamento aprovado com dados do pedido
      const { data: pagamento } = await supabase
        .from('pagamentos')
        .select('*, pedidos(*)')
        .eq('id', variables.id)
        .single();
      
      if (pagamento) {
        // Buscar pagamento de quitação automático pendente
        const { data: pagamentoQuitacao } = await supabase
          .from('pagamentos')
          .select('id, valor')
          .eq('pedido_id', pagamento.pedido_id)
          .eq('tipo', 'quitacao')
          .eq('status', 'aguardando')
          .eq('observacao', 'Pagamento gerado automaticamente ao criar o pedido')
          .maybeSingle();
        
        if (pagamentoQuitacao) {
          // Calcular valor já pago (incluindo o que acabou de aprovar)
          const { data: pagamentosAprovados } = await supabase
            .from('pagamentos')
            .select('valor')
            .eq('pedido_id', pagamento.pedido_id)
            .eq('status', 'aprovado')
            .eq('estornado', false);
          
          const valorPago = pagamentosAprovados?.reduce((sum, p) => sum + Number(p.valor), 0) || 0;
          const valorRestante = Number(pagamento.pedidos.valor_total) - valorPago;
          
          if (valorRestante <= 0) {
            // Deletar pagamento de quitação se já está tudo pago
            await supabase
              .from('pagamentos')
              .delete()
              .eq('id', pagamentoQuitacao.id);
          } else {
            // Atualizar valor do pagamento de quitação
            await supabase
              .from('pagamentos')
              .update({ valor: valorRestante })
              .eq('id', pagamentoQuitacao.id);
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['pagamentos-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['historico-financeiro'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      // Invalidar comissões após aprovar pagamento
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-comissao'] });
      queryClient.invalidateQueries({ queryKey: ['relatorio-comissoes'] });
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });
}

// Rejeitar pagamento
export function useRejeitarPagamento() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!can('pagamentos.rejeitar')) throw new Error('Você não tem permissão para rejeitar pagamentos');

      const { data, error } = await supabase
        .from('pagamentos')
        .update({
          status: 'rejeitado',
          aprovado_por: user.id,
          data_aprovacao: new Date().toISOString(),
          motivo_rejeicao: motivo,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Pagamento rejeitado');
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['pagamentos-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['historico-financeiro'] });
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });
}

// Estornar pagamento
export function useEstornarPagamento() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      if (!can('pagamentos.estornar')) throw new Error('Você não tem permissão para estornar pagamentos');

      const { data, error } = await supabase
        .from('pagamentos')
        .update({
          estornado: true,
          estornado_por: user.id,
          data_estorno: new Date().toISOString(),
          motivo_estorno: motivo,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Pagamento estornado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['pagamentos'] });
      queryClient.invalidateQueries({ queryKey: ['pagamentos-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['historico-financeiro'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      // Invalidar comissões após estorno
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-comissao'] });
      queryClient.invalidateQueries({ queryKey: ['relatorio-comissoes'] });
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });
}

// Upload de comprovante
export function useUploadComprovante() {
  return useMutation({
    mutationFn: async ({ file, pedidoId }: { file: File; pedidoId: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${pedidoId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('comprovantes-pagamento')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('comprovantes-pagamento')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });
}
