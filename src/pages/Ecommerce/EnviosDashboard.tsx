import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Truck, AlertTriangle, CheckCircle, Timer, TrendingUp, TrendingDown, CalendarIcon } from 'lucide-react';
import { useEnviosDashboardRealtime, useEnviosDashboardMetrics } from '@/hooks/useEnviosDashboard';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

type PeriodoPreset = '7d' | '15d' | '30d' | 'mes_atual' | 'mes_anterior';

function getPeriodo(preset: PeriodoPreset) {
  const hoje = new Date();
  switch (preset) {
    case '7d':
      return { startDate: format(subDays(hoje, 7), 'yyyy-MM-dd'), endDate: format(hoje, 'yyyy-MM-dd') };
    case '15d':
      return { startDate: format(subDays(hoje, 15), 'yyyy-MM-dd'), endDate: format(hoje, 'yyyy-MM-dd') };
    case '30d':
      return { startDate: format(subDays(hoje, 30), 'yyyy-MM-dd'), endDate: format(hoje, 'yyyy-MM-dd') };
    case 'mes_atual':
      return { startDate: format(startOfMonth(hoje), 'yyyy-MM-dd'), endDate: format(hoje, 'yyyy-MM-dd') };
    case 'mes_anterior': {
      const mesAnterior = subMonths(hoje, 1);
      return { startDate: format(startOfMonth(mesAnterior), 'yyyy-MM-dd'), endDate: format(endOfMonth(mesAnterior), 'yyyy-MM-dd') };
    }
  }
}

function VariacaoIndicator({ atual, anterior, invertido = false }: { atual: number; anterior: number; invertido?: boolean }) {
  if (anterior === 0 && atual === 0) return <span className="text-xs text-muted-foreground">—</span>;
  if (anterior === 0) return <span className="text-xs text-red-600">Novo</span>;
  
  const variacao = ((atual - anterior) / anterior) * 100;
  const isPositive = invertido ? variacao < 0 : variacao > 0;
  
  return (
    <span className={`text-xs flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {variacao > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {Math.abs(variacao).toFixed(1)}%
    </span>
  );
}

export default function EnviosDashboard() {
  const [periodoPreset, setPeriodoPreset] = useState<PeriodoPreset>('30d');
  const periodo = getPeriodo(periodoPreset);
  
  const { data: realtime, isLoading: loadingRealtime } = useEnviosDashboardRealtime();
  const { data: metricas, isLoading: loadingMetricas } = useEnviosDashboardMetrics(periodo);

  const realtimeCards = [
    {
      title: 'Entrega Atrasada',
      value: realtime?.entregaAtrasada || 0,
      icon: AlertTriangle,
      description: 'Delivery estimate ultrapassada',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '/ecommerce/envios-atrasados',
      alert: (realtime?.entregaAtrasada || 0) > 0,
    },
    {
      title: 'Atraso de Envio',
      value: realtime?.envioAtrasado || 0,
      icon: Timer,
      description: 'Sem rastreio após 5 dias (pagos)',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/ecommerce/envios-atrasados',
      alert: (realtime?.envioAtrasado || 0) > 0,
    },
    {
      title: 'Sem Código de Rastreio',
      value: realtime?.semRastreio || 0,
      icon: Truck,
      description: 'Pedidos ativos sem tracking',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/ecommerce/envios/despacho',
    },
    {
      title: 'Sem NF-e',
      value: realtime?.semNfe || 0,
      icon: Package,
      description: 'Pedidos sem chave NF-e',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      href: '/ecommerce/envios/despacho',
    },
  ];

  // Gráfico de pizza: distribuição atrasos
  const pieDataAtual = metricas ? [
    { name: 'Entrega Atrasada', value: metricas.atual.entregaAtrasada, fill: '#dc2626' },
    { name: 'Atraso de Envio', value: metricas.atual.envioAtrasado, fill: '#2563eb' },
    { name: 'Sem Atraso', value: Math.max(0, metricas.atual.totalPedidos - metricas.atual.entregaAtrasada - metricas.atual.envioAtrasado), fill: '#16a34a' },
  ] : [];

  // Gráfico de barras: comparativo
  const barData = metricas ? [
    {
      name: '% Entrega Atrasada',
      atual: Number(metricas.atual.percentualEntregaAtrasada.toFixed(1)),
      anterior: Number(metricas.anterior.percentualEntregaAtrasada.toFixed(1)),
    },
    {
      name: '% Atraso Envio',
      atual: Number(metricas.atual.percentualEnvioAtrasado.toFixed(1)),
      anterior: Number(metricas.anterior.percentualEnvioAtrasado.toFixed(1)),
    },
  ] : [];

  const chartConfig = {
    atual: { label: 'Período Atual', color: '#2563eb' },
    anterior: { label: 'Período Anterior', color: '#94a3b8' },
  };

  if (loadingRealtime) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Envios</h1>
        <p className="text-muted-foreground">
          Acompanhamento de despacho e entregas em tempo real
        </p>
      </div>

      {/* Cards em Tempo Real */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {realtimeCards.map((card) => (
          <Link key={card.title} to={card.href}>
            <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${card.alert ? 'border-red-300' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${card.alert ? 'text-red-600' : ''}`}>{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alertas */}
      {((realtime?.entregaAtrasada || 0) > 0 || (realtime?.envioAtrasado || 0) > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Atenção Necessária
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-700 space-y-2">
            {(realtime?.entregaAtrasada || 0) > 0 && (
              <p>• <strong>{realtime?.entregaAtrasada}</strong> pedido(s) com data de entrega ultrapassada</p>
            )}
            {(realtime?.envioAtrasado || 0) > 0 && (
              <p>• <strong>{realtime?.envioAtrasado}</strong> pedido(s) pagos sem rastreio após 5 dias</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Seção de Análise por Período */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Análise por Período</h2>
        <Select value={periodoPreset} onValueChange={(v) => setPeriodoPreset(v as PeriodoPreset)}>
          <SelectTrigger className="w-[200px]">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="15d">Últimos 15 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="mes_atual">Mês Atual</SelectItem>
            <SelectItem value="mes_anterior">Mês Anterior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loadingMetricas ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      ) : metricas && (
        <>
          {/* Cards de % com comparativo */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metricas.atual.totalPedidos}</div>
                <VariacaoIndicator atual={metricas.atual.totalPedidos} anterior={metricas.anterior.totalPedidos} />
                <p className="text-xs text-muted-foreground mt-1">Anterior: {metricas.anterior.totalPedidos}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">% Entrega Atrasada</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {metricas.atual.percentualEntregaAtrasada.toFixed(1)}%
                </div>
                <VariacaoIndicator atual={metricas.atual.percentualEntregaAtrasada} anterior={metricas.anterior.percentualEntregaAtrasada} invertido />
                <p className="text-xs text-muted-foreground mt-1">
                  {metricas.atual.entregaAtrasada} de {metricas.atual.totalPedidos} pedidos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">% Atraso de Envio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {metricas.atual.percentualEnvioAtrasado.toFixed(1)}%
                </div>
                <VariacaoIndicator atual={metricas.atual.percentualEnvioAtrasado} anterior={metricas.anterior.percentualEnvioAtrasado} invertido />
                <p className="text-xs text-muted-foreground mt-1">
                  {metricas.atual.envioAtrasado} de {metricas.atual.totalPedidos} pedidos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Entregues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{metricas.atual.entregues}</div>
                <VariacaoIndicator atual={metricas.atual.entregues} anterior={metricas.anterior.entregues} />
                <p className="text-xs text-muted-foreground mt-1">Anterior: {metricas.anterior.entregues}</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Gráfico de Pizza */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição de Atrasos</CardTitle>
                <CardDescription>Pedidos do período selecionado</CardDescription>
              </CardHeader>
              <CardContent>
                {pieDataAtual.every(d => d.value === 0) ? (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    Nenhum dado no período
                  </div>
                ) : (
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieDataAtual.filter(d => d.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {pieDataAtual.filter(d => d.value > 0).map((entry, index) => (
                            <Cell key={index} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-red-600" />
                    <span className="text-xs text-muted-foreground">Entrega Atrasada</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
                    <span className="text-xs text-muted-foreground">Atraso Envio</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-green-600" />
                    <span className="text-xs text-muted-foreground">Sem Atraso</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico Comparativo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparativo com Período Anterior</CardTitle>
                <CardDescription>% de atrasos: período atual vs anterior</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[250px]">
                  <BarChart data={barData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 'auto']} unit="%" />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value) => [`${value}%`]}
                    />
                    <Bar dataKey="anterior" fill="#94a3b8" radius={[0, 4, 4, 0]} name="Período Anterior" barSize={20} />
                    <Bar dataKey="atual" fill="#2563eb" radius={[0, 4, 4, 0]} name="Período Atual" barSize={20} />
                  </BarChart>
                </ChartContainer>
                <div className="flex justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#2563eb' }} />
                    <span className="text-xs text-muted-foreground">Período Atual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: '#94a3b8' }} />
                    <span className="text-xs text-muted-foreground">Período Anterior</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Links rápidos */}
      <div className="flex gap-4 flex-wrap">
        <Link to="/ecommerce/envios/despacho">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Leitura de Despacho</h3>
                <p className="text-sm text-muted-foreground">Registrar despacho via NF-e</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/ecommerce/envios-atrasados">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <h3 className="font-semibold">Pedidos Atrasados</h3>
                <p className="text-sm text-muted-foreground">Gerenciar atrasos de entrega e envio</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/ecommerce/envios/relatorios">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <Truck className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Relatórios</h3>
                <p className="text-sm text-muted-foreground">Visualizar relatórios de envio</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
