import { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, Plus, X, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  useQuickAccessItems,
  useAvailableScreens,
  useAddQuickAccess,
  useRemoveQuickAccess,
  useReorderQuickAccess,
  type AvailableScreen,
} from '@/hooks/useQuickAccess';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper para obter ícone
function getIcon(iconName: string) {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.Link;
}

// Componente para item ordenável
function SortableShortcutItem({
  id,
  title,
  icon,
  onRemove,
}: {
  id: string;
  title: string;
  icon: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = getIcon(icon);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 rounded-md border bg-card",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      <button
        className="cursor-grab hover:bg-muted rounded p-1"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-sm truncate">{title}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function ConfigurarAtalhosDialog({ open, onOpenChange }: Props) {
  const [search, setSearch] = useState('');
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const { data: shortcuts = [] } = useQuickAccessItems();
  const availableScreens = useAvailableScreens();
  const addMutation = useAddQuickAccess();
  const removeMutation = useRemoveQuickAccess();
  const reorderMutation = useReorderQuickAccess();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // URLs já adicionadas
  const addedUrls = useMemo(
    () => new Set(shortcuts.map((s) => s.url)),
    [shortcuts]
  );

  // Filtrar e agrupar telas disponíveis
  const groupedScreens = useMemo(() => {
    const filtered = availableScreens.filter(
      (screen) =>
        !addedUrls.has(screen.url) &&
        (screen.title.toLowerCase().includes(search.toLowerCase()) ||
          screen.module.toLowerCase().includes(search.toLowerCase()))
    );

    const grouped: Record<string, AvailableScreen[]> = {};
    filtered.forEach((screen) => {
      if (!grouped[screen.module]) {
        grouped[screen.module] = [];
      }
      grouped[screen.module].push(screen);
    });

    return grouped;
  }, [availableScreens, addedUrls, search]);

  const toggleModule = (module: string) => {
    setExpandedModules((prev) =>
      prev.includes(module)
        ? prev.filter((m) => m !== module)
        : [...prev, module]
    );
  };

  const handleAddShortcut = (screen: AvailableScreen) => {
    if (shortcuts.length >= 10) {
      return;
    }
    addMutation.mutate({
      title: screen.title,
      url: screen.url,
      icon: screen.icon,
    });
  };

  const handleRemoveShortcut = (id: string) => {
    removeMutation.mutate(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = shortcuts.findIndex((s) => s.id === active.id);
      const newIndex = shortcuts.findIndex((s) => s.id === over.id);

      // Calcular novas posições
      const reordered = [...shortcuts];
      const [removed] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, removed);

      const updates = reordered.map((item, index) => ({
        id: item.id,
        position: index,
      }));

      reorderMutation.mutate(updates);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Configurar Atalhos Rápidos</DialogTitle>
          <DialogDescription>
            Adicione até 10 atalhos para acesso rápido às suas telas favoritas.
            Arraste para reordenar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
          {/* Coluna esquerda: Telas disponíveis */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-medium text-sm">Telas Disponíveis</h3>
              <Badge variant="secondary" className="text-xs">
                {Object.values(groupedScreens).flat().length}
              </Badge>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar telas..."
                className="pl-8 h-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <ScrollArea className="flex-1 -mx-1 px-1">
              <div className="space-y-2">
                {Object.entries(groupedScreens).map(([module, screens]) => (
                  <div key={module}>
                    <button
                      className="flex items-center gap-2 w-full text-left text-sm font-medium text-muted-foreground hover:text-foreground py-1"
                      onClick={() => toggleModule(module)}
                    >
                      <LucideIcons.ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform",
                          expandedModules.includes(module) && "rotate-90"
                        )}
                      />
                      {module}
                      <Badge variant="outline" className="text-xs ml-auto">
                        {screens.length}
                      </Badge>
                    </button>

                    {expandedModules.includes(module) && (
                      <div className="ml-4 space-y-1 mt-1">
                        {screens.map((screen) => {
                          const Icon = getIcon(screen.icon);
                          return (
                            <button
                              key={screen.url}
                              className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-muted text-sm group"
                              onClick={() => handleAddShortcut(screen)}
                              disabled={
                                shortcuts.length >= 10 || addMutation.isPending
                              }
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="truncate">{screen.title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {screen.description}
                                </p>
                              </div>
                              <Plus className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {Object.keys(groupedScreens).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {search
                      ? 'Nenhuma tela encontrada'
                      : 'Todas as telas já foram adicionadas'}
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Coluna direita: Meus atalhos */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-medium text-sm">Meus Atalhos</h3>
              <Badge
                variant={shortcuts.length >= 10 ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {shortcuts.length}/10
              </Badge>
            </div>

            <ScrollArea className="flex-1 -mx-1 px-1">
              {shortcuts.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={shortcuts.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {shortcuts.map((shortcut) => (
                        <SortableShortcutItem
                          key={shortcut.id}
                          id={shortcut.id}
                          title={shortcut.title}
                          icon={shortcut.icon}
                          onRemove={() => handleRemoveShortcut(shortcut.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <LucideIcons.Star className="h-8 w-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum atalho configurado
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Clique em uma tela à esquerda para adicionar
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
