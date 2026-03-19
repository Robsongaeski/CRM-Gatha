import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, getMonth, getYear, isSameMonth, startOfMonth, endOfMonth } from 'date-fns';

export interface EventoCalendario {
  id: string;
  tipo: 'aniversario' | 'empresa' | 'ferias' | 'data_comemorativa' | 'feriado';
  titulo: string;
  data: string;
  cor: string;
  colaboradorId?: string;
  detalhes?: string;
}

export function useEventosCalendario(mes: Date) {
  const mesNum = getMonth(mes) + 1; // 1-12
  const ano = getYear(mes);
  const inicioMes = format(startOfMonth(mes), 'yyyy-MM-dd');
  const fimMes = format(endOfMonth(mes), 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['eventos-calendario-rh', ano, mesNum],
    queryFn: async () => {
      const eventos: EventoCalendario[] = [];

      // 1. Aniversários pessoais (data_nascimento)
      const { data: colaboradores, error: colabError } = await supabase
        .from('colaboradores')
        .select('id, nome, data_nascimento, data_admissao')
        .eq('ativo', true);

      if (colabError) throw colabError;

      colaboradores?.forEach((colab) => {
        // Aniversário pessoal
        if (colab.data_nascimento) {
          const nascimento = parseISO(colab.data_nascimento);
          if (getMonth(nascimento) + 1 === mesNum) {
            eventos.push({
              id: `aniv-${colab.id}`,
              tipo: 'aniversario',
              titulo: `🎂 Aniversário: ${colab.nome}`,
              data: `${ano}-${String(mesNum).padStart(2, '0')}-${String(nascimento.getDate()).padStart(2, '0')}`,
              cor: '#3B82F6', // blue
              colaboradorId: colab.id,
            });
          }
        }

        // Aniversário de empresa
        if (colab.data_admissao) {
          const admissao = parseISO(colab.data_admissao);
          if (getMonth(admissao) + 1 === mesNum && getYear(admissao) < ano) {
            const anosEmpresa = ano - getYear(admissao);
            eventos.push({
              id: `emp-${colab.id}`,
              tipo: 'empresa',
              titulo: `🏢 ${anosEmpresa} anos: ${colab.nome}`,
              data: `${ano}-${String(mesNum).padStart(2, '0')}-${String(admissao.getDate()).padStart(2, '0')}`,
              cor: '#10B981', // green
              colaboradorId: colab.id,
              detalhes: `${anosEmpresa} anos de empresa`,
            });
          }
        }
      });

      // 2. Férias do mês
      const { data: ferias, error: feriasError } = await supabase
        .from('colaborador_ferias')
        .select(`
          id,
          data_inicio,
          data_fim,
          dias,
          colaborador:colaboradores(id, nome)
        `)
        .or(`data_inicio.gte.${inicioMes},data_fim.lte.${fimMes}`)
        .in('status', ['agendada', 'em_gozo']);

      if (feriasError) throw feriasError;

      ferias?.forEach((f) => {
        if (f.data_inicio && f.colaborador) {
          eventos.push({
            id: `ferias-${f.id}`,
            tipo: 'ferias',
            titulo: `🏖️ Férias: ${(f.colaborador as any).nome}`,
            data: f.data_inicio,
            cor: '#F59E0B', // yellow
            colaboradorId: (f.colaborador as any).id,
            detalhes: `${f.dias} dias - até ${f.data_fim ? format(parseISO(f.data_fim), 'dd/MM') : 'indefinido'}`,
          });
        }
      });

      // 3. Datas comemorativas
      const { data: datas, error: datasError } = await supabase
        .from('datas_comemorativas')
        .select('*')
        .eq('ativo', true);

      if (datasError) throw datasError;

      datas?.forEach((d) => {
        const dataEvento = parseISO(d.data);
        
        // For recurring events, check if month matches
        if (d.recorrente) {
          if (getMonth(dataEvento) + 1 === mesNum) {
            eventos.push({
              id: `data-${d.id}`,
              tipo: d.tipo === 'feriado' ? 'feriado' : 'data_comemorativa',
              titulo: d.tipo === 'feriado' ? `🔴 ${d.nome}` : `💜 ${d.nome}`,
              data: `${ano}-${String(mesNum).padStart(2, '0')}-${String(dataEvento.getDate()).padStart(2, '0')}`,
              cor: d.tipo === 'feriado' ? '#EF4444' : '#8B5CF6', // red or purple
            });
          }
        } else {
          // Non-recurring: check if within this month
          if (isSameMonth(dataEvento, mes)) {
            eventos.push({
              id: `data-${d.id}`,
              tipo: d.tipo === 'feriado' ? 'feriado' : 'data_comemorativa',
              titulo: d.tipo === 'feriado' ? `🔴 ${d.nome}` : `💜 ${d.nome}`,
              data: d.data,
              cor: d.tipo === 'feriado' ? '#EF4444' : '#8B5CF6',
            });
          }
        }
      });

      // Sort by date
      return eventos.sort((a, b) => a.data.localeCompare(b.data));
    },
  });
}
