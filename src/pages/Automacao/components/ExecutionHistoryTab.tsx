import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCcw, Search, Filter, Clock, ExternalLink } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExecutionStatusBadge } from './ExecutionStatusBadge';
import { ExecutionDetailsDialog } from './ExecutionDetailsDialog';
import { useWorkflowExecutions, useExecutionLogs, type AutomationWorkflowExecution } from '@/hooks/useAutomationWorkflows';

interface ExecutionHistoryTabProps {
  workflowId: string;
}

export function ExecutionHistoryTab({ workflowId }: ExecutionHistoryTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<AutomationWorkflowExecution | null>(null);
  
  const { data: executions, isLoading, refetch, isRefetching } = useWorkflowExecutions(workflowId);

  // Filtrar execuções
  const filteredExecutions = React.useMemo(() => {
    if (!executions) return [];
    
    return executions.filter(exec => {
      // Filtro por status
      if (statusFilter !== 'all') {
        if (statusFilter === 'waiting') {
          if (!['waiting', 'paused'].includes(exec.status)) return false;
        } else if (exec.status !== statusFilter) {
          return false;
        }
      }
      
      // Filtro por busca (número do pedido, etc)
      if (searchQuery) {
        const triggerData = exec.trigger_data as any;
        const orderNumber = triggerData?.order_number || triggerData?.numero_pedido || '';
        const customerName = triggerData?.customer_name || triggerData?.nome || '';
        const searchLower = searchQuery.toLowerCase();
        
        return orderNumber.toString().includes(searchLower) 
          || customerName.toLowerCase().includes(searchLower);
      }
      
      return true;
    });
  }, [executions, statusFilter, searchQuery]);

  // Estatísticas rápidas
  const stats = React.useMemo(() => {
    if (!executions) return { total: 0, completed: 0, failed: 0, waiting: 0 };
    return {
      total: executions.length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      waiting: executions.filter(e => e.status === 'waiting' || e.status === 'paused').length,
    };
  }, [executions]);

  const getEntityLabel = (execution: AutomationWorkflowExecution) => {
    const triggerData = execution.trigger_data as any;
    return triggerData?.order_number 
      || triggerData?.numero_pedido
      || triggerData?.nome
      || execution.trigger_entity_id.slice(0, 8);
  };

  const getDuration = (execution: AutomationWorkflowExecution) => {
    if (!execution.started_at || !execution.completed_at) return '-';
    const start = new Date(execution.started_at);
    const end = new Date(execution.completed_at);
    const ms = end.getTime() - start.getTime();
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-4">
      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-green-500 dark:text-green-400">Completos</p>
          <p className="text-2xl font-bold text-green-500 dark:text-green-400">{stats.completed}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-destructive">Falhas</p>
          <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-yellow-500 dark:text-yellow-400">Aguardando</p>
          <p className="text-2xl font-bold text-yellow-500 dark:text-yellow-400">{stats.waiting}</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº pedido ou nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completed">Completos</SelectItem>
            <SelectItem value="failed">Falhas</SelectItem>
            <SelectItem value="waiting">Aguardando</SelectItem>
            <SelectItem value="paused">Pausado</SelectItem>
            <SelectItem value="running">Executando</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCcw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tabela de execuções */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma execução encontrada</p>
              <p className="text-sm">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Tente ajustar os filtros' 
                  : 'Quando o fluxo for executado, as execuções aparecerão aqui'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Iniciado</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExecutions.map((execution) => (
                  <TableRow 
                    key={execution.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedExecution(execution)}
                  >
                    <TableCell>
                      <ExecutionStatusBadge status={execution.status} />
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{execution.trigger_entity}</span>
                        <span className="text-muted-foreground ml-1">#{getEntityLabel(execution)}</span>
                      </div>
                      {execution.error_message && (
                        <p className="text-xs text-destructive truncate max-w-[200px]">
                          {execution.error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {execution.started_at 
                          ? format(new Date(execution.started_at), "dd/MM HH:mm", { locale: ptBR })
                          : '-'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {execution.started_at 
                          ? formatDistanceToNow(new Date(execution.started_at), { addSuffix: true, locale: ptBR })
                          : ''}
                      </div>
                    </TableCell>
                    <TableCell>{getDuration(execution)}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExecution(execution);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhes */}
      <ExecutionDetailsDialog
        execution={selectedExecution}
        open={!!selectedExecution}
        onOpenChange={(open) => !open && setSelectedExecution(null)}
      />
    </div>
  );
}
