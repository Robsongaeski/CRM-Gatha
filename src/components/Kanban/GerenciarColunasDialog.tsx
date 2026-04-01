import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useEtapasProducao } from '@/hooks/pcp/useEtapasProducao';
import type { EtapaProducao } from '@/hooks/pcp/useEtapasProducao';

interface GerenciarColunasDialogProps {
  open: boolean;
  onClose: () => void;
}

interface SortableEtapaItemProps {
  etapa: EtapaProducao;
  onToggleAtiva: (etapaId: string, ativa: boolean) => void;
}

function SortableEtapaItem({ etapa, onToggleAtiva }: SortableEtapaItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: etapa.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`flex items-center gap-3 p-3 bg-secondary/30 rounded-md cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-80 shadow-sm' : ''}`}
    >
      <button
        type="button"
        className="inline-flex items-center justify-center h-6 w-6 text-muted-foreground"
        aria-label={`Reordenar etapa ${etapa.nome_etapa}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div
        className="w-4 h-4 rounded-full"
        style={{ backgroundColor: etapa.cor_hex || '#6366f1' }}
      />
      <span className="flex-1">{etapa.nome_etapa}</span>
      <div
        className="flex items-center gap-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Label htmlFor={`ativa-${etapa.id}`} className="text-xs text-muted-foreground">
          {etapa.ativa ? 'Visivel' : 'Oculta'}
        </Label>
        <Switch
          id={`ativa-${etapa.id}`}
          checked={etapa.ativa || false}
          onCheckedChange={(checked) => onToggleAtiva(etapa.id, checked)}
        />
      </div>
    </div>
  );
}

export function GerenciarColunasDialog({ open, onClose }: GerenciarColunasDialogProps) {
  const { etapas, updateEtapa, createEtapa, reorderEtapas } = useEtapasProducao();
  const [novaEtapa, setNovaEtapa] = useState({ nome: '', cor: '#6366f1' });
  const [criando, setCriando] = useState(false);
  const [etapasOrdenadas, setEtapasOrdenadas] = useState<EtapaProducao[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  useEffect(() => {
    setEtapasOrdenadas(etapas);
  }, [etapas]);

  const etapaIds = useMemo(() => etapasOrdenadas.map((etapa) => etapa.id), [etapasOrdenadas]);

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = etapasOrdenadas.findIndex((etapa) => etapa.id === active.id);
    const newIndex = etapasOrdenadas.findIndex((etapa) => etapa.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const ordemAnterior = etapasOrdenadas;
    const reordenadas = arrayMove(etapasOrdenadas, oldIndex, newIndex).map((etapa, index) => ({
      ...etapa,
      ordem: index + 1,
    }));

    setEtapasOrdenadas(reordenadas);

    try {
      await reorderEtapas(reordenadas.map(({ id, ordem }) => ({ id, ordem })));
    } catch (error) {
      setEtapasOrdenadas(ordemAnterior);
      console.error('Erro ao reordenar etapas:', error);
      toast.error('Erro ao salvar nova ordem das etapas');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Colunas do Kanban</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Etapas Cadastradas</h3>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={etapaIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {etapasOrdenadas.map((etapa) => (
                    <SortableEtapaItem
                      key={etapa.id}
                      etapa={etapa}
                      onToggleAtiva={handleToggleAtiva}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

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
