import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAdicionarObservacaoPedido } from '@/hooks/useAtendenteActions';
import { usePermissions } from '@/hooks/usePermissions';
import { AlertTriangle } from 'lucide-react';

interface AdicionarObservacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
}

export function AdicionarObservacaoDialog({ 
  open, 
  onOpenChange, 
  pedidoId 
}: AdicionarObservacaoDialogProps) {
  const { can } = usePermissions();
  const podeAdicionarObservacao = can('pedidos.adicionar_observacao');
  const [observacao, setObservacao] = useState('');
  const adicionarObservacao = useAdicionarObservacaoPedido();

  // Bloquear se não tem permissão
  if (!podeAdicionarObservacao) {
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
            Você não tem permissão para adicionar observações em pedidos.
          </p>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = () => {
    if (!observacao.trim()) return;
    
    adicionarObservacao.mutate(
      { pedidoId, observacao },
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
          <DialogTitle>Adicionar Observação</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              placeholder="Ex: Cliente pediu para vendedor chamar porque o pedido foi no tamanho errado"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!observacao.trim() || adicionarObservacao.isPending}
          >
            {adicionarObservacao.isPending ? 'Salvando...' : 'Adicionar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
