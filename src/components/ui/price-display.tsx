import { formatCurrency, calcularDesconto } from '@/lib/formatters';
import { Badge } from '@/components/ui/badge';

interface PriceDisplayProps {
  valorBase: number;
  valorUnitario: number;
  showBadge?: boolean;
}

export function PriceDisplay({ valorBase, valorUnitario, showBadge = true }: PriceDisplayProps) {
  const desconto = calcularDesconto(valorBase, valorUnitario);
  
  if (!desconto) {
    return <span>{formatCurrency(valorUnitario)}</span>;
  }
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground line-through">
          {formatCurrency(valorBase)}
        </span>
        <span className="font-semibold text-green-600">
          {formatCurrency(valorUnitario)}
        </span>
      </div>
      {showBadge && (
        <Badge className="bg-green-600 hover:bg-green-700 text-white">
          {desconto.percentual}% OFF
        </Badge>
      )}
    </div>
  );
}
