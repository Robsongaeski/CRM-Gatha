import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePropostas, useDeleteProposta, useUpdatePropostaStatus, StatusProposta } from '@/hooks/usePropostas';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Eye, Pencil, Trash2, Bell, CheckCircle } from 'lucide-react';
import { format, isBefore, isToday } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig = {
  pendente: { label: 'Pendente', variant: 'secondary' as const },
  enviada: { label: 'Enviada', variant: 'default' as const },
  follow_up: { label: 'Follow-up', variant: 'default' as const },
  ganha: { label: 'Ganha', variant: 'default' as const },
  perdida: { label: 'Perdida', variant: 'destructive' as const },
};

const statusOptions: Array<{ value: StatusProposta; label: string }> = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'ganha', label: 'Ganha' },
  { value: 'perdida', label: 'Perdida' },
];

export default function PropostasLista() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin, isVendedor } = useUserRole();
  const { can } = usePermissions();
  const podeCriar = isAdmin || isVendedor || can('propostas.criar');
  const podeEditar = isAdmin || isVendedor || can('propostas.editar') || can('propostas.editar_todos') || can('propostas.editar_todas');
  const podeConverterPedido = isAdmin || isVendedor || can('pedidos.criar');
  const statusParam = searchParams.get('status');
  const statusFilter: StatusProposta | 'all' =
    statusParam && statusOptions.some((option) => option.value === statusParam)
      ? (statusParam as StatusProposta)
      : 'all';
  const search = searchParams.get('search') || '';
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const { data: propostas = [], isLoading } = usePropostas(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const deleteMutation = useDeleteProposta();
  const updateStatusMutation = useUpdatePropostaStatus();

  const updateFilters = (changes: {
    status?: StatusProposta | 'all' | null;
    search?: string | null;
  }) => {
    const next = new URLSearchParams(searchParams);

    if (changes.status !== undefined) {
      if (!changes.status || changes.status === 'all') next.delete('status');
      else next.set('status', changes.status);
    }

    if (changes.search !== undefined) {
      const value = (changes.search || '').trim();
      if (!value) next.delete('search');
      else next.set('search', value);
    }

    setSearchParams(next, { replace: true });
  };

  const returnTo = `/propostas${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

  const filteredPropostas = propostas.filter((proposta: any) => {
    const searchLower = search.toLowerCase();
    return (
      proposta.cliente?.nome_razao_social?.toLowerCase().includes(searchLower) ||
      proposta.cliente?.telefone?.toLowerCase().includes(searchLower) ||
      proposta.vendedor?.nome?.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const getFollowUpStatus = (dataFollowUp: string | null) => {
    if (!dataFollowUp) return null;
    const date = new Date(dataFollowUp);
    if (isBefore(date, new Date()) && !isToday(date)) {
      return 'overdue';
    }
    if (isToday(date)) {
      return 'today';
    }
    return 'future';
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleStatusChange = async (propostaId: string, nextStatus: StatusProposta) => {
    setUpdatingStatusId(propostaId);
    try {
      await updateStatusMutation.mutateAsync({ id: propostaId, status: nextStatus });
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const stats = {
    total: propostas.length,
    ganhas: propostas.filter((p: any) => p.status === 'ganha').length,
    valorTotal: propostas
      .filter((p: any) => p.status !== 'perdida')
      .reduce((sum: number, p: any) => sum + parseFloat(p.valor_total || 0), 0),
    lembretesHoje: propostas.filter(
      (p: any) => p.data_follow_up && isToday(new Date(p.data_follow_up))
    ).length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Propostas</h1>
        {podeCriar && (
          <Button onClick={() => navigate('/propostas/nova')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Proposta
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Propostas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Propostas Ganhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.ganhas}</p>
            <p className="text-sm text-muted-foreground">
              {stats.total > 0 ? `${((stats.ganhas / stats.total) * 100).toFixed(1)}%` : '0%'} de
              conversão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor em Negociação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(stats.valorTotal)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lembretes Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.lembretesHoje}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Buscar por cliente, vendedor ou telefone..."
              value={search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="flex-1"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => updateFilters({ status: value as StatusProposta | 'all' })}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPropostas.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma proposta encontrada</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Follow-up</TableHead>
                    {isAdmin && <TableHead>Vendedor</TableHead>}
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPropostas.map((proposta: any) => {
                    const followUpStatus = getFollowUpStatus(proposta.data_follow_up);
                    const config = statusConfig[proposta.status as StatusProposta];

                    return (
                      <TableRow key={proposta.id}>
                        <TableCell className="font-medium">
                          {proposta.cliente?.nome_razao_social}
                        </TableCell>
                        <TableCell>{formatCurrency(proposta.valor_total)}</TableCell>
                        <TableCell>
                          {podeEditar ? (
                            <Select
                              value={proposta.status}
                              onValueChange={(value) => handleStatusChange(proposta.id, value as StatusProposta)}
                              disabled={updateStatusMutation.isPending && updatingStatusId === proposta.id}
                            >
                              <SelectTrigger className="h-8 w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant={config.variant}>{config.label}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {proposta.data_follow_up ? (
                            <div className="flex items-center gap-2">
                              <Bell
                                className={cn(
                                  'h-4 w-4',
                                  followUpStatus === 'overdue' && 'text-destructive',
                                  followUpStatus === 'today' && 'text-warning'
                                )}
                              />
                              <span
                                className={cn(
                                  followUpStatus === 'overdue' && 'text-destructive',
                                  followUpStatus === 'today' && 'text-warning'
                                )}
                              >
                                {format(new Date(proposta.data_follow_up), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        {isAdmin && <TableCell>{proposta.vendedor?.nome}</TableCell>}
                        <TableCell>{format(new Date(proposta.created_at), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                navigate(
                                  `/propostas/${proposta.id}?returnTo=${encodeURIComponent(returnTo)}`
                                )
                              }
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {podeEditar && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  navigate(
                                    `/propostas/editar/${proposta.id}?returnTo=${encodeURIComponent(returnTo)}`
                                  )
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {podeConverterPedido && proposta.status === 'ganha' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Converter em pedido"
                                onClick={() => navigate(`/pedidos/novo?propostaId=${proposta.id}`)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(proposta.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
