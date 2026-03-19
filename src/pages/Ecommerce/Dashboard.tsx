import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Truck, RefreshCcw, AlertTriangle, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { useOrders, isOrderOverdue } from '@/hooks/useOrders';
import { useEnviosOrders } from '@/hooks/useEnvios';
import { useTrocas } from '@/hooks/useTrocas';
import { useDevolucoes } from '@/hooks/useDevolucoes';
import { useExtravios } from '@/hooks/useExtravios';
import { useProblemasPedido } from '@/hooks/useProblemasPedido';
import { differenceInBusinessDays, startOfDay } from 'date-fns';

export default function EcommerceDashboard() {
  const { data: orders = [] } = useOrders({});
  const { data: enviosData } = useEnviosOrders({ pageSize: 1000 });
  const envios = enviosData?.orders || [];
  const { data: trocas = [] } = useTrocas();
  const { data: devolucoes = [] } = useDevolucoes();
  const { data: extravios = [] } = useExtravios();
  const { data: problemas = [] } = useProblemasPedido();

  // Métricas de pedidos
  const today = startOfDay(new Date());
  const ordersToday = orders.filter(o => {
    const created = new Date(o.created_at);
    return differenceInBusinessDays(today, created) === 0;
  }).length;
  
  const pendingPayment = orders.filter(o => o.status === 'pending').length;
  const processing = orders.filter(o => o.status === 'processing').length;
  const shipped = orders.filter(o => o.status === 'shipped').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const overdue = orders.filter(o => isOrderOverdue(o)).length;

  // Métricas de envios
  const aguardandoDespacho = envios.filter(e => e.status_envio === 'aguardando_despacho').length;
  const despachadoHoje = envios.filter(e => {
    if (!e.data_despacho) return false;
    const despacho = new Date(e.data_despacho);
    return differenceInBusinessDays(today, despacho) === 0;
  }).length;

  // Métricas de trocas/devoluções
  const problemasAbertos = problemas.filter(p => p.status === 'pendente').length;
  const problemasUrgentes = problemas.filter(p => p.cor_alerta === 'vermelho').length;
  const extraviosPendentes = extravios.filter(e => e.solicitado_ressarcimento && e.status_ressarcimento === 'pendente').length;

  const cards = [
    // Pedidos
    {
      title: 'Pedidos Hoje',
      value: ordersToday,
      icon: Package,
      description: 'Pedidos recebidos hoje',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/ecommerce/pedidos',
    },
    {
      title: 'Aguardando Pagamento',
      value: pendingPayment,
      icon: DollarSign,
      description: 'Pedidos aguardando confirmação',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      href: '/ecommerce/pedidos',
    },
    {
      title: 'Em Processamento',
      value: processing,
      icon: Clock,
      description: 'Pedidos em preparação',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      href: '/ecommerce/pedidos',
    },
    {
      title: 'Entrega Atrasada',
      value: overdue,
      icon: AlertTriangle,
      description: 'Pedidos com entrega atrasada',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '/ecommerce/pedidos',
      alert: overdue > 0,
    },
    // Envios
    {
      title: 'Aguardando Despacho',
      value: aguardandoDespacho,
      icon: Package,
      description: 'Pedidos prontos para envio',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/ecommerce/envios/despacho',
    },
    {
      title: 'Despachado Hoje',
      value: despachadoHoje,
      icon: Truck,
      description: 'Pedidos despachados hoje',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/ecommerce/envios/despacho',
    },
    // Trocas e Devoluções
    {
      title: 'Chamados Abertos',
      value: problemasAbertos,
      icon: AlertTriangle,
      description: 'Problemas aguardando resolução',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      href: '/ecommerce/suporte/chamados',
      alert: problemasUrgentes > 0,
    },
    {
      title: 'Ressarcimentos Pendentes',
      value: extraviosPendentes,
      icon: RefreshCcw,
      description: 'Extravios aguardando ressarcimento',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      href: '/ecommerce/suporte/extravios',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard E-commerce</h1>
        <p className="text-muted-foreground">
          Visão geral de pedidos, envios e atendimento ao cliente
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
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
      {(problemasUrgentes > 0 || overdue > 0) && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Atenção Necessária
            </CardTitle>
          </CardHeader>
          <CardContent className="text-red-700 space-y-2">
            {overdue > 0 && (
              <p>
                • <strong>{overdue}</strong> pedido(s) com entrega atrasada
              </p>
            )}
            {problemasUrgentes > 0 && (
              <p>
                • <strong>{problemasUrgentes}</strong> problema(s) com mais de 96 horas úteis sem resolução
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumo por Setor */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Pedidos
            </CardTitle>
            <CardDescription>Status dos pedidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de pedidos</span>
              <span className="font-medium">{orders.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entregues</span>
              <span className="font-medium text-green-600">{delivered}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Em trânsito</span>
              <span className="font-medium text-blue-600">{shipped}</span>
            </div>
            <Link to="/ecommerce/pedidos" className="text-sm text-primary hover:underline block mt-4">
              Ver todos os pedidos →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Envios
            </CardTitle>
            <CardDescription>Despacho e expedição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aguardando</span>
              <span className="font-medium text-yellow-600">{aguardandoDespacho}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Despachados hoje</span>
              <span className="font-medium text-green-600">{despachadoHoje}</span>
            </div>
            <Link to="/ecommerce/envios/despacho" className="text-sm text-primary hover:underline block mt-4">
              Ir para despacho →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5" />
              Suporte
            </CardTitle>
            <CardDescription>Trocas, devoluções e problemas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Trocas</span>
              <span className="font-medium">{trocas.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Devoluções</span>
              <span className="font-medium">{devolucoes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Extravios</span>
              <span className="font-medium">{extravios.length}</span>
            </div>
            <Link to="/ecommerce/suporte" className="text-sm text-primary hover:underline block mt-4">
              Ver suporte →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
