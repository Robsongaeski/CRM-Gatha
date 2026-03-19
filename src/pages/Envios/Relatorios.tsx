import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart3, Truck, FileWarning, MapPin, Calendar, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useEnviosRelatorio, OrderEnvio } from '@/hooks/useEnvios';

export default function Relatorios() {
  const hoje = new Date();
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    endDate: format(hoje, 'yyyy-MM-dd'),
  });

  const { data: relatorioPorDia, isLoading: loadingPorDia } = useEnviosRelatorio({
    ...dateRange,
    tipo: 'por_dia',
  });

  const { data: relatorioPorTransportadora, isLoading: loadingTransportadora } = useEnviosRelatorio({
    ...dateRange,
    tipo: 'por_transportadora',
  });

  const { data: pendentesNf, isLoading: loadingPendentes } = useEnviosRelatorio({
    ...dateRange,
    tipo: 'pendentes_nf',
  });

  const { data: semTracking, isLoading: loadingSemTracking } = useEnviosRelatorio({
    ...dateRange,
    tipo: 'sem_tracking',
  });

  const setPresetRange = (preset: 'hoje' | 'semana' | 'mes') => {
    const hoje = new Date();
    switch (preset) {
      case 'hoje':
        setDateRange({
          startDate: format(hoje, 'yyyy-MM-dd'),
          endDate: format(hoje, 'yyyy-MM-dd'),
        });
        break;
      case 'semana':
        setDateRange({
          startDate: format(subDays(hoje, 7), 'yyyy-MM-dd'),
          endDate: format(hoje, 'yyyy-MM-dd'),
        });
        break;
      case 'mes':
        setDateRange({
          startDate: format(startOfMonth(hoje), 'yyyy-MM-dd'),
          endDate: format(hoje, 'yyyy-MM-dd'),
        });
        break;
    }
  };

  const totalDespachados = Array.isArray(relatorioPorDia) 
    ? relatorioPorDia.reduce((acc, item) => acc + (item as any).quantidade, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios de Envios</h1>
        <p className="text-muted-foreground">
          Acompanhe os despachos e identifique divergências
        </p>
      </div>

      {/* Filtro de Data */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-40"
              />
            </div>
            <div>
              <Label>Data Final</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-40"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPresetRange('hoje')}>
                Hoje
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPresetRange('semana')}>
                Última semana
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPresetRange('mes')}>
                Este mês
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Despachados</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDespachados}</div>
            <p className="text-xs text-muted-foreground">
              no período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transportadoras</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Array.isArray(relatorioPorTransportadora) ? relatorioPorTransportadora.length : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              diferentes utilizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes de Despacho</CardTitle>
            <FileWarning className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {Array.isArray(pendentesNf) ? pendentesNf.length : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              com NF-e emitida
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Rastreio</CardTitle>
            <MapPin className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {Array.isArray(semTracking) ? semTracking.length : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              despachados sem tracking
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Relatórios Detalhados */}
      <Tabs defaultValue="por_dia" className="space-y-4">
        <TabsList>
          <TabsTrigger value="por_dia">Por Dia</TabsTrigger>
          <TabsTrigger value="por_transportadora">Por Transportadora</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes de Despacho</TabsTrigger>
          <TabsTrigger value="sem_tracking">Sem Rastreio</TabsTrigger>
        </TabsList>

        <TabsContent value="por_dia">
          <Card>
            <CardHeader>
              <CardTitle>Despachos por Dia</CardTitle>
              <CardDescription>Quantidade de pedidos despachados por dia</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPorDia ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : !Array.isArray(relatorioPorDia) || relatorioPorDia.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum despacho no período
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(relatorioPorDia as any[]).map((item) => (
                      <TableRow key={item.data}>
                        <TableCell>
                          {format(new Date(item.data + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.quantidade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="por_transportadora">
          <Card>
            <CardHeader>
              <CardTitle>Despachos por Transportadora</CardTitle>
              <CardDescription>Ranking de transportadoras mais utilizadas</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTransportadora ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : !Array.isArray(relatorioPorTransportadora) || relatorioPorTransportadora.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum despacho no período
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transportadora</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(relatorioPorTransportadora as any[]).map((item) => (
                      <TableRow key={item.transportadora}>
                        <TableCell className="font-medium">{item.transportadora}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pendentes">
          <Card>
            <CardHeader>
              <CardTitle>Pendentes de Despacho</CardTitle>
              <CardDescription>Pedidos com NF-e emitida mas ainda não despachados</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPendentes ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : !Array.isArray(pendentesNf) || pendentesNf.length === 0 ? (
                <div className="text-center py-8 text-green-600">
                  Todos os pedidos com NF-e foram despachados!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Transportadora</TableHead>
                      <TableHead>Chave NF-e</TableHead>
                      <TableHead>Criado em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pendentesNf as OrderEnvio[]).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{order.carrier || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {order.chave_nfe?.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sem_tracking">
          <Card>
            <CardHeader>
              <CardTitle>Despachados sem Rastreio</CardTitle>
              <CardDescription>Pedidos despachados que ainda não possuem código de rastreio</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSemTracking ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : !Array.isArray(semTracking) || semTracking.length === 0 ? (
                <div className="text-center py-8 text-green-600">
                  Todos os pedidos despachados possuem rastreio!
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Transportadora</TableHead>
                      <TableHead>Data Despacho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(semTracking as OrderEnvio[]).map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{order.carrier || '-'}</TableCell>
                        <TableCell>
                          {order.data_despacho ? format(new Date(order.data_despacho), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
