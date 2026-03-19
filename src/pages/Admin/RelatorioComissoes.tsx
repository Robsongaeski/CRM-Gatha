import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileSpreadsheet, AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useRelatorioComissoes, ComissaoRelatorio } from '@/hooks/useRelatorioComissoes';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useMarcarComissoesPagas } from '@/hooks/useComissoes';
import { formatCurrency, parseDateString } from '@/lib/formatters';

export default function RelatorioComissoes() {
  const currentDate = new Date();
  const [vendedorId, setVendedorId] = useState<string>('todos');
  const [mesCompetencia, setMesCompetencia] = useState<string>(
    format(currentDate, 'yyyy-MM')
  );
  const [statusFiltro, setStatusFiltro] = useState<'todas' | 'prevista' | 'pendente' | 'paga'>('todas');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: usuarios } = useUsuarios();
  const vendedores = usuarios?.filter(u => 
    u.ativo !== false && (
      u.roles?.includes('vendedor') || 
      u.profiles?.some(p => p.codigo === 'vendedor')
    )
  );

  const { data: relatorio, isLoading } = useRelatorioComissoes({
    vendedorId: vendedorId === 'todos' ? undefined : vendedorId,
    mesCompetencia,
    statusFiltro,
  });

  const marcarPagas = useMarcarComissoesPagas();

  // Gerar lista de meses (últimos 12 meses)
  const mesesDisponiveis = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  const handleSelectAll = () => {
    if (!relatorio) return;
    const pendentes = relatorio.comissoes
      .filter(c => c.status_comissao === 'pendente')
      .map(c => c.comissao_id);
    
    if (selectedIds.length === pendentes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendentes);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const handleMarcarPagas = async () => {
    if (selectedIds.length === 0) return;
    await marcarPagas.mutateAsync(selectedIds);
    setSelectedIds([]);
  };

  const getStatusBadge = (comissao: ComissaoRelatorio) => {
    const variants = {
      prevista: { variant: 'outline' as const, label: '⏳ Prevista', className: 'border-purple-300 text-purple-700' },
      pendente: { variant: 'secondary' as const, label: '✓ Confirmada', className: 'bg-green-100 text-green-700' },
      paga: { variant: 'default' as const, label: '💰 Paga', className: 'bg-primary' },
      cancelada: { variant: 'destructive' as const, label: '✗ Cancelada', className: '' },
    };
    const config = variants[comissao.status_comissao] || variants.prevista;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getStatusPedidoBadge = (status: string) => {
    const statusLabels: Record<string, { label: string; className: string }> = {
      rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800' },
      em_producao: { label: 'Em Produção', className: 'bg-blue-100 text-blue-800' },
      pronto: { label: 'Pronto', className: 'bg-green-100 text-green-800' },
      entregue: { label: 'Entregue', className: 'bg-emerald-100 text-emerald-800' },
      cancelado: { label: 'Cancelado', className: 'bg-red-100 text-red-800' },
    };
    const config = statusLabels[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>{config.label}</span>;
  };

  const getAnomaliaIcon = (severidade: string) => {
    if (severidade === 'critico') {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (severidade === 'atencao') {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
    return <Info className="h-4 w-4 text-yellow-500" />;
  };

  const comissoesPendentes = relatorio?.comissoes.filter(c => c.status_comissao === 'pendente') || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8" />
            Relatório de Comissões
          </h1>
          <p className="text-muted-foreground mt-1">
            Análise detalhada de comissões por vendedor e pagamento
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Vendedor</label>
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Vendedores</SelectItem>
                {vendedores?.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Mês de Competência</label>
            <Select value={mesCompetencia} onValueChange={setMesCompetencia}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mesesDisponiveis.map(mes => (
                  <SelectItem key={mes.value} value={mes.value}>
                    {mes.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={statusFiltro} onValueChange={(v: any) => setStatusFiltro(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="prevista">Previstas</SelectItem>
                <SelectItem value="pendente">Confirmadas (Efetivas)</SelectItem>
                <SelectItem value="paga">Pagas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      {relatorio && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Base</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(relatorio.resumo.total_vendas)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>% Comissão Média</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {relatorio.resumo.percentual_medio.toFixed(2)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Comissões Previstas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(relatorio.resumo.total_comissoes_previstas)}
                </div>
                <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Comissões Confirmadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(relatorio.resumo.total_comissoes_confirmadas)}
                </div>
                <p className="text-xs text-muted-foreground">A pagar ao vendedor</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Comissões Pagas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(relatorio.resumo.total_comissoes_pagas)}
                </div>
                <p className="text-xs text-muted-foreground">Já pagas</p>
              </CardContent>
            </Card>
          </div>

          {/* Alerta de anomalias */}
          {relatorio.resumo.registros_com_anomalias > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{relatorio.resumo.registros_com_anomalias}</strong> registro(s) com anomalias detectadas. 
                Verifique a coluna de alertas na tabela abaixo.
              </AlertDescription>
            </Alert>
          )}

          {/* Ações em lote */}
          {comissoesPendentes.length > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                checked={selectedIds.length === comissoesPendentes.length && comissoesPendentes.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">
                {selectedIds.length > 0 
                  ? `${selectedIds.length} comissão(ões) selecionada(s)`
                  : `Selecionar todas as ${comissoesPendentes.length} confirmadas`}
              </span>
              {selectedIds.length > 0 && (
                <Button 
                  size="sm" 
                  onClick={handleMarcarPagas}
                  disabled={marcarPagas.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marcar como Pagas
                </Button>
              )}
            </div>
          )}

          {/* Tabela de Comissões */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Comissões</CardTitle>
              <CardDescription>
                {relatorio.comissoes.length} registro(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Data Pedido</TableHead>
                      <TableHead>Data Aprovação</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-right">Valor Base</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Alertas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : relatorio.comissoes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground">
                          Nenhuma comissão encontrada para os filtros selecionados
                        </TableCell>
                      </TableRow>
                    ) : (
                      relatorio.comissoes.map(comissao => (
                        <TableRow key={comissao.comissao_id} className={comissao.tipo_comissao === 'prevista' ? 'bg-muted/30' : ''}>
                          <TableCell>
                            {comissao.status_comissao === 'pendente' && (
                              <Checkbox
                                checked={selectedIds.includes(comissao.comissao_id)}
                                onCheckedChange={() => handleSelect(comissao.comissao_id)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">#{comissao.numero_pedido}</TableCell>
                          <TableCell>
                            {comissao.parcela_info ? (
                              <Badge variant="outline" className="text-xs">
                                {comissao.parcela_info}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                {comissao.tipo_comissao === 'prevista' ? 'Total' : '-'}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {comissao.data_pedido 
                              ? format(parseDateString(comissao.data_pedido) || new Date(), 'dd/MM/yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {comissao.data_aprovacao 
                              ? format(new Date(comissao.data_aprovacao), 'dd/MM/yyyy')
                              : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="max-w-[150px] truncate" title={comissao.cliente_nome}>
                            {comissao.cliente_nome}
                          </TableCell>
                          <TableCell>{comissao.vendedor_nome}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(comissao.valor_parcela)}
                          </TableCell>
                          <TableCell className="text-right">
                            {comissao.percentual_comissao.toFixed(2)}%
                          </TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(comissao.valor_comissao)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(comissao)}
                          </TableCell>
                          <TableCell className="text-center">
                            {comissao.anomalias.length > 0 ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center justify-center gap-1">
                                      {comissao.anomalias.map((anomalia, idx) => (
                                        <span key={idx}>
                                          {getAnomaliaIcon(anomalia.severidade)}
                                        </span>
                                      ))}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <ul className="space-y-1">
                                      {comissao.anomalias.map((anomalia, idx) => (
                                        <li key={idx} className="text-sm">
                                          • {anomalia.descricao}
                                        </li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-green-600">✓</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
