import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, DollarSign, Package, User, Calendar, FileText, AlertTriangle, Printer, Pencil, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { usePedido } from '@/hooks/usePedidos';
import { supabase } from '@/integrations/supabase/client';
import { usePagamentos } from '@/hooks/usePagamentos';
import { usePedidoHistorico } from '@/hooks/usePedidoHistorico';
import { usePedidoAprovacao } from '@/hooks/usePedidosAprovacao';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions } from '@/hooks/usePermissions';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RegistrarPagamentoModal } from '@/components/Pedidos/RegistrarPagamentoModal';
import { toast } from '@/hooks/use-toast';
import { FichaPedidoPrint } from '@/components/Pedidos/FichaPedidoPrint';
import { createRoot } from 'react-dom/client';
import { parseDateString } from '@/lib/formatters';
import { parsePedidoObservacoes } from '@/lib/pedidoObservacoes';
import { useCanViewPedidoValues } from '@/hooks/useCanViewPedidoValues';

const statusPedidoLabels = {
  rascunho: 'Rascunho',
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const statusPedidoColors = {
  rascunho: 'bg-gray-400',
  em_producao: 'bg-blue-500',
  pronto: 'bg-yellow-500',
  entregue: 'bg-green-500',
  cancelado: 'bg-red-500',
};

const statusPagamentoLabels = {
  aguardando: 'Aguardando',
  parcial: 'Parcial',
  quitado: 'Quitado',
};

const statusPagamentoColors = {
  aguardando: 'bg-yellow-500',
  parcial: 'bg-blue-500',
  quitado: 'bg-green-500',
};

const formaPagamentoLabels = {
  pix: 'PIX',
  cartao: 'Cartão',
  boleto: 'Boleto',
  dinheiro: 'Dinheiro',
};

export default function PedidoDetalhes() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAdmin, isVendedor, isPcp } = useUserRole();
  const { can } = usePermissions();
  const { canViewPedidoValues } = useCanViewPedidoValues();
  const podeEditar = isAdmin || isVendedor || isPcp || can('pedidos.editar') || can('pedidos.editar_todos');
  const { data: pedido, isLoading } = usePedido(id);
  const { data: pagamentos = [] } = usePagamentos(id, { enabled: canViewPedidoValues });
  const { data: historico = [] } = usePedidoHistorico(id);
  const { data: aprovacao } = usePedidoAprovacao(id);
  const [modalOpen, setModalOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [updatingDate, setUpdatingDate] = useState(false);
  const queryClient = useQueryClient();

  const handleUpdateDataEntrega = async (newDate: Date | undefined) => {
    if (!newDate || !id) return;
    setUpdatingDate(true);
    try {
      const dateStr = format(newDate, 'yyyy-MM-dd');
      const { error } = await supabase
        .from('pedidos')
        .update({ data_entrega: dateStr })
        .eq('id', id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['pedido', id] });
      queryClient.invalidateQueries({ queryKey: ['pedido-historico', id] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      setDatePickerOpen(false);
      toast({ title: 'Data de entrega atualizada' });
    } catch (error: any) {
      toast({ title: 'Erro ao atualizar data', description: error.message, variant: 'destructive' });
    } finally {
      setUpdatingDate(false);
    }
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

  if (!pedido) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Pedido não encontrado</p>
      </div>
    );
  }

  const valorTotal = Number(pedido.valor_total);
  const valorPago = pagamentos
    .filter((p: any) => p.status === 'aprovado' && !p.estornado)
    .reduce((sum: number, p: any) => sum + Number(p.valor), 0);
  const observacoesGerais = parsePedidoObservacoes(pedido.observacao);

  const formatObservacaoData = (dateValue: string | null) => {
    if (!dateValue) return null;
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return null;
    return format(parsed, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };
  
  // Calcular valor pendente (aguardando aprovação)
  const valorPendente = pagamentos
    .filter((p: any) => p.status === 'aguardando')
    .reduce((sum: number, p: any) => sum + Number(p.valor), 0);
  
  // Saldo real disponível (considerando pagamentos pendentes)
  // Arredondar para evitar problemas de precisão de ponto flutuante
  const valorRestante = Math.round((valorTotal - valorPago - valorPendente) * 100) / 100;

  // Verificar se há boletos rejeitados (pagamento em atraso)
  // NÃO mostrar alerta se o pedido já está QUITADO
  const boletosRejeitados = pedido.status_pagamento === 'quitado' 
    ? [] 
    : pagamentos.filter(
        (p: any) => p.forma_pagamento === 'boleto' && p.status === 'rejeitado' && !p.estornado
      );

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Ficha de Pedido #${pedido.numero_pedido}</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
          <div id="print-root"></div>
        </body>
      </html>
    `);
    printWindow.document.close();

    // Aguardar o Tailwind carregar
    setTimeout(() => {
      const container = printWindow.document.getElementById('print-root');
      if (container) {
        const root = createRoot(container);
        root.render(<FichaPedidoPrint pedido={pedido} pagamentos={pagamentos} />);
        
        // Aguardar o render e chamar print
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }
    }, 1000);
  };

  const handleCopyCaminhoArquivos = async () => {
    const caminho = (pedido as any)?.caminho_arquivos;
    if (!caminho) return;
    try {
      await navigator.clipboard.writeText(caminho);
      toast({ title: 'Caminho copiado' });
    } catch {
      toast({
        title: 'Não foi possível copiar o caminho',
        description: 'Copie manualmente o texto exibido no campo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pedidos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Pedido #{pedido.numero_pedido}</h1>
            <p className="text-muted-foreground">
              Criado em {format(parseDateString(pedido.data_pedido) || new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Ficha
          </Button>
          <Badge className={statusPedidoColors[pedido.status as keyof typeof statusPedidoColors]}>
            {statusPedidoLabels[pedido.status as keyof typeof statusPedidoLabels]}
          </Badge>
          <Badge className={statusPagamentoColors[pedido.status_pagamento as keyof typeof statusPagamentoColors]}>
            {statusPagamentoLabels[pedido.status_pagamento as keyof typeof statusPagamentoLabels]}
          </Badge>
        </div>
      </div>

      {/* Alerta de Pedido em Rascunho */}
      {pedido.status === 'rascunho' && (
        <Alert className="border-muted bg-muted/50">
          <FileText className="h-5 w-5" />
          <AlertTitle>📋 Pedido em Rascunho</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            <div className="space-y-2 mt-2">
              <p>Este pedido está em modo rascunho. Ele não aparece na produção, kanban ou financeiro.</p>
              <p className="text-sm">Edite o pedido para completar os dados e ativá-lo.</p>
              {podeEditar && (
                <div className="mt-3">
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => navigate(`/pedidos/editar/${pedido.id}`)}
                  >
                    Editar e Ativar Pedido
                  </Button>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de Pedido Aguardando Aprovação */}
      {pedido.requer_aprovacao_preco && aprovacao?.status === 'pendente' && (
        <Alert variant="destructive" className="border-warning bg-warning/10">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertTitle className="text-warning">⚠️ Pedido Aguardando Aprovação</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            <div className="space-y-2 mt-2">
              <p>Este pedido está aguardando aprovação por política comercial (preço e/ou desconto à vista).</p>
              {aprovacao?.motivo_solicitacao && (
                <div className="mt-2">
                  <strong>Motivo:</strong> {aprovacao.motivo_solicitacao}
                </div>
              )}
              {aprovacao?.observacao_vendedor && (
                <div className="mt-2">
                  <strong>Observação:</strong> {aprovacao.observacao_vendedor}
                </div>
              )}
              {isAdmin && (
                <div className="mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/admin/aprovar-pedidos')}
                  >
                    Ir para Aprovações
                  </Button>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de Boleto Rejeitado / Pagamento em Atraso */}
      {boletosRejeitados.length > 0 && (
        <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-red-700 dark:text-red-400">⚠️ Pagamento em Atraso</AlertTitle>
          <AlertDescription className="text-red-600 dark:text-red-500">
            <div className="space-y-2 mt-2">
              {boletosRejeitados.map((boleto: any) => (
                <div key={boleto.id} className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <p className="font-semibold">
                    Boleto de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(boleto.valor))}
                    {boleto.data_vencimento_boleto && (
                      <span className="ml-2">
                        (venceu em {format(new Date(boleto.data_vencimento_boleto + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })})
                      </span>
                    )}
                  </p>
                  {boleto.motivo_rejeicao && (
                    <p className="text-sm mt-1">
                      <strong>Motivo:</strong> {boleto.motivo_rejeicao}
                    </p>
                  )}
                </div>
              ))}
              <p className="text-sm mt-2">
                Por favor, regularize o pagamento ou registre um novo pagamento.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Informações do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{pedido.cliente?.nome_razao_social}</p>
            {pedido.cliente?.email && (
              <p className="text-sm text-muted-foreground">{pedido.cliente.email}</p>
            )}
            {pedido.cliente?.telefone && (
              <p className="text-sm text-muted-foreground">{pedido.cliente.telefone}</p>
            )}
          </CardContent>
        </Card>

        {/* Informações do Vendedor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Vendedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{pedido.vendedor?.nome}</p>
            <p className="text-sm text-muted-foreground">{pedido.vendedor?.email}</p>
          </CardContent>
        </Card>

        {/* Data de Entrega */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Entrega
              </CardTitle>
              {podeEditar && pedido.status !== 'cancelado' && (
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={updatingDate}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={pedido.data_entrega ? parseDateString(pedido.data_entrega) || undefined : undefined}
                      onSelect={handleUpdateDataEntrega}
                      locale={ptBR}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {pedido.data_entrega ? (
              <p className="font-medium">
                {format(parseDateString(pedido.data_entrega) || new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            ) : (
              <p className="text-muted-foreground">Não definida</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Caminho dos Arquivos/Logos
            </CardTitle>
            {Boolean((pedido as any).caminho_arquivos) && (
              <Button variant="outline" size="sm" onClick={handleCopyCaminhoArquivos}>
                <Copy className="h-4 w-4 mr-2" />
                Copiar caminho
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(pedido as any).caminho_arquivos ? (
            <p className="font-mono text-sm break-all">{(pedido as any).caminho_arquivos}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Não informado</p>
          )}
        </CardContent>
      </Card>

      {canViewPedidoValues && (
        <>
      {/* Resumo Financeiro */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumo Financeiro
            </CardTitle>
            {pedido.status !== 'cancelado' && pedido.status !== 'rascunho' && !pedido.requer_aprovacao_preco ? (
              <Button onClick={() => setModalOpen(true)}>Registrar Pagamento</Button>
            ) : (
              <div className="text-sm text-muted-foreground text-right">
                {pedido.status === 'cancelado' && (
                  <p>⛔ Pagamentos bloqueados</p>
                )}
                {pedido.status === 'rascunho' && (
                  <p>📋 Ative o pedido primeiro</p>
                )}
                {pedido.requer_aprovacao_preco && (
                  <p>⏳ Aguardando aprovação</p>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorTotal)}
              </p>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Valor Pago</p>
              <p className="text-2xl font-bold text-green-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorPago)}
              </p>
            </div>
            <div className="p-4 bg-yellow-500/10 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Saldo Restante</p>
              <p className="text-2xl font-bold text-yellow-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorRestante)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {pagamentos.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum pagamento registrado</p>
          ) : (
            <div className="space-y-4">
              {pagamentos.map((pagamento: any) => (
                <div key={pagamento.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={
                        pagamento.status === 'aprovado' ? 'default' :
                        pagamento.status === 'rejeitado' ? 'destructive' : 'secondary'
                      }>
                        {pagamento.status === 'aguardando' ? 'Aguardando Aprovação' :
                         pagamento.status === 'aprovado' ? 'Aprovado' : 'Rejeitado'}
                      </Badge>
                      {pagamento.estornado && <Badge variant="destructive">Estornado</Badge>}
                      <Badge variant="outline">{formaPagamentoLabels[pagamento.forma_pagamento as keyof typeof formaPagamentoLabels]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(pagamento.data_pagamento), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    {pagamento.criador && (
                      <p className="text-sm text-muted-foreground">
                        Registrado por: {pagamento.criador.nome}
                      </p>
                    )}
                    {pagamento.observacao && (
                      <p className="text-sm text-muted-foreground mt-1">{pagamento.observacao}</p>
                    )}
                    {pagamento.motivo_rejeicao && (
                      <p className="text-sm text-red-600 mt-1">Motivo da rejeição: {pagamento.motivo_rejeicao}</p>
                    )}
                    {pagamento.motivo_estorno && (
                      <p className="text-sm text-red-600 mt-1">Motivo do estorno: {pagamento.motivo_estorno}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(pagamento.valor))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

        </>
      )}

      {/* Imagem Aprovada - Exibida em destaque quando existe */}
      {pedido.imagem_aprovada && pedido.imagem_aprovacao_url && (
        <Card className="border-green-500/50 bg-green-50/30 dark:bg-green-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Package className="h-5 w-5" />
              Imagem Aprovada
              <Badge variant="outline" className="border-green-500 text-green-600">
                ✓ Aprovada
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <img
                src={pedido.imagem_aprovacao_url}
                alt="Imagem aprovada do pedido"
                className="max-w-md max-h-96 object-contain rounded-lg border border-green-500/50 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(pedido.imagem_aprovacao_url, '_blank')}
                title="Clique para ver em tamanho maior"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Itens do Pedido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pedido.itens?.map((item: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex gap-4">
                  {/* Se há imagem aprovada, mostra ela nos itens. Senão, mostra a foto do item */}
                  {pedido.imagem_aprovada && pedido.imagem_aprovacao_url ? (
                    <div className="flex-shrink-0">
                      <img
                        src={pedido.imagem_aprovacao_url}
                        alt="Imagem aprovada"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-green-500 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(pedido.imagem_aprovacao_url, '_blank')}
                        title="Imagem aprovada - Clique para ver em tamanho maior"
                      />
                    </div>
                  ) : item.foto_modelo_url ? (
                    <div className="flex-shrink-0">
                      <img
                        src={item.foto_modelo_url}
                        alt={`Modelo de ${item.produto?.nome}`}
                        className="w-32 h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(item.foto_modelo_url, '_blank')}
                        title="Clique para ver em tamanho maior"
                      />
                    </div>
                  ) : null}
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-lg">{item.produto?.nome}</h4>
                        {item.produto?.codigo && (
                          <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                            {item.produto.codigo}
                          </span>
                        )}
                      </div>
                      {item.tipo_estampa?.nome_tipo_estampa && (
                        <Badge variant="secondary" className="mt-1">
                          {item.tipo_estampa.nome_tipo_estampa}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm">
                      <span className="font-medium">Quantidade:</span> {item.quantidade}
                      {canViewPedidoValues && (
                        <>
                          {' '}x{' '}
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.valor_unitario))} ={' '}
                          <span className="font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.valor_total))}
                          </span>
                        </>
                      )}
                    </p>

                    {/* Grade de Tamanhos */}
                    {item.grades && item.grades.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Grade de Tamanhos:</p>
                        <div className="flex flex-wrap gap-2">
                          {item.grades.map((grade: any) => (
                            <Badge key={grade.id} variant="outline" className="font-mono">
                              {grade.tamanho_nome}: {grade.quantidade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Detalhes Adicionais */}
                    {item.detalhes && item.detalhes.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Detalhes:</p>
                        <div className="space-y-1">
                          {item.detalhes.map((detalhe: any) => {
                            const labelMap: Record<string, string> = {
                              nome_numero: 'Nome/Número',
                              cor_vies: 'Cor do Viés',
                              tipo_gola: 'Tipo de Gola',
                            };
                            const label = labelMap[detalhe.tipo_detalhe] || 
                              detalhe.tipo_detalhe.charAt(0).toUpperCase() + 
                              detalhe.tipo_detalhe.slice(1).replace(/_/g, ' ');
                            
                            return (
                              <p key={detalhe.id} className="text-sm text-muted-foreground">
                                <span className="font-medium">{label}:</span> {detalhe.valor}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {item.observacoes && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Observações:</span> {item.observacoes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      {observacoesGerais.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Observações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {observacoesGerais.map((obs, index) => (
                <div key={index} className="rounded-lg border bg-muted/20 px-3 py-2">
                  {formatObservacaoData(obs.data) && (
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {formatObservacaoData(obs.data)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{obs.texto}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Alterações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mostrar foto original dos itens quando há imagem aprovada */}
          {pedido.imagem_aprovada && pedido.imagem_aprovacao_url && (
            <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3">
                📷 Imagem de Referência Original (substituída pela imagem aprovada)
              </h4>
              <div className="flex flex-wrap gap-3">
                {pedido.itens?.filter((item: any) => item.foto_modelo_url).map((item: any, idx: number) => (
                  <div key={idx} className="relative">
                    <img
                      src={item.foto_modelo_url}
                      alt={`Foto original - ${item.produto?.nome}`}
                      className="w-24 h-24 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity opacity-70"
                      onClick={() => window.open(item.foto_modelo_url, '_blank')}
                      title={`Foto original de ${item.produto?.nome} - Clique para ver em tamanho maior`}
                    />
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5 rounded-b">
                      {item.produto?.nome}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {historico.length === 0 && !(pedido.imagem_aprovada && pedido.imagem_aprovacao_url) ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma alteração registrada</p>
          ) : historico.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">Nenhuma outra alteração registrada</p>
          ) : (
            <div className="space-y-3">
              {historico.map((item: any) => (
                <div key={item.id} className="flex gap-3 p-3 border-l-2 border-primary/50 bg-muted/30 rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        {item.tipo_alteracao === 'criacao' && 'Criação'}
                        {item.tipo_alteracao === 'edicao' && 'Edição'}
                        {item.tipo_alteracao === 'status' && 'Status'}
                        {item.tipo_alteracao === 'exclusao' && 'Exclusão'}
                        {item.tipo_alteracao === 'solicitacao_edicao' && 'Solicitação de Edição'}
                        {item.tipo_alteracao === 'edicao_aprovada' && 'Edição Aprovada'}
                        {item.tipo_alteracao === 'edicao_rejeitada' && 'Edição Rejeitada'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold text-foreground">
                        {item.usuario?.nome || 'Sistema'}
                      </span>
                      {item.usuario?.email && (
                        <span className="text-xs text-muted-foreground">({item.usuario.email})</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.descricao}</p>
                    {item.campo_alterado && (
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Campo:</strong> {item.campo_alterado}
                        {item.valor_anterior && ` | De: "${item.valor_anterior}"`}
                        {item.valor_novo && ` | Para: "${item.valor_novo}"`}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RegistrarPagamentoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        pedidoId={id!}
        valorRestante={valorRestante}
        statusPedido={pedido.status}
        requerAprovacao={pedido.requer_aprovacao_preco || false}
      />
    </div>
  );
}
