import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategoriasEcommerce, classificarProdutoPorCodigo, CategoriaEcommerce } from './useCategoriasEcommerce';
import { startOfDay, endOfDay, format, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

interface QuantidadePorCategoria {
  categoria: string;
  ecommerce: number;
  comercial: number;
  total: number;
}

interface ResumoDia {
  data: string;
  dataFormatada: string;
  totalGeral: number;
  totalEcommerce: number;
  totalComercial: number;
  porCategoria: QuantidadePorCategoria[];
}

export interface ResumoQuantidadesPeriodo {
  totalGeral: number;
  totalEcommerce: number;
  totalComercial: number;
  porCategoria: QuantidadePorCategoria[];
  porDia: ResumoDia[];
  dataInicio: Date;
  dataFim: Date;
}

const ETAPA_FICHA_IMPRESSA_ID = '1fc5f700-726c-443c-a481-eac9e6de0f1a';

function classificarProduto(
  sku: string,
  nome: string,
  categorias: CategoriaEcommerce[],
  cor?: string
): string {
  const resultadoCodigo = classificarProdutoPorCodigo(sku, categorias);
  if (resultadoCodigo.categoriaId !== null) {
    return resultadoCodigo.categoria;
  }

  const nomeUpper = (nome || '').toUpperCase();
  const corUpper = (cor || '').toUpperCase();
  
  if (nomeUpper.includes('CAMISETA') || nomeUpper.includes('CAMISA')) {
    const ehAlgodao = CORES_ALGODAO.some(c => corUpper.includes(c));
    if (ehAlgodao) {
      const catAlgodao = categorias.find(c => c.nome.toUpperCase().includes('ALGODÃO') || c.nome.toUpperCase().includes('ALGODAO'));
      return catAlgodao?.nome || 'Camiseta Algodão';
    } else {
      const catSublimacao = categorias.find(c => c.nome.toUpperCase().includes('SUBLIMAÇÃO') || c.nome.toUpperCase().includes('SUBLIMACAO'));
      return catSublimacao?.nome || 'Camiseta Sublimação';
    }
  }
  
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
        return categoriaNome;
      }
    }
  }

  return 'Outros';
}

export function useQuantidadesPorDiaPeriodo(dataInicio: Date, dataFim: Date) {
  const { data: categorias = [] } = useCategoriasEcommerce();
  
  return useQuery({
    queryKey: ['quantidades-por-dia-periodo', dataInicio.toISOString(), dataFim.toISOString()],
    queryFn: async (): Promise<ResumoQuantidadesPeriodo> => {
      const inicio = startOfDay(dataInicio).toISOString();
      const fim = endOfDay(dataFim).toISOString();
      
      // Criar mapa de dias no período
      const diasNoPeriodo = eachDayOfInterval({ start: dataInicio, end: dataFim });
      const dadosPorDia = new Map<string, { ecommerce: Map<string, number>; comercial: Map<string, number> }>();
      
      diasNoPeriodo.forEach(dia => {
        const diaKey = format(dia, 'yyyy-MM-dd');
        dadosPorDia.set(diaKey, { ecommerce: new Map(), comercial: new Map() });
      });
      
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
      
      const processedOrderIds = new Set<string>();
      
      if (errorHistorico || !historicoEcommerce?.length) {
        // Fallback: buscar orders com status de produção atualizados no período
        const { data: ordersFallback } = await supabase
          .from('orders')
          .select('id, items, updated_at')
          .eq('wbuy_status_code', 4)
          .gte('updated_at', inicio)
          .lte('updated_at', fim);
        
        if (ordersFallback) {
          ordersFallback.forEach(order => {
            const diaKey = format(new Date(order.updated_at), 'yyyy-MM-dd');
            const dadosDia = dadosPorDia.get(diaKey);
            if (!dadosDia) return;
            
            const items = order.items as unknown as OrderItem[] | null;
            if (items && Array.isArray(items)) {
              items.forEach(item => {
                const categoria = classificarProduto(item.sku || item.codigo || '', item.name || '', categorias, item.color);
                const atual = dadosDia.ecommerce.get(categoria) || 0;
                dadosDia.ecommerce.set(categoria, atual + (item.quantity || 1));
              });
            }
          });
        }
      } else {
        // Usar dados do histórico (melhor precisão)
        historicoEcommerce.forEach(h => {
          if (processedOrderIds.has(h.order_id)) return;
          processedOrderIds.add(h.order_id);
          
          const diaKey = format(new Date(h.data_alteracao!), 'yyyy-MM-dd');
          const dadosDia = dadosPorDia.get(diaKey);
          if (!dadosDia) return;
          
          const order = h.orders as any;
          const items = order?.items as OrderItem[] | null;
          if (items && Array.isArray(items)) {
            items.forEach(item => {
              const categoria = classificarProduto(item.sku || item.codigo || '', item.name || '', categorias, item.color);
              const atual = dadosDia.ecommerce.get(categoria) || 0;
              dadosDia.ecommerce.set(categoria, atual + (item.quantity || 1));
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
      
      const processedPedidoIds = new Set<string>();
      
      if (movimentosComercial) {
        movimentosComercial.forEach(mov => {
          if (processedPedidoIds.has(mov.pedido_id)) return;
          processedPedidoIds.add(mov.pedido_id);
          
          const diaKey = format(new Date(mov.data_hora_movimento!), 'yyyy-MM-dd');
          const dadosDia = dadosPorDia.get(diaKey);
          if (!dadosDia) return;
          
          const pedido = mov.pedidos as any;
          const itens = pedido?.pedido_itens as any[];
          if (itens && Array.isArray(itens)) {
            itens.forEach(item => {
              const categoria = classificarProduto(item.produtos?.codigo || '', item.produtos?.nome || '', categorias);
              const atual = dadosDia.comercial.get(categoria) || 0;
              dadosDia.comercial.set(categoria, atual + (item.quantidade || 1));
            });
          }
        });
      }
      
      // 3. Processar dados por dia
      const porDia: ResumoDia[] = [];
      const categoriaTotais = new Map<string, { ecommerce: number; comercial: number }>();
      let totalGeralGeral = 0;
      let totalEcommerceGeral = 0;
      let totalComercialGeral = 0;
      
      diasNoPeriodo.forEach(dia => {
        const diaKey = format(dia, 'yyyy-MM-dd');
        const dadosDia = dadosPorDia.get(diaKey)!;
        
        const categoriasDia: QuantidadePorCategoria[] = [];
        let totalDiaEcommerce = 0;
        let totalDiaComercial = 0;
        
        // Combinar todas as categorias do dia
        const todasCategorias = new Set([...dadosDia.ecommerce.keys(), ...dadosDia.comercial.keys()]);
        
        todasCategorias.forEach(categoria => {
          const ecommerce = dadosDia.ecommerce.get(categoria) || 0;
          const comercial = dadosDia.comercial.get(categoria) || 0;
          const total = ecommerce + comercial;
          
          if (total > 0) {
            categoriasDia.push({ categoria, ecommerce, comercial, total });
            totalDiaEcommerce += ecommerce;
            totalDiaComercial += comercial;
            
            // Acumular totais gerais
            if (!categoriaTotais.has(categoria)) {
              categoriaTotais.set(categoria, { ecommerce: 0, comercial: 0 });
            }
            const catTotal = categoriaTotais.get(categoria)!;
            catTotal.ecommerce += ecommerce;
            catTotal.comercial += comercial;
          }
        });
        
        if (categoriasDia.length > 0) {
          porDia.push({
            data: diaKey,
            dataFormatada: format(dia, 'dd/MM/yyyy (EEEE)', { locale: ptBR }),
            totalGeral: totalDiaEcommerce + totalDiaComercial,
            totalEcommerce: totalDiaEcommerce,
            totalComercial: totalDiaComercial,
            porCategoria: categoriasDia.sort((a, b) => b.total - a.total),
          });
          
          totalGeralGeral += totalDiaEcommerce + totalDiaComercial;
          totalEcommerceGeral += totalDiaEcommerce;
          totalComercialGeral += totalDiaComercial;
        }
      });
      
      // 4. Montar resumo geral por categoria
      const porCategoria: QuantidadePorCategoria[] = Array.from(categoriaTotais.entries())
        .map(([categoria, { ecommerce, comercial }]) => ({
          categoria,
          ecommerce,
          comercial,
          total: ecommerce + comercial,
        }))
        .sort((a, b) => b.total - a.total);
      
      return {
        totalGeral: totalGeralGeral,
        totalEcommerce: totalEcommerceGeral,
        totalComercial: totalComercialGeral,
        porCategoria,
        porDia: porDia.sort((a, b) => a.data.localeCompare(b.data)),
        dataInicio,
        dataFim,
      };
    },
    enabled: categorias.length > 0,
    staleTime: 1000 * 60 * 5,
  });
}
