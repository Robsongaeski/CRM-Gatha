import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardPCP } from '@/hooks/pcp/useDashboardPCP';
import { Factory, AlertTriangle, Printer, PackageCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateString } from '@/lib/formatters';

export default function DashboardPCP() {
  const {
    pedidosPorEtapa,
    falhasHoje,
    impressoesHoje,
    pedidosUrgentes,
    falhasPorCategoria,
    isLoading,
  } = useDashboardPCP();

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard PCP</h1>
          <p className="text-muted-foreground">Visão geral da produção</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalPedidos: number = pedidosPorEtapa.reduce((sum: number, etapa: any) => sum + (etapa.quantidade || 0), 0) as number;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard PCP</h1>
        <p className="text-muted-foreground">Visão geral da produção em tempo real</p>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos em Produção</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidos}</div>
            <p className="text-xs text-muted-foreground">Em todas as etapas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressões Hoje</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{impressoesHoje}</div>
            <p className="text-xs text-muted-foreground">Registros no dia</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas Hoje</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{falhasHoje}</div>
            <p className="text-xs text-muted-foreground">Registradas hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregas Urgentes</CardTitle>
            <PackageCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidosUrgentes.length}</div>
            <p className="text-xs text-muted-foreground">Próximos 3 dias</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pedidos por Etapa</CardTitle>
            <CardDescription>Distribuição atual na produção</CardDescription>
          </CardHeader>
          <CardContent>
            {pedidosPorEtapa.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pedidosPorEtapa}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="etapa" className="text-xs" />
                  <YAxis />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nenhum pedido em produção
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Falhas por Categoria</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {falhasPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={falhasPorCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ categoria, quantidade }) => `${categoria}: ${quantidade}`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="quantidade"
                  >
                    {falhasPorCategoria.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nenhuma falha registrada nos últimos 7 dias
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pedidos Urgentes */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Urgentes</CardTitle>
          <CardDescription>Entregas previstas para os próximos 3 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {pedidosUrgentes.length > 0 ? (
            <div className="space-y-4">
              {pedidosUrgentes.map((pedido: any) => (
                <div
                  key={pedido.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">Pedido #{pedido.numero_pedido}</p>
                    <p className="text-sm text-muted-foreground">
                      {pedido.cliente?.nome_razao_social}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {pedido.etapa_producao?.nome_etapa || 'Sem etapa'}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {pedido.data_entrega
                        ? format(parseDateString(pedido.data_entrega) || new Date(), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Sem data'}
                    </p>
                    <p className="text-xs text-muted-foreground">Previsão de entrega</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Nenhum pedido urgente nos próximos 3 dias
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
