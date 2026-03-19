import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, DollarSign, Package, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { parseDateString } from '@/lib/formatters';

interface PedidoDetalhesPopoverProps {
  children: React.ReactNode;
  pedido: {
    id: string;
    numero_pedido: number;
    data_entrega: string | null;
    status: string;
    valor_total: number;
    observacao?: string | null;
    cliente?: { nome_razao_social: string } | null;
    etapa?: { nome_etapa: string; cor_hex: string | null } | null;
    itens?: Array<{ quantidade: number; produto?: { nome: string } }>;
  };
}

export function PedidoDetalhesPopover({ children, pedido }: PedidoDetalhesPopoverProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      em_producao: { label: 'Em Produção', variant: 'secondary' },
      pronto: { label: 'Pronto', variant: 'default' },
      entregue: { label: 'Entregue', variant: 'outline' },
      cancelado: { label: 'Cancelado', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalItens = pedido.itens?.reduce((sum, item) => sum + item.quantidade, 0) || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-lg">#{pedido.numero_pedido}</h3>
              <p className="text-sm text-muted-foreground">
                {pedido.cliente?.nome_razao_social || 'Cliente não informado'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {pedido.data_entrega 
                  ? format(parseDateString(pedido.data_entrega) || new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : 'Data não definida'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {getStatusBadge(pedido.status)}
            </div>

            {pedido.etapa && (
              <div className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: pedido.etapa.cor_hex || 'hsl(var(--primary))' }}
                />
                <span>{pedido.etapa.nome_etapa}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">R$ {pedido.valor_total.toFixed(2)}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span>{totalItens} {totalItens === 1 ? 'item' : 'itens'}</span>
            </div>

            {pedido.observacao && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">Observação:</p>
                <p className="text-sm">{pedido.observacao}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={() => {
                setOpen(false);
                navigate(`/pedidos/${pedido.id}`);
              }}
            >
              Ver Detalhes
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Fechar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
