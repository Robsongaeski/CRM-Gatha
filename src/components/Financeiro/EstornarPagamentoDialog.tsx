import { useState } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useEstornarPagamento } from '@/hooks/usePagamentos';
import { toast } from 'sonner';

interface EstornarPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: any;
}

export function EstornarPagamentoDialog({ open, onOpenChange, pagamento }: EstornarPagamentoDialogProps) {
  const [motivo, setMotivo] = useState('');
  const estornarPagamento = useEstornarPagamento();

  const handleEstornar = async () => {
    if (!motivo.trim()) {
      toast.error('O motivo do estorno é obrigatório');
      return;
    }

    await estornarPagamento.mutateAsync({
      id: pagamento.id,
      motivo: motivo.trim(),
    });
    onOpenChange(false);
    setMotivo('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-destructive" />
            Estornar Pagamento
          </DialogTitle>
          <DialogDescription>
            Esta ação irá reverter o pagamento e reabrirá a pendência financeira do pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Atenção: Esta ação é irreversível e afetará o saldo financeiro do pedido.
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  Number(pagamento?.valor || 0)
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cliente</span>
              <span className="font-medium">{pagamento?.pedidos?.clientes?.nome_razao_social}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pedido</span>
              <span className="font-medium">#{pagamento?.pedidos?.id.slice(0, 8)}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Motivo do Estorno <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique o motivo do estorno..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Documente claramente o motivo para fins de auditoria
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleEstornar}
            disabled={estornarPagamento.isPending || !motivo.trim()}
          >
            {estornarPagamento.isPending ? 'Estornando...' : 'Confirmar Estorno'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
