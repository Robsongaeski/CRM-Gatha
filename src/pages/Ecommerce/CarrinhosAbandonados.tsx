import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAbandonedCarts, AbandonedCart, AbandonedCartItem } from '@/hooks/useAbandonedCarts';
import { useActiveStores } from '@/hooks/useEcommerceStores';
import { formatCurrency } from '@/lib/formatters';
import { formatDistanceToNow, format, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StoreBadge } from '@/components/Ecommerce/StoreBadge';
import {
  ShoppingCart,
  Search,
  MessageCircle,
  ExternalLink,
  Eye,
  TrendingUp,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Package,
  Download,
  Filter,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function CarrinhosAbandonados() {
  const navigate = useNavigate();
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('abandoned');
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [selectedCart, setSelectedCart] = useState<AbandonedCart | null>(null);

  const { data: stores } = useActiveStores();
  const { carts: allCarts, isLoading, stats, statsLoading, markAsExpired } = useAbandonedCarts({
    storeCode: storeFilter,
    status: statusFilter as any,
    search: search.trim() || undefined,
  });

  // Filter by product name
  const carts = useMemo(() => {
    if (!productFilter.trim()) return allCarts;
    const term = productFilter.toLowerCase();
    return allCarts.filter(cart =>
      cart.items.some((item: AbandonedCartItem) =>
        item.name?.toLowerCase().includes(term)
      )
    );
  }, [allCarts, productFilter]);

  // Format time abandoned for export
  const formatTimeAbandoned = (abandonedAt: string) => {
    const now = new Date();
    const abandoned = new Date(abandonedAt);
    const hours = differenceInHours(now, abandoned);
    if (hours < 1) {
      return `${differenceInMinutes(now, abandoned)} minutos`;
    }
    if (hours < 24) return `${hours} horas`;
    const days = Math.floor(hours / 24);
    return `${days} dia${days > 1 ? 's' : ''}`;
  };

  // Export filtered carts to CSV
  const handleExport = () => {
    if (carts.length === 0) {
      toast.error('Nenhum carrinho para exportar');
      return;
    }

    const rows: string[][] = [
      ['Nome', 'Telefone', 'Email', 'Produto', 'Data Abandono', 'Tempo Abandonado', 'Link Carrinho'],
    ];

    carts.forEach(cart => {
      const firstName = cart.customer_name?.split(' ')[0] || '';
      const phone = cart.customer_phone || '';
      const email = cart.customer_email || '';
      const timeAbandoned = formatTimeAbandoned(cart.abandoned_at);
      const dataAbandono = format(new Date(cart.abandoned_at), 'dd/MM/yyyy HH:mm', { locale: ptBR });
      const link = cart.recovery_url || '';

      // One row per product in the cart
      cart.items.forEach((item: AbandonedCartItem) => {
        // If product filter active, only export matching products
        if (productFilter.trim()) {
          if (!item.name?.toLowerCase().includes(productFilter.toLowerCase())) return;
        }
        rows.push([
          firstName,
          phone,
          email,
          item.name || '',
          dataAbandono,
          timeAbandoned,
          link,
        ]);
      });
    });

    const csvContent = rows.map(row =>
      row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carrinhos-abandonados-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length - 1} registros exportados`);
  };

  // Navegar para o sistema interno de WhatsApp com o telefone do cliente
  const handleOpenWhatsApp = (phone: string | null, customerName: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    // Navega para o atendimento WhatsApp passando telefone e nome como params
    navigate(`/whatsapp/atendimento?telefone=${cleanPhone}&nome=${encodeURIComponent(customerName)}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'abandoned':
        return <Badge variant="destructive">Abandonado</Badge>;
      case 'recovered':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Recuperado</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expirado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Carrinhos Abandonados</h1>
            <p className="text-muted-foreground">
              Gerencie e recupere vendas de carrinhos abandonados
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abandonados</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.totalAbandoned || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.valueAbandoned || 0)} em potencial
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recuperados</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-600">{stats?.totalRecovered || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats?.valueRecovered || 0)} recuperado
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Recuperação</CardTitle>
            <RefreshCw className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{(stats?.recoveryRate || 0).toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">dos carrinhos</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Potencial</CardTitle>
            <DollarSign className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-warning">
                  {formatCurrency(stats?.valueAbandoned || 0)}
                </div>
                <p className="text-xs text-muted-foreground">a recuperar</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="relative min-w-[200px] max-w-[240px]">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filtrar por produto..."
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por loja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as lojas</SelectItem>
            {stores?.map((store) => (
              <SelectItem key={store.id} value={store.codigo}>
                {store.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="abandoned">Abandonados</SelectItem>
            <SelectItem value="recovered">Recuperados</SelectItem>
            <SelectItem value="expired">Expirados</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={handleExport} disabled={carts.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar ({carts.length})
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-center">Itens</TableHead>
                <TableHead>Abandonado há</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : carts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ShoppingCart className="h-8 w-8" />
                      <p>Nenhum carrinho abandonado encontrado</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                carts.map((cart) => (
                  <TableRow key={cart.id}>
                    <TableCell>
                      <StoreBadge
                        storeCode={cart.store_code}
                        storeName={cart.ecommerce_stores?.nome}
                        storeColor={cart.ecommerce_stores?.cor}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{cart.customer_name}</p>
                        {cart.customer_email && (
                          <p className="text-xs text-muted-foreground">{cart.customer_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {cart.customer_phone ? (
                        <span className="text-sm">{cart.customer_phone}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cart.total)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{cart.items.length}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(cart.abandoned_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(cart.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedCart(cart)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {cart.customer_phone && cart.status === 'abandoned' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenWhatsApp(cart.customer_phone, cart.customer_name)}
                            title="Contato via WhatsApp interno"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {cart.recovery_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            title="Abrir link de recuperação"
                          >
                            <a
                              href={cart.recovery_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedCart} onOpenChange={() => setSelectedCart(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Detalhes do Carrinho
            </DialogTitle>
          </DialogHeader>

          {selectedCart && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="rounded-lg border p-4 space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Cliente</h4>
                <p className="font-medium">{selectedCart.customer_name}</p>
                {selectedCart.customer_email && (
                  <p className="text-sm">{selectedCart.customer_email}</p>
                )}
                {selectedCart.customer_phone && (
                  <p className="text-sm">{selectedCart.customer_phone}</p>
                )}
              </div>

              {/* Items */}
              <div className="rounded-lg border p-4 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos ({selectedCart.items.length})
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedCart.items.map((item: AbandonedCartItem, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-0">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.sku && `SKU: ${item.sku}`}
                          {item.color && ` | Cor: ${item.color}`}
                          {item.size && ` | Tam: ${item.size}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p>{item.quantity}x {formatCurrency(item.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-medium pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(selectedCart.total)}</span>
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <StoreBadge
                    storeCode={selectedCart.store_code}
                    storeName={selectedCart.ecommerce_stores?.nome}
                    storeColor={selectedCart.ecommerce_stores?.cor}
                  />
                  {getStatusBadge(selectedCart.status)}
                </div>
                <span>
                  {format(new Date(selectedCart.abandoned_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>

              {/* Actions */}
              {selectedCart.status === 'abandoned' && (
                <div className="flex gap-2 pt-2">
                  {selectedCart.customer_phone && (
                    <Button 
                      className="flex-1" 
                      variant="default"
                      onClick={() => {
                        setSelectedCart(null);
                        handleOpenWhatsApp(selectedCart.customer_phone, selectedCart.customer_name);
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      WhatsApp
                    </Button>
                  )}
                  {selectedCart.recovery_url && (
                    <Button asChild variant="outline" className="flex-1">
                      <a
                        href={selectedCart.recovery_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Link Carrinho
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
