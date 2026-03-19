import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatusPedido } from './usePedidos';

export interface FiltrosEntrega {
  cliente?: string;
  vendedor?: string;
  status?: StatusPedido[];
  periodo?: '1dia' | '14dias' | '30dias' | 'maximo';
  mostrarEntregues: boolean;
}

export const useEntregaPedidos = (filtros: FiltrosEntrega) => {
  return useQuery({
    queryKey: ['entrega-pedidos', filtros],
    queryFn: async () => {
      let query = supabase
        .from('pedidos')
        .select(`
          *,
          cliente:clientes(id, nome_razao_social, telefone, whatsapp),
          vendedor:profiles(id, nome)
        `)
        .order('data_entrega', { ascending: true, nullsFirst: false })
        .order('data_pedido', { ascending: false });

      // Filtrar pedidos entregues se necessário
      if (!filtros.mostrarEntregues) {
        query = query.neq('status', 'entregue');
      }
      
      // Filtrar por status específicos
      if (filtros.status && filtros.status.length > 0) {
        query = query.in('status', filtros.status);
      }
      
      // Filtrar por cliente
      if (filtros.cliente) {
        query = query.eq('cliente_id', filtros.cliente);
      }
      
      // Filtrar por vendedor
      if (filtros.vendedor) {
        query = query.eq('vendedor_id', filtros.vendedor);
      }
      
      // Filtrar por período
      if (filtros.periodo && filtros.periodo !== 'maximo') {
        const hoje = new Date();
        let dataInicio: Date;
        
        switch (filtros.periodo) {
          case '1dia':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 1));
            break;
          case '14dias':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 14));
            break;
          case '30dias':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 30));
            break;
          default:
            dataInicio = new Date(0);
        }
        
        query = query.gte('data_pedido', dataInicio.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
};

export const calcularStatusEntrega = (dataEntrega: string | null) => {
  if (!dataEntrega) return { 
    status: 'sem_data', 
    cor: 'text-muted-foreground', 
    bgCor: 'bg-muted',
    texto: 'Sem data definida' 
  };
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const entrega = new Date(dataEntrega);
  entrega.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((entrega.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDias < 0) return { 
    status: 'atrasado', 
    cor: 'text-destructive', 
    bgCor: 'bg-destructive/10',
    texto: `Atrasado (${Math.abs(diffDias)} ${Math.abs(diffDias) === 1 ? 'dia' : 'dias'})`
  };
  if (diffDias === 0) return { 
    status: 'hoje', 
    cor: 'text-orange-600', 
    bgCor: 'bg-orange-50',
    texto: 'Entrega hoje!'
  };
  if (diffDias <= 3) return { 
    status: 'proximo', 
    cor: 'text-yellow-700', 
    bgCor: 'bg-yellow-50',
    texto: `Entrega em ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`
  };
  return { 
    status: 'normal', 
    cor: 'text-green-700', 
    bgCor: 'bg-green-50',
    texto: `Entrega em ${diffDias} dias`
  };
};

export const calcularEstatisticas = (pedidos: any[]) => {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  return {
    totalPendentes: pedidos.filter(p => 
      p.status !== 'entregue' && p.status !== 'cancelado'
    ).length,
    
    atrasados: pedidos.filter(p => {
      if (!p.data_entrega || p.status === 'entregue' || p.status === 'cancelado') return false;
      const entrega = new Date(p.data_entrega);
      entrega.setHours(0, 0, 0, 0);
      return entrega < hoje;
    }).length,
    
    pagamentoPendente: pedidos.filter(p => 
      p.status_pagamento !== 'quitado' && 
      p.status !== 'cancelado'
    ).length,
    
    prontosParaEntrega: pedidos.filter(p => 
      p.status === 'pronto'
    ).length,
  };
};
