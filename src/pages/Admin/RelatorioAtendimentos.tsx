import { useEffect, useMemo, useRef, useState } from 'react';
import {
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarIcon,
  FileSpreadsheet,
  GitCompareArrows,
  MessageCircleMore,
  Printer,
  ShoppingCart,
  UserRound,
  Wallet,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import {
  AtendimentoAdminReportFilters,
  useAtendimentoAdminReport,
} from '@/hooks/useAtendimentoAdminReport';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ComparisonMode = 'none' | 'previous_period' | 'other_attendant';

type SummaryItem = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  compareValue: number;
  deltaValue: number;
  isCurrency?: boolean;
};

const performanceChartConfig = {
  attendedConversations: { label: 'Com interação', color: 'hsl(var(--primary))' },
  compareAttendedConversations: { label: 'Comparação', color: '#f59e0b' },
  closedOrders: { label: 'Pedidos fechados', color: '#10b981' },
  closedOrdersValue: { label: 'Valor dos pedidos', color: '#0f766e' },
} satisfies ChartConfig;

const originChartConfig = {
  startedByCustomer: { label: 'Iniciado pelo cliente', color: '#0ea5e9' },
  startedByAttendant: { label: 'Iniciado pelo atendente', color: '#8b5cf6' },
} satisfies ChartConfig;

function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: Date;
  to: Date;
  onChange: (range: { from: Date; to: Date }) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-[280px] justify-start text-left font-normal')}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(from, 'dd/MM/yyyy', { locale: ptBR })} até {format(to, 'dd/MM/yyyy', { locale: ptBR })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from, to }}
          onSelect={(range) => {
            if (range?.from && range?.to) {
              onChange({ from: range.from, to: range.to });
            }
          }}
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}

function LoadingCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full" />
      ))}
    </div>
  );
}

function getDeltaDescription(currentValue: number, comparisonValue: number, isCurrency = false) {
  const delta = currentValue - comparisonValue;
  const signal = delta === 0 ? 'Sem variação' : delta > 0 ? 'Acima' : 'Abaixo';
  const absolute = isCurrency ? formatCurrency(Math.abs(delta)) : Math.abs(delta).toLocaleString('pt-BR');
  return `${signal} ${absolute} do comparativo`;
}

function getPercentage(value: number, total: number) {
  if (!total) return 0;
  return (value / total) * 100;
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export default function RelatorioAtendimentos() {
  const printRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    from: startOfWeek(today, { weekStartsOn: 1 }),
    to: endOfWeek(today, { weekStartsOn: 1 }),
  });
  const [selectedAttendantId, setSelectedAttendantId] = useState<string>('');
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('none');
  const [comparisonAttendantId, setComparisonAttendantId] = useState<string>('none');

  const { data: attendants = [] } = useQuery({
    queryKey: ['admin-report-whatsapp-linked-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instance_users')
        .select(`
          user_id,
          user:profiles!user_id(id, nome, email, ativo),
          instance:whatsapp_instances!inner(id, nome, is_active)
        `)
        .eq('instance.is_active', true);

      if (error) throw error;

      const usersMap = new Map<string, { id: string; nome: string; email?: string | null }>();

      (data || []).forEach((item) => {
        const user = item.user;
        if (!user?.id || user.ativo === false) return;

        if (!usersMap.has(user.id)) {
          usersMap.set(user.id, {
            id: user.id,
            nome: user.nome,
            email: user.email,
          });
        }
      });

      return Array.from(usersMap.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    },
  });

  const attendantNameMap = useMemo(
    () => new Map(attendants.map((attendant) => [attendant.id, attendant.nome])),
    [attendants],
  );

  useEffect(() => {
    if (attendants.length === 0) return;
    const hasCurrentSelection = attendants.some((attendant) => attendant.id === selectedAttendantId);
    if (!selectedAttendantId || !hasCurrentSelection) {
      setSelectedAttendantId(attendants[0].id);
    }
  }, [attendants, selectedAttendantId]);

  const selectedAttendantIds = useMemo(() => {
    if (selectedAttendantId === 'all') return attendants.map((attendant) => attendant.id);
    return attendants.some((attendant) => attendant.id === selectedAttendantId) ? [selectedAttendantId] : [];
  }, [attendants, selectedAttendantId]);

  const primaryFilters = useMemo<AtendimentoAdminReportFilters | null>(() => {
    if (selectedAttendantIds.length === 0) return null;
    return {
      startDate: format(dateRange.from, 'yyyy-MM-dd'),
      endDate: format(dateRange.to, 'yyyy-MM-dd'),
      attendantIds: selectedAttendantIds,
    };
  }, [dateRange.from, dateRange.to, selectedAttendantIds]);

  const comparisonFilters = useMemo<AtendimentoAdminReportFilters | null>(() => {
    if (comparisonMode === 'none' || selectedAttendantIds.length === 0) return null;

    if (comparisonMode === 'previous_period') {
      const periodLength = differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
      const previousTo = subDays(dateRange.from, 1);
      const previousFrom = subDays(previousTo, periodLength - 1);
      return {
        startDate: format(previousFrom, 'yyyy-MM-dd'),
        endDate: format(previousTo, 'yyyy-MM-dd'),
        attendantIds: selectedAttendantIds,
      };
    }

    if (comparisonAttendantId === 'none') return null;
    return {
      startDate: format(dateRange.from, 'yyyy-MM-dd'),
      endDate: format(dateRange.to, 'yyyy-MM-dd'),
      attendantIds: [comparisonAttendantId],
    };
  }, [comparisonAttendantId, comparisonMode, dateRange.from, dateRange.to, selectedAttendantIds]);

  const primaryReport = useAtendimentoAdminReport(primaryFilters);
  const comparisonReport = useAtendimentoAdminReport(comparisonFilters);
  const comparisonLabel = useMemo(() => {
    if (!comparisonFilters) return null;

    if (comparisonMode === 'previous_period') {
      return `${format(parseISO(comparisonFilters.startDate), 'dd/MM', { locale: ptBR })} até ${format(parseISO(comparisonFilters.endDate), 'dd/MM', { locale: ptBR })}`;
    }

    return attendantNameMap.get(comparisonAttendantId) || 'Atendente comparado';
  }, [attendantNameMap, comparisonAttendantId, comparisonFilters, comparisonMode]);

  const mergedDaily = useMemo(() => {
    const currentDaily = primaryReport.data?.daily || [];
    const compareDaily = comparisonReport.data?.daily || [];
    return currentDaily.map((item, index) => ({
      ...item,
      compareAttendedConversations: compareDaily[index]?.attendedConversations || 0,
    }));
  }, [comparisonReport.data?.daily, primaryReport.data?.daily]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relatorio-Atendimentos-${format(dateRange.from, 'dd-MM-yyyy')}-${format(dateRange.to, 'dd-MM-yyyy')}`,
  });

  const currentSummary = primaryReport.data?.summary;
  const compareSummary = comparisonReport.data?.summary;
  const selectedAttendantName = selectedAttendantId === 'all'
    ? 'Todos os atendentes'
    : attendantNameMap.get(selectedAttendantId) || 'Atendente';

  const currentNewConversations = (currentSummary?.startedByCustomer || 0) + (currentSummary?.startedByAttendant || 0);
  const compareNewConversations = (compareSummary?.startedByCustomer || 0) + (compareSummary?.startedByAttendant || 0);
  const currentRecurringConversations = Math.max((currentSummary?.attendedConversations || 0) - currentNewConversations, 0);
  const currentConversionRate = getPercentage(currentSummary?.closedOrders || 0, currentSummary?.attendedConversations || 0);
  const currentNewConversionRate = getPercentage(currentSummary?.closedOrders || 0, currentNewConversations);
  const currentAverageTicket = currentSummary?.closedOrders
    ? Number(currentSummary.closedOrdersValue || 0) / Number(currentSummary.closedOrders || 0)
    : 0;
  const compareAverageTicket = compareSummary?.closedOrders
    ? Number(compareSummary.closedOrdersValue || 0) / Number(compareSummary.closedOrders || 0)
    : 0;

  const summaryItems: SummaryItem[] = [
    {
      key: 'attendedConversations',
      title: 'Atendimentos no período',
      value: Number(currentSummary?.attendedConversations || 0).toLocaleString('pt-BR'),
      subtitle: `${currentNewConversations.toLocaleString('pt-BR')} novos e ${currentRecurringConversations.toLocaleString('pt-BR')} recorrentes`,
      compareValue: Number(compareSummary?.attendedConversations || 0),
      deltaValue: Number(currentSummary?.attendedConversations || 0),
    },
    {
      key: 'startedByCustomer',
      title: 'Iniciados pelo cliente',
      value: Number(currentSummary?.startedByCustomer || 0).toLocaleString('pt-BR'),
      subtitle: `${formatPercent(getPercentage(currentSummary?.startedByCustomer || 0, currentNewConversations))} dos novos`,
      compareValue: Number(compareSummary?.startedByCustomer || 0),
      deltaValue: Number(currentSummary?.startedByCustomer || 0),
    },
    {
      key: 'startedByAttendant',
      title: 'Iniciados pelo atendente',
      value: Number(currentSummary?.startedByAttendant || 0).toLocaleString('pt-BR'),
      subtitle: `${formatPercent(getPercentage(currentSummary?.startedByAttendant || 0, currentNewConversations))} dos novos`,
      compareValue: Number(compareSummary?.startedByAttendant || 0),
      deltaValue: Number(currentSummary?.startedByAttendant || 0),
    },
    {
      key: 'closedOrders',
      title: 'Pedidos fechados',
      value: Number(currentSummary?.closedOrders || 0).toLocaleString('pt-BR'),
      subtitle: `${formatPercent(currentConversionRate)} de conversão geral`,
      compareValue: Number(compareSummary?.closedOrders || 0),
      deltaValue: Number(currentSummary?.closedOrders || 0),
    },
    {
      key: 'closedOrdersValue',
      title: 'Valor em pedidos',
      value: formatCurrency(Number(currentSummary?.closedOrdersValue || 0)),
      subtitle: `Ticket médio ${formatCurrency(currentAverageTicket)}`,
      compareValue: Number(compareSummary?.closedOrdersValue || 0),
      deltaValue: Number(currentSummary?.closedOrdersValue || 0),
      isCurrency: true,
    },
    {
      key: 'newConversionRate',
      title: 'Conversão dos novos',
      value: formatPercent(currentNewConversionRate),
      subtitle: `${currentNewConversations.toLocaleString('pt-BR')} contatos novos no período`,
      compareValue: compareNewConversations ? getPercentage(compareSummary?.closedOrders || 0, compareNewConversations) : 0,
      deltaValue: currentNewConversionRate,
    },
  ];

  const printInsights = [
    `Conversão geral: ${formatPercent(currentConversionRate)}`,
    `Conversão dos novos: ${formatPercent(currentNewConversionRate)}`,
    `Ticket médio: ${formatCurrency(currentAverageTicket)}`,
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
              <FileSpreadsheet className="h-8 w-8" />
              Relatório de Atendimentos
            </h1>
            <p className="mt-1 text-muted-foreground">
              Análise por atendente com período, origem do atendimento, pedidos fechados, conversão e comparação.
            </p>
          </div>
          <Badge variant="outline" className="w-fit">Administração</Badge>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => handlePrint()}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir relatório
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Escolha o período, o atendente principal e a comparação desejada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <DateRangePicker from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
              <Button variant="outline" onClick={() => setDateRange({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) })}>Esta semana</Button>
              <Button variant="outline" onClick={() => setDateRange({ from: subDays(new Date(), 29), to: new Date() })}>Últimos 30 dias</Button>
              <Button variant="outline" onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}>Este mês</Button>
            </div>

            <Separator />

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Atendente</label>
                <Select value={selectedAttendantId} onValueChange={setSelectedAttendantId}>
                  <SelectTrigger><SelectValue placeholder="Selecione um atendente" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os atendentes</SelectItem>
                    {attendants.map((attendant) => (
                      <SelectItem key={attendant.id} value={attendant.id}>{attendant.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Comparação</label>
                <Select value={comparisonMode} onValueChange={(value) => setComparisonMode(value as ComparisonMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem comparação</SelectItem>
                    <SelectItem value="previous_period">Período anterior</SelectItem>
                    <SelectItem value="other_attendant">Outro atendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Atendente comparado</label>
                <Select value={comparisonAttendantId} onValueChange={setComparisonAttendantId} disabled={comparisonMode !== 'other_attendant'}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {attendants.filter((attendant) => attendant.id !== selectedAttendantId).map((attendant) => (
                      <SelectItem key={attendant.id} value={attendant.id}>{attendant.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
        {primaryReport.isLoading ? (
          <LoadingCards />
        ) : currentSummary ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {summaryItems.map((item) => (
                <SummaryCard
                  key={item.key}
                  title={item.title}
                  value={item.value}
                  subtitle={
                    compareSummary && comparisonLabel
                      ? `${item.subtitle} • ${getDeltaDescription(item.deltaValue, item.compareValue, item.isCurrency)} vs ${comparisonLabel}`
                      : item.subtitle
                  }
                />
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Novos no período</CardTitle>
                  <CardDescription>Conversas que realmente começaram dentro do recorte.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{currentNewConversations.toLocaleString('pt-BR')}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{currentRecurringConversations.toLocaleString('pt-BR')} recorrentes com nova interação.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Taxa de conversão</CardTitle>
                  <CardDescription>Pedidos fechados sobre os atendimentos com conversa no período.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatPercent(currentConversionRate)}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{currentSummary.closedOrders} pedidos em {currentSummary.attendedConversations} atendimentos.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ticket médio</CardTitle>
                  <CardDescription>Valor médio por pedido fechado no período.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(currentAverageTicket)}</div>
                  <p className="mt-2 text-sm text-muted-foreground">Conversão dos novos em {formatPercent(currentNewConversionRate)}.</p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><GitCompareArrows className="h-5 w-5" />Evolução diária</CardTitle>
              <CardDescription>Atendimentos com interação do atendente, pedidos fechados e valor ao longo do período.</CardDescription>
            </CardHeader>
            <CardContent>
              {primaryReport.isLoading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (
                <ChartContainer config={performanceChartConfig} className="h-[320px] w-full">
                  <LineChart data={mergedDaily}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar yAxisId="right" dataKey="closedOrders" fill="var(--color-closedOrders)" radius={4} />
                    <Line yAxisId="left" type="monotone" dataKey="attendedConversations" stroke="var(--color-attendedConversations)" strokeWidth={2} dot={false} />
                    <Line yAxisId="right" type="monotone" dataKey="closedOrdersValue" stroke="var(--color-closedOrdersValue)" strokeWidth={2} dot={false} />
                    {comparisonLabel ? <Line yAxisId="left" type="monotone" dataKey="compareAttendedConversations" stroke="var(--color-compareAttendedConversations)" strokeWidth={2} strokeDasharray="4 4" dot={false} /> : null}
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><MessageCircleMore className="h-5 w-5" />Origem dos atendimentos</CardTitle>
              <CardDescription>Distribuição diária entre conversas iniciadas pelo cliente e pelo atendente.</CardDescription>
            </CardHeader>
            <CardContent>
              {primaryReport.isLoading ? (
                <Skeleton className="h-[320px] w-full" />
              ) : (
                <ChartContainer config={originChartConfig} className="h-[320px] w-full">
                  <BarChart data={primaryReport.data?.daily || []}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="startedByCustomer" fill="var(--color-startedByCustomer)" radius={4} />
                    <Bar dataKey="startedByAttendant" fill="var(--color-startedByAttendant)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />Resumo por atendente</CardTitle>
              <CardDescription>Visão consolidada dos atendentes dentro do filtro atual.</CardDescription>
            </CardHeader>
            <CardContent>
              {primaryReport.isLoading ? (
                <Skeleton className="h-[360px] w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atendente</TableHead>
                      <TableHead className="text-right">Atendimentos</TableHead>
                      <TableHead className="text-right">Início cliente</TableHead>
                      <TableHead className="text-right">Início atendente</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(primaryReport.data?.byAttendant || []).map((row) => (
                      <TableRow key={row.attendantId}>
                        <TableCell className="font-medium">{attendantNameMap.get(row.attendantId) || 'Atendente'}</TableCell>
                        <TableCell className="text-right">{row.attendedConversations}</TableCell>
                        <TableCell className="text-right">{row.startedByCustomer}</TableCell>
                        <TableCell className="text-right">{row.startedByAttendant}</TableCell>
                        <TableCell className="text-right">{row.closedOrders}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.closedOrdersValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Fechamento diário</CardTitle>
              <CardDescription>Pedidos fechados e faturamento por dia dentro do período selecionado.</CardDescription>
            </CardHeader>
            <CardContent>
              {primaryReport.isLoading ? (
                <Skeleton className="h-[360px] w-full" />
              ) : (
                <div className="space-y-3">
                  {(primaryReport.data?.daily || []).map((row) => (
                    <div key={row.date} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{row.label}</span>
                        <span className="text-sm text-muted-foreground">{row.closedOrders} pedido(s)</span>
                      </div>
                      <div className="mt-2 text-lg font-semibold">{formatCurrency(row.closedOrdersValue)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por dia</CardTitle>
            <CardDescription>Tabela diária para facilitar a leitura operacional e a comparação do período.</CardDescription>
          </CardHeader>
          <CardContent>
            {primaryReport.isLoading ? (
              <Skeleton className="h-[420px] w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Atendimentos no período</TableHead>
                    <TableHead className="text-right">Início cliente</TableHead>
                    <TableHead className="text-right">Início atendente</TableHead>
                    <TableHead className="text-right">Pedidos fechados</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(primaryReport.data?.daily || []).map((row) => (
                    <TableRow key={row.date}>
                      <TableCell className="font-medium">{format(parseISO(row.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="text-right">{row.attendedConversations}</TableCell>
                      <TableCell className="text-right">{row.startedByCustomer}</TableCell>
                      <TableCell className="text-right">{row.startedByAttendant}</TableCell>
                      <TableCell className="text-right">{row.closedOrders}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.closedOrdersValue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div ref={printRef} className="hidden print:block">
        <div className="mb-4 border-b pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold">Relatório de Atendimentos</h1>
              <p className="text-xs text-muted-foreground">Atendente: {selectedAttendantName}</p>
              <p className="text-xs text-muted-foreground">Período: {format(dateRange.from, 'dd/MM/yyyy')} até {format(dateRange.to, 'dd/MM/yyyy')}</p>
              <p className="mt-1 text-xs text-muted-foreground">{printInsights.join(' • ')}</p>
            </div>
            <div className="text-right text-xs text-muted-foreground">Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 text-sm">
          <Card className="shadow-none"><CardContent className="pt-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><UserRound className="h-4 w-4" />Atendimentos</div><div className="mt-1 text-xl font-bold">{currentSummary?.attendedConversations || 0}</div></CardContent></Card>
          <Card className="shadow-none"><CardContent className="pt-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><MessageCircleMore className="h-4 w-4" />Início cliente</div><div className="mt-1 text-xl font-bold">{currentSummary?.startedByCustomer || 0}</div></CardContent></Card>
          <Card className="shadow-none"><CardContent className="pt-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShoppingCart className="h-4 w-4" />Início atendente</div><div className="mt-1 text-xl font-bold">{currentSummary?.startedByAttendant || 0}</div></CardContent></Card>
          <Card className="shadow-none"><CardContent className="pt-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><GitCompareArrows className="h-4 w-4" />Conversão geral</div><div className="mt-1 text-xl font-bold">{formatPercent(currentConversionRate)}</div></CardContent></Card>
          <Card className="shadow-none"><CardContent className="pt-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><GitCompareArrows className="h-4 w-4" />Conversão novos</div><div className="mt-1 text-xl font-bold">{formatPercent(currentNewConversionRate)}</div></CardContent></Card>
          <Card className="shadow-none"><CardContent className="pt-3"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Wallet className="h-4 w-4" />Pedidos e valor</div><div className="mt-1 text-xl font-bold">{currentSummary?.closedOrders || 0}</div><div className="text-xs text-muted-foreground">{formatCurrency(currentSummary?.closedOrdersValue || 0)} • ticket {formatCurrency(currentAverageTicket)}</div></CardContent></Card>
        </div>

        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalhamento diário</CardTitle>
            <CardDescription>Distribuição de atendimentos, origem, pedidos e valor por dia.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 px-2 text-xs">Data</TableHead>
                  <TableHead className="h-8 px-2 text-right text-xs">Atend.</TableHead>
                  <TableHead className="h-8 px-2 text-right text-xs">Cliente</TableHead>
                  <TableHead className="h-8 px-2 text-right text-xs">Atend.</TableHead>
                  <TableHead className="h-8 px-2 text-right text-xs">Pedidos</TableHead>
                  <TableHead className="h-8 px-2 text-right text-xs">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(primaryReport.data?.daily || []).map((row) => (
                  <TableRow key={`print-${row.date}`}>
                    <TableCell className="px-2 py-1 text-xs">{format(parseISO(row.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="px-2 py-1 text-right text-xs">{row.attendedConversations}</TableCell>
                    <TableCell className="px-2 py-1 text-right text-xs">{row.startedByCustomer}</TableCell>
                    <TableCell className="px-2 py-1 text-right text-xs">{row.startedByAttendant}</TableCell>
                    <TableCell className="px-2 py-1 text-right text-xs">{row.closedOrders}</TableCell>
                    <TableCell className="px-2 py-1 text-right text-xs">{formatCurrency(row.closedOrdersValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
