import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Search, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveStores } from '@/hooks/useEcommerceStores';
import { useDailySalesReport, useProductSalesReport, useProductRanking } from '@/hooks/useEcommerceRelatorios';

function DatePicker({ date, onSelect, label }: { date: Date | undefined; onSelect: (d: Date | undefined) => void; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('w-[160px] justify-start text-left font-normal', !date && 'text-muted-foreground')}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'dd/MM/yyyy') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onSelect} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
      </PopoverContent>
    </Popover>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export default function RelatoriosEcommerce() {
  const [startDate, setStartDate] = useState<Date | undefined>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [storeCode, setStoreCode] = useState<string>('');
  const [productSearch, setProductSearch] = useState('');
  const [rankingLimit, setRankingLimit] = useState(20);

  const { data: stores = [] } = useActiveStores();

  const filters = useMemo(() => ({
    startDate: startDate ? format(startDate, 'yyyy-MM-dd') : '',
    endDate: endDate ? format(endDate, 'yyyy-MM-dd') : '',
    storeCode: storeCode && storeCode !== 'all' ? storeCode : undefined,
  }), [startDate, endDate, storeCode]);

  const daily = useDailySalesReport(filters);
  const products = useProductSalesReport(filters, productSearch);
  const ranking = useProductRanking(filters, rankingLimit);

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios E-commerce</h1>
        <p className="text-muted-foreground">Análise de vendas e desempenho de produtos</p>
      </div>

      {/* Filtros globais */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <DatePicker date={startDate} onSelect={setStartDate} label="Data início" />
            <span className="text-muted-foreground">até</span>
            <DatePicker date={endDate} onSelect={setEndDate} label="Data fim" />
            <Select value={storeCode} onValueChange={setStoreCode}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Todas as lojas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas</SelectItem>
                {stores.map((s) => (
                  <SelectItem key={s.codigo} value={s.codigo}>{s.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Resumo Diário</TabsTrigger>
          <TabsTrigger value="products">Vendas por Produto</TabsTrigger>
          <TabsTrigger value="ranking">Ranking de Produtos</TabsTrigger>
        </TabsList>

        {/* Tab 1: Resumo Diário */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Resumo Diário de Vendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {daily.isLoading ? <LoadingSkeleton /> : daily.rows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum pedido encontrado no período selecionado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Pedidos Total</TableHead>
                      <TableHead className="text-right">Pedidos Pagos</TableHead>
                      <TableHead className="text-right">Ticket Médio</TableHead>
                      <TableHead className="text-right">Total Faturado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daily.rows.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell className="font-medium">{formatDate(row.date)}</TableCell>
                        <TableCell className="text-right">{row.totalOrders}</TableCell>
                        <TableCell className="text-right">{row.paidOrders}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.avgTicket)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.totalBilled)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-right font-bold">{daily.totals.totalOrders}</TableCell>
                      <TableCell className="text-right font-bold">{daily.totals.paidOrders}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(daily.totals.avgTicket)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(daily.totals.totalBilled)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Vendas por Produto */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Vendas por Produto
                </CardTitle>
                <div className="relative sm:ml-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto (ex: pijama)"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 w-[280px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {products.isLoading ? <LoadingSkeleton /> : !productSearch.trim() ? (
                <p className="text-center text-muted-foreground py-8">Digite um termo de busca para filtrar os produtos.</p>
              ) : products.rows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado com o termo "{productSearch}".</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código (SKU)</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd Paga</TableHead>
                      <TableHead className="text-right">Qtd Não Paga</TableHead>
                      <TableHead className="text-right">Qtd Total</TableHead>
                      <TableHead className="text-right">Faturado (Pago)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.rows.map((row) => (
                      <TableRow key={row.sku}>
                        <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right">{row.qtyPaid}</TableCell>
                        <TableCell className="text-right">{row.qtyUnpaid}</TableCell>
                        <TableCell className="text-right">{row.qtyTotal}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.totalBilled)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-right font-bold">{products.totals.qtyPaid}</TableCell>
                      <TableCell className="text-right font-bold">{products.totals.qtyUnpaid}</TableCell>
                      <TableCell className="text-right font-bold">{products.totals.qtyTotal}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(products.totals.totalBilled)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Ranking */}
        <TabsContent value="ranking">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Ranking de Produtos
                </CardTitle>
                <Select value={String(rankingLimit)} onValueChange={(v) => setRankingLimit(Number(v))}>
                  <SelectTrigger className="w-[120px] sm:ml-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="20">Top 20</SelectItem>
                    <SelectItem value="50">Top 50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {ranking.isLoading ? <LoadingSkeleton /> : ranking.rows.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum produto vendido no período selecionado.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd Vendida</TableHead>
                      <TableHead className="text-right">Faturado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.rows.map((row, i) => (
                      <TableRow key={row.sku}>
                        <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right">{row.qtyPaid}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.totalBilled)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
