import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Package, Truck, AlertTriangle, ChevronLeft, ChevronRight, CalendarIcon, CheckCircle, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useOrders, isOrderOverdue, Order, getOrderStatusLabel, getOrderStatusColor, wbuyStatusLabels } from '@/hooks/useOrders';
import { useActiveStores } from '@/hooks/useEcommerceStores';
import { StoreBadge } from '@/components/Ecommerce/StoreBadge';
import { parseDateString } from '@/lib/formatters';
import { OrderDetailDialog } from '@/components/TrocasDevolucoes/OrderDetailDialog';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

export default function PedidosLista() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [storeFilter, setStoreFilter] = useState<string>('');
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: stores = [] } = useActiveStores();

  const { data: allOrders = [], isLoading } = useOrders({
    search: search || undefined,
    wbuyStatusCode: statusFilter ? parseInt(statusFilter) : undefined,
    storeCode: storeFilter || undefined,
    startDate: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : undefined,
    endDate: dateTo ? format(dateTo, 'yyyy-MM-dd') : undefined,
  });

  // Filtro adicional por status de entrega (client-side)
  const orders = useMemo(() => {
    if (deliveryStatusFilter === 'all') return allOrders;
    
    return allOrders.filter(order => {
      const overdue = isOrderOverdue(order);
      if (deliveryStatusFilter === 'overdue') return overdue;
      if (deliveryStatusFilter === 'ontime') return !overdue && order.status !== 'delivered' && order.status !== 'cancelled';
      return true;
    });
  }, [allOrders, deliveryStatusFilter]);

  // Paginação
  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedOrders = orders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleRowClick = (order: Order) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  const getRowClass = (order: Order) => {
    if (isOrderOverdue(order)) {
      return 'bg-red-50 hover:bg-red-100';
    }
    return '';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setStoreFilter('');
    setDeliveryStatusFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const hasActiveFilters = search || statusFilter || storeFilter || deliveryStatusFilter !== 'all' || dateFrom || dateTo;

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, storeFilter, deliveryStatusFilter, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pedidos E-commerce</h1>
        <p className="text-muted-foreground">Pedidos recebidos via WBuy</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filtros</CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Busca */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pedido, cliente ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Loja */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Loja</label>
              <Select value={storeFilter || "all"} onValueChange={(v) => setStoreFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as lojas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Todas as lojas
                    </div>
                  </SelectItem>
                  {stores.map((store) => (
                    <SelectItem key={store.codigo} value={store.codigo}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: store.cor }}
                        />
                        {store.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {Object.entries(wbuyStatusLabels).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status de Entrega */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Status Entrega</label>
              <Select value={deliveryStatusFilter} onValueChange={setDeliveryStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ontime">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Em dia
                    </div>
                  </SelectItem>
                  <SelectItem value="overdue">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      Atrasado
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data De */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Data Início</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Data Até */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Data Fim</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Selecionar'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {orders.length} pedido(s) encontrado(s)
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Entrega Prevista</TableHead>
                <TableHead>Rastreio</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => {
                  const overdue = isOrderOverdue(order);
                  const store = stores.find(s => s.codigo === order.store_code);
                  return (
                    <TableRow 
                      key={order.id} 
                      className={`${getRowClass(order)} cursor-pointer hover:bg-muted/50`}
                      onClick={() => handleRowClick(order)}
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(new Date(order.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), 'HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {order.order_number}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StoreBadge 
                          storeCode={order.store_code} 
                          storeName={store?.nome}
                          storeColor={store?.cor}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.customer_name}</span>
                          <span className="text-xs text-muted-foreground">{order.customer_email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(order.total)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.delivery_estimate ? (
                            <>
                              {format(parseDateString(order.delivery_estimate), 'dd/MM/yyyy', { locale: ptBR })}
                              {overdue && (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.tracking_code ? (
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{order.tracking_code}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getOrderStatusColor(order)}>
                          {getOrderStatusLabel(order)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + ITEMS_PER_PAGE, orders.length)} de {orders.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <OrderDetailDialog
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
