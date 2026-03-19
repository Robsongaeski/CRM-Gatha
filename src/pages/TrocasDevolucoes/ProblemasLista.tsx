import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, Pencil, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useProblemasPedido, useUpdateProblemaPedido, TipoProblema, StatusProblema } from '@/hooks/useProblemasPedido';
import { parseDateString } from '@/lib/formatters';

const tipoProblemaLabels: Record<TipoProblema, string> = {
  atraso_entrega: 'Atraso na Entrega',
  sem_tentativa_entrega: 'Sem Tentativa de Entrega',
  entregue_nao_recebido: 'Entregue mas Não Recebido',
  outro: 'Outro',
};

export default function ProblemasLista() {
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('pendente');
  const [incluirResolvidos, setIncluirResolvidos] = useState(false);

  const { data: problemas = [], isLoading } = useProblemasPedido({
    search: search || undefined,
    tipo_problema: tipoFilter as TipoProblema || undefined,
    status: statusFilter as StatusProblema || undefined,
    incluirResolvidos,
  });
  const updateProblema = useUpdateProblemaPedido();

  const getRowClass = (cor: string) => {
    if (cor === 'vermelho') return 'bg-red-50 hover:bg-red-100';
    if (cor === 'amarelo') return 'bg-yellow-50 hover:bg-yellow-100';
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/ecommerce/suporte"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chamados</h1>
            <p className="text-muted-foreground">Acompanhamento de pedidos com problemas</p>
          </div>
        </div>
        <Link to="/ecommerce/suporte/chamados/novo"><Button><Plus className="mr-2 h-4 w-4" />Novo Chamado</Button></Link>
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
              <label className="text-sm font-medium text-muted-foreground">Tipo de Problema</label>
              <Select value={tipoFilter || "all"} onValueChange={(v) => setTipoFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todos os tipos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {Object.entries(tipoProblemaLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="nao_resolvido">Não Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">&nbsp;</label>
              <div className="flex items-center gap-2 h-10">
                <Checkbox id="incluirResolvidos" checked={incluirResolvidos} onCheckedChange={(c) => setIncluirResolvidos(!!c)} />
                <label htmlFor="incluirResolvidos" className="text-sm">Incluir resolvidos</label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Rastreio</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Horas Úteis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : problemas.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum problema encontrado</TableCell></TableRow>
              ) : (
                problemas.map((problema) => (
                  <TableRow key={problema.id} className={getRowClass(problema.cor_alerta || 'normal')}>
                    <TableCell>{format(parseDateString(problema.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                    <TableCell className="font-medium">{problema.numero_pedido}</TableCell>
                    <TableCell>{problema.nome_cliente || '-'}</TableCell>
                    <TableCell>{problema.telefone_cliente || '-'}</TableCell>
                    <TableCell>{problema.codigo_rastreio || '-'}</TableCell>
                    <TableCell>{tipoProblemaLabels[problema.tipo_problema]}</TableCell>
                    <TableCell>
                      <span className={problema.cor_alerta === 'vermelho' ? 'text-red-700 font-bold' : problema.cor_alerta === 'amarelo' ? 'text-yellow-700 font-semibold' : ''}>
                        {problema.horas_uteis}h
                      </span>
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={problema.status} 
                        onValueChange={(v) => updateProblema.mutate({ id: problema.id, status: v as StatusProblema })}
                      >
                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="resolvido">Resolvido</SelectItem>
                          <SelectItem value="nao_resolvido">Não Resolvido</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/ecommerce/suporte/chamados/${problema.id}/editar`}>
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
