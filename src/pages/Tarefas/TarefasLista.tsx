import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ListTodo, Clock, AlertTriangle, Filter, User, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useTarefas, useTarefaChecklist, useExcluirTarefa, TarefaFilters, TarefaStatus, TarefaPrioridade, Tarefa } from '@/hooks/useTarefas';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NovaTarefaDialog } from '@/components/Tarefas/NovaTarefaDialog';

const statusLabels: Record<TarefaStatus, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  aguardando_validacao: 'Aguardando Validação',
  concluida: 'Concluída',
  reaberta: 'Reaberta',
};

const statusColors: Record<TarefaStatus, string> = {
  pendente: 'bg-muted text-muted-foreground',
  em_andamento: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  aguardando_validacao: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  concluida: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  reaberta: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

const prioridadeColors: Record<TarefaPrioridade, string> = {
  baixa: 'bg-green-500',
  media: 'bg-yellow-500',
  alta: 'bg-red-500',
};

interface TarefaRowProps {
  tarefa: Tarefa;
  currentUserId: string | undefined;
  isAdmin: boolean;
}

function TarefaRow({ tarefa, currentUserId, isAdmin }: TarefaRowProps) {
  const { data: checklist = [] } = useTarefaChecklist(
    tarefa.tipo_conteudo === 'checklist' ? tarefa.id : undefined
  );
  const excluirTarefa = useExcluirTarefa();
  
  const dataLimite = parseISO(tarefa.data_limite);
  const isAtrasada = isPast(dataLimite) && tarefa.status !== 'concluida';
  const isHoje = isToday(dataLimite);
  const isNaoVisualizada = tarefa.executor_id === currentUserId && !tarefa.visualizada_em;
  
  const podeExcluir = tarefa.criador_id === currentUserId || isAdmin;
  const isParaOutraPessoa = tarefa.criador_id === currentUserId && tarefa.executor_id !== currentUserId;
  
  const progresso = tarefa.tipo_conteudo === 'checklist' && checklist.length > 0
    ? Math.round((checklist.filter(i => i.concluido).length / checklist.length) * 100)
    : null;

  const handleExcluir = () => {
    excluirTarefa.mutate(tarefa.id);
  };

  return (
    <TableRow className={isNaoVisualizada ? 'bg-primary/5' : ''}>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${prioridadeColors[tarefa.prioridade]}`} />
          <Link 
            to={`/tarefas/${tarefa.id}`} 
            className="font-medium hover:underline flex items-center gap-2"
          >
            {tarefa.titulo}
            {isNaoVisualizada && (
              <Badge variant="secondary" className="text-xs">Nova</Badge>
            )}
          </Link>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <User className="h-3 w-3" />
          {tarefa.criador?.nome || 'N/A'}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <User className="h-3 w-3" />
          <span className={isParaOutraPessoa ? 'font-medium text-foreground' : ''}>
            {tarefa.executor?.nome || 'N/A'}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className={`flex items-center gap-1 text-sm ${
          isAtrasada ? 'text-destructive font-medium' : 
          isHoje ? 'text-yellow-600 font-medium' : 'text-muted-foreground'
        }`}>
          <Calendar className="h-3 w-3" />
          {format(dataLimite, "dd/MM/yyyy", { locale: ptBR })}
          {isAtrasada && <AlertTriangle className="h-3 w-3 ml-1" />}
          {isHoje && <Clock className="h-3 w-3 ml-1" />}
        </div>
      </TableCell>
      <TableCell>
        <Badge className={statusColors[tarefa.status]}>
          {statusLabels[tarefa.status]}
        </Badge>
      </TableCell>
      <TableCell>
        {progresso !== null && (
          <div className="flex items-center gap-2 min-w-[100px]">
            <Progress value={progresso} className="h-2 flex-1" />
            <span className="text-xs text-muted-foreground w-8">{progresso}%</span>
          </div>
        )}
      </TableCell>
      <TableCell>
        {podeExcluir && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
                <AlertDialogDescription>
                  A tarefa "{tarefa.titulo}" será excluída. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleExcluir} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function TarefasLista() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<TarefaFilters>({
    view: 'para_mim',
    status: 'pendentes_ativas',
    prioridade: 'todas',
  });

  const { data: tarefas = [], isLoading } = useTarefas(filters);

  // Calcular estatísticas
  const stats = {
    total: tarefas.length,
    pendentes: tarefas.filter(t => t.status === 'pendente' || t.status === 'reaberta').length,
    emAndamento: tarefas.filter(t => t.status === 'em_andamento').length,
    atrasadas: tarefas.filter(t => 
      isPast(parseISO(t.data_limite)) && t.status !== 'concluida'
    ).length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-muted-foreground">Gerencie suas tarefas e acompanhe o progresso</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendentes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <ListTodo className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emAndamento}</div>
          </CardContent>
        </Card>
        <Card className={stats.atrasadas > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasadas</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${stats.atrasadas > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.atrasadas > 0 ? 'text-destructive' : ''}`}>
              {stats.atrasadas}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select
              value={filters.view}
              onValueChange={(value: TarefaFilters['view']) => 
                setFilters(prev => ({ ...prev, view: value }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="para_mim">Para mim</SelectItem>
                <SelectItem value="criadas_por_mim">Criadas por mim</SelectItem>
                {isAdmin && <SelectItem value="todas">Todas</SelectItem>}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value: TarefaFilters['status']) => 
                setFilters(prev => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendentes_ativas">Não concluídas</SelectItem>
                <SelectItem value="todas">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="aguardando_validacao">Aguardando Validação</SelectItem>
                <SelectItem value="concluida">Concluídas</SelectItem>
                <SelectItem value="reaberta">Reabertas</SelectItem>
                <SelectItem value="atrasadas">Atrasadas</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.prioridade}
              onValueChange={(value: TarefaFilters['prioridade']) => 
                setFilters(prev => ({ ...prev, prioridade: value }))
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas prioridades</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : tarefas.length === 0 ? (
            <div className="text-center py-12">
              <ListTodo className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma tarefa encontrada</h3>
              <p className="text-muted-foreground mb-4">
                {filters.view === 'para_mim' 
                  ? 'Você não tem tarefas atribuídas' 
                  : 'Você ainda não criou nenhuma tarefa'}
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira tarefa
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Criador</TableHead>
                  <TableHead>Executor</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tarefas.map((tarefa) => (
                  <TarefaRow 
                    key={tarefa.id} 
                    tarefa={tarefa} 
                    currentUserId={user?.id}
                    isAdmin={isAdmin}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NovaTarefaDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={() => setDialogOpen(false)}
      />
    </div>
  );
}
