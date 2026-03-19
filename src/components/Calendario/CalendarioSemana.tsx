import { format, isSameDay, addDays, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PedidoCalendarioItem } from './PedidoCalendarioItem';
import { PedidoDetalhesPopover } from './PedidoDetalhesPopover';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { parseDateString } from '@/lib/formatters';

interface CalendarioSemanaProps {
  dataInicio: Date;
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

export function CalendarioSemana({ dataInicio, pedidos }: CalendarioSemanaProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const dias = Array.from({ length: 7 }, (_, i) => addDays(dataInicio, i));
  const maxVisivel = 3;

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
    <div className="grid grid-cols-7 gap-2 h-full">
      {dias.map((dia, index) => {
        const diaKey = format(dia, 'yyyy-MM-dd');
        const pedidosDoDia = pedidos.filter(p => 
          p.data_entrega && isSameDay(parseDateString(p.data_entrega) || new Date(), dia)
        );
        const isExpanded = expandedDays.has(diaKey);
        const pedidosVisiveis = isExpanded ? pedidosDoDia : pedidosDoDia.slice(0, maxVisivel);
        const pedidosOcultos = pedidosDoDia.length - maxVisivel;

        return (
          <div
            key={index}
            className={cn(
              "border rounded-lg p-2 bg-card min-h-[300px]",
              isToday(dia) && "ring-2 ring-primary"
            )}
          >
            <div className="text-center mb-3">
              <div className="text-xs text-muted-foreground uppercase">
                {format(dia, 'EEE', { locale: ptBR })}
              </div>
              <div className={cn(
                "text-xl font-semibold",
                isToday(dia) && "text-primary"
              )}>
                {format(dia, 'd')}
              </div>
              {pedidosDoDia.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {pedidosDoDia.length} {pedidosDoDia.length === 1 ? 'pedido' : 'pedidos'}
                </div>
              )}
            </div>

            <div className="space-y-1">
              {pedidosVisiveis.map(pedido => (
                <PedidoDetalhesPopover key={pedido.id} pedido={pedido}>
                  <div>
                    <PedidoCalendarioItem pedido={pedido} />
                  </div>
                </PedidoDetalhesPopover>
              ))}

              {pedidosOcultos > 0 && !isExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => toggleDia(diaKey)}
                >
                  +{pedidosOcultos} mais
                </Button>
              )}

              {isExpanded && pedidosDoDia.length > maxVisivel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => toggleDia(diaKey)}
                >
                  Ver menos
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
