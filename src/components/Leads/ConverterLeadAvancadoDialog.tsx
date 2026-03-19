import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useConverterLead, Lead } from '@/hooks/useLeads';
import { useNavigate } from 'react-router-dom';
import { UserCheck, FileText, ShoppingCart, User } from 'lucide-react';

interface ConverterLeadAvancadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

type AcaoConversao = 'cliente' | 'proposta' | 'pedido';

export function ConverterLeadAvancadoDialog({ 
  open, 
  onOpenChange, 
  lead 
}: ConverterLeadAvancadoDialogProps) {
  const [acao, setAcao] = useState<AcaoConversao>('cliente');
  const converterMutation = useConverterLead();
  const navigate = useNavigate();

  const handleConverter = async () => {
    if (!lead) return;

    const cliente = await converterMutation.mutateAsync(lead.id);
    
    if (cliente) {
      onOpenChange(false);
      
      switch (acao) {
        case 'proposta':
          navigate(`/propostas/novo?cliente_id=${cliente.id}`);
          break;
        case 'pedido':
          navigate(`/pedidos/novo?cliente_id=${cliente.id}`);
          break;
        default:
          navigate(`/clientes/${cliente.id}`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Converter Lead em Cliente
          </DialogTitle>
          <DialogDescription>
            {lead?.nome} será convertido em cliente. Escolha o que fazer após a conversão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Label>O que deseja fazer após converter?</Label>
          <RadioGroup value={acao} onValueChange={(v) => setAcao(v as AcaoConversao)}>
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="cliente" id="cliente" />
              <Label htmlFor="cliente" className="flex items-center gap-2 cursor-pointer flex-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Apenas criar cliente</div>
                  <div className="text-sm text-muted-foreground">Abrir ficha do cliente</div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="proposta" id="proposta" />
              <Label htmlFor="proposta" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileText className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="font-medium">Criar cliente + Nova Proposta</div>
                  <div className="text-sm text-muted-foreground">Abrir formulário de proposta</div>
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
              <RadioGroupItem value="pedido" id="pedido" />
              <Label htmlFor="pedido" className="flex items-center gap-2 cursor-pointer flex-1">
                <ShoppingCart className="h-4 w-4 text-green-600" />
                <div>
                  <div className="font-medium">Criar cliente + Novo Pedido</div>
                  <div className="text-sm text-muted-foreground">Abrir formulário de pedido</div>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConverter} 
            disabled={converterMutation.isPending}
          >
            {converterMutation.isPending ? 'Convertendo...' : 'Converter Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
