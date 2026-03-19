import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAlterarStatusPedido } from '@/hooks/useAtendenteActions';
import { StatusPedido } from '@/hooks/usePedidos';
import { usePermissions } from '@/hooks/usePermissions';
import { AlertTriangle } from 'lucide-react';

interface AlterarStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  statusAtual: StatusPedido;
}

const statusOptions = [
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'entregue', label: 'Entregue' },
];

export function AlterarStatusDialog({ 
  open, 
  onOpenChange, 
  pedidoId, 
  statusAtual 
}: AlterarStatusDialogProps) {
  const { can } = usePermissions();
  const podeAlterarStatus = can('pedidos.alterar_status');
  const [novoStatus, setNovoStatus] = useState<StatusPedido>(statusAtual);
  const [observacao, setObservacao] = useState('');
  const alterarStatus = useAlterarStatusPedido();

  // Bloquear se não tem permissão
  if (!podeAlterarStatus) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Acesso Negado
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4">
            Você não tem permissão para alterar o status de pedidos.
          </p>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = () => {
    alterarStatus.mutate(
      { pedidoId, novoStatus, observacao: observacao || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setObservacao('');
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alterar Status do Pedido</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Novo Status</Label>
            <Select value={novoStatus} onValueChange={(value) => setNovoStatus(value as StatusPedido)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              placeholder="Adicione uma observação sobre a alteração..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={alterarStatus.isPending}>
            {alterarStatus.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
