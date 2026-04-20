import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Target, 
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  FileText,
  AlertCircle,
  Phone
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useDashboardComissao } from '@/hooks/useComissoes';
import { useDashboardVendedor } from '@/hooks/useDashboardVendedor';
import { useDashboardGeral } from '@/hooks/useDashboardGeral';
import { formatCurrency, parseDateString } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useNavigate, Navigate } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const { isAdmin, isVendedor, isAtendente, isFinanceiro } = useUserRole();
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>(user?.id || '');
  const [viewMode, setViewMode] = useState<'individual' | 'geral'>('individual');
  const navigate = useNavigate();

  // Redirecionar atendentes puros para tela de entregas
  if (isAtendente && !isAdmin && !isVendedor && !isFinanceiro) {
    return <Navigate to="/entrega-pedidos" replace />;
  }

  // Redirecionar financeiros puros para tela de pagamentos pendentes
  if (isFinanceiro && !isAdmin && !isVendedor) {
    return <Navigate to="/financeiro/pagamentos-pendentes" replace />;
  }

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-list'],
    queryFn: async () => {
      // Buscar do sistema NOVO (user_profiles + system_profiles)
      const { data: newProfiles } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          system_profiles!inner (
            codigo,
            ativo
          )
        `)
        .filter('system_profiles.codigo', 'eq', 'vendedor')
        .filter('system_profiles.ativo', 'eq', true);

      const newUserIds = newProfiles?.map((p: any) => p.user_id) || [];

      // Buscar do sistema ANTIGO (user_roles) como fallback
      const { data: oldRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'vendedor');

      const oldUserIds = oldRoles?.map(r => r.user_id) || [];

      // Combinar IDs únicos
      const allUserIds = [...new Set([...newUserIds, ...oldUserIds])];
      if (allUserIds.length === 0) return [];

      // Buscar profiles apenas ativos
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, ativo')
        .in('id', allUserIds)
        .neq('ativo', false);
      
      return profiles?.map(p => ({ id: p.id, nome: p.nome })) || [];
    },
    enabled: isAdmin,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const vendedorAtual = isAdmin && viewMode === 'individual' ? vendedorSelecionado : user?.id;
  const dashboardComissao = useDashboardComissao(vendedorAtual);
  const dashboardVendedor = useDashboardVendedor(vendedorAtual);
  const dashboardGeral = useDashboardGeral();

  // Métricas gerais para admin
  const { data: clientesCount = 0 } = useQuery({
    queryKey: ['clientes-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
    enabled: isAdmin,
  });

  const { data: produtosCount = 0 } = useQuery({
    queryKey: ['produtos-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
    enabled: isAdmin,
  });

  const formatPercentage = (value: number) => 
    `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const comissaoConfirmada = dashboardComissao.data
    ? dashboardComissao.data.comissoes
        .filter(c => c.status === 'pendente' || c.status === 'paga')
        .reduce((sum, c) => sum + Number(c.valor_comissao), 0)
    : 0;

  const comissaoPrevista = dashboardComissao.data
    ? dashboardComissao.data.comissoes
        .filter(c => c.status === 'prevista')
        .reduce((sum, c) => sum + Number(c.valor_comissao), 0)
    : 0;

  const percentualFaixaAtual = Number(dashboardComissao.data?.faixa_atual?.percentual || 0);
  const comissaoTeoricaMes = (dashboardVendedor.data?.total_vendas_mes || 0) * (percentualFaixaAtual / 100);

  if (!isVendedor && !isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo, {profile?.nome || user?.email}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {isAdmin && viewMode === 'geral'
              ? 'Visão Geral de Todos os Vendedores'
              : isAdmin && vendedorSelecionado 
              ? `Dashboard de ${vendedores.find(v => v.id === vendedorSelecionado)?.nome || 'Vendedor'}`
              : `Bem-vindo, ${profile?.nome || user?.email}`}
          </p>
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-3">
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === 'individual' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('individual')}
                className="rounded-none"
              >
                Individual
              </Button>
              <Button
                variant={viewMode === 'geral' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('geral')}
                className="rounded-none"
              >
                Visão Geral
              </Button>
            </div>
            
            {viewMode === 'individual' && (
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
        )}
      </div>

      {/* Métricas de Comissão */}
      {viewMode === 'individual' && dashboardComissao.data && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Meta de Comissão - {format(parseDateString(dashboardComissao.data.mes_atual) || new Date(), 'MMMM yyyy', { locale: ptBR })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground mb-1">Total Vendido no Mês</p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(dashboardComissao.data.total_vendido)}
                </p>
              </div>
              <div className="bg-card rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground mb-1">Faixa Atual</p>
                <p className="text-xl font-bold text-green-600">
                  {dashboardComissao.data.faixa_atual?.descricao || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {dashboardComissao.data.faixa_atual?.percentual}% de comissão
                </p>
              </div>
              <div className="bg-card rounded-lg p-4 border">
                <p className="text-sm text-muted-foreground mb-1">Ticket Médio</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboardVendedor.data?.ticket_medio || 0)}
                </p>
                <p className="text-xs text-muted-foreground">valor médio por pedido</p>
              </div>
            </div>

            {dashboardComissao.data.proxima_faixa ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Progresso para {dashboardComissao.data.proxima_faixa.descricao} ({dashboardComissao.data.proxima_faixa.percentual}%)
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Faltam {formatCurrency(dashboardComissao.data.valor_falta_proxima_faixa || 0)}
                  </p>
                </div>
                <Progress value={dashboardComissao.data.percentual_progresso} className="h-3" />
                <p className="text-xs text-muted-foreground text-right">
                  {Math.round(dashboardComissao.data.percentual_progresso)}% completo
                </p>
              </div>
            ) : (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-green-800 dark:text-green-200 font-medium text-center">
                  🎉 Parabéns! Você já está na faixa máxima de comissão!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Métricas Principais - Visão Individual */}
      {viewMode === 'individual' && dashboardVendedor.data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos no Mês</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardVendedor.data.total_pedidos_mes}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {dashboardVendedor.data.crescimento_pedidos >= 0 ? (
                    <ArrowUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={dashboardVendedor.data.crescimento_pedidos >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercentage(dashboardVendedor.data.crescimento_pedidos)}
                  </span>
                  {' '}vs mês anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardVendedor.data.total_vendas_mes)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {dashboardVendedor.data.crescimento_vendas >= 0 ? (
                    <ArrowUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={dashboardVendedor.data.crescimento_vendas >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercentage(dashboardVendedor.data.crescimento_vendas)}
                  </span>
                  {' '}vs mês anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comissões</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(dashboardVendedor.data.total_comissao_mes)}
                </div>
                <p className="text-xs text-muted-foreground">competência do mês (real)</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-green-600 font-medium">
                    {formatCurrency(comissaoConfirmada)} confirmada
                  </span>
                  <span className="text-xs text-orange-600 font-medium">
                    {formatCurrency(comissaoPrevista)} prevista
                  </span>
                </div>
                <div className="mt-3 border-t pt-3">
                  <p className="text-xs text-muted-foreground">
                    teórica sobre vendas do mês ({percentualFaixaAtual}%)
                  </p>
                  <p className="text-lg font-semibold text-blue-700">
                    {formatCurrency(comissaoTeoricaMes)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardVendedor.data.total_pedidos_mes > 0 
                    ? ((dashboardVendedor.data.pedidos_entregues / dashboardVendedor.data.total_pedidos_mes) * 100).toFixed(1)
                    : '0'}%
                </div>
                <p className="text-xs text-muted-foreground">pedidos entregues</p>
              </CardContent>
            </Card>
          </div>

          {/* Status dos Pedidos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status dos Pedidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Em Produção</span>
                  </div>
                  <Badge variant="secondary">{dashboardVendedor.data.pedidos_em_producao}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Prontos</span>
                  </div>
                  <Badge variant="secondary">{dashboardVendedor.data.pedidos_prontos}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Entregues</span>
                  </div>
                  <Badge variant="secondary">{dashboardVendedor.data.pedidos_entregues}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Cancelados</span>
                  </div>
                  <Badge variant="secondary">{dashboardVendedor.data.pedidos_cancelados}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status de Pagamentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Aguardando</span>
                    <span className="text-xs text-muted-foreground">pendentes de pagamento</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">
                    {formatCurrency(dashboardVendedor.data.valor_aguardando_pagamento)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Parcial</span>
                    <span className="text-xs text-muted-foreground">pagamentos parciais</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(dashboardVendedor.data.valor_parcial)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Quitado</span>
                    <span className="text-xs text-muted-foreground">totalmente pago</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(dashboardVendedor.data.valor_quitado)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Propostas Abertas - Follow-up */}
          {dashboardVendedor.data.propostas_abertas.length > 0 && (
            <Card className="border-2 border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50 to-transparent dark:from-orange-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-orange-800 dark:text-orange-200">
                      Propostas Aguardando Follow-up
                    </CardTitle>
                  </div>
                  <Link to="/propostas">
                    <Button variant="ghost" size="sm">Ver Todas</Button>
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Lembre-se de retomar contato com esses clientes
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardVendedor.data.propostas_abertas.map((proposta: any) => (
                    <div key={proposta.id} className="flex items-center justify-between p-4 bg-card border-2 border-orange-100 dark:border-orange-900/50 rounded-lg hover:shadow-md transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="h-4 w-4 text-orange-600" />
                          <span className="font-semibold text-foreground">
                            {proposta.clientes?.nome_razao_social}
                          </span>
                          <Badge variant={proposta.status === 'follow_up' ? 'default' : 'secondary'}>
                            {proposta.status === 'follow_up' ? 'Follow-up' : 'Pendente'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {proposta.data_follow_up && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Follow-up: {format(new Date(proposta.data_follow_up), "d 'de' MMM", { locale: ptBR })}
                            </span>
                          )}
                          <span className="font-medium text-primary">
                            {formatCurrency(proposta.valor_total)}
                          </span>
                          {(() => {
                            const diasPendente = Math.floor((Date.now() - new Date(proposta.updated_at || proposta.created_at).getTime()) / (1000 * 60 * 60 * 24));
                            return diasPendente > 0 ? (
                              <Badge variant={diasPendente >= 5 ? 'destructive' : 'outline'} className="text-xs">
                                {diasPendente} {diasPendente === 1 ? 'dia' : 'dias'} sem atualização
                              </Badge>
                            ) : null;
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {proposta.clientes?.whatsapp && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/whatsapp/atendimento?phone=${proposta.clientes.whatsapp.replace(/\D/g, '')}`)}
                            className="gap-2"
                          >
                            <Phone className="h-4 w-4" />
                            WhatsApp
                          </Button>
                        )}
                        <Link to={`/propostas/${proposta.id}`}>
                          <Button size="sm" variant="default">
                            Ver Proposta
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Grades de Prova Vencidas */}
          {dashboardVendedor.data.grades_vencidas && dashboardVendedor.data.grades_vencidas.length > 0 && (
            <Card className="border-2 border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50 to-transparent dark:from-red-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <CardTitle className="text-red-800 dark:text-red-200">
                      Grades de Prova Vencidas
                    </CardTitle>
                  </div>
                  <Link to="/vendas/grades-prova">
                    <Button variant="ghost" size="sm">Ver Todas</Button>
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Empréstimos com data de devolução ultrapassada
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardVendedor.data.grades_vencidas.map((grade: any) => {
                    const diasVencido = Math.floor((Date.now() - new Date(grade.data_prevista_devolucao).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={grade.id} className="flex items-center justify-between p-4 bg-card border-2 border-red-100 dark:border-red-900/50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold">
                              Empréstimo #{grade.numero_emprestimo}
                            </span>
                            <Badge variant="destructive" className="text-xs">
                              {diasVencido} {diasVencido === 1 ? 'dia' : 'dias'} vencido
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {grade.clientes?.nome_razao_social} • Devolução prevista: {format(new Date(grade.data_prevista_devolucao), "d 'de' MMM", { locale: ptBR })}
                          </p>
                        </div>
                        {grade.clientes?.whatsapp && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/whatsapp/atendimento?phone=${grade.clientes.whatsapp.replace(/\D/g, '')}`)}
                            className="gap-2"
                          >
                            <Phone className="h-4 w-4" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Últimos Pedidos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Últimos Pedidos</CardTitle>
                <Link to="/pedidos">
                  <Button variant="ghost" size="sm">Ver Todos</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {dashboardVendedor.data.ultimos_pedidos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum pedido recente</p>
              ) : (
                <div className="space-y-3">
                  {dashboardVendedor.data.ultimos_pedidos.map((pedido: any) => (
                    <Link key={pedido.id} to={`/pedidos/${pedido.id}`}>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold">#{pedido.numero_pedido}</span>
                            <Badge variant={
                              pedido.status === 'entregue' ? 'default' :
                              pedido.status === 'cancelado' ? 'destructive' : 'secondary'
                            }>
                              {pedido.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant={
                              pedido.status_pagamento === 'quitado' ? 'default' :
                              pedido.status_pagamento === 'parcial' ? 'secondary' : 'outline'
                            }>
                              {pedido.status_pagamento}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {pedido.clientes?.nome_razao_social} • {format(parseDateString(pedido.data_pedido) || new Date(), "d 'de' MMM", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(pedido.valor_total)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Métricas Principais - Visão Geral (Todos os Vendedores) */}
      {viewMode === 'geral' && dashboardGeral.data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pedidos no Mês</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardGeral.data.total_pedidos_mes}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {dashboardGeral.data.crescimento_pedidos >= 0 ? (
                    <ArrowUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={dashboardGeral.data.crescimento_pedidos >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercentage(dashboardGeral.data.crescimento_pedidos)}
                  </span>
                  {' '}vs mês anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(dashboardGeral.data.total_vendas_mes)}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {dashboardGeral.data.crescimento_vendas >= 0 ? (
                    <ArrowUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={dashboardGeral.data.crescimento_vendas >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatPercentage(dashboardGeral.data.crescimento_vendas)}
                  </span>
                  {' '}vs mês anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comissão Acumulada</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(dashboardGeral.data.total_comissao_mes)}
                </div>
                <p className="text-xs text-muted-foreground">total de comissões</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(dashboardGeral.data.ticket_medio)}
                </div>
                <p className="text-xs text-muted-foreground">valor médio por pedido</p>
              </CardContent>
            </Card>
          </div>

          {/* Status dos Pedidos - Visão Geral */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status dos Pedidos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Em Produção</span>
                  </div>
                  <Badge variant="secondary">{dashboardGeral.data.pedidos_em_producao}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Prontos</span>
                  </div>
                  <Badge variant="secondary">{dashboardGeral.data.pedidos_prontos}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Entregues</span>
                  </div>
                  <Badge variant="secondary">{dashboardGeral.data.pedidos_entregues}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Cancelados</span>
                  </div>
                  <Badge variant="secondary">{dashboardGeral.data.pedidos_cancelados}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status de Pagamentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Aguardando</span>
                    <span className="text-xs text-muted-foreground">pendentes de pagamento</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">
                    {formatCurrency(dashboardGeral.data.valor_aguardando_pagamento)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Parcial</span>
                    <span className="text-xs text-muted-foreground">pagamentos parciais</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(dashboardGeral.data.valor_parcial)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">Quitado</span>
                    <span className="text-xs text-muted-foreground">totalmente pago</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(dashboardGeral.data.valor_quitado)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Vendedores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top 5 Vendedores do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardGeral.data.top_vendedores.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum vendedor com pedidos este mês</p>
              ) : (
                <div className="space-y-3">
                  {dashboardGeral.data.top_vendedores.map((vendedor, index) => (
                    <div key={vendedor.vendedor_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? 'default' : 'secondary'} className="text-base px-3">
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{vendedor.vendedor_nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {vendedor.total_pedidos} pedidos • Ticket: {formatCurrency(vendedor.ticket_medio)}
                          </p>
                        </div>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(vendedor.total_vendas)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimos Pedidos - Visão Geral */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Últimos Pedidos</CardTitle>
                <Link to="/pedidos">
                  <Button variant="ghost" size="sm">Ver Todos</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {dashboardGeral.data.ultimos_pedidos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum pedido recente</p>
              ) : (
                <div className="space-y-3">
                  {dashboardGeral.data.ultimos_pedidos.map((pedido: any) => (
                    <Link key={pedido.id} to={`/pedidos/${pedido.id}`}>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-semibold">#{pedido.numero_pedido}</span>
                            <Badge variant={
                              pedido.status === 'entregue' ? 'default' :
                              pedido.status === 'cancelado' ? 'destructive' : 'secondary'
                            }>
                              {pedido.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant={
                              pedido.status_pagamento === 'quitado' ? 'default' :
                              pedido.status_pagamento === 'parcial' ? 'secondary' : 'outline'
                            }>
                              {pedido.status_pagamento}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {pedido.clientes?.nome_razao_social} • {format(parseDateString(pedido.data_pedido) || new Date(), "d 'de' MMM", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{formatCurrency(pedido.valor_total)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Métricas Admin Gerais */}
      {isAdmin && !isVendedor && viewMode === 'individual' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientesCount}</div>
              <p className="text-xs text-muted-foreground">clientes cadastrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{produtosCount}</div>
              <p className="text-xs text-muted-foreground">produtos disponíveis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sistema</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">100%</div>
              <p className="text-xs text-muted-foreground">operacional</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
