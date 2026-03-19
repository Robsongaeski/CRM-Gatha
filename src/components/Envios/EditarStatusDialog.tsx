import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

// Mapeamento completo dos 16 status WBuy (individual, sem agrupamento)
export const STATUS_WBUY: Record<number, { label: string; status: string }> = {
  1: { label: 'Aguardando pagamento', status: 'pending' },
  2: { label: 'Pagamento em análise', status: 'pending' },
  3: { label: 'Pagamento efetuado', status: 'processing' },
  4: { label: 'Em produção', status: 'processing' },
  5: { label: 'Em expedição', status: 'processing' },
  6: { label: 'Em transporte', status: 'shipped' },
  7: { label: 'Saiu para entrega', status: 'shipped' },
  8: { label: 'Disponível para retirada', status: 'shipped' },
  9: { label: 'Pedido cancelado', status: 'cancelled' },
  10: { label: 'Pedido concluído', status: 'delivered' },
  11: { label: 'Pagamento negado', status: 'payment_denied' },
  12: { label: 'Sem retorno do cliente', status: 'cancelled' },
  13: { label: 'Devolvido', status: 'cancelled' },
  14: { label: 'Pedido em análise', status: 'pending' },
  15: { label: 'Fatura gerada', status: 'processing' },
  16: { label: 'Nota fiscal emitida', status: 'processing' },
};

interface EditarStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  currentStatusCode: number | null;
  onConfirm: (newStatusCode: number) => Promise<void>;
}

export function EditarStatusDialog({
  open,
  onOpenChange,
  orderNumber,
  currentStatusCode,
  onConfirm,
}: EditarStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(
    currentStatusCode?.toString() || '1'
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(parseInt(selectedStatus));
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const currentStatusLabel = currentStatusCode 
    ? STATUS_WBUY[currentStatusCode]?.label || `Código ${currentStatusCode}`
    : 'Desconhecido';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Status do Pedido</DialogTitle>
          <DialogDescription>
            Pedido #{orderNumber} - Status atual: <strong>{currentStatusLabel}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Novo Status WBuy</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_WBUY).map(([code, { label }]) => (
                  <SelectItem key={code} value={code}>
                    {code}. {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStatus && STATUS_WBUY[parseInt(selectedStatus)] && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <p>
                <strong>Status interno:</strong>{' '}
                {STATUS_WBUY[parseInt(selectedStatus)].status}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
