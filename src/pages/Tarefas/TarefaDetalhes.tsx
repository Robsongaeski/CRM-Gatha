import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Clock, CheckCircle, RotateCcw, Trash2, Send, AlertTriangle, Play, Copy, RefreshCw, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  useTarefa,
  useTarefaChecklist,
  useTarefaObservacoes,
  useToggleChecklistItem,
  useAdicionarObservacao,
  useMarcarTarefaConcluida,
  useValidarTarefa,
  useReabrirTarefa,
  useExcluirTarefa,
  useIniciarTarefa,
  useMarcarTarefaVisualizada,
  useMarcarObservacoesLidas,
  useDuplicarTarefa,
  useToggleRecorrencia,
  useEncerrarRecorrencia,
  TarefaStatus,
  TarefaPrioridade,
} from '@/hooks/useTarefas';
import { EditarTarefaDialog } from '@/components/Tarefas/EditarTarefaDialog';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { format, parseISO, isPast, isToday, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

const prioridadeLabels: Record<TarefaPrioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
};

const prioridadeColors: Record<TarefaPrioridade, string> = {
  baixa: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  media: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  alta: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function TarefaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  
  const { data: tarefa, isLoading } = useTarefa(id);
  const { data: checklist = [] } = useTarefaChecklist(
    tarefa?.tipo_conteudo === 'checklist' ? id : undefined
  );
  const { data: observacoes = [] } = useTarefaObservacoes(id);
  
  const toggleChecklistItem = useToggleChecklistItem();
  const adicionarObservacao = useAdicionarObservacao();
  const marcarConcluida = useMarcarTarefaConcluida();
  const validarTarefa = useValidarTarefa();
  const reabrirTarefa = useReabrirTarefa();
  const excluirTarefa = useExcluirTarefa();
  const iniciarTarefa = useIniciarTarefa();
  const marcarVisualizada = useMarcarTarefaVisualizada();
  const marcarObservacoesLidas = useMarcarObservacoesLidas();
  const duplicarTarefa = useDuplicarTarefa();
  const toggleRecorrencia = useToggleRecorrencia();
  const encerrarRecorrencia = useEncerrarRecorrencia();
  
  const [novaObservacao, setNovaObservacao] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [concluirDialogOpen, setConcluirDialogOpen] = useState(false);
  const [encerrarRecorrenciaDialogOpen, setEncerrarRecorrenciaDialogOpen] = useState(false);
  const [editarDialogOpen, setEditarDialogOpen] = useState(false);

  // Marcar como visualizada ao abrir
  useEffect(() => {
    if (tarefa && !tarefa.visualizada_em && tarefa.executor_id === user?.id) {
      marcarVisualizada.mutate(tarefa.id);
    }
  }, [tarefa, user?.id]);

  // Marcar observações como lidas
  useEffect(() => {
    if (id && observacoes.length > 0) {
      marcarObservacoesLidas.mutate(id);
    }
  }, [id, observacoes.length]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!tarefa) {
    return (
      <div className="container mx-auto py-6 text-center">
        <h2 className="text-xl font-semibold">Tarefa não encontrada</h2>
        <Button variant="link" onClick={() => navigate('/tarefas')}>
          Voltar para lista
        </Button>
      </div>
    );
  }

  const isCriador = tarefa.criador_id === user?.id;
  const isExecutor = tarefa.executor_id === user?.id;
  const dataLimite = parseISO(tarefa.data_limite);
  const isAtrasada = isPast(dataLimite) && tarefa.status !== 'concluida';
  const isHoje = isToday(dataLimite);

  const progresso = checklist.length > 0
    ? Math.round((checklist.filter(i => i.concluido).length / checklist.length) * 100)
    : null;

  const handleToggleItem = (itemId: string, concluido: boolean) => {
    toggleChecklistItem.mutate({ itemId, concluido: !concluido });
    
    // Se marcou o último item, perguntar se deseja concluir
    if (!concluido) {
      const restantes = checklist.filter(i => !i.concluido && i.id !== itemId);
      if (restantes.length === 0 && tarefa.status !== 'aguardando_validacao') {
        setConcluirDialogOpen(true);
      }
    }
  };

  const handleEnviarObservacao = async () => {
    if (!novaObservacao.trim() || !id) return;
    await adicionarObservacao.mutateAsync({ tarefaId: id, mensagem: novaObservacao.trim() });
    setNovaObservacao('');
  };

  const handleExcluir = async () => {
    await excluirTarefa.mutateAsync(tarefa.id);
    navigate('/tarefas');
  };

  const handleDuplicar = async () => {
    const novaTarefa = await duplicarTarefa.mutateAsync(tarefa.id);
    if (novaTarefa) {
      navigate(`/tarefas/${novaTarefa.id}`);
    }
  };

  const handleToggleRecorrencia = (ativar: boolean) => {
    toggleRecorrencia.mutate({ tarefaId: tarefa.id, ativar });
  };

  const handleEncerrarRecorrencia = async () => {
    await encerrarRecorrencia.mutateAsync(tarefa.id);
    setEncerrarRecorrenciaDialogOpen(false);
  };

  const podeIniciar = isExecutor && (tarefa.status === 'pendente' || tarefa.status === 'reaberta');
  const podeConcluir = isExecutor && (tarefa.status === 'em_andamento' || tarefa.status === 'pendente' || tarefa.status === 'reaberta');
  const podeValidar = isCriador && tarefa.status === 'aguardando_validacao';
  const podeReabrir = isCriador && tarefa.status === 'aguardando_validacao';
  const podeExcluir = isAdmin;
  const podeGerenciarRecorrencia = isCriador || isAdmin;
  const podeEditar = (isCriador || isExecutor) && tarefa.status !== 'concluida';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => navigate('/tarefas')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{tarefa.titulo}</h1>
            <Badge className={statusColors[tarefa.status]}>
              {statusLabels[tarefa.status]}
            </Badge>
            <Badge className={prioridadeColors[tarefa.prioridade]}>
              {prioridadeLabels[tarefa.prioridade]}
            </Badge>
            {tarefa.recorrente && (
              <Badge variant="outline" className="gap-1">
                <RefreshCw className="h-3 w-3" />
                {tarefa.ativa_recorrencia ? 'Diária' : 'Recorrência encerrada'}
              </Badge>
            )}
            {tarefa.tarefa_origem_id && (
              <Badge variant="secondary" className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Gerada automaticamente
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {/* Botão Editar - para criador e executor */}
          {podeEditar && (
            <Button variant="outline" onClick={() => setEditarDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          
          {/* Botão Duplicar - sempre visível */}
          <Button variant="outline" onClick={handleDuplicar} disabled={duplicarTarefa.isPending}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>
          
          {podeIniciar && (
            <Button variant="outline" onClick={() => iniciarTarefa.mutate(tarefa.id)}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar
            </Button>
          )}
          {podeConcluir && (
            <Button onClick={() => marcarConcluida.mutate(tarefa.id)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar como Concluída
            </Button>
          )}
          {podeValidar && (
            <Button variant="default" onClick={() => validarTarefa.mutate(tarefa.id)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Validar Conclusão
            </Button>
          )}
          {podeReabrir && (
            <Button variant="outline" onClick={() => reabrirTarefa.mutate(tarefa.id)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reabrir
            </Button>
          )}
          {podeExcluir && (
            <Button variant="destructive" size="icon" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Conteúdo Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Descrição ou Checklist */}
          <Card>
            <CardHeader>
              <CardTitle>
                {tarefa.tipo_conteudo === 'checklist' ? 'Checklist' : 'Descrição'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tarefa.tipo_conteudo === 'checklist' ? (
                <div className="space-y-4">
                  {progresso !== null && (
                    <div className="flex items-center gap-3">
                      <Progress value={progresso} className="flex-1" />
                      <span className="text-sm font-medium">
                        {checklist.filter(i => i.concluido).length}/{checklist.length} ({progresso}%)
                      </span>
                    </div>
                  )}
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={item.concluido}
                          onCheckedChange={() => handleToggleItem(item.id, item.concluido)}
                          disabled={tarefa.status === 'concluida'}
                        />
                        <span className={item.concluido ? 'line-through text-muted-foreground' : ''}>
                          {item.descricao}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {tarefa.descricao || 'Sem descrição'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ScrollArea className="h-[300px] pr-4">
                {observacoes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma observação ainda
                  </p>
                ) : (
                  <div className="space-y-4">
                    {observacoes.map((obs) => {
                      const isOwn = obs.usuario_id === user?.id;
                      const isNaoLida = !obs.lida_por?.includes(user?.id || '');
                      return (
                        <div
                          key={obs.id}
                          className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {obs.usuario?.nome?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
                            <div className={`inline-block p-3 rounded-lg max-w-[80%] ${
                              isOwn 
                                ? 'bg-primary text-primary-foreground' 
                                : isNaoLida 
                                  ? 'bg-yellow-100 dark:bg-yellow-900' 
                                  : 'bg-muted'
                            }`}>
                              <p className="text-sm">{obs.mensagem}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {obs.usuario?.nome} • {formatDistanceToNow(parseISO(obs.created_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
              
              <Separator />
              
              <div className="flex gap-2">
                <Textarea
                  placeholder="Escreva uma observação..."
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  className="min-h-[80px]"
                />
                <Button 
                  onClick={handleEnviarObservacao}
                  disabled={!novaObservacao.trim() || adicionarObservacao.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Criador</p>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4" />
                  <span>{tarefa.criador?.nome || 'N/A'}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Executor</p>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4" />
                  <span>{tarefa.executor?.nome || 'N/A'}</span>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Limite</p>
                <div className={`flex items-center gap-2 mt-1 ${
                  isAtrasada ? 'text-destructive' : isHoje ? 'text-yellow-600' : ''
                }`}>
                  <Calendar className="h-4 w-4" />
                  <span>{format(dataLimite, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  {isAtrasada && <AlertTriangle className="h-4 w-4" />}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground">Criado em</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4" />
                  <span>{format(parseISO(tarefa.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                </div>
              </div>

              {tarefa.concluida_em && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Concluída em</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{format(parseISO(tarefa.concluida_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              )}

              {tarefa.validada_em && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Validada em</p>
                  <div className="flex items-center gap-2 mt-1">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{format(parseISO(tarefa.validada_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card de Recorrência */}
          {podeGerenciarRecorrencia && !tarefa.tarefa_origem_id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Recorrência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recorrencia-switch" className="text-sm">
                    Tarefa diária (dias úteis)
                  </Label>
                  <Switch
                    id="recorrencia-switch"
                    checked={tarefa.recorrente}
                    onCheckedChange={handleToggleRecorrencia}
                    disabled={toggleRecorrencia.isPending}
                  />
                </div>
                
                {tarefa.recorrente && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-3">
                      Esta tarefa será recriada automaticamente todos os dias úteis até que o ciclo seja encerrado.
                    </p>
                    {tarefa.ativa_recorrencia ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setEncerrarRecorrenciaDialogOpen(true)}
                      >
                        Encerrar ciclo de recorrência
                      </Button>
                    ) : (
                      <Badge variant="secondary" className="w-full justify-center">
                        Ciclo encerrado
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá arquivar a tarefa. Ela não aparecerá mais na listagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de conclusão */}
      <AlertDialog open={concluirDialogOpen} onOpenChange={setConcluirDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Todos os itens concluídos!</AlertDialogTitle>
            <AlertDialogDescription>
              Você completou todos os itens do checklist. Deseja marcar a tarefa como concluída?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              marcarConcluida.mutate(tarefa.id);
              setConcluirDialogOpen(false);
            }}>
              Marcar como Concluída
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação de encerrar recorrência */}
      <AlertDialog open={encerrarRecorrenciaDialogOpen} onOpenChange={setEncerrarRecorrenciaDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar ciclo de recorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              Novas tarefas não serão mais geradas automaticamente. A tarefa atual permanecerá ativa para ser concluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEncerrarRecorrencia}>
              Encerrar ciclo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de edição */}
      {tarefa && (
        <EditarTarefaDialog
          tarefa={tarefa}
          open={editarDialogOpen}
          onOpenChange={setEditarDialogOpen}
        />
      )}
    </div>
  );
}
