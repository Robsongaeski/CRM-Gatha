import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Mail, MapPin, Package, Calendar, Clock, Truck, AlertTriangle, Phone, CreditCard, Copy, Check, History, Store, Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Order, isOrderOverdue, getOrderStatusLabel, getOrderStatusColor, wbuyStatusLabels, wbuyStatusColors } from '@/hooks/useOrders';
import { StoreBadge } from '@/components/Ecommerce/StoreBadge';
import { parseDateString } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface OrderDetailDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Status que indicam pagamento PIX
const pixPaymentStatuses = [1, 2, 3, 4, 5, 6, 7, 8, 10, 14, 15, 16];

// Gerar histórico baseado nas datas e status
function generateOrderHistory(order: Order) {
  const history: { date: string; status: string; agent: string; color: string }[] = [];
  
  // Data de criação - sempre o primeiro status
  history.push({
    date: order.created_at,
    status: 'Aguardando pagamento',
    agent: 'Sistema',
    color: wbuyStatusColors[1] || 'bg-gray-100 text-gray-800',
  });

  // Se tem wbuy_status_code diferente de 1, houve atualização
  if (order.wbuy_status_code && order.wbuy_status_code > 1 && order.created_at !== order.updated_at) {
    history.push({
      date: order.updated_at,
      status: wbuyStatusLabels[order.wbuy_status_code] || getOrderStatusLabel(order),
      agent: 'WBuy',
      color: wbuyStatusColors[order.wbuy_status_code] || 'bg-gray-100 text-gray-800',
    });
  }

  return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function OrderDetailDialog({ order, open, onOpenChange }: OrderDetailDialogProps) {
  const [copied, setCopied] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const queryClient = useQueryClient();
  if (!order) return null;

  const overdue = isOrderOverdue(order);
  const isPix = order.pix_key || pixPaymentStatuses.includes(order.wbuy_status_code || 0);
  const history = generateOrderHistory(order);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleCopyPix = async () => {
    if (order.pix_key) {
      try {
        await navigator.clipboard.writeText(order.pix_key);
        setCopied(true);
        toast.success('Chave PIX copiada!');
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        toast.error('Erro ao copiar');
      }
    }
  };

  const items = Array.isArray(order.items) ? order.items : [];

  const handleEnrich = async () => {
    if (!order.store_code || !order.external_id) {
      toast.error('Pedido sem loja ou ID externo associado');
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
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      } else {
        toast.error(data?.error || 'Erro ao buscar dados');
      }
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setEnriching(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">Pedido #{order.order_number}</DialogTitle>
              <StoreBadge storeCode={order.store_code} />
            </div>
            <Badge className={getOrderStatusColor(order)}>
              {getOrderStatusLabel(order)}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Customer Info */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Informações do Cliente</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{order.customer_name}</span>
                </div>
                {order.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{order.customer_email}</span>
                  </div>
                )}
                {order.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{order.customer_phone}</span>
                  </div>
                )}
                {order.customer_document && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-mono">{order.customer_document}</span>
                  </div>
                )}
                {order.shipping_address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{order.shipping_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Pagamento</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    Forma de pagamento
                  </span>
                  <Badge variant="outline">
                    {order.payment_method || (isPix ? 'PIX' : 'Outro')}
                  </Badge>
                </div>
                {order.payment_installments && order.payment_installments > 1 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Parcelas</span>
                    <span>{order.payment_installments}x</span>
                  </div>
                )}
                {order.subtotal != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Subtotal produtos</span>
                    <span>{formatCurrency(order.subtotal)}</span>
                  </div>
                )}
                {order.shipping_cost != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Frete</span>
                    <span>{formatCurrency(order.shipping_cost)}</span>
                  </div>
                )}
                {order.discount != null && order.discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>Desconto {order.coupon_code && <span className="text-xs text-muted-foreground">({order.coupon_code})</span>}</span>
                    <span className="text-destructive">-{formatCurrency(order.discount)}</span>
                  </div>
                )}
                
                {isPix && order.pix_key && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Chave PIX</span>
                      <Button variant="outline" size="sm" onClick={handleCopyPix} className="h-8 gap-2">
                        {copied ? <><Check className="h-4 w-4 text-green-600" />Copiado!</> : <><Copy className="h-4 w-4" />Copiar PIX</>}
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground bg-muted rounded p-2 font-mono break-all">
                      {order.pix_key.substring(0, 80)}...
                    </div>
                  </div>
                )}

                {!order.enriched_at && order.store_code && order.external_id && (
                  <Button variant="outline" size="sm" onClick={handleEnrich} disabled={enriching} className="w-full mt-2">
                    {enriching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {enriching ? 'Buscando...' : 'Buscar dados completos via API'}
                  </Button>
                )}
                {order.enriched_at && (
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Dados enriquecidos em {format(new Date(order.enriched_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            {items.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">Itens do Pedido</h3>
                <div className="space-y-3">
                  {items.map((item: any, index: number) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                        {item.color && <p className="text-xs text-muted-foreground">Cor: {item.color}</p>}
                        {item.size && <p className="text-xs text-muted-foreground">Tamanho: {item.size}</p>}
                      </div>
                      <span className="font-medium text-sm">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Resumo</h3>
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Data do pedido
                  </span>
                  <span>{format(parseDateString(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    Última atualização
                  </span>
                  <span>{format(parseDateString(order.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
                {order.delivery_estimate && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      Estimativa de entrega
                    </span>
                    <span className={overdue ? 'text-destructive font-medium flex items-center gap-1' : 'text-primary'}>
                      {format(parseDateString(order.delivery_estimate), 'dd/MM/yyyy', { locale: ptBR })}
                      {overdue && <AlertTriangle className="h-4 w-4" />}
                    </span>
                  </div>
                )}
                {order.tracking_code && (
                  <div className="flex items-center justify-between">
                    <span>Código de rastreio</span>
                    <span className="font-mono">{order.tracking_code}</span>
                  </div>
                )}
                {order.carrier && (
                  <div className="flex items-center justify-between">
                    <span>Transportadora</span>
                    <span>{order.carrier}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t mt-2">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg text-primary">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* History */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico do Pedido
              </h3>
              <div className="space-y-3">
                {history.map((entry, index) => (
                  <div key={index} className="flex items-start gap-4 text-sm">
                    <div className="flex flex-col items-end min-w-[100px]">
                      <span className="font-medium">
                        {format(parseDateString(entry.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(parseDateString(entry.date), 'HH:mm:ss', { locale: ptBR })}
                      </span>
                    </div>
                    <Separator orientation="vertical" className="h-auto self-stretch" />
                    <div className="flex-1">
                      <Badge className={entry.color + ' mb-1'}>{entry.status}</Badge>
                      <p className="text-xs text-muted-foreground">{entry.agent}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observations */}
            {order.observations && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-3">Observações</h3>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm">{order.observations}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
