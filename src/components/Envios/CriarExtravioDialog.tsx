import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateExtravio } from '@/hooks/useExtravios';
import { EnvioAtrasado } from '@/hooks/useEnviosAtrasados';
import { Loader2 } from 'lucide-react';
import { extrairNumeroNF } from '@/lib/nfUtils';

interface CriarExtravioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: EnvioAtrasado | null;
}

export function CriarExtravioDialog({ open, onOpenChange, pedido }: CriarExtravioDialogProps) {
  const createExtravioMutation = useCreateExtravio();
  
  const [numeroChamado, setNumeroChamado] = useState('');
  const [observacao, setObservacao] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pedido) return;

    await createExtravioMutation.mutateAsync({
      numero_pedido: pedido.order_number,
      nome_cliente: pedido.customer_name,
      email_cliente: pedido.customer_email,
      telefone_cliente: pedido.customer_phone,
      valor_pedido: pedido.total,
      data_pedido_original: pedido.created_at?.split('T')[0] || null,
      numero_rastreio: pedido.tracking_code,
      numero_chamado: numeroChamado || null,
      numero_nf: extrairNumeroNF(pedido.chave_nfe) || null,
      chave_nf: pedido.chave_nfe,
      transportadora: pedido.carrier,
      solicitado_ressarcimento: false,
      status_ressarcimento: 'pendente',
      motivo_negacao: null,
      valor_ressarcimento: null,
      observacao: observacao || `Pedido atrasado há ${pedido.dias_atraso} dias. Registrado como extravio/roubo.`,
      data_resolucao: null,
      problema_origem_id: pedido.problema?.id || null,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setNumeroChamado('');
    setObservacao('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  if (!pedido) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Extravio/Roubo</DialogTitle>
          <DialogDescription>
            Registrar extravio para o pedido #{pedido.order_number}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pedido</Label>
              <Input value={pedido.order_number} disabled />
            </div>
            <div className="space-y-2">
              <Label>Rastreio</Label>
              <Input value={pedido.tracking_code || '-'} disabled />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Input value={pedido.customer_name} disabled />
            </div>
            <div className="space-y-2">
              <Label>Valor do Pedido</Label>
              <Input value={`R$ ${pedido.total.toFixed(2)}`} disabled />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Transportadora</Label>
              <Input value={pedido.carrier || '-'} disabled />
            </div>
            <div className="space-y-2">
              <Label>Dias de Atraso</Label>
              <Input value={`${pedido.dias_atraso} dias`} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_chamado">Número do Chamado (Transportadora)</Label>
            <Input
              id="numero_chamado"
              value={numeroChamado}
              onChange={(e) => setNumeroChamado(e.target.value)}
              placeholder="Ex: 123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observações</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Detalhes sobre o extravio/roubo..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={createExtravioMutation.isPending}>
              {createExtravioMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Extravio
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
