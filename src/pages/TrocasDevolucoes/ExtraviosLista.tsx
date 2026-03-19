import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useExtravios, useUpdateExtravio, StatusRessarcimento } from '@/hooks/useExtravios';
import { useUserRole } from '@/hooks/useUserRole';
import { parseDateString } from '@/lib/formatters';
import { AcoesLoteBarra } from '@/components/Leads/AcoesLoteBarra';
import { toast } from 'sonner';

export default function ExtraviosLista() {
  const { isAdmin } = useUserRole();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [ressarcimentoFilter, setRessarcimentoFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('');

  const { data: extravios = [], isLoading } = useExtravios({
    search: search || undefined,
    status_ressarcimento: statusFilter as StatusRessarcimento || undefined,
    solicitado_ressarcimento: ressarcimentoFilter === 'all' ? undefined : ressarcimentoFilter === 'sim',
    dataInicio: dataInicio || undefined,
    dataFim: dataFim || undefined,
  });
  const updateExtravio = useUpdateExtravio();

  const allSelected = extravios.length > 0 && selectedIds.size === extravios.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < extravios.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(extravios.map((e) => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    const statusMap: Record<string, StatusRessarcimento> = {
      pendente: 'pendente',
      aprovado: 'aprovado',
      negado: 'negado',
    };
    const newStatus = statusMap[bulkStatus];
    if (!newStatus) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          updateExtravio.mutateAsync({ id, status_ressarcimento: newStatus, solicitado_ressarcimento: true })
        )
      );
      toast.success(`Status de ${selectedIds.size} extravio(s) atualizado para "${bulkStatus}"`);
      setSelectedIds(new Set());
      setBulkStatus('');
    } catch {
      toast.error('Erro ao atualizar status em lote');
    }
  };

  const handleInlineStatusChange = (id: string, newStatus: string) => {
    if (newStatus === 'sem_ressarcimento') {
      updateExtravio.mutate({ id, solicitado_ressarcimento: false, status_ressarcimento: 'pendente' as StatusRessarcimento });
    } else {
      updateExtravio.mutate({
        id,
        solicitado_ressarcimento: true,
        status_ressarcimento: newStatus as StatusRessarcimento,
      });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const getStatusBadge = (status: StatusRessarcimento) => {
    const variants: Record<StatusRessarcimento, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      pendente: { variant: 'secondary', label: 'Pendente' },
      aprovado: { variant: 'default', label: 'Aprovado' },
      negado: { variant: 'destructive', label: 'Negado' },
    };
    return <Badge variant={variants[status].variant}>{variants[status].label}</Badge>;
  };

  const getInlineStatusValue = (extravio: { solicitado_ressarcimento: boolean; status_ressarcimento: StatusRessarcimento }) => {
    if (!extravio.solicitado_ressarcimento) return 'sem_ressarcimento';
    return extravio.status_ressarcimento;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/ecommerce/suporte">
            <Button variant="ghost" size="icon">
              <span className="sr-only">Voltar</span>
              ←
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Extravios e Roubos</h1>
            <p className="text-muted-foreground">Registro de extravios e roubos na entrega</p>
          </div>
        </div>
        <Link to="/ecommerce/suporte/extravios/novo">
          <Button><Plus className="mr-2 h-4 w-4" />Novo Extravio</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Nº pedido, cliente, rastreio..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Ressarcimento</label>
              <Select value={ressarcimentoFilter} onValueChange={setRessarcimentoFilter}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="sim">Solicitado</SelectItem>
                  <SelectItem value="nao">Não solicitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Status Ressarcimento</label>
              <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="negado">Negado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Data Início</label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Data Fim</label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg animate-in slide-in-from-top-2">
          <span className="text-sm font-medium">{selectedIds.size} extravio(s) selecionado(s)</span>
          <div className="flex-1" />
          <Select value={bulkStatus} onValueChange={setBulkStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alterar status para..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="negado">Negado</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleBulkStatusChange} disabled={!bulkStatus || updateExtravio.isPending}>
            Aplicar
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setSelectedIds(new Set()); setBulkStatus(''); }}>
            Limpar
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        const input = el.querySelector('button');
                        if (input) input.dataset.state = someSelected ? 'indeterminate' : allSelected ? 'checked' : 'unchecked';
                      }
                    }}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Rastreio</TableHead>
                <TableHead>Ressarcimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : extravios.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum extravio encontrado</TableCell></TableRow>
              ) : (
                extravios.map((extravio) => (
                  <TableRow key={extravio.id} data-state={selectedIds.has(extravio.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(extravio.id)}
                        onCheckedChange={() => toggleSelect(extravio.id)}
                      />
                    </TableCell>
                    <TableCell>{format(parseDateString(extravio.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="font-medium">{extravio.numero_pedido}</TableCell>
                    <TableCell>{extravio.nome_cliente}</TableCell>
                    <TableCell>{extravio.numero_rastreio || '-'}</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={extravio.solicitado_ressarcimento}
                        onCheckedChange={(checked) =>
                          updateExtravio.mutate({ id: extravio.id, solicitado_ressarcimento: !!checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const val = getInlineStatusValue(extravio);
                        const colorClasses: Record<string, string> = {
                          aprovado: 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
                          negado: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
                          pendente: 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
                          sem_ressarcimento: '',
                        };
                        return (
                          <Select
                            value={val}
                            onValueChange={(v) => handleInlineStatusChange(extravio.id, v)}
                          >
                            <SelectTrigger className={`w-[160px] h-8 text-xs font-medium ${colorClasses[val] || ''}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sem_ressarcimento">Sem ressarcimento</SelectItem>
                              <SelectItem value="pendente">
                                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-yellow-500" />Pendente</span>
                              </SelectItem>
                              <SelectItem value="aprovado">
                                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-green-500" />Aprovado</span>
                              </SelectItem>
                              <SelectItem value="negado">
                                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" />Negado</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/ecommerce/suporte/extravios/${extravio.id}/editar`}>
                        <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
