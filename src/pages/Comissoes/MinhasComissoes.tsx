import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Target, DollarSign, TrendingUp, Calendar, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useDashboardComissao, useComissoes, Comissao } from '@/hooks/useComissoes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';

export default function MinhasComissoes() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>(user?.id || '');
  const [mesSelecionado, setMesSelecionado] = useState<string>(
    new Date().toISOString().slice(0, 7) + '-01'
  );
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'previstas' | 'confirmadas' | 'pagas'>('todas');

  // Buscar vendedores (apenas para admin) - combina sistemas novo e legado
  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-comissao-minhas'],
    queryFn: async () => {
      // Sistema novo
      const { data: newProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, system_profiles!inner(codigo)')
        .eq('system_profiles.codigo', 'vendedor')
        .eq('system_profiles.ativo', true);

      // Sistema legado
      const { data: legacyRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'vendedor');

      const ids = new Set<string>();
      newProfiles?.forEach(p => ids.add(p.user_id));
      legacyRoles?.forEach(r => ids.add(r.user_id));

      if (ids.size === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, ativo')
        .in('id', Array.from(ids))
        .eq('ativo', true)
        .order('nome');

      return profiles?.map(p => ({ id: p.id, nome: p.nome })) || [];
    },
    enabled: isAdmin,
  });

  const vendedorAtual = isAdmin ? vendedorSelecionado : user?.id;
  const dashboardComissao = useDashboardComissao(vendedorAtual, mesSelecionado);
  const { data: comissoesData = [] } = useComissoes(vendedorAtual, mesSelecionado);

  // Filtrar comissões por status
  const comissoes = comissoesData.filter(c => {
    if (filtroStatus === 'previstas') return c.status === 'prevista';
    if (filtroStatus === 'confirmadas') return c.status === 'pendente';
    if (filtroStatus === 'pagas') return c.status === 'paga';
    return c.status !== 'cancelada'; // 'todas' exclui apenas canceladas
  });

  // Buscar pedidos e pagamentos relacionados às comissões
  const { data: pedidosComissoes } = useQuery({
    queryKey: ['pedidos-comissoes', comissoes.map(c => c.pedido_id)],
    queryFn: async () => {
      if (comissoes.length === 0) return [];
      const { data, error } = await supabase
        .from('pedidos')
        .select('id, numero_pedido, data_pedido, clientes(nome_razao_social)')
        .in('id', comissoes.map(c => c.pedido_id));
      if (error) throw error;
      return data;
    },
    enabled: comissoes.length > 0,
  });

  // Buscar pagamentos para info de parcela
  const { data: pagamentosComissoes } = useQuery({
    queryKey: ['pagamentos-comissoes', comissoes.filter(c => c.pagamento_id).map(c => c.pagamento_id)],
    queryFn: async () => {
      const pagamentoIds = comissoes.filter(c => c.pagamento_id).map(c => c.pagamento_id);
      if (pagamentoIds.length === 0) return [];
      const { data, error } = await supabase
        .from('pagamentos')
        .select('id, valor, observacao, data_aprovacao')
        .in('id', pagamentoIds);
      if (error) throw error;
      return data;
    },
    enabled: comissoes.some(c => c.pagamento_id),
  });

  const getPedidoInfo = (pedidoId: string) => {
    return pedidosComissoes?.find(p => p.id === pedidoId);
  };

  const getPagamentoInfo = (pagamentoId?: string) => {
    if (!pagamentoId) return null;
    return pagamentosComissoes?.find(p => p.id === pagamentoId);
  };

  // Gerar lista de meses disponíveis (últimos 12 meses)
  const mesesDisponiveis = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: date.toISOString().slice(0, 7) + '-01',
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  const getStatusBadge = (comissao: Comissao) => {
    if (comissao.status === 'paga') {
      return <Badge className="bg-primary">💰 Paga</Badge>;
    }
    if (comissao.status === 'cancelada') {
      return <Badge variant="destructive">✗ Cancelada</Badge>;
    }
    if (comissao.status === 'prevista') {
      return <Badge variant="outline" className="border-purple-300 text-purple-700">⏳ Prevista</Badge>;
    }
    // pendente = confirmada
    return <Badge variant="secondary" className="bg-green-100 text-green-700">✓ Confirmada</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Minhas Comissões</h1>
          <p className="text-muted-foreground">
            {isAdmin && vendedorSelecionado 
              ? `Comissões de ${vendedores.find(v => v.id === vendedorSelecionado)?.nome}`
              : 'Acompanhe suas comissões e metas'}
          </p>
        </div>
        
        {isAdmin && (
          <Select value={vendedorSelecionado} onValueChange={setVendedorSelecionado}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Selecionar vendedor" />
            </SelectTrigger>
            <SelectContent>
              {vendedores.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Cards de Resumo */}
      {dashboardComissao.data && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vendido</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(dashboardComissao.data.total_vendido)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(dashboardComissao.data.mes_atual), 'MMMM yyyy', { locale: ptBR })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faixa Atual</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {dashboardComissao.data.faixa_atual?.descricao || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardComissao.data.faixa_atual?.percentual}% de comissão
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissão Prevista</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(dashboardComissao.data.total_comissao_prevista)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando pagamento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissão Confirmada</CardTitle>
              <Clock className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(dashboardComissao.data.total_comissao_confirmada)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pedidos pagos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissão Paga</CardTitle>
              <CheckCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboardComissao.data.total_comissao_paga)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Já recebida
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Histórico de Comissões */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Histórico de Comissões</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="previstas">Previstas</SelectItem>
                  <SelectItem value="confirmadas">Confirmadas</SelectItem>
                  <SelectItem value="pagas">Pagas</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={mesSelecionado} onValueChange={setMesSelecionado}>
                <SelectTrigger className="w-[200px]">
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
          </div>
        </CardHeader>
        <CardContent>
          {comissoes.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhuma comissão encontrada para este período</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Base</TableHead>
                  <TableHead>% Comissão</TableHead>
                  <TableHead>Valor Comissão</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoes.map((comissao) => {
                  const pedidoInfo = getPedidoInfo(comissao.pedido_id);
                  const pagamentoInfo = getPagamentoInfo(comissao.pagamento_id);
                  
                  // Extrair info de parcela da observação do pagamento
                  let parcelaInfo = '';
                  if (pagamentoInfo?.observacao) {
                    const match = pagamentoInfo.observacao.match(/Parcela \d+\/\d+/);
                    if (match) parcelaInfo = match[0];
                  }
                  
                  return (
                    <TableRow key={comissao.id} className={comissao.tipo_comissao === 'prevista' ? 'bg-muted/30' : ''}>
                      <TableCell>
                        {comissao.pagamento_id && pagamentoInfo?.data_aprovacao
                          ? format(new Date(pagamentoInfo.data_aprovacao), 'dd/MM/yyyy', { locale: ptBR })
                          : format(new Date(comissao.data_geracao), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-mono">
                        #{pedidoInfo?.numero_pedido || '-'}
                      </TableCell>
                      <TableCell>
                        {parcelaInfo ? (
                          <Badge variant="outline" className="text-xs">{parcelaInfo}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {comissao.tipo_comissao === 'prevista' ? 'Total' : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {pedidoInfo?.clientes?.nome_razao_social || '-'}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          comissao.tipo_comissao === 'efetiva' && comissao.valor_pago
                            ? Number(comissao.valor_pago)
                            : Number(comissao.valor_pedido)
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{comissao.percentual_comissao}%</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        {formatCurrency(Number(comissao.valor_comissao))}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              {getStatusBadge(comissao)}
                            </TooltipTrigger>
                            <TooltipContent>
                              {comissao.status === 'prevista' && 
                                'Comissão será confirmada quando o pagamento for aprovado'}
                              {comissao.status === 'pendente' && 
                                'Comissão confirmada, aguardando pagamento ao vendedor'}
                              {comissao.status === 'paga' && 
                                'Comissão já foi paga'}
                              {comissao.status === 'cancelada' && 
                                'Comissão cancelada'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
