import React from 'react';
import { Zap, GitBranch, Play, StopCircle, MessageSquare, Mail, Bell, Tag, Webhook, Clock, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ExecutionLog {
  id: string;
  node_id: string;
  node_type: string;
  node_label?: string;
  action?: string;
  status: string;
  input_data: any;
  output_data: any;
  duration_ms?: number;
  error_message?: string;
  condition_result?: string;
  created_at: string;
}

interface ExecutionPathViewerProps {
  logs: ExecutionLog[];
}

const nodeIcons: Record<string, React.ElementType> = {
  trigger: Zap,
  condition: GitBranch,
  control: StopCircle,
  send_whatsapp: MessageSquare,
  send_email: Mail,
  create_notification: Bell,
  add_tag: Tag,
  call_webhook: Webhook,
  delay: Clock,
  schedule: Clock,
  stop_flow: StopCircle,
};

const nodeColors: Record<string, string> = {
  trigger: 'bg-primary/10 text-primary border-primary/30',
  condition: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  control: 'bg-muted text-muted-foreground border-muted-foreground/30',
  action: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
};

export function ExecutionPathViewer({ logs }: ExecutionPathViewerProps) {
  const [expandedLogs, setExpandedLogs] = React.useState<Set<string>>(new Set());

  const toggleExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum nó executado ainda
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log, index) => {
        const Icon = nodeIcons[log.action || log.node_type] || Play;
        const colorClass = nodeColors[log.node_type] || nodeColors.action;
        const isSuccess = log.status === 'completed';
        const isFailed = log.status === 'failed';
        const isExpanded = expandedLogs.has(log.id);
        const hasDetails = log.input_data || log.output_data || log.error_message || log.condition_result;
        const label = log.node_label || log.action || log.node_type;

        return (
          <div key={log.id} className="relative">
            {/* Linha conectora */}
            {index < logs.length - 1 && (
              <div className="absolute left-5 top-10 bottom-0 w-px bg-border -mb-3" />
            )}

            <Collapsible open={isExpanded} onOpenChange={() => hasDetails && toggleExpanded(log.id)}>
              <CollapsibleTrigger asChild disabled={!hasDetails}>
                <div 
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                    hasDetails && 'cursor-pointer hover:bg-muted/50',
                    isFailed && 'border-destructive/50 bg-destructive/5'
                  )}
                >
                  {/* Número e ícone */}
                  <div className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border shrink-0',
                    colorClass
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium capitalize">
                        {index + 1}. {label}
                      </span>
                      {isSuccess && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {isFailed && <XCircle className="h-4 w-4 text-destructive" />}
                      {log.duration_ms !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {log.duration_ms}ms
                        </Badge>
                      )}
                    </div>

                    {log.condition_result && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Resultado: <span className="font-medium">{log.condition_result === 'yes' ? 'SIM' : 'NÃO'}</span>
                      </p>
                    )}

                    {log.error_message && (
                      <p className="text-sm text-destructive mt-1 truncate">
                        Erro: {log.error_message}
                      </p>
                    )}
                  </div>

                  {/* Indicador de expansão */}
                  {hasDetails && (
                    <div className="shrink-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="ml-13 pl-6 pb-2 space-y-3">
                  {log.input_data && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Entrada:</p>
                      <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(log.input_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.output_data && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Saída:</p>
                      <pre className="text-xs bg-muted/50 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(log.output_data, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.error_message && (
                    <div>
                      <p className="text-xs font-medium text-destructive mb-1">Erro completo:</p>
                      <pre className="text-xs bg-destructive/10 text-destructive p-2 rounded overflow-auto max-h-32">
                        {log.error_message}
                      </pre>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
}
