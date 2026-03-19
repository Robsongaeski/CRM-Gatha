import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CalendarClock, 
  Package, 
  TrendingUp, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { usePedidosCalendario } from '@/hooks/pcp/usePedidosCalendario';
import { 
  format, 
  isToday, 
  isPast, 
  addMonths, 
  subMonths, 
  addWeeks, 
  subWeeks, 
  startOfWeek 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarioSemana } from '@/components/Calendario/CalendarioSemana';
import { CalendarioMes } from '@/components/Calendario/CalendarioMes';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseDateString } from '@/lib/formatters';

type ModoVisualizacao = 'semana' | 'mes';

export default function Calendario() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [modo, setModo] = useState<ModoVisualizacao>('mes');

  const { pedidos, isLoading } = usePedidosCalendario(dataAtual, modo);

  // Calcular métricas
  const pedidosHoje = pedidos.filter(p => p.data_entrega && isToday(parseDateString(p.data_entrega) || new Date()));
  const pedidosAtrasados = pedidos.filter(
    p => {
      const dataEntrega = parseDateString(p.data_entrega);
      return dataEntrega && isPast(dataEntrega) && !isToday(dataEntrega) && p.status !== 'entregue';
    }
  );
  const totalPedidos = pedidos.length;
  const totalEntregues = pedidos.filter(p => p.status === 'entregue').length;

  const navegarPara = (direcao: 'anterior' | 'proximo') => {
    if (modo === 'semana') {
      setDataAtual(prev => direcao === 'anterior' ? subWeeks(prev, 1) : addWeeks(prev, 1));
    } else {
      setDataAtual(prev => direcao === 'anterior' ? subMonths(prev, 1) : addMonths(prev, 1));
    }
  };

  const voltarHoje = () => {
    setDataAtual(new Date());
  };

  const getTituloData = () => {
    if (modo === 'semana') {
      const inicio = startOfWeek(dataAtual, { locale: ptBR });
      return `Semana de ${format(inicio, "d 'de' MMMM", { locale: ptBR })}`;
    }
    return format(dataAtual, 'MMMM yyyy', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendário de Entregas</h1>
        <p className="text-muted-foreground">
          Visualize pedidos organizados por data de entrega prevista
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total do Período</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidos}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos programados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Hoje</CardTitle>
            <CalendarClock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidosHoje.length}</div>
            <p className="text-xs text-muted-foreground">
              Para entregar hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pedidosAtrasados.length}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos em atraso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos</CardTitle>
            <TrendingUp className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEntregues}</div>
            <p className="text-xs text-muted-foreground">
              {totalPedidos > 0 ? Math.round((totalEntregues / totalPedidos) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button onClick={voltarHoje} variant="outline">
                Hoje
              </Button>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navegarPara('anterior')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navegarPara('proximo')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <CardTitle className="capitalize">{getTituloData()}</CardTitle>
            </div>

            <Select value={modo} onValueChange={(v) => setModo(v as ModoVisualizacao)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Semana</SelectItem>
                <SelectItem value="mes">Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando calendário...
            </div>
          ) : modo === 'semana' ? (
            <CalendarioSemana 
              dataInicio={startOfWeek(dataAtual, { locale: ptBR })} 
              pedidos={pedidos} 
            />
          ) : (
            <CalendarioMes mes={dataAtual} pedidos={pedidos} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
