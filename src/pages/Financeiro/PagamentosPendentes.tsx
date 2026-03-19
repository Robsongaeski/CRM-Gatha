import { useState } from 'react';
import { format, isBefore, addDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ptBR } from 'date-fns/locale';
import { DollarSign, Eye, Check, X, FileText, AlertTriangle, Clock, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePagamentosPendentes } from '@/hooks/usePagamentos';
import { AprovarPagamentoDialog } from '@/components/Financeiro/AprovarPagamentoDialog';
import { RejeitarPagamentoDialog } from '@/components/Financeiro/RejeitarPagamentoDialog';
import { PagamentoDetalhesDialog } from '@/components/Financeiro/PagamentoDetalhesDialog';
import { usePermissions } from '@/hooks/usePermissions';

const formaPagamentoLabels = {
  pix: 'PIX',
  cartao: 'Cartão',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
};

export default function PagamentosPendentes() {
  const navigate = useNavigate();
  const { data: pagamentos = [], isLoading } = usePagamentosPendentes();
  const { can } = usePermissions();
  const [aprovarDialogOpen, setAprovarDialogOpen] = useState(false);
  const [rejeitarDialogOpen, setRejeitarDialogOpen] = useState(false);
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [selectedPagamento, setSelectedPagamento] = useState<any>(null);
  
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroForma, setFiltroForma] = useState('all');
  const [filtroPedido, setFiltroPedido] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('all');
  
  const podeAprovar = can('pagamentos.aprovar');

  const handleAprovar = (pagamento: any) => {
    setSelectedPagamento(pagamento);
    setAprovarDialogOpen(true);
  };

  const handleRejeitar = (pagamento: any) => {
    setSelectedPagamento(pagamento);
    setRejeitarDialogOpen(true);
  };

  const handleVerDetalhes = (pagamento: any) => {
    setSelectedPagamento(pagamento);
    setDetalhesDialogOpen(true);
  };

  const handleVerComprovante = async (url: string) => {
    // Extract file path from the stored URL
    const bucketName = 'comprovantes-pagamento';
    const match = url.match(/comprovantes-pagamento\/(.+)$/);
    if (!match) {
      window.open(url, '_blank');
      return;
    }
    const filePath = match[1];
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 300); // 5 min
    if (error || !data?.signedUrl) {
      toast.error('Erro ao gerar link do comprovante');
      return;
    }
    window.open(data.signedUrl, '_blank');
  };

  // Função para verificar status do boleto baseado no vencimento
  const getBoletoStatus = (pagamento: any) => {
    if (pagamento.forma_pagamento !== 'boleto' || !pagamento.data_vencimento_boleto) {
      return null;
    }

    const hoje = startOfDay(new Date());
    const vencimento = startOfDay(new Date(pagamento.data_vencimento_boleto + 'T12:00:00'));
    const proximoVencimento = addDays(hoje, 3);

    if (isBefore(vencimento, hoje)) {
      return 'vencido';
    } else if (isBefore(vencimento, proximoVencimento)) {
      return 'proximo';
    }
    return 'normal';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Aplicar filtros
  let pagamentosFiltrados = pagamentos.filter((p: any) => {
    if (filtroVendedor && !p.pedidos?.vendedor?.nome?.toLowerCase().includes(filtroVendedor.toLowerCase())) {
      return false;
    }
    if (filtroCliente && !p.pedidos?.clientes?.nome_razao_social?.toLowerCase().includes(filtroCliente.toLowerCase())) {
      return false;
    }
    if (filtroForma && filtroForma !== 'all' && p.forma_pagamento !== filtroForma) {
      return false;
    }
    if (filtroPedido && !String(p.pedidos?.numero_pedido).includes(filtroPedido)) {
      return false;
    }
    // Filtro por status de atraso
    if (filtroStatus && filtroStatus !== 'all') {
      const status = getBoletoStatus(p);
      if (filtroStatus === 'vencido' && status !== 'vencido') return false;
      if (filtroStatus === 'proximo' && status !== 'proximo') return false;
      if (filtroStatus === 'normal' && (status === 'vencido' || status === 'proximo')) return false;
    }
    return true;
  });

  // Ordenar: boletos vencidos primeiro, depois próximos do vencimento, depois por data
  pagamentosFiltrados = [...pagamentosFiltrados].sort((a: any, b: any) => {
    const statusA = getBoletoStatus(a);
    const statusB = getBoletoStatus(b);
    
    // Prioridade: vencido > proximo > normal/null
    const prioridadeA = statusA === 'vencido' ? 0 : statusA === 'proximo' ? 1 : 2;
    const prioridadeB = statusB === 'vencido' ? 0 : statusB === 'proximo' ? 1 : 2;
    
    if (prioridadeA !== prioridadeB) {
      return prioridadeA - prioridadeB;
    }
    
    // Se ambos são boletos, ordenar por vencimento
    if (a.data_vencimento_boleto && b.data_vencimento_boleto) {
      return new Date(a.data_vencimento_boleto).getTime() - new Date(b.data_vencimento_boleto).getTime();
    }
    
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Agrupar pagamentos por pedido
  const pagamentosPorPedido = pagamentosFiltrados.reduce((acc: any, p: any) => {
    const pedidoId = p.pedido_id;
    if (!acc[pedidoId]) {
      acc[pedidoId] = {
        pedido: p.pedidos,
        pagamentos: []
      };
    }
    acc[pedidoId].pagamentos.push(p);
    return acc;
  }, {});

  const totalPendente = pagamentosFiltrados.reduce((sum: number, p: any) => sum + Number(p.valor), 0);
  const boletosVencidos = pagamentosFiltrados.filter((p: any) => getBoletoStatus(p) === 'vencido').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pagamentos Pendentes</h1>
          <p className="text-muted-foreground">Aprovar ou rejeitar pagamentos registrados</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Pendente</p>
          <p className="text-2xl font-bold text-yellow-600">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPendente)}
          </p>
        </div>
      </div>

      {boletosVencidos > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">
                {boletosVencidos} boleto(s) vencido(s)!
              </p>
              <p className="text-sm text-red-600 dark:text-red-500">
                Verifique o pagamento com o cliente ou rejeite se não foi pago.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros sempre visíveis */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nº Pedido</label>
              <Input
                placeholder="Ex: 1145"
                value={filtroPedido}
                onChange={(e) => setFiltroPedido(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Vendedor</label>
              <Input
                placeholder="Filtrar por vendedor..."
                value={filtroVendedor}
                onChange={(e) => setFiltroVendedor(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Cliente</label>
              <Input
                placeholder="Filtrar por cliente..."
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Forma de Pagamento</label>
              <Select value={filtroForma} onValueChange={setFiltroForma}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="vencido">🔴 Vencidos</SelectItem>
                  <SelectItem value="proximo">🟡 Vence em Breve</SelectItem>
                  <SelectItem value="normal">🟢 Em dia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {pagamentosFiltrados.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-xl font-semibold mb-2">Nenhum pagamento pendente</p>
            <p className="text-muted-foreground">
              {pagamentos.length === 0 ? 'Todos os pagamentos foram processados' : 'Nenhum pagamento encontrado com os filtros aplicados'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Object.values(pagamentosPorPedido).map((grupo: any) => {
            const totalPedido = grupo.pagamentos.reduce((sum: number, p: any) => sum + Number(p.valor), 0);
            const temBoletoVencido = grupo.pagamentos.some((p: any) => getBoletoStatus(p) === 'vencido');
            const temBoletoProximo = grupo.pagamentos.some((p: any) => getBoletoStatus(p) === 'proximo');
            
            return (
              <Card 
                key={grupo.pedido.id}
                className={
                  temBoletoVencido 
                    ? 'border-red-500 bg-red-50/50 dark:bg-red-950/10' 
                    : temBoletoProximo 
                    ? 'border-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/10' 
                    : ''
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">Pedido #{grupo.pedido.numero_pedido}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Cliente: {grupo.pedido.clientes?.nome_razao_social}</span>
                        <span>Vendedor: {grupo.pedido.vendedor?.nome}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total dos Pagamentos</p>
                      <p className="text-xl font-bold">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPedido)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {grupo.pagamentos.map((pagamento: any, index: number) => {
                    const boletoStatus = getBoletoStatus(pagamento);
                    
                    return (
                      <div 
                        key={pagamento.id} 
                        className={`${index > 0 ? 'pt-4 border-t' : ''} ${
                          boletoStatus === 'vencido' 
                            ? 'bg-red-100/50 dark:bg-red-900/20 -mx-4 px-4 py-3 rounded' 
                            : boletoStatus === 'proximo' 
                            ? 'bg-yellow-100/50 dark:bg-yellow-900/20 -mx-4 px-4 py-3 rounded' 
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant="secondary">Aguardando Aprovação</Badge>
                              <Badge variant="outline">
                                {formaPagamentoLabels[pagamento.forma_pagamento as keyof typeof formaPagamentoLabels]}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(pagamento.data_pagamento), "d 'de' MMM 'de' yyyy", { locale: ptBR })}
                              </span>
                              
                              {boletoStatus === 'vencido' && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge variant="destructive" className="animate-pulse">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        BOLETO VENCIDO
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Venceu em {format(new Date(pagamento.data_vencimento_boleto + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              
                              {boletoStatus === 'proximo' && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge className="bg-yellow-500 text-white">
                                        <Clock className="h-3 w-3 mr-1" />
                                        VENCE EM BREVE
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Vence em {format(new Date(pagamento.data_vencimento_boleto + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>

                            {pagamento.data_vencimento_boleto && (
                              <div className={`text-sm ${boletoStatus === 'vencido' ? 'text-red-700 font-semibold' : boletoStatus === 'proximo' ? 'text-yellow-700 font-semibold' : 'text-muted-foreground'}`}>
                                📅 Vencimento do Boleto: {format(new Date(pagamento.data_vencimento_boleto + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                            )}

                            {pagamento.observacao && (
                              <div>
                                <p className="text-sm text-muted-foreground">Observação</p>
                                <p className="text-sm">{pagamento.observacao}</p>
                              </div>
                            )}

                            <div className="flex gap-2 flex-wrap">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerDetalhes(pagamento)}
                              >
                                <Info className="h-4 w-4 mr-2" />
                                Ver Detalhes
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/pedidos/${pagamento.pedido_id}`)}
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Ver Pedido
                              </Button>
                              {pagamento.comprovante_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerComprovante(pagamento.comprovante_url)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Comprovante
                                </Button>
                              )}
                              {podeAprovar ? (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleAprovar(pagamento)}
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Aprovar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRejeitar(pagamento)}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Rejeitar
                                  </Button>
                                </>
                              ) : (
                                <Badge variant="secondary">Apenas visualização</Badge>
                              )}
                            </div>
                          </div>

                          <div className="text-right ml-4">
                            <p className="text-2xl font-bold">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(pagamento.valor))}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedPagamento && (
        <>
          <AprovarPagamentoDialog
            open={aprovarDialogOpen}
            onOpenChange={setAprovarDialogOpen}
            pagamento={selectedPagamento}
          />
          <RejeitarPagamentoDialog
            open={rejeitarDialogOpen}
            onOpenChange={setRejeitarDialogOpen}
            pagamento={selectedPagamento}
          />
          <PagamentoDetalhesDialog
            open={detalhesDialogOpen}
            onOpenChange={setDetalhesDialogOpen}
            pagamento={selectedPagamento}
          />
        </>
      )}
    </div>
  );
}