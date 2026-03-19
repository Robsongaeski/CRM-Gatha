import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { sanitizeError } from '@/lib/errorHandling';

export type StatusEmprestimo = 'emprestado' | 'devolvido' | 'devolvido_parcial' | 'nao_devolvido';

export interface EmprestimoItem {
  id?: string;
  descricao: string;
  quantidade: number;
  quantidade_devolvida?: number;
  tamanhos?: string;
  problema_devolucao?: string;
}

export interface EmprestimoGradeProva {
  id: string;
  numero_emprestimo: number;
  cliente_id: string;
  vendedor_id: string;
  data_emprestimo: string;
  data_prevista_devolucao: string;
  data_devolucao?: string | null;
  status: StatusEmprestimo;
  observacao_saida?: string | null;
  observacao_devolucao?: string | null;
  devolvido_por?: string | null;
  created_at: string;
  updated_at: string;
  cliente?: { id: string; nome_razao_social: string; telefone?: string; whatsapp?: string; cpf_cnpj?: string; endereco?: string };
  vendedor?: { id: string; nome: string };
  devolvido_por_profile?: { id: string; nome: string };
  itens?: EmprestimoItem[];
}

export interface FiltrosEmprestimo {
  cliente?: string;
  vendedor?: string;
  status?: StatusEmprestimo[];
  periodo?: '7dias' | '30dias' | '90dias' | 'todos';
  apenasAtrasados?: boolean;
}

export interface NovoEmprestimoData {
  cliente_id: string;
  vendedor_id: string;
  data_emprestimo: string;
  data_prevista_devolucao: string;
  observacao_saida?: string;
  itens: EmprestimoItem[];
}

export interface DevolucaoData {
  emprestimo_id: string;
  observacao_devolucao?: string;
  itens: {
    id: string;
    quantidade_devolvida: number;
    problema_devolucao?: string;
  }[];
}

// Hook para listar empréstimos
export function useEmprestimosGradeProva(filtros: FiltrosEmprestimo) {
  return useQuery({
    queryKey: ['emprestimos-grade-prova', filtros],
    queryFn: async () => {
      let query = supabase
        .from('emprestimos_grade_prova')
        .select(`
          *,
          cliente:clientes(id, nome_razao_social, telefone, whatsapp, cpf_cnpj, endereco),
          vendedor:profiles!emprestimos_grade_prova_vendedor_id_fkey(id, nome),
          devolvido_por_profile:profiles!emprestimos_grade_prova_devolvido_por_fkey(id, nome),
          itens:emprestimo_grade_itens(*)
        `)
        .order('data_emprestimo', { ascending: false });

      // Filtro por status
      if (filtros.status && filtros.status.length > 0) {
        query = query.in('status', filtros.status);
      }

      // Filtro por cliente
      if (filtros.cliente) {
        query = query.eq('cliente_id', filtros.cliente);
      }

      // Filtro por vendedor
      if (filtros.vendedor) {
        query = query.eq('vendedor_id', filtros.vendedor);
      }

      // Filtro por período
      if (filtros.periodo && filtros.periodo !== 'todos') {
        const hoje = new Date();
        let dataInicio: Date;
        
        switch (filtros.periodo) {
          case '7dias':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 7));
            break;
          case '30dias':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 30));
            break;
          case '90dias':
            dataInicio = new Date(hoje.setDate(hoje.getDate() - 90));
            break;
          default:
            dataInicio = new Date(0);
        }
        
        query = query.gte('data_emprestimo', dataInicio.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filtro de atrasados no cliente (pois precisa comparar datas)
      let resultado = data as EmprestimoGradeProva[];
      
      if (filtros.apenasAtrasados) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        resultado = resultado.filter(e => {
          if (e.status !== 'emprestado') return false;
          const prazo = new Date(e.data_prevista_devolucao);
          prazo.setHours(0, 0, 0, 0);
          return prazo < hoje;
        });
      }

      return resultado;
    },
  });
}

// Hook para buscar um empréstimo específico
export function useEmprestimoGradeProva(id: string | undefined) {
  return useQuery({
    queryKey: ['emprestimo-grade-prova', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('emprestimos_grade_prova')
        .select(`
          *,
          cliente:clientes(id, nome_razao_social, telefone, whatsapp, cpf_cnpj, endereco),
          vendedor:profiles!emprestimos_grade_prova_vendedor_id_fkey(id, nome),
          devolvido_por_profile:profiles!emprestimos_grade_prova_devolvido_por_fkey(id, nome),
          itens:emprestimo_grade_itens(*)
        `)
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data as EmprestimoGradeProva;
    },
    enabled: !!id,
  });
}

// Hook para criar empréstimo
export function useCreateEmprestimo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (dados: NovoEmprestimoData) => {
      // Criar empréstimo
      const { data: emprestimo, error: emprestimoError } = await supabase
        .from('emprestimos_grade_prova')
        .insert({
          cliente_id: dados.cliente_id,
          vendedor_id: dados.vendedor_id,
          data_emprestimo: dados.data_emprestimo,
          data_prevista_devolucao: dados.data_prevista_devolucao,
          observacao_saida: dados.observacao_saida,
        })
        .select()
        .single();

      if (emprestimoError) throw emprestimoError;

      // Criar itens
      if (dados.itens.length > 0) {
        const itensParaInserir = dados.itens.map(item => ({
          emprestimo_id: emprestimo.id,
          descricao: item.descricao,
          quantidade: item.quantidade,
          tamanhos: item.tamanhos || null,
        }));

        const { error: itensError } = await supabase
          .from('emprestimo_grade_itens')
          .insert(itensParaInserir);

        if (itensError) throw itensError;
      }

      return emprestimo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emprestimos-grade-prova'] });
      toast({
        title: 'Empréstimo registrado',
        description: 'O empréstimo de grade para prova foi registrado com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao registrar empréstimo',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

// Hook para registrar devolução
export function useRegistrarDevolucao() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (dados: DevolucaoData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Atualizar itens
      for (const item of dados.itens) {
        const { error: itemError } = await supabase
          .from('emprestimo_grade_itens')
          .update({
            quantidade_devolvida: item.quantidade_devolvida,
            problema_devolucao: item.problema_devolucao || null,
          })
          .eq('id', item.id);

        if (itemError) throw itemError;
      }

      // Buscar itens atualizados para calcular status
      const { data: itensAtualizados } = await supabase
        .from('emprestimo_grade_itens')
        .select('*')
        .eq('emprestimo_id', dados.emprestimo_id);

      // Calcular status baseado nas quantidades devolvidas
      let status: StatusEmprestimo = 'devolvido';
      
      if (itensAtualizados) {
        const totalQuantidade = itensAtualizados.reduce((sum, i) => sum + i.quantidade, 0);
        const totalDevolvido = itensAtualizados.reduce((sum, i) => sum + (i.quantidade_devolvida || 0), 0);
        
        if (totalDevolvido === 0) {
          status = 'nao_devolvido';
        } else if (totalDevolvido < totalQuantidade) {
          status = 'devolvido_parcial';
        } else {
          status = 'devolvido';
        }
      }

      // Atualizar empréstimo
      const { error: emprestimoError } = await supabase
        .from('emprestimos_grade_prova')
        .update({
          status,
          data_devolucao: new Date().toISOString().substring(0, 10) + 'T12:00:00',
          observacao_devolucao: dados.observacao_devolucao || null,
          devolvido_por: user.id,
        })
        .eq('id', dados.emprestimo_id);

      if (emprestimoError) throw emprestimoError;

      return { status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emprestimos-grade-prova'] });
      queryClient.invalidateQueries({ queryKey: ['emprestimo-grade-prova'] });
      toast({
        title: 'Devolução registrada',
        description: 'A devolução foi registrada com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao registrar devolução',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

// Hook para excluir empréstimo
export function useDeleteEmprestimo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('emprestimos_grade_prova')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emprestimos-grade-prova'] });
      toast({
        title: 'Empréstimo excluído',
        description: 'O empréstimo foi excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao excluir empréstimo',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

// Funções auxiliares
export function calcularStatusPrazo(dataPrevista: string, status: StatusEmprestimo) {
  if (status !== 'emprestado') {
    return { 
      status: status === 'devolvido' ? 'devolvido' : status === 'devolvido_parcial' ? 'parcial' : 'nao_devolvido',
      cor: status === 'devolvido' ? 'text-green-700' : 'text-yellow-700',
      bgCor: status === 'devolvido' ? 'bg-green-50' : 'bg-yellow-50',
      texto: status === 'devolvido' ? 'Devolvido' : status === 'devolvido_parcial' ? 'Devolução Parcial' : 'Não Devolvido',
    };
  }
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazo = new Date(dataPrevista);
  prazo.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDias < 0) {
    return { 
      status: 'atrasado', 
      cor: 'text-destructive', 
      bgCor: 'bg-destructive/10',
      texto: `Atrasado (${Math.abs(diffDias)} ${Math.abs(diffDias) === 1 ? 'dia' : 'dias'})`
    };
  }
  if (diffDias === 0) {
    return { 
      status: 'hoje', 
      cor: 'text-orange-600', 
      bgCor: 'bg-orange-50',
      texto: 'Vence hoje!'
    };
  }
  if (diffDias <= 3) {
    return { 
      status: 'proximo', 
      cor: 'text-yellow-700', 
      bgCor: 'bg-yellow-50',
      texto: `Vence em ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`
    };
  }
  return { 
    status: 'normal', 
    cor: 'text-muted-foreground', 
    bgCor: 'bg-muted',
    texto: `Vence em ${diffDias} dias`
  };
}

export function calcularEstatisticasEmprestimos(emprestimos: EmprestimoGradeProva[]) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  return {
    emAberto: emprestimos.filter(e => e.status === 'emprestado').length,
    
    atrasados: emprestimos.filter(e => {
      if (e.status !== 'emprestado') return false;
      const prazo = new Date(e.data_prevista_devolucao);
      prazo.setHours(0, 0, 0, 0);
      return prazo < hoje;
    }).length,
    
    venceHoje: emprestimos.filter(e => {
      if (e.status !== 'emprestado') return false;
      const prazo = new Date(e.data_prevista_devolucao);
      prazo.setHours(0, 0, 0, 0);
      return prazo.getTime() === hoje.getTime();
    }).length,
    
    devolvidos: emprestimos.filter(e => 
      e.status === 'devolvido' || e.status === 'devolvido_parcial'
    ).length,
  };
}
