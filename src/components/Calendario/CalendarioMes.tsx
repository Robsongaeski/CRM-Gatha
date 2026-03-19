import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameMonth, 
  isSameDay,
  isToday 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PedidoCalendarioItem } from './PedidoCalendarioItem';
import { PedidoDetalhesPopover } from './PedidoDetalhesPopover';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseDateString } from '@/lib/formatters';

interface CalendarioMesProps {
  mes: Date;
  pedidos: Array<{
    id: string;
    numero_pedido: number;
    data_entrega: string | null;
    status: string;
    valor_total: number;
    observacao?: string | null;
    cliente?: { nome_razao_social: string } | null;
    etapa?: { nome_etapa: string; cor_hex: string | null } | null;
    itens?: Array<{ id: string; quantidade: number; foto_modelo_url?: string | null; produto?: { nome: string } }>;
  }>;
}

export function CalendarioMes({ mes, pedidos }: CalendarioMesProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const inicioMes = startOfMonth(mes);
  const fimMes = endOfMonth(mes);
  const inicioCalendario = startOfWeek(inicioMes, { locale: ptBR });
  const fimCalendario = endOfWeek(fimMes, { locale: ptBR });

  const dias: Date[] = [];
  let diaAtual = inicioCalendario;
  
  while (diaAtual <= fimCalendario) {
    dias.push(diaAtual);
    diaAtual = addDays(diaAtual, 1);
  }

  const maxVisivel = 3;
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const toggleDia = (diaKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(diaKey)) {
        next.delete(diaKey);
      } else {
        next.add(diaKey);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {/* Header dos dias da semana */}
      <div className="grid grid-cols-7 gap-2">
        {diasSemana.map(dia => (
          <div key={dia} className="text-center text-sm font-medium text-muted-foreground py-2">
            {dia}
          </div>
        ))}
      </div>

      {/* Grid do calendário */}
      <div className="grid grid-cols-7 gap-2">
        {dias.map((dia, index) => {
          const diaKey = format(dia, 'yyyy-MM-dd');
          const pedidosDoDia = pedidos.filter(p => 
            p.data_entrega && isSameDay(parseDateString(p.data_entrega) || new Date(), dia)
          );
          const isExpanded = expandedDays.has(diaKey);
          const pedidosVisiveis = isExpanded ? pedidosDoDia : pedidosDoDia.slice(0, maxVisivel);
          const pedidosOcultos = pedidosDoDia.length - maxVisivel;
          const isOutroMes = !isSameMonth(dia, mes);
          const isDiaHoje = isToday(dia);

          return (
            <div
              key={index}
              className={cn(
                "border rounded-lg p-2 bg-card min-h-[120px]",
                isOutroMes && "bg-muted/20",
                isDiaHoje && "ring-2 ring-primary"
              )}
            >
              <div className={cn(
                "text-sm font-medium mb-2",
                isOutroMes ? "text-muted-foreground" : "text-foreground",
                isDiaHoje && "flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground"
              )}>
                {format(dia, 'd')}
              </div>

              <div className="space-y-1">
                {pedidosVisiveis.map(pedido => (
                  <PedidoDetalhesPopover key={pedido.id} pedido={pedido}>
                    <div>
                      <PedidoCalendarioItem pedido={pedido} compact />
                    </div>
                  </PedidoDetalhesPopover>
                ))}

                {pedidosOcultos > 0 && !isExpanded && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-6"
                    onClick={() => toggleDia(diaKey)}
                  >
                    +{pedidosOcultos}
                  </Button>
                )}

                {isExpanded && pedidosDoDia.length > maxVisivel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs h-6"
                    onClick={() => toggleDia(diaKey)}
                  >
                    −
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
