import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategoriasEcommerce, classificarProdutoPorCodigo, CategoriaEcommerce } from './useCategoriasEcommerce';
import { startOfDay, endOfDay, format } from 'date-fns';

interface OrderItem {
  sku: string;
  codigo?: string;
  name: string;
  quantity: number;
  price: number;
  color?: string;
  size?: string;
}

// Cores padrão que indicam camiseta de algodão
const CORES_ALGODAO = [
  'BRANCA', 'BRANCO', 'PRETA', 'PRETO', 'AZUL', 'VERMELHA', 'VERMELHO',
  'CINZA', 'AMARELA', 'AMARELO', 'VERDE', 'ROSA', 'LARANJA', 'MARROM',
  'BEGE', 'VINHO', 'ROXO', 'ROXA', 'LILÁS', 'LILAS', 'MARINHO'
];

export interface ItemProduto {
  sku: string;
  nome: string;
  quantidade: number;
  categoria: string;
  categoriaId: string | null;
  origem: 'ecommerce' | 'comercial';
}

interface QuantidadePorCategoria {
  categoria: string;
  categoriaId: string | null;
  ecommerce: number;
  comercial: number;
  total: number;
}

interface ResumoQuantidades {
  totalGeral: number;
  totalEcommerce: number;
  totalComercial: number;
  porCategoria: QuantidadePorCategoria[];
  itensProduto: ItemProduto[];
  itensNaoClassificados: ItemProduto[];
  dataInicio: Date;
  dataFim: Date;
}

// ID da etapa "Ficha Impressa" (configurar conforme necessidade)
const ETAPA_FICHA_IMPRESSA_ID = '1fc5f700-726c-443c-a481-eac9e6de0f1a';

// Classificar produto por código OU por nome (fallback)
function classificarProduto(
  sku: string,
  nome: string,
  categorias: CategoriaEcommerce[],
  cor?: string
): { categoria: string; categoriaId: string | null } {
  // Primeiro tenta pelo código/SKU
  const resultadoCodigo = classificarProdutoPorCodigo(sku, categorias);
  if (resultadoCodigo.categoriaId !== null) {
    return resultadoCodigo;
  }

  // Fallback: classificar pelo nome do produto
  const nomeUpper = (nome || '').toUpperCase();
  const corUpper = (cor || '').toUpperCase();
  
  // Para camisetas, precisamos distinguir entre sublimação e algodão
  if (nomeUpper.includes('CAMISETA') || nomeUpper.includes('CAMISA')) {
    // Se tem cor padrão de algodão, é camiseta de algodão
    const ehAlgodao = CORES_ALGODAO.some(c => corUpper.includes(c));
    
    if (ehAlgodao) {
      const catAlgodao = categorias.find(c => c.nome.toUpperCase().includes('ALGODÃO') || c.nome.toUpperCase().includes('ALGODAO'));
      return {
        categoria: catAlgodao?.nome || 'Camiseta Algodão',
        categoriaId: catAlgodao?.id || null,
      };
    } else {
      // Sem cor definida ou cor especial = sublimação
      const catSublimacao = categorias.find(c => c.nome.toUpperCase().includes('SUBLIMAÇÃO') || c.nome.toUpperCase().includes('SUBLIMACAO'));
      return {
        categoria: catSublimacao?.nome || 'Camiseta Sublimação',
        categoriaId: catSublimacao?.id || null,
      };
    }
  }
  
  // Mapeamento de palavras-chave para outras categorias
  const palavrasChave: Record<string, string[]> = {
    'Regata': ['REGATA'],
    'Cueca Personalizada': ['CUECA'],
    'Samba Canção': ['SAMBA CANÇÃO', 'SAMBA CANCAO', 'SAMBACANCAO'],
    'Bermuda/Shorts': ['BERMUDA', 'SHORTS', 'SHORT'],
    'Calcinha Personalizada': ['CALCINHA'],
    'Pijama': ['PIJAMA'],
  };

  for (const [categoriaNome, palavras] of Object.entries(palavrasChave)) {
    for (const palavra of palavras) {
      if (nomeUpper.includes(palavra)) {
        const cat = categorias.find(c => c.nome === categoriaNome);
        return {
          categoria: categoriaNome,
          categoriaId: cat?.id || null,
        };
      }
    }
  }

  return { categoria: 'Outros', categoriaId: null };
}

export function useQuantidadesVendidas(dataInicio: Date, dataFim: Date) {
  const { data: categorias = [] } = useCategoriasEcommerce();
  
  return useQuery({
    queryKey: ['quantidades-vendidas', dataInicio.toISOString(), dataFim.toISOString()],
    queryFn: async (): Promise<ResumoQuantidades> => {
      const inicio = startOfDay(dataInicio).toISOString();
      const fim = endOfDay(dataFim).toISOString();
      
      // 1. Buscar pedidos E-commerce que entraram em produção (status 4) no período
      const { data: historicoEcommerce, error: errorHistorico } = await supabase
        .from('orders_status_history')
        .select(`
          order_id,
          data_alteracao,
          orders!inner(items)
        `)
        .eq('wbuy_status_code_novo', 4)
        .gte('data_alteracao', inicio)
        .lte('data_alteracao', fim);
      
      let ecommerceItems: { sku: string; nome: string; quantity: number; cor?: string }[] = [];
      
      if (errorHistorico || !historicoEcommerce?.length) {
        // Fallback: buscar orders com status de produção atualizados no período
        const { data: ordersFallback } = await supabase
          .from('orders')
          .select('items, updated_at')
          .eq('wbuy_status_code', 4)
          .gte('updated_at', inicio)
          .lte('updated_at', fim);
        
        if (ordersFallback) {
          ordersFallback.forEach(order => {
            const items = order.items as unknown as OrderItem[] | null;
            if (items && Array.isArray(items)) {
              items.forEach(item => {
                ecommerceItems.push({
                  sku: item.sku || item.codigo || '',
                  nome: item.name || '',
                  quantity: item.quantity || 1,
                  cor: item.color || '',
                });
              });
            }
          });
        }
      } else {
        // Usar dados do histórico (melhor precisão)
        const processedOrderIds = new Set<string>();
        
        historicoEcommerce.forEach(h => {
          if (processedOrderIds.has(h.order_id)) return;
          processedOrderIds.add(h.order_id);
          
          const order = h.orders as any;
          const items = order?.items as OrderItem[] | null;
          if (items && Array.isArray(items)) {
            items.forEach(item => {
              ecommerceItems.push({
                sku: item.sku || item.codigo || '',
                nome: item.name || '',
                quantity: item.quantity || 1,
                cor: item.color || '',
              });
            });
          }
        });
      }
      
      // 2. Buscar pedidos Comerciais que entraram na etapa "Ficha Impressa" no período
      const { data: movimentosComercial } = await supabase
        .from('movimento_etapa_producao')
        .select(`
          pedido_id,
          data_hora_movimento,
          pedidos!inner(
            pedido_itens(
              quantidade,
              produtos(codigo, nome)
            )
          )
        `)
        .eq('etapa_nova_id', ETAPA_FICHA_IMPRESSA_ID)
        .gte('data_hora_movimento', inicio)
        .lte('data_hora_movimento', fim);
      
      let comercialItems: { codigo: string; nome: string; quantity: number }[] = [];
      const processedPedidoIds = new Set<string>();
      
      if (movimentosComercial) {
        movimentosComercial.forEach(mov => {
          if (processedPedidoIds.has(mov.pedido_id)) return;
          processedPedidoIds.add(mov.pedido_id);
          
          const pedido = mov.pedidos as any;
          const itens = pedido?.pedido_itens as any[];
          if (itens && Array.isArray(itens)) {
            itens.forEach(item => {
              comercialItems.push({
                codigo: item.produtos?.codigo || '',
                nome: item.produtos?.nome || '',
                quantity: item.quantidade || 1,
              });
            });
          }
        });
      }
      
      // 3. Classificar e agrupar por categoria
      const categoriasMap = new Map<string, QuantidadePorCategoria>();
      const itensProduto: ItemProduto[] = [];
      const itensNaoClassificados: ItemProduto[] = [];
      
      // Inicializar categorias conhecidas
      categorias.forEach(cat => {
        categoriasMap.set(cat.nome, {
          categoria: cat.nome,
          categoriaId: cat.id,
          ecommerce: 0,
          comercial: 0,
          total: 0,
        });
      });
      
      // Garantir que "Outros" existe
      if (!categoriasMap.has('Outros')) {
        categoriasMap.set('Outros', {
          categoria: 'Outros',
          categoriaId: null,
          ecommerce: 0,
          comercial: 0,
          total: 0,
        });
      }
      
      // Classificar itens E-commerce
      ecommerceItems.forEach(item => {
        const { categoria, categoriaId } = classificarProduto(item.sku, item.nome, categorias, item.cor);
        
        if (!categoriasMap.has(categoria)) {
          categoriasMap.set(categoria, {
            categoria,
            categoriaId: null,
            ecommerce: 0,
            comercial: 0,
            total: 0,
          });
        }
        
        const cat = categoriasMap.get(categoria)!;
        cat.ecommerce += item.quantity;
        cat.total += item.quantity;
        
        const itemProduto: ItemProduto = {
          sku: item.sku,
          nome: item.nome,
          quantidade: item.quantity,
          categoria,
          categoriaId,
          origem: 'ecommerce',
        };
        
        itensProduto.push(itemProduto);
        
        if (categoriaId === null) {
          itensNaoClassificados.push(itemProduto);
        }
      });
      
      // Classificar itens Comercial
      comercialItems.forEach(item => {
        const { categoria, categoriaId } = classificarProduto(item.codigo, item.nome, categorias);
        
        if (!categoriasMap.has(categoria)) {
          categoriasMap.set(categoria, {
            categoria,
            categoriaId: null,
            ecommerce: 0,
            comercial: 0,
            total: 0,
          });
        }
        
        const cat = categoriasMap.get(categoria)!;
        cat.comercial += item.quantity;
        cat.total += item.quantity;
        
        const itemProduto: ItemProduto = {
          sku: item.codigo,
          nome: item.nome,
          quantidade: item.quantity,
          categoria,
          categoriaId,
          origem: 'comercial',
        };
        
        itensProduto.push(itemProduto);
        
        if (categoriaId === null) {
          itensNaoClassificados.push(itemProduto);
        }
      });
      
      // Converter para array e ordenar
      const porCategoria = Array.from(categoriasMap.values())
        .filter(cat => cat.total > 0)
        .sort((a, b) => b.total - a.total);
      
      // Calcular totais
      const totalEcommerce = ecommerceItems.reduce((sum, item) => sum + item.quantity, 0);
      const totalComercial = comercialItems.reduce((sum, item) => sum + item.quantity, 0);
      
      return {
        totalGeral: totalEcommerce + totalComercial,
        totalEcommerce,
        totalComercial,
        porCategoria,
        itensProduto,
        itensNaoClassificados,
        dataInicio,
        dataFim,
      };
    },
    enabled: categorias.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });
}

// Hook para buscar quantidade de pedidos que entraram em produção por data
export function useQuantidadesPorDia(dataInicio: Date, dataFim: Date) {
  return useQuery({
    queryKey: ['quantidades-por-dia', dataInicio.toISOString(), dataFim.toISOString()],
    queryFn: async () => {
      const inicio = startOfDay(dataInicio).toISOString();
      const fim = endOfDay(dataFim).toISOString();
      
      // Buscar histórico de status 4 (Em produção)
      const { data, error } = await supabase
        .from('orders_status_history')
        .select('data_alteracao')
        .eq('wbuy_status_code_novo', 4)
        .gte('data_alteracao', inicio)
        .lte('data_alteracao', fim);
      
      if (error) throw error;
      
      // Agrupar por dia
      const porDia = new Map<string, number>();
      
      data?.forEach(h => {
        const dia = format(new Date(h.data_alteracao), 'yyyy-MM-dd');
        porDia.set(dia, (porDia.get(dia) || 0) + 1);
      });
      
      return Array.from(porDia.entries()).map(([data, quantidade]) => ({
        data,
        quantidade,
      }));
    },
  });
}
