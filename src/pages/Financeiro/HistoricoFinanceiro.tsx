import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, Filter, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useHistoricoFinanceiroCompleto } from '@/hooks/usePagamentos';
import { EstornarPagamentoDialog } from '@/components/Financeiro/EstornarPagamentoDialog';
import { useUserRole } from '@/hooks/useUserRole';

const formaPagamentoLabels = {
  pix: 'PIX',
  cartao: 'Cartão',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
};

const statusLabels = {
  aguardando: 'Aguardando',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
};

export default function HistoricoFinanceiro() {
  const [estornarDialogOpen, setEstornarDialogOpen] = useState(false);
  const [selectedPagamento, setSelectedPagamento] = useState<any>(null);
  const { isAdmin, hasRole } = useUserRole();
  const podeEstornar = isAdmin || hasRole('financeiro');

  const [filtros, setFiltros] = useState({
    status: '',
    dataInicio: '',
    dataFim: '',
    busca: '',
  });

  const { data: pagamentos = [], isLoading } = useHistoricoFinanceiroCompleto();

  // Aplicar filtros no frontend
  const pagamentosFiltrados = pagamentos.filter((pagamento: any) => {
    if (filtros.status && pagamento.status !== filtros.status) return false;
    
    if (filtros.dataInicio) {
      const dataPagamento = new Date(pagamento.data_pagamento);
      const dataInicio = new Date(filtros.dataInicio);
      if (dataPagamento < dataInicio) return false;
    }
    
    if (filtros.dataFim) {
      const dataPagamento = new Date(pagamento.data_pagamento);
      const dataFim = new Date(filtros.dataFim);
      if (dataPagamento > dataFim) return false;
    }
    
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      const cliente = pagamento.pedido?.cliente?.nome_razao_social?.toLowerCase() || '';
      const vendedor = pagamento.pedido?.vendedor?.nome?.toLowerCase() || '';
      const numeroPedido = pagamento.pedido?.numero_pedido?.toString() || '';
      
      if (!cliente.includes(busca) && !vendedor.includes(busca) && !numeroPedido.includes(busca)) {
        return false;
      }
    }
    
    return true;
  });

  const handleEstornar = (pagamento: any) => {
    setSelectedPagamento(pagamento);
    setEstornarDialogOpen(true);
  };

  const handleLimparFiltros = () => {
    setFiltros({
      status: '',
      dataInicio: '',
      dataFim: '',
      busca: '',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  const totalAprovado = pagamentosFiltrados
    .filter((p: any) => p.status === 'aprovado' && !p.estornado)
    .reduce((sum: number, p: any) => sum + Number(p.valor), 0);

  const totalEstornado = pagamentosFiltrados
    .filter((p: any) => p.estornado)
    .reduce((sum: number, p: any) => sum + Number(p.valor), 0);

  const totalRejeitado = pagamentosFiltrados
    .filter((p: any) => p.status === 'rejeitado')
    .reduce((sum: number, p: any) => sum + Number(p.valor), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Histórico Financeiro</h1>
          <p className="text-muted-foreground">
            Visualize todos os pagamentos processados ({pagamentosFiltrados.length} registro{pagamentosFiltrados.length !== 1 ? 's' : ''})
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total de Pagamentos</p>
            <p className="text-2xl font-bold">{pagamentosFiltrados.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Aprovado</p>
            <p className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAprovado)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Rejeitado</p>
            <p className="text-2xl font-bold text-orange-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRejeitado)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground mb-1">Total Estornado</p>
            <p className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalEstornado)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar por cliente, vendedor ou pedido..."
              value={filtros.busca}
              onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            />
            
            <Select
              value={filtros.status}
              onValueChange={(value) => setFiltros({ ...filtros, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
              placeholder="Data inicial"
            />

            <Input
              type="date"
              value={filtros.dataFim}
              onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
              placeholder="Data final"
            />

            <Button variant="outline" onClick={handleLimparFiltros}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pagamentos */}
      {pagamentosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">Nenhum pagamento encontrado</p>
            <p className="text-muted-foreground">Tente ajustar os filtros</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pagamentosFiltrados.map((pagamento: any) => (
            <Card key={pagamento.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge
                        variant={
                          pagamento.status === 'aprovado'
                            ? 'default'
                            : pagamento.status === 'rejeitado'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {statusLabels[pagamento.status as keyof typeof statusLabels]}
                      </Badge>
                      {pagamento.estornado && <Badge variant="destructive">Estornado</Badge>}
                      <Badge variant="outline">
                        {formaPagamentoLabels[pagamento.forma_pagamento as keyof typeof formaPagamentoLabels]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(pagamento.data_pagamento), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Cliente</p>
                        <p className="font-medium">{pagamento.pedido?.cliente?.nome_razao_social || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vendedor</p>
                        <p className="font-medium">{pagamento.pedido?.vendedor?.nome || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Registrado por</p>
                        <p className="font-medium">{pagamento.criador?.nome || 'Desconhecido'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pedido</p>
                        <p className="font-medium">#{pagamento.pedido?.numero_pedido || 'N/A'}</p>
                      </div>
                    </div>

                    {pagamento.observacao && (
                      <div>
                        <p className="text-sm text-muted-foreground">Observação</p>
                        <p className="text-sm">{pagamento.observacao}</p>
                      </div>
                    )}

                    {pagamento.motivo_rejeicao && (
                      <div>
                        <p className="text-sm text-muted-foreground">Motivo da Rejeição</p>
                        <p className="text-sm text-red-600">{pagamento.motivo_rejeicao}</p>
                      </div>
                    )}

                    {pagamento.motivo_estorno && (
                      <div>
                        <p className="text-sm text-muted-foreground">Motivo do Estorno</p>
                        <p className="text-sm text-red-600">{pagamento.motivo_estorno}</p>
                      </div>
                    )}

                    {pagamento.status === 'aprovado' && !pagamento.estornado && podeEstornar && (
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleEstornar(pagamento)}
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Estornar
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        Number(pagamento.valor)
                      )}
                    </p>
                    {pagamento.data_aprovacao && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Aprovado em{' '}
                        {format(new Date(pagamento.data_aprovacao), "d/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPagamento && (
        <EstornarPagamentoDialog
          open={estornarDialogOpen}
          onOpenChange={setEstornarDialogOpen}
          pagamento={selectedPagamento}
        />
      )}
    </div>
  );
}
