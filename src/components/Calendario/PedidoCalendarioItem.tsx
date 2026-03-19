import { cn } from '@/lib/utils';
import { isPast, isToday } from 'date-fns';
import { parseDateString } from '@/lib/formatters';

interface PedidoCalendarioItemProps {
  pedido: {
    id: string;
    numero_pedido: number;
    data_entrega: string | null;
    status: string;
    valor_total: number;
    cliente?: { nome_razao_social: string } | null;
    etapa?: { nome_etapa: string; cor_hex: string | null } | null;
    itens?: Array<{ 
      id: string;
      quantidade: number; 
      foto_modelo_url?: string | null;
      produto?: { nome: string } 
    }>;
  };
  onClick?: () => void;
  compact?: boolean;
}

export function PedidoCalendarioItem({ pedido, onClick, compact = false }: PedidoCalendarioItemProps) {
  const dataEntrega = parseDateString(pedido.data_entrega);
  const isAtrasado = dataEntrega && isPast(dataEntrega) && !isToday(dataEntrega) && pedido.status !== 'entregue';
  
  // Encontrar primeira foto disponível
  const primeiraFoto = pedido.itens?.find(item => item.foto_modelo_url)?.foto_modelo_url;
  
  const getCorPedido = () => {
    if (isAtrasado) return 'hsl(0 84.2% 60.2%)'; // destructive
    if (pedido.status === 'entregue') return 'hsl(215.4 16.3% 46.9%)'; // muted-foreground
    if (pedido.status === 'pronto') return 'hsl(142 76% 36%)'; // secondary/green
    if (pedido.etapa?.cor_hex) return pedido.etapa.cor_hex;
    return 'hsl(38 92% 50%)'; // brand-accent/orange for em_producao
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded px-2 py-1 text-xs cursor-pointer transition-all hover:opacity-80",
        compact ? "truncate" : "space-y-0.5"
      )}
      style={{ 
        backgroundColor: getCorPedido(),
        color: 'white',
      }}
    >
      <div className="font-medium truncate flex items-center gap-1.5">
        {primeiraFoto && (
          <img 
            src={primeiraFoto} 
            alt="" 
            className="w-4 h-4 rounded object-cover flex-shrink-0"
          />
        )}
        <span className="truncate">
          #{pedido.numero_pedido} - {pedido.cliente?.nome_razao_social || 'Cliente'}
        </span>
      </div>
      {!compact && (
        <div className="text-[10px] opacity-90 truncate">
          {pedido.etapa?.nome_etapa || pedido.status}
        </div>
      )}
    </div>
  );
}
