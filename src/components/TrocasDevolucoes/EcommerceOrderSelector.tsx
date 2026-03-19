import { useState, useEffect } from 'react';
import { Search, Package, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOrders, Order } from '@/hooks/useOrders';

interface EcommerceOrderSelectorProps {
  value: string;
  onChange: (orderNumber: string) => void;
  onOrderSelect?: (order: Order | null) => void;
  disabled?: boolean;
}

export function EcommerceOrderSelector({
  value,
  onChange,
  onOrderSelect,
  disabled,
}: EcommerceOrderSelectorProps) {
  const [search, setSearch] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders = [] } = useOrders({ search: search.length >= 2 ? search : undefined });

  useEffect(() => {
    setSearch(value || '');
  }, [value]);

  const handleSelectOrder = (order: Order) => {
    setSelectedOrder(order);
    onChange(order.order_number);
    setSearch(order.order_number);
    setIsOpen(false);
    onOrderSelect?.(order);
  };

  const handleClearSelection = () => {
    setSelectedOrder(null);
    onChange('');
    setSearch('');
    onOrderSelect?.(null);
  };

  const handleManualInput = (inputValue: string) => {
    setSearch(inputValue);
    onChange(inputValue);
    if (selectedOrder && inputValue !== selectedOrder.order_number) {
      setSelectedOrder(null);
      onOrderSelect?.(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    shipped: 'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite o número do pedido ou busque..."
            value={search}
            onChange={(e) => handleManualInput(e.target.value)}
            onFocus={() => setIsOpen(true)}
            disabled={disabled}
            className="pl-10"
          />
        </div>
        {selectedOrder && (
          <Button type="button" variant="ghost" size="icon" onClick={handleClearSelection}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {selectedOrder && (
        <Card className="mt-2 bg-muted/50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Pedido selecionado:</span>
              <Badge variant="secondary">{selectedOrder.order_number}</Badge>
              <span className="text-muted-foreground">-</span>
              <span>{selectedOrder.customer_name}</span>
              <span className="text-muted-foreground ml-auto">{formatCurrency(selectedOrder.total)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {isOpen && search.length >= 2 && orders.length > 0 && !selectedOrder && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg">
          <ScrollArea className="max-h-[300px]">
            <CardContent className="p-0">
              {orders.slice(0, 10).map((order) => (
                <button
                  key={order.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-muted border-b last:border-b-0 transition-colors"
                  onClick={() => handleSelectOrder(order)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.order_number}</span>
                        <Badge variant="outline" className="text-xs">
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                      {order.customer_phone && (
                        <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                      )}
                    </div>
                    <span className="font-medium text-sm">{formatCurrency(order.total)}</span>
                  </div>
                </button>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>
      )}

      {isOpen && search.length >= 2 && orders.length === 0 && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg">
          <CardContent className="p-4 text-center text-muted-foreground text-sm">
            Nenhum pedido encontrado. Continue digitando para cadastrar manualmente.
          </CardContent>
        </Card>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
