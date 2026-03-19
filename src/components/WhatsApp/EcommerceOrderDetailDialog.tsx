import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, MapPin, Package, Calendar, Truck, Download, Loader2, CreditCard } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { wbuyStatusLabels, wbuyStatusColors } from '@/hooks/useOrders';
import { useState } from 'react';
import { toast } from 'sonner';

interface EcommerceOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
}

// Fallback para status interno
const fallbackLabels: Record<string, string> = {
  pending: 'Aguardando Pagamento',
  processing: 'Processando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  payment_denied: 'Pagamento Negado',
};

const fallbackColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  payment_denied: 'bg-red-100 text-red-800',
};

export default function EcommerceOrderDetailDialog({
  open,
  onOpenChange,
  orderId,
}: EcommerceOrderDetailDialogProps) {
  const [enriching, setEnriching] = useState(false);
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['ecommerce-order-detail', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId && open,
  });

  const handleEnrich = async () => {
    if (!order?.store_code || !order?.external_id) {
      toast.error('Pedido sem loja ou ID externo');
      return;
    }
    setEnriching(true);
    try {
      const { data, error } = await supabase.functions.invoke('wbuy-api-proxy', {
        body: { store_code: order.store_code, action: 'enrich', params: { order_id: order.id } },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Dados complementares atualizados!');
        queryClient.invalidateQueries({ queryKey: ['ecommerce-order-detail', orderId] });
      } else {
        toast.error(data?.error || 'Erro ao buscar dados');
      }
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setEnriching(false);
    }
  };

  if (!orderId) return null;

  // Parse items from JSON
  const items = order?.items ? (Array.isArray(order.items) ? order.items : []) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-lg">
            Pedido #{order?.order_number || '...'}
          </DialogTitle>
          {order && (
            <Badge className={order.wbuy_status_code ? wbuyStatusColors[order.wbuy_status_code] : (fallbackColors[order.status] || 'bg-gray-100')}>
              {order.wbuy_status_code ? wbuyStatusLabels[order.wbuy_status_code] : (fallbackLabels[order.status] || order.status)}
            </Badge>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : order ? (
          <div className="space-y-4">
            {/* Informações do Cliente */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Informações do Cliente</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customer_name}</span>
                </div>
                {order.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{order.customer_email}</span>
                  </div>
                )}
                {order.shipping_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{order.shipping_address}</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Itens do Pedido */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Itens do Pedido</h4>
              <div className="space-y-2">
                {items.length > 0 ? (
                  items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-start text-sm">
                      <div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{item.name || 'Produto'}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">Qtd: {item.quantity || 1}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.price || 0)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Payment & Enrichment */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Pagamento</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Forma
                  </span>
                  <Badge variant="outline">{order.payment_method || 'Não informado'}</Badge>
                </div>
                {order.payment_installments && order.payment_installments > 1 && (
                  <div className="flex items-center justify-between">
                    <span>Parcelas</span>
                    <span>{order.payment_installments}x</span>
                  </div>
                )}
                {order.subtotal != null && (
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                )}
                {order.shipping_cost != null && (
                  <div className="flex items-center justify-between">
                    <span>Frete</span>
                    <span>{formatCurrency(order.shipping_cost)}</span>
                  </div>
                )}
                {order.discount != null && order.discount > 0 && (
                  <div className="flex items-center justify-between">
                    <span>Desconto {order.coupon_code && <span className="text-xs text-muted-foreground">({order.coupon_code})</span>}</span>
                    <span className="text-destructive">-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                {!order.enriched_at && order.store_code && order.external_id && (
                  <Button variant="outline" size="sm" onClick={handleEnrich} disabled={enriching} className="w-full mt-2">
                    {enriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {enriching ? 'Buscando...' : 'Buscar dados completos'}
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Resumo */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Resumo</h4>
              <div className="space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Data do pedido</span>
                  </div>
                  <span className="text-blue-600">
                    {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {order.delivery_estimate && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>Estimativa de entrega</span>
                    </div>
                    <span className="text-blue-600">
                      {format(new Date(order.delivery_estimate), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                )}
                {order.tracking_code && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span>Rastreio</span>
                    </div>
                    <span className="font-mono text-sm">{order.tracking_code}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-lg text-blue-600">
                    {formatCurrency(order.total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Pedido não encontrado</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
