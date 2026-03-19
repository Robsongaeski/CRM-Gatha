import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstanceOption {
  id: string;
  nome: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  hasExistingConversation?: boolean;
}

interface SelecionarInstanciaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instances: InstanceOption[];
  contactName: string;
  contactPhone: string;
  existingConversationInstanceId?: string | null;
  onConfirm: (instanceId: string) => void;
  loading?: boolean;
}

export default function SelecionarInstanciaDialog({
  open,
  onOpenChange,
  instances,
  contactName,
  contactPhone,
  existingConversationInstanceId,
  onConfirm,
  loading = false,
}: SelecionarInstanciaDialogProps) {
  // Apenas instâncias conectadas podem ser selecionadas
  const connectedInstances = useMemo(() => 
    instances.filter(i => i.status === 'connected'),
    [instances]
  );

  // Se existe conversa em uma instância conectada, pré-seleciona ela
  const defaultInstance = useMemo(() => {
    if (existingConversationInstanceId) {
      const existing = connectedInstances.find(i => i.id === existingConversationInstanceId);
      if (existing) return existing.id;
    }
    return connectedInstances[0]?.id || '';
  }, [connectedInstances, existingConversationInstanceId]);

  const [selectedInstanceId, setSelectedInstanceId] = useState<string>(defaultInstance);

  // Atualizar seleção quando instâncias mudam
  useEffect(() => {
    if (defaultInstance && !selectedInstanceId) {
      setSelectedInstanceId(defaultInstance);
    }
  }, [defaultInstance, selectedInstanceId]);

  // Reset quando abre
  useEffect(() => {
    if (open) {
      setSelectedInstanceId(defaultInstance);
    }
  }, [open, defaultInstance]);

  const handleConfirm = () => {
    if (selectedInstanceId) {
      onConfirm(selectedInstanceId);
    }
  };

  const existingConversationInstance = existingConversationInstanceId 
    ? connectedInstances.find(i => i.id === existingConversationInstanceId)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Selecionar Instância
          </DialogTitle>
          <DialogDescription>
            Escolha a instância para iniciar conversa com <strong>{contactName || contactPhone}</strong>
          </DialogDescription>
        </DialogHeader>

        {existingConversationInstance && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
            <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-800">Conversa existente encontrada</p>
              <p className="text-blue-700">
                Já existe conversa com este contato na instância <strong>{existingConversationInstance.nome}</strong>
              </p>
            </div>
          </div>
        )}

        {connectedInstances.length === 0 ? (
          <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              Nenhuma instância conectada disponível. Conecte uma instância antes de iniciar conversas.
            </p>
          </div>
        ) : (
          <RadioGroup
            value={selectedInstanceId}
            onValueChange={setSelectedInstanceId}
            className="space-y-2"
          >
            {connectedInstances.map((instance) => {
              const hasExisting = instance.id === existingConversationInstanceId;
              return (
                <div
                  key={instance.id}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    selectedInstanceId === instance.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50",
                    hasExisting && "ring-2 ring-blue-200"
                  )}
                  onClick={() => setSelectedInstanceId(instance.id)}
                >
                  <RadioGroupItem value={instance.id} id={instance.id} />
                  <Label htmlFor={instance.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{instance.nome}</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        Conectada
                      </Badge>
                      {hasExisting && (
                        <Badge variant="secondary" className="text-xs">
                          Conversa existente
                        </Badge>
                      )}
                    </div>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !selectedInstanceId || connectedInstances.length === 0}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existingConversationInstanceId && selectedInstanceId === existingConversationInstanceId
              ? 'Abrir Conversa'
              : 'Iniciar Conversa'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
