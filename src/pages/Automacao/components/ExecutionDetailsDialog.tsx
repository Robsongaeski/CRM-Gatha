import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ExternalLink, Clock, Timer, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { ExecutionPathViewer } from './ExecutionPathViewer';
import { useExecutionLogs } from '@/hooks/useAutomationWorkflows';
import type { AutomationWorkflowExecution } from '@/hooks/useAutomationWorkflows';

interface ExecutionDetailsDialogProps {
  execution: AutomationWorkflowExecution | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExecutionDetailsDialog({ 
  execution, 
  open, 
  onOpenChange 
}: ExecutionDetailsDialogProps) {
  const { data: logs, isLoading: logsLoading } = useExecutionLogs(
    open && execution ? execution.id : undefined
  );

  if (!execution) return null;

  const startedAt = execution.started_at 
    ? new Date(execution.started_at) 
    : new Date(execution.created_at);
  const completedAt = execution.completed_at 
    ? new Date(execution.completed_at) 
    : null;
  const duration = completedAt 
    ? ((completedAt.getTime() - startedAt.getTime()) / 1000).toFixed(2) 
    : null;

  // Extrair identificador da entidade
  const entityLabel = (execution.trigger_data as any)?.order_number 
    || (execution.trigger_data as any)?.numero_pedido
    || (execution.trigger_data as any)?.nome
    || execution.trigger_entity_id.slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Execução: {execution.trigger_entity} #{entityLabel}</span>
            <ExecutionStatusBadge status={execution.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Iniciado
              </p>
              <p className="text-sm font-medium">
                {format(startedAt, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
              </p>
            </div>
            {completedAt && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Finalizado
                </p>
                <p className="text-sm font-medium">
                  {format(completedAt, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                </p>
              </div>
            )}
            {duration && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3" /> Duração
                </p>
                <p className="text-sm font-medium">{duration}s</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" /> Nós executados
              </p>
              <p className="text-sm font-medium">{logs?.length || 0}</p>
            </div>
          </div>

          {/* Erro se houver */}
          {execution.error_message && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">Erro:</p>
              <p className="text-sm text-destructive/80">{execution.error_message}</p>
            </div>
          )}

          <Separator />

          {/* Timeline de nós */}
          <div>
            <h4 className="font-medium mb-4">Caminho Percorrido</h4>
            <ScrollArea className="h-[350px] pr-4">
              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ExecutionPathViewer logs={logs || []} />
              )}
            </ScrollArea>
          </div>

          {/* Link para entidade */}
          {execution.trigger_entity === 'order' && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`/ecommerce/pedidos?q=${entityLabel}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Pedido
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
