import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Phone, Tag } from 'lucide-react';
import { useUpdateWhatsappInstance } from '@/hooks/whatsapp/useWhatsappInstances';
import { toast } from 'sonner';

interface EditarAliasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  currentNome: string;
  numeroWhatsapp: string | null;
  instanceName?: string;
}

// Formata número brasileiro: 5546999075520 -> +55 (46) 99907-5520
function formatPhoneNumber(phone: string | null): string {
  if (!phone) return 'Não conectado';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 13) {
    // 55 + DDD + 9 dígitos
    return `+${cleaned.slice(0,2)} (${cleaned.slice(2,4)}) ${cleaned.slice(4,9)}-${cleaned.slice(9)}`;
  } else if (cleaned.length === 12) {
    // 55 + DDD + 8 dígitos
    return `+${cleaned.slice(0,2)} (${cleaned.slice(2,4)}) ${cleaned.slice(4,8)}-${cleaned.slice(8)}`;
  }
  return phone;
}

export function EditarAliasDialog({
  open,
  onOpenChange,
  instanceId,
  currentNome,
  numeroWhatsapp,
  instanceName,
}: EditarAliasDialogProps) {
  const [nome, setNome] = useState(currentNome);
  const updateInstance = useUpdateWhatsappInstance();

  useEffect(() => {
    if (open) {
      setNome(currentNome);
    }
  }, [open, currentNome]);

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    try {
      await updateInstance.mutateAsync({ id: instanceId, nome: nome.trim() });
      toast.success('Nome da instância atualizado');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar nome da instância');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Instância</DialogTitle>
          <DialogDescription>
            Altere o nome de exibição da instância
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Número do WhatsApp */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Número Conectado</p>
              <p className="font-medium">{formatPhoneNumber(numeroWhatsapp)}</p>
            </div>
          </div>

          {/* Nome editável */}
          <div className="grid gap-2">
            <Label htmlFor="nome" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Nome de Exibição
            </Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Atendimento Principal"
            />
            <p className="text-xs text-muted-foreground">
              Este nome aparece na lista de instâncias e identifica o canal
            </p>
          </div>

          {/* Info técnica (opcional) */}
          {instanceName && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              <span className="font-medium">ID técnico:</span> {instanceName}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={updateInstance.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateInstance.isPending}>
            {updateInstance.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
