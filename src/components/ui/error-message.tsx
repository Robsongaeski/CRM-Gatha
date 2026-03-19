import { AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorMessageProps {
  title?: string;
  message: string;
  details?: string;
  variant?: 'error' | 'warning' | 'info';
  showRetry?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({
  title,
  message,
  details,
  variant = 'error',
  showRetry = false,
  onRetry,
  className,
}: ErrorMessageProps) {
  const icons = {
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const variants = {
    error: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
    warning: 'border-yellow-500/50 text-yellow-700 dark:text-yellow-500 [&>svg]:text-yellow-600',
    info: 'border-blue-500/50 text-blue-700 dark:text-blue-400 [&>svg]:text-blue-600',
  };

  const Icon = icons[variant];

  return (
    <Alert className={cn(variants[variant], className)}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="flex flex-col gap-2">
        <span>{message}</span>
        {details && (
          <span className="text-xs opacity-70 font-mono">
            Detalhes técnicos: {details}
          </span>
        )}
        {showRetry && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="w-fit mt-2"
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Tentar novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}
