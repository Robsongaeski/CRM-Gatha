import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, DollarSign } from 'lucide-react';
import { formatCurrency, parseDateString } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type StatusPedido = 'em_producao' | 'pronto' | 'entregue' | 'cancelado';
type StatusPagamento = 'aguardando' | 'pendente' | 'parcial' | 'pago';

interface PedidoComPagamentos {
  id: string;
  numero_pedido: number;
  data_pedido: string;
  valor_total: number;
  status: StatusPedido;
  status_pagamento: StatusPagamento;
  cliente: {
    nome_razao_social: string;
  };
  vendedor: {
    nome: string;
  };
  valor_pago: number;
  valor_pendente: number;
}

const statusPedidoLabels: Record<StatusPedido, string> = {
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const statusPagamentoLabels: Record<StatusPagamento, string> = {
  aguardando: 'Aguardando',
  pendente: 'Pendente',
  parcial: 'Parcial',
  pago: 'Pago',
};

const statusPagamentoColors: Record<StatusPagamento, "default" | "destructive" | "secondary" | "outline"> = {
  aguardando: 'secondary',
  pendente: 'destructive',
  parcial: 'outline',
  pago: 'default',
};

export default function ControleRecebimentos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ['controle-recebimentos'],
    queryFn: async () => {
      // Buscar todos os pedidos não cancelados
      const { data: pedidosData, error: pedidosError } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          data_pedido,
          valor_total,
          status,
          status_pagamento,
          cliente:clientes!inner(nome_razao_social),
          vendedor:profiles!pedidos_vendedor_id_fkey(nome)
        `)
        .neq('status', 'cancelado')
        .order('data_pedido', { ascending: false });

      if (pedidosError) throw pedidosError;

      // Buscar pagamentos aprovados para cada pedido
      const pedidosComPagamentos = await Promise.all(
        (pedidosData || []).map(async (pedido) => {
          const { data: pagamentos } = await supabase
            .from('pagamentos')
            .select('valor')
            .eq('pedido_id', pedido.id)
            .eq('status', 'aprovado')
            .eq('estornado', false);

          const valorPago = pagamentos?.reduce((sum, p) => sum + Number(p.valor), 0) || 0;
          const valorPendente = Number(pedido.valor_total) - valorPago;

          return {
            ...pedido,
            cliente: Array.isArray(pedido.cliente) ? pedido.cliente[0] : pedido.cliente,
            vendedor: Array.isArray(pedido.vendedor) ? pedido.vendedor[0] : pedido.vendedor,
            valor_pago: valorPago,
            valor_pendente: valorPendente,
          };
        })
      );

      // Filtrar apenas pedidos com saldo pendente
      return pedidosComPagamentos.filter(p => p.valor_pendente > 0) as PedidoComPagamentos[];
    },
  });

  const pedidosFiltrados = pedidos.filter(pedido => {
    const matchesSearch = 
      pedido.numero_pedido.toString().includes(searchTerm) ||
      pedido.cliente?.nome_razao_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.vendedor?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || pedido.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPendente = pedidosFiltrados.reduce((sum, p) => sum + p.valor_pendente, 0);
  const totalPedidos = pedidosFiltrados.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Controle de Recebimentos</h1>
        <p className="text-muted-foreground">
          Visão geral de pedidos com pagamentos pendentes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPendente)}</div>
            <p className="text-xs text-muted-foreground">
              Valor total a receber
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidos}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos com saldo a receber
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos com Saldo Pendente</CardTitle>
          <CardDescription>
            Lista de pedidos que ainda não tiveram pagamento completo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, cliente ou vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="em_producao">Em Produção</SelectItem>
                <SelectItem value="pronto">Pronto</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pedido com saldo pendente encontrado
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Valor Pago</TableHead>
                    <TableHead className="text-right">Valor Pendente</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosFiltrados.map((pedido) => (
                    <TableRow key={pedido.id}>
                      <TableCell className="font-medium">#{pedido.numero_pedido}</TableCell>
                      <TableCell>
                        {format(parseDateString(pedido.data_pedido) || new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{pedido.cliente?.nome_razao_social || '-'}</TableCell>
                      <TableCell>{pedido.vendedor?.nome || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={statusPagamentoColors[pedido.status_pagamento]}>
                          {statusPagamentoLabels[pedido.status_pagamento]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(pedido.valor_total)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(pedido.valor_pago)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-destructive">
                        {formatCurrency(pedido.valor_pendente)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
