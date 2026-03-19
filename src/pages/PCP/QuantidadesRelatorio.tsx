import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Package, ShoppingCart, Factory, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useQuantidadesPorDiaPeriodo } from '@/hooks/pcp/useQuantidadesPorDiaPeriodo';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReactToPrint } from 'react-to-print';
import logotipo from '@/assets/logotipo_horizontal_colorido.png';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

export default function QuantidadesRelatorio() {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  // Estado do período
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  
  const dataInicio = dateRange?.from || startOfDay(new Date());
  const dataFim = dateRange?.to || endOfDay(new Date());
  
  const { data: resumo, isLoading } = useQuantidadesPorDiaPeriodo(dataInicio, dataFim);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relatorio-Producao-${format(dataInicio, 'dd-MM-yyyy')}`,
  });

  const formatarPeriodo = () => {
    const inicio = format(dataInicio, 'dd/MM/yyyy', { locale: ptBR });
    const fim = format(dataFim, 'dd/MM/yyyy', { locale: ptBR });
    return inicio === fim ? inicio : `${inicio} a ${fim}`;
  };
  
  // Atalhos de período
  const selecionarHoje = () => {
    const hoje = new Date();
    setDateRange({ from: startOfDay(hoje), to: endOfDay(hoje) });
  };
  
  const selecionarOntem = () => {
    const ontem = subDays(new Date(), 1);
    setDateRange({ from: startOfDay(ontem), to: endOfDay(ontem) });
  };
  
  const selecionarUltimos7Dias = () => {
    const hoje = new Date();
    setDateRange({ from: startOfDay(subDays(hoje, 6)), to: endOfDay(hoje) });
  };

  return (
    <div className="space-y-6">
      {/* Header - não imprime */}
      <div className="flex flex-col gap-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/pcp/quantidades')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Relatório de Produção</h1>
              <p className="text-muted-foreground">
                Resumo de quantidades por período
              </p>
            </div>
          </div>
          
          <Button variant="outline" onClick={() => handlePrint()}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
        
        {/* Seletor de período */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={selecionarHoje}>
            Hoje
          </Button>
          <Button variant="outline" size="sm" onClick={selecionarOntem}>
            Ontem
          </Button>
          <Button variant="outline" size="sm" onClick={selecionarUltimos7Dias}>
            Últimos 7 dias
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="ml-2">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {formatarPeriodo()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Conteúdo para impressão */}
      <div ref={printRef} className="print:p-4">
        {/* Cabeçalho do relatório */}
        <div className="mb-6 print:mb-4">
          <div className="flex items-center justify-between mb-4 print:mb-2">
            <img 
              src={logotipo} 
              alt="Logo" 
              className="h-10 print:h-8 hidden print:block" 
            />
            <div className="text-right print:text-left print:flex-1">
              <h2 className="text-xl font-bold print:text-lg">Relatório de Produção</h2>
              <p className="text-muted-foreground print:text-sm">
                {formatarPeriodo()} • Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : !resumo?.porDia?.length ? (
          <p className="text-center text-muted-foreground py-8">Nenhum dado encontrado para o período</p>
        ) : (
          <div className="space-y-6 print:space-y-4">
            {/* Resumo Geral do Período */}
            <Card className="print:border print:shadow-none bg-muted/30">
              <CardHeader className="print:py-2 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Resumo do Período
                  <Badge variant="secondary">{resumo.totalGeral} peças</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="print:pt-0">
                <div className="grid grid-cols-3 gap-4 mb-4 print:gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <span className="font-bold">{resumo.totalGeral}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">E-commerce:</span>
                    <span className="font-bold text-blue-600">{resumo.totalEcommerce}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Factory className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-muted-foreground">Comercial:</span>
                    <span className="font-bold text-orange-600">{resumo.totalComercial}</span>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="print:py-1">Categoria</TableHead>
                      <TableHead className="text-right print:py-1">E-commerce</TableHead>
                      <TableHead className="text-right print:py-1">Comercial</TableHead>
                      <TableHead className="text-right font-bold print:py-1">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resumo.porCategoria.map((cat) => (
                      <TableRow key={cat.categoria} className="print:text-sm">
                        <TableCell className="font-medium print:py-1">{cat.categoria}</TableCell>
                        <TableCell className="text-right text-blue-600 print:py-1">{cat.ecommerce}</TableCell>
                        <TableCell className="text-right text-orange-600 print:py-1">{cat.comercial}</TableCell>
                        <TableCell className="text-right font-bold print:py-1">{cat.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Resumo por Dia */}
            <div className="space-y-4 print:space-y-3">
              <h3 className="text-lg font-semibold print:text-base">Detalhamento Diário</h3>
              
              {resumo.porDia.map((dia) => (
                <Card key={dia.data} className="print:border print:shadow-none print:break-inside-avoid">
                  <CardHeader className="print:py-2 pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        {dia.dataFormatada}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-sm">
                        <Badge variant="outline">{dia.totalGeral} peças</Badge>
                        <span className="text-blue-600">E: {dia.totalEcommerce}</span>
                        <span className="text-orange-600">C: {dia.totalComercial}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="print:pt-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="print:py-1">Categoria</TableHead>
                          <TableHead className="text-right print:py-1">E-commerce</TableHead>
                          <TableHead className="text-right print:py-1">Comercial</TableHead>
                          <TableHead className="text-right font-bold print:py-1">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dia.porCategoria.map((cat) => (
                          <TableRow key={cat.categoria} className="print:text-sm">
                            <TableCell className="font-medium print:py-1">{cat.categoria}</TableCell>
                            <TableCell className="text-right text-blue-600 print:py-1">{cat.ecommerce || '-'}</TableCell>
                            <TableCell className="text-right text-orange-600 print:py-1">{cat.comercial || '-'}</TableCell>
                            <TableCell className="text-right font-bold print:py-1">{cat.total}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé de impressão */}
        <div className="hidden print:block mt-8 pt-4 border-t text-center text-xs text-muted-foreground">
          Relatório gerado automaticamente pelo sistema • {format(new Date(), "dd/MM/yyyy HH:mm")}
        </div>
      </div>
    </div>
  );
}
