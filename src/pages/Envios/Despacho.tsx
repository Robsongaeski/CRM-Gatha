import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, Search, AlertTriangle, CheckCircle, AlertCircle, RefreshCcw, Filter, ChevronLeft, ChevronRight, Edit, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  useEnviosOrders, 
  useDespachar,
  useDespacharLote,
  useAtualizarChaveNfe,
  validarChaveNfe, 
  normalizarChaveNfe,
  StatusEnvio,
  OrderEnvio 
} from '@/hooks/useEnvios';
import { useEnviosCarriers } from '@/hooks/useEnvios';
import { Label } from '@/components/ui/label';

const statusEnvioLabels: Record<StatusEnvio, string> = {
  aguardando_despacho: 'Aguardando Despacho',
  despachado: 'Despachado',
  reprocessado: 'Reprocessado',
  cancelado: 'Cancelado',
};

const statusEnvioColors: Record<StatusEnvio, string> = {
  aguardando_despacho: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  despachado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  reprocessado: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function Despacho() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [codigoBarras, setCodigoBarras] = useState('');
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({
    status_envio: '' as StatusEnvio | '',
    carrier: '',
    search: '',
  });
  
  // Seleção em lote
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchStatus, setBatchStatus] = useState<StatusEnvio>('despachado');
  
  // Modais
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showAlreadyDispatchedModal, setShowAlreadyDispatchedModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<OrderEnvio | null>(null);
  
  // Modal de edição de chave NF-e
  const [showEditNfeModal, setShowEditNfeModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<OrderEnvio | null>(null);
  const [editNfeValue, setEditNfeValue] = useState('');

  const { data: enviosData, isLoading } = useEnviosOrders({
    status_envio: filtros.status_envio || undefined,
    carrier: filtros.carrier || undefined,
    search: filtros.search || undefined,
    page,
    pageSize: 50,
  });
  
  const orders = enviosData?.orders || [];
  const totalCount = enviosData?.totalCount || 0;
  const totalPages = enviosData?.totalPages || 1;
  
  const { data: carriers = [] } = useEnviosCarriers();
  const despacharMutation = useDespachar();
  const despacharLoteMutation = useDespacharLote();
  const atualizarChaveNfeMutation = useAtualizarChaveNfe();

  // Funções para edição de chave NF-e
  const handleOpenEditNfe = (order: OrderEnvio) => {
    setEditingOrder(order);
    setEditNfeValue(order.chave_nfe || '');
    setShowEditNfeModal(true);
  };

  const handleSaveNfe = async () => {
    if (!editingOrder) return;
    
    try {
      await atualizarChaveNfeMutation.mutateAsync({
        orderId: editingOrder.id,
        chaveNfe: editNfeValue,
      });
      setShowEditNfeModal(false);
      setEditingOrder(null);
      setEditNfeValue('');
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    setSelectedOrders(new Set());
  }, [filtros]);

  // Focar no input ao carregar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focar após fechar modais - sem delay para maior velocidade
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleCloseErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
    setCodigoBarras('');
    inputRef.current?.focus();
  };

  const handleCloseAlreadyDispatchedModal = (action: 'cancel' | 'reprocess') => {
    if (action === 'reprocess' && pendingOrder) {
      processDespacho(codigoBarras, true);
    }
    setShowAlreadyDispatchedModal(false);
    setPendingOrder(null);
    setCodigoBarras('');
    focusInput();
  };

  const processDespacho = async (codigo: string, forceReprocess = false) => {
    const normalized = normalizarChaveNfe(codigo);

    if (!validarChaveNfe(normalized)) {
      setErrorMessage('Código inválido. A chave NF-e deve ter 44 dígitos numéricos.');
      setShowErrorModal(true);
      return;
    }

    try {
      const result = await despacharMutation.mutateAsync({ 
        chaveNfe: normalized, 
        forceReprocess 
      });

      if (result.status === 'ALREADY_DISPATCHED') {
        setPendingOrder(result.order);
        setShowAlreadyDispatchedModal(true);
        return;
      }

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <div>
            <div className="font-semibold">Pedido {result.order.order_number} despachado!</div>
            <div className="text-sm text-muted-foreground">{result.order.customer_name}</div>
          </div>
        </div>
      );
      setCodigoBarras('');
      focusInput();
    } catch (error: any) {
      if (error.message === 'NOT_FOUND') {
        setErrorMessage('Pedido não encontrado. Verifique se a chave NF-e está correta.');
      } else {
        setErrorMessage(`Erro ao processar: ${error.message}`);
      }
      setShowErrorModal(true);
    }
  };

  const handleCodigoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCodigoBarras(value);
    
    const normalized = normalizarChaveNfe(value);
    if (normalized.length >= 44) {
      processDespacho(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && codigoBarras.trim()) {
      processDespacho(codigoBarras);
    }
  };

  // Seleção em lote
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === orders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(orders.map(o => o.id)));
    }
  };

  const handleBatchDispatch = async () => {
    if (selectedOrders.size === 0) return;
    
    try {
      await despacharLoteMutation.mutateAsync({
        orderIds: Array.from(selectedOrders),
        statusEnvio: batchStatus,
      });
      setSelectedOrders(new Set());
      setShowBatchModal(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Despacho de Pedidos</h1>
          <p className="text-muted-foreground">
            Leia o código de barras da NF-e para registrar o despacho
          </p>
        </div>
      </div>

      {/* Campo de Leitura */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Leitura de Código de Barras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Aguardando leitura do código de barras da NF-e (44 dígitos)..."
                className="pl-10 text-lg h-14 font-mono"
                value={codigoBarras}
                onChange={handleCodigoChange}
                onKeyDown={handleKeyDown}
                disabled={despacharMutation.isPending}
                autoFocus
              />
            </div>
            <Button 
              onClick={() => processDespacho(codigoBarras)}
              disabled={!codigoBarras.trim() || despacharMutation.isPending}
              size="lg"
              className="h-14"
            >
              {despacharMutation.isPending ? 'Processando...' : 'Despachar'}
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            A leitura é processada automaticamente ao completar 44 dígitos ou ao pressionar Enter
          </p>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-64">
              <Input
                placeholder="Buscar pedido, cliente ou NF-e..."
                value={filtros.search}
                onChange={(e) => setFiltros(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <Select
              value={filtros.status_envio || "all"}
              onValueChange={(value) => setFiltros(prev => ({ ...prev, status_envio: value === "all" ? '' : value as StatusEnvio }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status do envio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="aguardando_despacho">Aguardando Despacho</SelectItem>
                <SelectItem value="despachado">Despachado</SelectItem>
                <SelectItem value="reprocessado">Reprocessado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filtros.carrier || "all"}
              onValueChange={(value) => setFiltros(prev => ({ ...prev, carrier: value === "all" ? '' : value }))}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Transportadora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {carriers.map(carrier => (
                  <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filtros.status_envio || filtros.carrier || filtros.search) && (
              <Button 
                variant="outline" 
                onClick={() => setFiltros({ status_envio: '', carrier: '', search: '' })}
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ações em Lote */}
      {selectedOrders.size > 0 && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800 dark:text-blue-200">
                  {selectedOrders.size} pedido(s) selecionado(s)
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedOrders(new Set())}
                >
                  Limpar seleção
                </Button>
                <Button 
                  size="sm"
                  onClick={() => setShowBatchModal(true)}
                >
                  Atualizar Status em Lote
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Pedidos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pedidos ({totalCount})</CardTitle>
          {/* Paginação no header */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pedido encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={orders.length > 0 && selectedOrders.size === orders.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Transportadora</TableHead>
                    <TableHead>Chave NF-e</TableHead>
                    <TableHead>Status Envio</TableHead>
                    <TableHead>Data Despacho</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow 
                      key={order.id}
                      className={selectedOrders.has(order.id) ? 'bg-blue-50 dark:bg-blue-950' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => toggleSelectOrder(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>{order.carrier || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center gap-1">
                          {order.chave_nfe ? (
                            <span title={order.chave_nfe}>
                              {order.chave_nfe.substring(0, 8)}...{order.chave_nfe.substring(order.chave_nfe.length - 8)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Sem NF-e</span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleOpenEditNfe(order)}
                            title="Editar chave NF-e"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusEnvioColors[order.status_envio]}>
                          {statusEnvioLabels[order.status_envio]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {order.data_despacho ? (
                          format(new Date(order.data_despacho), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginação rodapé */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * 50) + 1} - {Math.min(page * 50, totalCount)} de {totalCount} pedidos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                >
                  Primeira
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(totalPages)}
                >
                  Última
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Erro */}
      <Dialog open={showErrorModal} onOpenChange={(open) => !open && handleCloseErrorModal()}>
        <DialogContent className="border-red-500">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6" />
              Erro na Leitura
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {errorMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleCloseErrorModal}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Já Despachado */}
      <Dialog open={showAlreadyDispatchedModal} onOpenChange={(open) => !open && handleCloseAlreadyDispatchedModal('cancel')}>
        <DialogContent className="border-yellow-500">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-6 w-6" />
              Pedido Já Despachado
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Este pedido já foi despachado
              {pendingOrder?.data_despacho && (
                <> em {format(new Date(pendingOrder.data_despacho), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
              )}.
              <br /><br />
              <strong>Pedido:</strong> {pendingOrder?.order_number}<br />
              <strong>Cliente:</strong> {pendingOrder?.customer_name}
              <br /><br />
              Deseja registrar novamente como reprocessado?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleCloseAlreadyDispatchedModal('cancel')}>
              Não
            </Button>
            <Button onClick={() => handleCloseAlreadyDispatchedModal('reprocess')}>
              Sim, Reprocessar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Atualização em Lote */}
      <Dialog open={showBatchModal} onOpenChange={setShowBatchModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Atualizar Status em Lote
            </DialogTitle>
            <DialogDescription className="pt-2">
              Você está prestes a atualizar {selectedOrders.size} pedido(s).
              <br />
              Selecione o novo status de envio:
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select
              value={batchStatus}
              onValueChange={(value) => setBatchStatus(value as StatusEnvio)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="despachado">Despachado</SelectItem>
                <SelectItem value="reprocessado">Reprocessado</SelectItem>
                <SelectItem value="aguardando_despacho">Aguardando Despacho</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowBatchModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBatchDispatch}
              disabled={despacharLoteMutation.isPending}
            >
              {despacharLoteMutation.isPending ? 'Atualizando...' : 'Confirmar Atualização'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Chave NF-e */}
      <Dialog open={showEditNfeModal} onOpenChange={(open) => {
        if (!open) {
          setShowEditNfeModal(false);
          setEditingOrder(null);
          setEditNfeValue('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Editar Chave NF-e
            </DialogTitle>
            <DialogDescription className="pt-2">
              Pedido: <strong>#{editingOrder?.order_number}</strong>
              <br />
              Cliente: {editingOrder?.customer_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="chaveNfe">Chave NF-e (44 dígitos)</Label>
              <Input
                id="chaveNfe"
                placeholder="Digite ou cole a chave NF-e..."
                value={editNfeValue}
                onChange={(e) => setEditNfeValue(e.target.value)}
                className="font-mono"
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Dígitos: {normalizarChaveNfe(editNfeValue).length}/44
                {normalizarChaveNfe(editNfeValue).length === 44 && (
                  <span className="text-green-600 ml-2">✓ Válida</span>
                )}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEditNfeModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveNfe}
              disabled={atualizarChaveNfeMutation.isPending || normalizarChaveNfe(editNfeValue).length !== 44}
            >
              {atualizarChaveNfeMutation.isPending ? 'Salvando...' : 'Salvar Chave NF-e'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
