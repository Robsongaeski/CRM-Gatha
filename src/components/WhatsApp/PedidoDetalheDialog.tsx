import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PedidoDetalheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: {
    id: string;
    numero_pedido: number;
    data_pedido: string;
    valor_total: number;
    status: string;
  } | null;
}

const statusLabels: Record<string, string> = {
  orcamento: 'Orçamento',
  confirmado: 'Confirmado',
  em_producao: 'Em Produção',
  pronto_entrega: 'Pronto p/ Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  orcamento: 'bg-blue-100 text-blue-800',
  confirmado: 'bg-green-100 text-green-800',
  em_producao: 'bg-yellow-100 text-yellow-800',
  pronto_entrega: 'bg-purple-100 text-purple-800',
  entregue: 'bg-gray-100 text-gray-800',
  cancelado: 'bg-red-100 text-red-800',
};

export default function PedidoDetalheDialog({
  open,
  onOpenChange,
  pedido,
}: PedidoDetalheDialogProps) {
  const navigate = useNavigate();

  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pedido #{pedido.numero_pedido}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge className={statusColors[pedido.status] || 'bg-gray-100'}>
              {statusLabels[pedido.status] || pedido.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Data</span>
            <span className="font-medium">
              {format(new Date(pedido.data_pedido), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Valor Total</span>
            <span className="font-semibold text-lg">
              {formatCurrency(pedido.valor_total)}
            </span>
          </div>

          <Button
            className="w-full"
            onClick={() => {
              navigate(`/pedidos/${pedido.id}`);
              onOpenChange(false);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Detalhes Completos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
