import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { StatusPagamento, StatusPedido } from './usePedidos';

interface PedidoListFilters {
  status?: StatusPedido | StatusPedido[];
  statusPagamento?: StatusPagamento | string[];
  clienteId?: string;
  vendedorId?: string;
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  pageSize?: number;
  includeValues?: boolean;
}

export const usePedidos = (filters?: PedidoListFilters) => {
  return useQuery({
    queryKey: ['pedidos', filters],
    queryFn: async () => {
      const buscaClean = filters?.busca?.trim() || '';
      const buscaLike = `%${buscaClean}%`;
      const page = filters?.page || 0;
      const pageSize = filters?.pageSize || 20;
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const includeValues = filters?.includeValues ?? true;
      const selectFields = `
        id,
        numero_pedido,
        data_pedido,
        data_entrega,
        status,
        status_pagamento,
        vendedor_id,
        cliente_id,
        etapa_producao_id,
        observacao,
        requer_aprovacao_preco,
        imagem_aprovacao_url,
        imagem_aprovada,
        ${includeValues ? 'valor_total,' : ''}
        cliente:clientes(id, nome_razao_social, telefone, whatsapp),
        vendedor:profiles(id, nome),
        etapa_producao:etapa_producao(id, nome_etapa, cor_hex),
        itens:pedido_itens(id, foto_modelo_url, nome_customizado, produto:produtos(id, nome))
      `;

      let query = supabase
        .from('pedidos')
        .select(selectFields, { count: 'exact' });

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
        if (includeValues) {
          query = query.gt('valor_total', 0);
        }
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

      if (buscaClean) {
        const matchedPedidoIds = new Set<string>();
        const buscaNumero = Number(buscaClean);
        const buscaEhNumeroInteiro = /^\d+$/.test(buscaClean) && Number.isFinite(buscaNumero);

        if (buscaEhNumeroInteiro) {
          const { data: pedidosPorNumero, error: pedidosNumeroError } = await supabase
            .from('pedidos')
            .select('id')
            .eq('numero_pedido', buscaNumero);

          if (pedidosNumeroError) throw pedidosNumeroError;
          pedidosPorNumero?.forEach((pedido) => matchedPedidoIds.add(pedido.id));
        }

        const { data: clientesEncontrados, error: clientesError } = await supabase
          .from('clientes')
          .select('id')
          .or(`nome_razao_social.ilike.${buscaLike},telefone.ilike.${buscaLike},whatsapp.ilike.${buscaLike}`);

        if (clientesError) throw clientesError;

        const clienteIds = (clientesEncontrados || []).map((cliente) => cliente.id);

        if (clienteIds.length > 0) {
          const { data: pedidosPorCliente, error: pedidosClienteError } = await supabase
            .from('pedidos')
            .select('id')
            .in('cliente_id', clienteIds);

          if (pedidosClienteError) throw pedidosClienteError;
          pedidosPorCliente?.forEach((pedido) => matchedPedidoIds.add(pedido.id));
        }

        const pedidoIds = Array.from(matchedPedidoIds);

        if (pedidoIds.length === 0) {
          return {
            data: [],
            totalCount: 0,
          };
        }

        query = query.in('id', pedidoIds);
      }

      const { data, error, count } = await query
        .order('numero_pedido', { ascending: false })
        .order('data_pedido', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        data: data || [],
        totalCount: count || 0,
      };
    },
  });
};
