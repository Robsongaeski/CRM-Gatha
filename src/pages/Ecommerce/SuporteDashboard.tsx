import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCcw, PackageX, AlertTriangle, HelpCircle, Settings, BarChart3 } from 'lucide-react';
import { useTrocas } from '@/hooks/useTrocas';
import { useDevolucoes } from '@/hooks/useDevolucoes';
import { useExtravios } from '@/hooks/useExtravios';
import { useProblemasPedido } from '@/hooks/useProblemasPedido';
import { useUserRole } from '@/hooks/useUserRole';

export default function SuporteDashboard() {
  const { isAdmin } = useUserRole();
  const { data: trocas = [] } = useTrocas();
  const { data: devolucoes = [] } = useDevolucoes();
  const { data: extravios = [] } = useExtravios();
  const { data: problemas = [] } = useProblemasPedido();

  const problemasUrgentes = problemas.filter(p => p.cor_alerta === 'vermelho').length;
  const problemasAtencao = problemas.filter(p => p.cor_alerta === 'amarelo').length;
  const problemasAbertos = problemas.filter(p => p.status === 'pendente').length;
  const extraviosPendentes = extravios.filter(e => e.solicitado_ressarcimento && e.status_ressarcimento === 'pendente').length;

  const cards = [
    {
      title: 'Chamados',
      description: 'Problemas de pedidos em andamento',
      icon: HelpCircle,
      href: '/ecommerce/suporte/chamados',
      count: problemas.length,
      openCount: problemasAbertos,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      badge: problemasUrgentes > 0 
        ? `${problemasUrgentes} urgente(s)` 
        : problemasAtencao > 0 
          ? `${problemasAtencao} atenção`
          : undefined,
      badgeVariant: problemasUrgentes > 0 ? 'destructive' : 'warning',
    },
    {
      title: 'Trocas',
      description: 'Registro de trocas de produtos',
      icon: RefreshCcw,
      href: '/ecommerce/suporte/trocas',
      count: trocas.length,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Devoluções',
      description: 'Registro de devoluções de pedidos',
      icon: PackageX,
      href: '/ecommerce/suporte/devolucoes',
      count: devolucoes.length,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Extravios/Roubos',
      description: 'Registro de extravios na entrega',
      icon: AlertTriangle,
      href: '/ecommerce/suporte/extravios',
      count: extravios.length,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      badge: extraviosPendentes > 0 ? `${extraviosPendentes} pendente(s)` : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Suporte</h1>
          <p className="text-muted-foreground">
            Trocas, devoluções, extravios e problemas de pedidos
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Link
              to="/ecommerce/suporte/motivos"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              Cadastro de Motivos
            </Link>
          )}
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} to={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.count}</div>
                {card.openCount !== undefined && card.openCount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {card.openCount} em aberto
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
                {card.badge && (
                  <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                    card.badgeVariant === 'destructive' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {card.badge}
                  </span>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Alertas */}
      {(problemasUrgentes > 0 || problemasAtencao > 0) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Atenção Necessária
            </CardTitle>
          </CardHeader>
          <CardContent className="text-yellow-700">
            {problemasUrgentes > 0 && (
              <p className="text-red-700 font-medium">
                • {problemasUrgentes} problema(s) com mais de 96 horas úteis sem resolução
              </p>
            )}
            {problemasAtencao > 0 && (
              <p>
                • {problemasAtencao} problema(s) com mais de 48 horas úteis sem resolução
              </p>
            )}
            <Link 
              to="/ecommerce/suporte/chamados" 
              className="inline-block mt-2 text-sm underline hover:no-underline"
            >
              Ver todos os chamados →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Links rápidos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/ecommerce/suporte/relatorios">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 p-6">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h3 className="font-semibold">Relatórios de Suporte</h3>
                <p className="text-sm text-muted-foreground">Métricas e análises de atendimento</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        {isAdmin && (
          <Link to="/ecommerce/suporte/motivos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center gap-4 p-6">
                <Settings className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Configurar Motivos</h3>
                  <p className="text-sm text-muted-foreground">Gerenciar motivos de troca e devolução</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
