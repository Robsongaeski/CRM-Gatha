import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled' | 'waiting';

interface ExecutionStatusBadgeProps {
  status: ExecutionStatus;
  className?: string;
}

const statusConfig: Record<ExecutionStatus, { label: string; icon: React.ElementType; className: string }> = {
  pending: {
    label: 'Pendente',
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  },
  running: {
    label: 'Executando',
    icon: Loader2,
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  completed: {
    label: 'Completo',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  failed: {
    label: 'Falhou',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive',
  },
  paused: {
    label: 'Pausado',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  },
  waiting: {
    label: 'Aguardando',
    icon: Clock,
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  },
  cancelled: {
    label: 'Cancelado',
    icon: AlertCircle,
    className: 'bg-muted text-muted-foreground',
  },
};

export function ExecutionStatusBadge({ status, className }: ExecutionStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;
  const isRunning = status === 'running';

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium border-0',
        config.className,
        className
      )}
    >
      <Icon className={cn('h-3 w-3', isRunning && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}
