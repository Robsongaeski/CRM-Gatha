import React from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { ExternalLink, Clock, Timer, Hash, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { ExecutionPathViewer } from './ExecutionPathViewer';
import { useExecutionLogs } from '@/hooks/useAutomationWorkflows';
import type { AutomationWorkflowExecution } from '@/hooks/useAutomationWorkflows';

interface ExecutionDetailsDialogProps {
  execution: AutomationWorkflowExecution | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getExecutionHint(
  status: string,
  nextScheduledFor: string | null,
): string {
  if (status === 'failed') return 'Fluxo interrompido por erro.';
  if (status === 'completed') return 'Fluxo finalizado com sucesso.';
  if (status === 'running') return 'Fluxo em execucao.';
  if (status === 'pending') return 'Fluxo aguardando inicio.';
  if (status === 'cancelled') return 'Fluxo cancelado.';

  if (status === 'paused' || status === 'waiting') {
    if (nextScheduledFor) {
      return `Fluxo aguardando continuidade automatica ate ${nextScheduledFor}.`;
    }
    return 'Fluxo aguardando continuidade automatica. Se demorar, verifique a funcao automation-scheduler.';
  }

  return 'Execucao em andamento.';
}

export function ExecutionDetailsDialog({
  execution,
  open,
  onOpenChange,
}: ExecutionDetailsDialogProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);

  React.useEffect(() => {
    if (!open) setShowTechnicalDetails(false);
  }, [open, execution?.id]);

  const { data: logs, isLoading: logsLoading } = useExecutionLogs(
    open && execution ? execution.id : undefined,
  );

  const { data: nextScheduledAction } = useQuery({
    queryKey: ['execution-next-scheduled-action', execution?.id],
    queryFn: async () => {
      if (!execution) return null;
      const { data, error } = await supabase
        .from('automation_scheduled_actions')
        .select('id, status, scheduled_for, node_id, error_message')
        .eq('execution_id', execution.id)
        .in('status', ['pending', 'processing', 'waiting_event'])
        .order('scheduled_for', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open && !!execution?.id && !!execution && ['paused', 'waiting'].includes(execution.status),
    staleTime: 15000,
  });

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

  const entityLabel = (execution.trigger_data as any)?.order_number
    || (execution.trigger_data as any)?.numero_pedido
    || (execution.trigger_data as any)?.nome
    || execution.trigger_entity_id.slice(0, 8);

  const scheduledForLabel = nextScheduledAction?.scheduled_for
    ? format(new Date(nextScheduledAction.scheduled_for), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
    : null;
  const statusHint = getExecutionHint(execution.status, scheduledForLabel);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Execucao: {execution.trigger_entity} #{entityLabel}</span>
            <ExecutionStatusBadge status={execution.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="p-3 rounded-lg border bg-muted/30">
            <p className="text-sm flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <span>{statusHint}</span>
            </p>
            {nextScheduledAction?.node_id && (
              <p className="text-xs text-muted-foreground mt-2">
                Proximo no: {nextScheduledAction.node_id}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Iniciado
              </p>
              <p className="text-sm font-medium">
                {format(startedAt, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
              </p>
            </div>
            {completedAt && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Finalizado
                </p>
                <p className="text-sm font-medium">
                  {format(completedAt, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                </p>
              </div>
            )}
            {duration && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3" /> Duracao
                </p>
                <p className="text-sm font-medium">{duration}s</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" /> Nos executados
              </p>
              <p className="text-sm font-medium">{logs?.length || 0}</p>
            </div>
          </div>

          {execution.error_message && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">Erro:</p>
              <p className="text-sm text-destructive/80">{execution.error_message}</p>
            </div>
          )}

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-4 gap-3">
              <h4 className="font-medium">Caminho Percorrido</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTechnicalDetails((prev) => !prev)}
              >
                {showTechnicalDetails ? 'Ocultar dados tecnicos' : 'Mostrar dados tecnicos'}
              </Button>
            </div>
            <ScrollArea className="h-[350px] pr-4">
              {logsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
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
                <ExecutionPathViewer logs={logs || []} showTechnicalDetails={showTechnicalDetails} />
              )}
            </ScrollArea>
          </div>

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
