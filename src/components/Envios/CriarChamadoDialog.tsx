import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateProblemaPedido, TipoProblema } from '@/hooks/useProblemasPedido';
import { EnvioAtrasado } from '@/hooks/useEnviosAtrasados';
import { Loader2 } from 'lucide-react';

interface CriarChamadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: EnvioAtrasado | null;
}

const tiposProblema: { value: TipoProblema; label: string }[] = [
  { value: 'atraso_entrega', label: 'Atraso na entrega' },
  { value: 'sem_tentativa_entrega', label: 'Sem tentativa de entrega' },
  { value: 'entregue_nao_recebido', label: 'Entregue mas não recebido' },
  { value: 'outro', label: 'Outro' },
];

export function CriarChamadoDialog({ open, onOpenChange, pedido }: CriarChamadoDialogProps) {
  const navigate = useNavigate();
  const createProblemaMutation = useCreateProblemaPedido();
  
  const [tipoProblema, setTipoProblema] = useState<TipoProblema>('atraso_entrega');
  const [observacao, setObservacao] = useState('');
  const [numeroChamado, setNumeroChamado] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pedido) return;

    await createProblemaMutation.mutateAsync({
      numero_pedido: pedido.order_number,
      codigo_rastreio: pedido.tracking_code,
      numero_chamado: numeroChamado || null,
      tipo_problema: tipoProblema,
      motivo_id: null,
      problema_outro: null,
      transportadora: pedido.carrier,
      observacao: observacao || `Pedido atrasado há ${pedido.dias_atraso} dias. Criado a partir da tela de Atrasados.`,
      status: 'pendente',
      data_resolucao: null,
      extravio_gerado_id: null,
      nome_cliente: pedido.customer_name,
      email_cliente: pedido.customer_email,
      telefone_cliente: pedido.customer_phone,
      endereco_cliente: pedido.shipping_address,
      valor_pedido: pedido.total,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setTipoProblema('atraso_entrega');
    setObservacao('');
    setNumeroChamado('');
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
          <DialogTitle>Abrir Chamado</DialogTitle>
          <DialogDescription>
            Criar chamado para o pedido #{pedido.order_number}
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
              <Label>Dias de Atraso</Label>
              <Input value={`${pedido.dias_atraso} dias`} disabled />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo_problema">Tipo do Problema *</Label>
            <Select value={tipoProblema} onValueChange={(v) => setTipoProblema(v as TipoProblema)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {tiposProblema.map(tipo => (
                  <SelectItem key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              placeholder="Detalhes adicionais sobre o problema..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProblemaMutation.isPending}>
              {createProblemaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Chamado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
