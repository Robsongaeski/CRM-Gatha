import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  etapa: {
    id: string;
    nome_etapa: string;
    cor_hex: string | null;
  };
  pedidos: any[];
  children: React.ReactNode;
  isOver?: boolean;
  title?: string;
  badge?: string;
  variant?: 'default' | 'approval';
}

export function KanbanColumn({ 
  etapa, 
  pedidos, 
  children, 
  isOver, 
  title, 
  badge,
  variant = 'default' 
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: etapa.id,
  });

  const displayTitle = title || etapa.nome_etapa;
  const displayBadge = badge ?? String(pedidos.length);
  const isApproval = variant === 'approval';

  return (
    <Card
      className={cn(
        'flex flex-col w-[240px] min-w-[240px] flex-shrink-0 h-auto max-h-[calc(100vh-220px)] transition-all duration-200',
        isOver && 'ring-4 ring-green-500 bg-green-50/50 dark:bg-green-950/30 scale-[1.02]',
        isApproval && 'border-dashed border-2 border-primary/30'
      )}
    >
      {/* Header da Coluna */}
      <div
        className={cn(
          "p-3 border-b flex items-center justify-between flex-shrink-0",
          isApproval && "bg-primary/5"
        )}
        style={{
          backgroundColor: !isApproval && etapa.cor_hex ? `${etapa.cor_hex}15` : undefined,
          borderLeftWidth: '4px',
          borderLeftColor: etapa.cor_hex || (isApproval ? 'hsl(var(--primary))' : '#6366f1'),
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: etapa.cor_hex || (isApproval ? 'hsl(var(--primary))' : '#6366f1') }}
          />
          <h3 className="font-semibold text-sm">{displayTitle}</h3>
        </div>
        <span className={cn(
          "text-xs font-medium px-2 py-0.5 rounded-full",
          isApproval ? "bg-primary/20 text-primary" : "bg-secondary"
        )}>
          {displayBadge}
        </span>
      </div>

      {/* Área Droppable */}
      <div className="overflow-y-auto p-2">
        <SortableContext
          items={pedidos.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <div ref={setNodeRef} data-column-id={etapa.id} className="space-y-2 min-h-[100px]">
            {pedidos.length === 0 && !children ? (
              <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                {isApproval ? 'Nenhuma proposta' : 'Nenhum pedido'}
              </div>
            ) : (
              children
            )}
          </div>
        </SortableContext>
      </div>
    </Card>
  );
}
