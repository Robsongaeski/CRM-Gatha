import React, { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CalendarIcon, BarChart3, RefreshCcw, PackageX, AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrocas } from '@/hooks/useTrocas';
import { useDevolucoes } from '@/hooks/useDevolucoes';
import { useExtravios } from '@/hooks/useExtravios';
import { useProblemasPedido } from '@/hooks/useProblemasPedido';

export default function SuporteRelatorios() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const { data: allTrocas = [] } = useTrocas();
  const { data: allDevolucoes = [] } = useDevolucoes();
  const { data: allExtravios = [] } = useExtravios();
  const { data: allProblemas = [] } = useProblemasPedido();

  // Filter by date range on frontend
  const trocas = allTrocas.filter(t => {
    const created = new Date(t.created_at);
    return created >= dateRange.from && created <= dateRange.to;
  });
  
  const devolucoes = allDevolucoes.filter(d => {
    const created = new Date(d.created_at);
    return created >= dateRange.from && created <= dateRange.to;
  });
  
  const extravios = allExtravios.filter(e => {
    const created = new Date(e.created_at);
    return created >= dateRange.from && created <= dateRange.to;
  });
  
  const problemas = allProblemas;

  // Filtrar problemas pelo período
  const problemasFiltered = problemas.filter(p => {
    const created = new Date(p.created_at);
    return created >= dateRange.from && created <= dateRange.to;
  });

  // Métricas
  const totalOcorrencias = trocas.length + devolucoes.length + extravios.length + problemasFiltered.length;
  
  const valorTrocas = trocas.reduce((acc, t) => acc + (t.valor_pedido || 0), 0);
  const valorDevolucoes = devolucoes.reduce((acc, d) => acc + (d.valor_pedido || 0), 0);
  const valorExtravios = extravios.reduce((acc, e) => acc + (e.valor_pedido || 0), 0);
  const valorProblemas = problemasFiltered.reduce((acc, p) => acc + (p.valor_pedido || 0), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Agrupar por motivo
  const trocasPorMotivo = trocas.reduce((acc, t) => {
    const motivo = t.motivo?.nome || 'Sem motivo';
    acc[motivo] = (acc[motivo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const devolucoesPorMotivo = devolucoes.reduce((acc, d) => {
    const motivo = d.motivo?.nome || 'Sem motivo';
    acc[motivo] = (acc[motivo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const problemasPorTipo = problemasFiltered.reduce((acc, p) => {
    acc[p.tipo_problema] = (acc[p.tipo_problema] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios de Suporte</h1>
        <p className="text-muted-foreground">
          Análise de trocas, devoluções, extravios e problemas
        </p>
      </div>

      {/* Filtro de período */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('w-[280px] justify-start text-left font-normal')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} -{' '}
                  {format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" onClick={() => setDateRange({
              from: subDays(new Date(), 30),
              to: new Date(),
            })}>
              Últimos 30 dias
            </Button>
            <Button variant="outline" onClick={() => setDateRange({
              from: startOfMonth(new Date()),
              to: endOfMonth(new Date()),
            })}>
              Este mês
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ocorrências</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOcorrencias}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trocas</CardTitle>
            <RefreshCcw className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trocas.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(valorTrocas)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devoluções</CardTitle>
            <PackageX className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{devolucoes.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(valorDevolucoes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Extravios</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{extravios.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(valorExtravios)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes */}
      <Tabs defaultValue="trocas">
        <TabsList>
          <TabsTrigger value="trocas">Trocas por Motivo</TabsTrigger>
          <TabsTrigger value="devolucoes">Devoluções por Motivo</TabsTrigger>
          <TabsTrigger value="problemas">Problemas por Tipo</TabsTrigger>
        </TabsList>

        <TabsContent value="trocas">
          <Card>
            <CardHeader>
              <CardTitle>Trocas por Motivo</CardTitle>
              <CardDescription>Distribuição de trocas por motivo no período</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(trocasPorMotivo).map(([motivo, count]) => (
                    <TableRow key={motivo}>
                      <TableCell>{motivo}</TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                      <TableCell className="text-right">
                        {((count / trocas.length) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(trocasPorMotivo).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhuma troca no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devolucoes">
          <Card>
            <CardHeader>
              <CardTitle>Devoluções por Motivo</CardTitle>
              <CardDescription>Distribuição de devoluções por motivo no período</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(devolucoesPorMotivo).map(([motivo, count]) => (
                    <TableRow key={motivo}>
                      <TableCell>{motivo}</TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                      <TableCell className="text-right">
                        {((count / devolucoes.length) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(devolucoesPorMotivo).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhuma devolução no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="problemas">
          <Card>
            <CardHeader>
              <CardTitle>Problemas por Tipo</CardTitle>
              <CardDescription>Distribuição de problemas por tipo no período</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(problemasPorTipo).map(([tipo, count]) => (
                    <TableRow key={tipo}>
                      <TableCell className="capitalize">{tipo.replace('_', ' ')}</TableCell>
                      <TableCell className="text-right">{count}</TableCell>
                      <TableCell className="text-right">
                        {((count / problemasFiltered.length) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(problemasPorTipo).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum problema no período
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
