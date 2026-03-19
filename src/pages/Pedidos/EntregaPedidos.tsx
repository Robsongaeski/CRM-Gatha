import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useEntregaPedidos, calcularStatusEntrega, calcularEstatisticas, FiltrosEntrega } from '@/hooks/useEntregaPedidos';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, AlertTriangle, Clock, DollarSign, Eye, Edit, FileText, CreditCard, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatCurrency, parseDateString } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlterarStatusDialog } from '@/components/Pedidos/AlterarStatusDialog';
import { AdicionarObservacaoDialog } from '@/components/Pedidos/AdicionarObservacaoDialog';
import { RegistrarPagamentoModal } from '@/components/Pedidos/RegistrarPagamentoModal';
import { StatusPedido } from '@/hooks/usePedidos';
import { AtendenteWelcome } from '@/components/AtendenteWelcome';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

const statusColors = {
  em_producao: 'bg-blue-50 border-blue-200',
  pronto: 'bg-orange-50 border-orange-200',
  entregue: 'bg-green-50 border-green-200',
  cancelado: 'bg-gray-50 border-gray-200',
};

const statusLabels = {
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export default function EntregaPedidos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAtendente, isAdmin, isVendedor } = useUserRole();
  
  const [filtros, setFiltros] = useState<FiltrosEntrega>({
    status: ['em_producao', 'pronto'],
    periodo: '30dias',
    mostrarEntregues: false,
  });
  const [busca, setBusca] = useState('');

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [observacaoDialogOpen, setObservacaoDialogOpen] = useState(false);
  const [pagamentoModalOpen, setPagamentoModalOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<any>(null);

  const { data: todosPedidos = [], isLoading } = useEntregaPedidos(filtros);
  
  // Filtro client-side por busca (número, cliente, telefone)
  const pedidos = busca.trim()
    ? todosPedidos.filter((p: any) => {
        const termo = busca.toLowerCase().trim();
        const numero = String(p.numero_pedido || '').toLowerCase();
        const cliente = (p.cliente?.nome_razao_social || '').toLowerCase();
        const telefone = (p.cliente?.telefone || '').toLowerCase();
        const whatsapp = (p.cliente?.whatsapp || '').toLowerCase();
        return numero.includes(termo) || cliente.includes(termo) || telefone.includes(termo) || whatsapp.includes(termo);
      })
    : todosPedidos;
  
  const estatisticas = calcularEstatisticas(todosPedidos);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('nome')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });


  const handleStatusClick = (pedido: any) => {
    setPedidoSelecionado(pedido);
    setStatusDialogOpen(true);
  };

  const handleObservacaoClick = (pedido: any) => {
    setPedidoSelecionado(pedido);
    setObservacaoDialogOpen(true);
  };

  const handlePagamentoClick = (pedido: any) => {
    setPedidoSelecionado(pedido);
    setPagamentoModalOpen(true);
  };

  const handleStatusChange = (status: StatusPedido[]) => {
    setFiltros({ ...filtros, status });
  };

  const toggleStatus = (status: StatusPedido) => {
    const newStatus = filtros.status || [];
    if (newStatus.includes(status)) {
      handleStatusChange(newStatus.filter(s => s !== status));
    } else {
      handleStatusChange([...newStatus, status]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Entrega de Pedidos</h1>
          <p className="text-muted-foreground">Acompanhe e gerencie as entregas dos pedidos</p>
        </div>
      </div>

      {/* Card de Boas-vindas para Atendentes */}
      {isAtendente && !isAdmin && !isVendedor && (
        <AtendenteWelcome nome={profile?.nome} />
      )}

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.totalPendentes}</div>
            <p className="text-xs text-muted-foreground">Em produção ou prontos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Atrasados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{estatisticas.atrasados}</div>
            <p className="text-xs text-muted-foreground">Data de entrega vencida</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamento Pendente</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.pagamentoPendente}</div>
            <p className="text-xs text-muted-foreground">Aguardando quitação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prontos para Entrega</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.prontosParaEntrega}</div>
            <p className="text-xs text-muted-foreground">Disponíveis para retirada</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nº Pedido, Nome do Cliente ou Telefone..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={filtros.periodo} onValueChange={(value: any) => setFiltros({ ...filtros, periodo: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1dia">Último dia</SelectItem>
                  <SelectItem value="14dias">Últimos 14 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="maximo">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <Label>Status</Label>
              <div className="flex flex-wrap gap-2">
                {(['em_producao', 'pronto', 'entregue'] as StatusPedido[]).map((status) => (
                  <div key={status} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${status}`}
                      checked={filtros.status?.includes(status)}
                      onCheckedChange={() => toggleStatus(status)}
                    />
                    <Label htmlFor={`status-${status}`} className="cursor-pointer text-sm font-normal">
                      {statusLabels[status]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pedidos */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando pedidos...</p>
          </div>
        </div>
      ) : pedidos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum pedido encontrado com os filtros selecionados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pedidos.map((pedido) => {
            const statusEntrega = calcularStatusEntrega(pedido.data_entrega);
            const valorPendente = pedido.valor_total - (pedido.status_pagamento === 'quitado' ? pedido.valor_total : pedido.status_pagamento === 'parcial' ? pedido.valor_total / 2 : 0);

            return (
              <Card key={pedido.id} className={`${statusColors[pedido.status as keyof typeof statusColors]} border-2`}>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold">Pedido #{pedido.numero_pedido}</h3>
                        <Badge variant="outline">{statusLabels[pedido.status as keyof typeof statusLabels]}</Badge>
                        {statusEntrega.status === 'atrasado' && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Atrasado
                          </Badge>
                        )}
                      </div>

                      <div className="grid gap-2 text-sm">
                        <div><span className="font-medium">Cliente:</span> {pedido.cliente?.nome_razao_social}</div>
                        <div><span className="font-medium">Vendedor:</span> {pedido.vendedor?.nome}</div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Entrega:</span>
                          {pedido.data_entrega ? (
                            <>
                              <span>{format(parseDateString(pedido.data_entrega) || new Date(), "dd/MM/yyyy", { locale: ptBR })}</span>
                              <Badge className={statusEntrega.bgCor}>
                                <span className={statusEntrega.cor}>{statusEntrega.texto}</span>
                              </Badge>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Não definida</span>
                          )}
                        </div>
                        <div><span className="font-medium">Valor Total:</span> {formatCurrency(pedido.valor_total)}</div>
                        {valorPendente > 0 && (
                          <div className="text-orange-600 font-medium">
                            💳 Valor Pendente: {formatCurrency(valorPendente)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 lg:w-48">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/pedidos/${pedido.id}`)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleStatusClick(pedido)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Alterar Status
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePagamentoClick(pedido)}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pagamento
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleObservacaoClick(pedido)}>
                        <FileText className="h-4 w-4 mr-2" />
                        Observação
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {pedidoSelecionado && (
        <>
          <AlterarStatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            pedidoId={pedidoSelecionado.id}
            statusAtual={pedidoSelecionado.status}
          />
          <AdicionarObservacaoDialog
            open={observacaoDialogOpen}
            onOpenChange={setObservacaoDialogOpen}
            pedidoId={pedidoSelecionado.id}
          />
          <RegistrarPagamentoModal
            open={pagamentoModalOpen}
            onOpenChange={setPagamentoModalOpen}
            pedidoId={pedidoSelecionado.id}
            valorRestante={pedidoSelecionado.valor_total - (pedidoSelecionado.status_pagamento === 'quitado' ? pedidoSelecionado.valor_total : pedidoSelecionado.status_pagamento === 'parcial' ? pedidoSelecionado.valor_total / 2 : 0)}
            statusPedido={pedidoSelecionado.status}
            requerAprovacao={pedidoSelecionado.requer_aprovacao_preco || false}
          />
        </>
      )}
    </div>
  );
}
