import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInDays, differenceInYears, addYears, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

export interface MetricasRH {
  totalColaboradores: number;
  colaboradoresAtivos: number;
  colaboradoresInativos: number;
  admissoesMes: number;
  demissoesMes: number;
  turnoverMes: number;
  mediaTempoEmpresa: number;
  mediaSalarial: number;
  totalFolha: number;
}

export interface ColaboradorPorSetor {
  setor: string;
  quantidade: number;
  percentual: number;
}

export interface ColaboradorPorContrato {
  tipo: string;
  quantidade: number;
  percentual: number;
}

export interface FeriasAlerta {
  colaboradorId: string;
  colaboradorNome: string;
  cargo: string;
  diasParaVencer: number;
  status: 'ok' | 'a_vencer' | 'vencido';
  dataVencimento: string;
}

export interface AniversarianteMes {
  id: string;
  nome: string;
  cargo: string;
  dia: number;
  tipo: 'pessoal' | 'empresa';
  anos?: number;
}

export function useDashboardRH() {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);
  const fimMes = endOfMonth(hoje);

  return useQuery({
    queryKey: ['dashboard-rh', format(hoje, 'yyyy-MM')],
    queryFn: async () => {
      // Buscar todos os colaboradores
      const { data: colaboradores, error: colabError } = await supabase
        .from('colaboradores')
        .select(`
          *,
          setor:setores(id, nome)
        `);

      if (colabError) throw colabError;

      // Buscar setores
      const { data: setores, error: setoresError } = await supabase
        .from('setores')
        .select('*')
        .eq('ativo', true);

      if (setoresError) throw setoresError;

      const ativos = colaboradores?.filter(c => c.ativo) || [];
      const inativos = colaboradores?.filter(c => !c.ativo) || [];

      // Admissões e demissões do mês
      const admissoesMes = ativos.filter(c => {
        const admissao = parseISO(c.data_admissao);
        return isWithinInterval(admissao, { start: inicioMes, end: fimMes });
      }).length;

      const demissoesMes = inativos.filter(c => {
        if (!c.data_demissao) return false;
        const demissao = parseISO(c.data_demissao);
        return isWithinInterval(demissao, { start: inicioMes, end: fimMes });
      }).length;

      // Turnover
      const turnoverMes = ativos.length > 0 
        ? ((demissoesMes / ativos.length) * 100) 
        : 0;

      // Média de tempo de empresa (em anos)
      const temposEmpresa = ativos.map(c => 
        differenceInYears(hoje, parseISO(c.data_admissao))
      );
      const mediaTempoEmpresa = temposEmpresa.length > 0
        ? temposEmpresa.reduce((a, b) => a + b, 0) / temposEmpresa.length
        : 0;

      // Média salarial e total da folha
      const salarios = ativos
        .filter(c => c.salario_atual && c.salario_atual > 0)
        .map(c => c.salario_atual as number);
      
      const mediaSalarial = salarios.length > 0
        ? salarios.reduce((a, b) => a + b, 0) / salarios.length
        : 0;
      
      const totalFolha = salarios.reduce((a, b) => a + b, 0);

      // Colaboradores por setor
      const colaboradoresPorSetor: ColaboradorPorSetor[] = setores?.map(setor => {
        const qtd = ativos.filter(c => c.setor_id === setor.id).length;
        return {
          setor: setor.nome,
          quantidade: qtd,
          percentual: ativos.length > 0 ? (qtd / ativos.length) * 100 : 0,
        };
      }).filter(s => s.quantidade > 0).sort((a, b) => b.quantidade - a.quantidade) || [];

      // Colaboradores por tipo de contrato
      const tiposContrato = ['clt', 'pj', 'estagio', 'temporario'];
      const labelsTipo: Record<string, string> = {
        clt: 'CLT',
        pj: 'PJ',
        estagio: 'Estágio',
        temporario: 'Temporário',
      };
      
      const colaboradoresPorContrato: ColaboradorPorContrato[] = tiposContrato.map(tipo => {
        const qtd = ativos.filter(c => c.tipo_contrato === tipo).length;
        return {
          tipo: labelsTipo[tipo] || tipo,
          quantidade: qtd,
          percentual: ativos.length > 0 ? (qtd / ativos.length) * 100 : 0,
        };
      }).filter(c => c.quantidade > 0);

      // Férias com alertas (vencendo em 90 dias ou vencidas)
      const feriasAlertas: FeriasAlerta[] = ativos
        .map(c => {
          const admissao = parseISO(c.data_admissao);
          const anosCompletos = differenceInYears(hoje, admissao);
          const proximoVencimento = addYears(admissao, anosCompletos + 1);
          const diasParaVencer = differenceInDays(proximoVencimento, hoje);

          let status: 'ok' | 'a_vencer' | 'vencido' = 'ok';
          if (diasParaVencer < 0) status = 'vencido';
          else if (diasParaVencer <= 90) status = 'a_vencer';

          return {
            colaboradorId: c.id,
            colaboradorNome: c.nome,
            cargo: c.cargo,
            diasParaVencer,
            status,
            dataVencimento: format(proximoVencimento, 'yyyy-MM-dd'),
          };
        })
        .filter(f => f.status !== 'ok')
        .sort((a, b) => a.diasParaVencer - b.diasParaVencer);

      // Aniversariantes do mês (pessoais e de empresa)
      const mesAtual = hoje.getMonth();
      const aniversariantesMes: AniversarianteMes[] = [];

      ativos.forEach(c => {
        // Aniversário pessoal
        if (c.data_nascimento) {
          const nascimento = parseISO(c.data_nascimento);
          if (nascimento.getMonth() === mesAtual) {
            aniversariantesMes.push({
              id: c.id,
              nome: c.nome,
              cargo: c.cargo,
              dia: nascimento.getDate(),
              tipo: 'pessoal',
            });
          }
        }

        // Aniversário de empresa
        const admissao = parseISO(c.data_admissao);
        if (admissao.getMonth() === mesAtual) {
          const anos = differenceInYears(hoje, admissao);
          if (anos >= 1) {
            aniversariantesMes.push({
              id: `emp-${c.id}`,
              nome: c.nome,
              cargo: c.cargo,
              dia: admissao.getDate(),
              tipo: 'empresa',
              anos: anos,
            });
          }
        }
      });

      aniversariantesMes.sort((a, b) => a.dia - b.dia);

      const metricas: MetricasRH = {
        totalColaboradores: colaboradores?.length || 0,
        colaboradoresAtivos: ativos.length,
        colaboradoresInativos: inativos.length,
        admissoesMes,
        demissoesMes,
        turnoverMes,
        mediaTempoEmpresa,
        mediaSalarial,
        totalFolha,
      };

      return {
        metricas,
        colaboradoresPorSetor,
        colaboradoresPorContrato,
        feriasAlertas,
        aniversariantesMes,
        colaboradores: colaboradores || [],
      };
    },
  });
}
