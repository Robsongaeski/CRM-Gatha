import { useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRejeitarPagamento } from '@/hooks/usePagamentos';
import { toast } from 'sonner';

interface RejeitarPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: any;
}

export function RejeitarPagamentoDialog({ open, onOpenChange, pagamento }: RejeitarPagamentoDialogProps) {
  const [motivo, setMotivo] = useState('');
  const rejeitarPagamento = useRejeitarPagamento();

  const handleRejeitar = async () => {
    if (!motivo.trim()) {
      toast.error('O motivo da rejeição é obrigatório');
      return;
    }

    await rejeitarPagamento.mutateAsync({
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
            <X className="h-5 w-5 text-red-600" />
            Rejeitar Pagamento
          </DialogTitle>
          <DialogDescription>
            Informe o motivo da rejeição deste pagamento. O vendedor será notificado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-destructive/10 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Valor</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(pagamento?.valor || 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Cliente</span>
              <span className="font-medium">{pagamento?.pedidos?.clientes?.nome_razao_social}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Motivo da Rejeição <span className="text-destructive">*</span>
            </label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Explique o motivo da rejeição..."
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Seja claro sobre o que está errado para que o vendedor possa corrigir
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleRejeitar} 
            disabled={rejeitarPagamento.isPending || !motivo.trim()}
          >
            {rejeitarPagamento.isPending ? 'Rejeitando...' : 'Confirmar Rejeição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
