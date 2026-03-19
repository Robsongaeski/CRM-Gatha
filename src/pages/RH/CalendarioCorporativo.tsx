import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, ChevronLeft, ChevronRight, Cake, Building2, Palmtree, PartyPopper, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useEventosCalendario, EventoCalendario } from '@/hooks/rh/useCalendarioRH';

const tipoIcones: Record<string, React.ReactNode> = {
  aniversario: <Cake className="h-3 w-3" />,
  empresa: <Building2 className="h-3 w-3" />,
  ferias: <Palmtree className="h-3 w-3" />,
  data_comemorativa: <PartyPopper className="h-3 w-3" />,
  feriado: <X className="h-3 w-3" />,
};

const tipoCores: Record<string, string> = {
  aniversario: 'bg-blue-100 text-blue-800 border-blue-200',
  empresa: 'bg-green-100 text-green-800 border-green-200',
  ferias: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  data_comemorativa: 'bg-purple-100 text-purple-800 border-purple-200',
  feriado: 'bg-red-100 text-red-800 border-red-200',
};

export default function CalendarioCorporativo() {
  const navigate = useNavigate();
  const [mesAtual, setMesAtual] = useState(new Date());
  const [eventoSelecionado, setEventoSelecionado] = useState<EventoCalendario | null>(null);

  const { data: eventos, isLoading } = useEventosCalendario(mesAtual);

  const inicioMes = startOfMonth(mesAtual);
  const fimMes = endOfMonth(mesAtual);
  const diasDoMes = eachDayOfInterval({ start: inicioMes, end: fimMes });

  // Calculate offset for first day of month (0 = Sunday)
  const offsetInicio = getDay(inicioMes);

  const getEventosDoDia = (dia: Date) => {
    return eventos?.filter((e) => isSameDay(parseISO(e.data), dia)) || [];
  };

  const proximoMes = () => setMesAtual(addMonths(mesAtual, 1));
  const mesAnterior = () => setMesAtual(subMonths(mesAtual, 1));

  const eventosAgrupados = eventos?.reduce((acc, e) => {
    acc[e.tipo] = (acc[e.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Calendário Corporativo
          </h1>
          <p className="text-muted-foreground">Aniversários, férias e datas comemorativas</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/rh')}>
          Voltar ao Dashboard
        </Button>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
          <Cake className="h-3 w-3 mr-1" /> Aniversário ({eventosAgrupados.aniversario || 0})
        </Badge>
        <Badge className="bg-green-100 text-green-800 border border-green-200">
          <Building2 className="h-3 w-3 mr-1" /> Tempo de Empresa ({eventosAgrupados.empresa || 0})
        </Badge>
        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
          <Palmtree className="h-3 w-3 mr-1" /> Férias ({eventosAgrupados.ferias || 0})
        </Badge>
        <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
          <PartyPopper className="h-3 w-3 mr-1" /> Datas Comemorativas ({eventosAgrupados.data_comemorativa || 0})
        </Badge>
        <Badge className="bg-red-100 text-red-800 border border-red-200">
          Feriados ({eventosAgrupados.feriado || 0})
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendário */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex justify-between items-center">
              <Button variant="ghost" size="icon" onClick={mesAnterior}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-xl">
                {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={proximoMes}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) => (
                <div key={dia} className="text-center text-sm font-medium text-muted-foreground p-2">
                  {dia}
                </div>
              ))}
            </div>

            {/* Grid de dias */}
            <div className="grid grid-cols-7 gap-1">
              {/* Células vazias para offset */}
              {Array.from({ length: offsetInicio }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-24 p-1" />
              ))}

              {/* Dias do mês */}
              {diasDoMes.map((dia) => {
                const eventosDoDia = getEventosDoDia(dia);
                const isHoje = isSameDay(dia, new Date());

                return (
                  <div
                    key={dia.toISOString()}
                    className={cn(
                      "min-h-24 p-1 border rounded-md transition-colors",
                      isHoje && "border-primary bg-primary/5",
                      !isSameMonth(dia, mesAtual) && "opacity-50"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      isHoje && "text-primary"
                    )}>
                      {format(dia, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {eventosDoDia.slice(0, 3).map((evento) => (
                        <button
                          key={evento.id}
                          onClick={() => setEventoSelecionado(evento)}
                          className={cn(
                            "w-full text-left text-[10px] px-1 py-0.5 rounded truncate border",
                            tipoCores[evento.tipo]
                          )}
                        >
                          {evento.titulo.replace(/^[^\s]+\s/, '')}
                        </button>
                      ))}
                      {eventosDoDia.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{eventosDoDia.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lista de eventos do mês */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eventos do Mês</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : eventos?.length === 0 ? (
              <p className="text-muted-foreground">Nenhum evento neste mês</p>
            ) : eventos?.map((evento) => (
              <button
                key={evento.id}
                onClick={() => setEventoSelecionado(evento)}
                className={cn(
                  "w-full text-left p-2 rounded-md border transition-colors hover:bg-muted/50",
                  tipoCores[evento.tipo]
                )}
              >
                <div className="flex items-center gap-2">
                  {tipoIcones[evento.tipo]}
                  <span className="font-medium text-sm">
                    {format(parseISO(evento.data), 'dd/MM')}
                  </span>
                </div>
                <p className="text-sm mt-1">{evento.titulo}</p>
                {evento.detalhes && (
                  <p className="text-xs opacity-75 mt-0.5">{evento.detalhes}</p>
                )}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Modal de detalhes (simple) */}
      {eventoSelecionado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEventoSelecionado(null)}>
          <Card className="w-96" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{eventoSelecionado.titulo}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setEventoSelecionado(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(parseISO(eventoSelecionado.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
              </div>
              <Badge className={tipoCores[eventoSelecionado.tipo]}>
                {eventoSelecionado.tipo.replace('_', ' ')}
              </Badge>
              {eventoSelecionado.detalhes && (
                <p className="text-sm text-muted-foreground">{eventoSelecionado.detalhes}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
