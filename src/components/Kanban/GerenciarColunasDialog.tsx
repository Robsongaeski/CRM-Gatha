import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEtapasProducao } from '@/hooks/pcp/useEtapasProducao';
import { GripVertical, Plus, Pencil } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface GerenciarColunasDialogProps {
  open: boolean;
  onClose: () => void;
}

export function GerenciarColunasDialog({ open, onClose }: GerenciarColunasDialogProps) {
  const { etapas, updateEtapa, createEtapa } = useEtapasProducao();
  const [novaEtapa, setNovaEtapa] = useState({ nome: '', cor: '#6366f1' });
  const [criando, setCriando] = useState(false);

  const handleToggleAtiva = async (etapaId: string, ativa: boolean) => {
    try {
      await updateEtapa({ id: etapaId, ativa });
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
    }
  };

  const handleCriarEtapa = async () => {
    if (!novaEtapa.nome.trim()) {
      toast.error('Informe o nome da etapa');
      return;
    }

    try {
      const proximaOrdem = Math.max(...etapas.map((e) => e.ordem), 0) + 1;
      await createEtapa({
        nome_etapa: novaEtapa.nome,
        cor_hex: novaEtapa.cor,
        ordem: proximaOrdem,
        tipo_etapa: 'intermediaria',
      });
      setNovaEtapa({ nome: '', cor: '#6366f1' });
      setCriando(false);
      toast.success('Etapa criada com sucesso');
    } catch (error) {
      console.error('Erro ao criar etapa:', error);
      toast.error('Erro ao criar etapa');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Colunas do Kanban</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Etapas Existentes */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Etapas Cadastradas</h3>
            {etapas.map((etapa) => (
              <div
                key={etapa.id}
                className="flex items-center gap-3 p-3 bg-secondary/30 rounded-md"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: etapa.cor_hex || '#6366f1' }}
                />
                <span className="flex-1">{etapa.nome_etapa}</span>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`ativa-${etapa.id}`} className="text-xs text-muted-foreground">
                    {etapa.ativa ? 'Visível' : 'Oculta'}
                  </Label>
                  <Switch
                    id={`ativa-${etapa.id}`}
                    checked={etapa.ativa || false}
                    onCheckedChange={(checked) => handleToggleAtiva(etapa.id, checked)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Criar Nova Etapa */}
          <div className="space-y-2 pt-4 border-t">
            {criando ? (
              <div className="space-y-3">
                <div>
                  <Label>Nome da Etapa</Label>
                  <Input
                    value={novaEtapa.nome}
                    onChange={(e) => setNovaEtapa({ ...novaEtapa, nome: e.target.value })}
                    placeholder="Ex: Aguardando Material"
                  />
                </div>
                <div>
                  <Label>Cor</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={novaEtapa.cor}
                      onChange={(e) => setNovaEtapa({ ...novaEtapa, cor: e.target.value })}
                      className="h-10 w-20 rounded border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{novaEtapa.cor}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCriarEtapa}>Criar Etapa</Button>
                  <Button variant="ghost" onClick={() => setCriando(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setCriando(true)} className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Nova Etapa
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
