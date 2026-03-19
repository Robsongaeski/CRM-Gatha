import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, Filter, X, AlertTriangle, ChevronDown, ChevronUp, Image, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePedidos, useDeletePedido, StatusPedido } from '@/hooks/usePedidos';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency, parseDateString } from '@/lib/formatters';

const FILTROS_STORAGE_KEY = 'pedidos-filtros';

const statusColors: Record<StatusPedido, string> = {
  rascunho: 'bg-gray-400',
  em_producao: 'bg-blue-500',
  pronto: 'bg-green-500',
  entregue: 'bg-gray-500',
  cancelado: 'bg-red-500',
};

const statusLabels: Record<StatusPedido, string> = {
  rascunho: 'Rascunho',
  em_producao: 'Em Produção',
  pronto: 'Pronto',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

// Função para carregar filtros do sessionStorage
const carregarFiltros = () => {
  try {
    const saved = sessionStorage.getItem(FILTROS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Erro ao carregar filtros:', e);
  }
  return null;
};

// Função para salvar filtros no sessionStorage
const salvarFiltros = (filtros: any) => {
  try {
    sessionStorage.setItem(FILTROS_STORAGE_KEY, JSON.stringify(filtros));
  } catch (e) {
    console.warn('Erro ao salvar filtros:', e);
  }
};

export default function PedidosLista() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isVendedor } = useUserRole();
  const { can } = usePermissions();
  const podeCriar = can('pedidos.criar');
  const podeEditar = isAdmin || isVendedor || can('pedidos.editar');
  const { user } = useAuth();
  const deletePedido = useDeletePedido();
  const [mostrarFiltrosAvancados, setMostrarFiltrosAvancados] = useState(false);
  
  // Carregar filtros salvos ao inicializar
  const filtrosSalvos = carregarFiltros();
  
  // Estados dos filtros
  const [statusFilter, setStatusFilter] = useState<StatusPedido[]>(filtrosSalvos?.statusFilter || []);
  const [statusPagamentoFilter, setStatusPagamentoFilter] = useState<string[]>(filtrosSalvos?.statusPagamentoFilter || []);
  const [vendedorFilter, setVendedorFilter] = useState(filtrosSalvos?.vendedorFilter || 'todos');
  const [clienteFilter, setClienteFilter] = useState(filtrosSalvos?.clienteFilter || 'todos');
  const [buscaInput, setBuscaInput] = useState(filtrosSalvos?.buscaInput || '');
  const [buscaFilter, setBuscaFilter] = useState(filtrosSalvos?.buscaFilter || '');
  const [dataInicioFilter, setDataInicioFilter] = useState(filtrosSalvos?.dataInicioFilter || '');
  const [dataFimFilter, setDataFimFilter] = useState(filtrosSalvos?.dataFimFilter || '');

  // Salvar filtros quando mudarem
  useEffect(() => {
    salvarFiltros({
      statusFilter,
      statusPagamentoFilter,
      vendedorFilter,
      clienteFilter,
      buscaInput,
      buscaFilter,
      dataInicioFilter,
      dataFimFilter,
    });
  }, [statusFilter, statusPagamentoFilter, vendedorFilter, clienteFilter, buscaInput, buscaFilter, dataInicioFilter, dataFimFilter]);

  // Limpar filtros ao sair da página (exceto para páginas de pedido)
  useEffect(() => {
    return () => {
      // Verificar se está navegando para uma página de pedido
      const nextPath = window.location.pathname;
      const isPedidoPage = nextPath.includes('/pedidos/');
      if (!isPedidoPage) {
        sessionStorage.removeItem(FILTROS_STORAGE_KEY);
      }
    };
  }, []);

  // Debounce para a busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaFilter(buscaInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [buscaInput]);

  // Buscar vendedores ativos (query simplificada)
  const { data: vendedores } = useQuery({
    queryKey: ['vendedores-lista'],
    queryFn: async () => {
      // Buscar todos os vendedores que têm pedidos OU que estão em perfis de vendedor/admin
      const { data: vendedoresComPedidos, error: errPedidos } = await supabase
        .from('pedidos')
        .select('vendedor_id, vendedor:profiles(id, nome)')
        .not('vendedor_id', 'is', null);
      
      if (errPedidos) throw errPedidos;

      // Extrair vendedores únicos
      const vendedoresMap = new Map<string, { id: string; nome: string }>();
      vendedoresComPedidos?.forEach((p: any) => {
        if (p.vendedor && !vendedoresMap.has(p.vendedor.id)) {
          vendedoresMap.set(p.vendedor.id, p.vendedor);
        }
      });

      // Também buscar perfis ativos
      const { data: perfisAtivos } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');

      perfisAtivos?.forEach((p: any) => {
        if (!vendedoresMap.has(p.id)) {
          vendedoresMap.set(p.id, p);
        }
      });

      return Array.from(vendedoresMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    },
  });

  // Buscar clientes
  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_razao_social')
        .order('nome_razao_social');
      if (error) throw error;
      return data;
    },
  });

  // Buscar pagamentos para calcular valor pendente e verificar boletos rejeitados
  const { data: pagamentosData } = useQuery({
    queryKey: ['pagamentos-todos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pagamentos')
        .select('pedido_id, valor, status, estornado, forma_pagamento, motivo_rejeicao, data_vencimento_boleto');
      if (error) throw error;
      return data;
    },
  });

  const calcularValorPendente = (pedidoId: string, valorTotal: number) => {
    const pagamentosPedido = pagamentosData?.filter(
      (p) => p.pedido_id === pedidoId && p.status === 'aprovado' && !p.estornado
    ) || [];
    const valorPago = pagamentosPedido.reduce((sum, p) => sum + Number(p.valor), 0);
    return valorTotal - valorPago;
  };

  // Verificar se pedido tem boleto rejeitado (em atraso)
  // Não mostrar alerta se o pedido já está quitado
  const temBoletoRejeitado = (pedidoId: string, statusPagamento: string) => {
    // Pedido quitado = sem alerta de atraso
    if (statusPagamento === 'quitado') return false;
    
    return pagamentosData?.some(
      (p) => p.pedido_id === pedidoId && 
             p.forma_pagamento === 'boleto' && 
             p.status === 'rejeitado' &&
             !p.estornado
    ) || false;
  };

  const filtros = {
    ...(statusFilter.length > 0 && { status: statusFilter }),
    ...(statusPagamentoFilter.length > 0 && { statusPagamento: statusPagamentoFilter }),
    ...(vendedorFilter !== 'todos' && { vendedorId: vendedorFilter }),
    ...(clienteFilter !== 'todos' && { clienteId: clienteFilter }),
    ...(buscaFilter && { busca: buscaFilter }),
    ...(dataInicioFilter && { dataInicio: dataInicioFilter }),
    ...(dataFimFilter && { dataFim: dataFimFilter }),
  };

  const { data: pedidos, isLoading } = usePedidos(Object.keys(filtros).length > 0 ? filtros : undefined);

  // Verificar permissões de edição para cada pedido
  const { data: permissoesEdicao } = useQuery({
    queryKey: ['permissoes-edicao', pedidos?.map(p => p.id), user?.id],
    queryFn: async () => {
      if (!pedidos || !user) return {};
      
      const permissoes: Record<string, boolean> = {};
      
      // Verificar se o usuário é admin
      const { data: isAdminUser } = await supabase.rpc('is_admin' as any, {
        user_id: user.id
      });
      
      for (const pedido of pedidos) {
        // Tentar a RPC principal
        const { data, error } = await supabase.rpc('pode_editar_pedido' as any, {
          p_pedido_id: pedido.id,
          p_usuario_id: user.id
        });
        
        if (error) {
          // Fallback robusto para QUALQUER erro na RPC
          console.warn('RPC pode_editar_pedido falhou, aplicando fallback:', error);
          
          // 1) Admin sempre pode editar
          if (isAdminUser) {
            permissoes[pedido.id] = true;
          } else {
            // 2) Verificar se tem pagamento aprovado
            try {
              const { data: pagamentosAprovados, error: pagError } = await supabase
                .from('pagamentos')
                .select('id')
                .eq('pedido_id', pedido.id)
                .eq('status', 'aprovado')
                .eq('estornado', false)
                .limit(1);
              
              if (pagError) {
                console.error('Erro ao verificar pagamentos:', pagError);
                permissoes[pedido.id] = false; // Por segurança
              } else {
                // Pode editar se NÃO tiver pagamento aprovado
                permissoes[pedido.id] = !pagamentosAprovados || pagamentosAprovados.length === 0;
              }
            } catch (e) {
              console.error('Erro no fallback de pagamentos:', e);
              permissoes[pedido.id] = false;
            }
          }
        } else {
          permissoes[pedido.id] = data || false;
        }
      }
      return permissoes;
    },
    enabled: !!pedidos && !!user,
  });

  const handleDelete = async (id: string) => {
    await deletePedido.mutateAsync(id);
  };

  const limparFiltros = () => {
    setStatusFilter([]);
    setStatusPagamentoFilter([]);
    setVendedorFilter('todos');
    setClienteFilter('todos');
    setBuscaInput('');
    setBuscaFilter('');
    setDataInicioFilter('');
    setDataFimFilter('');
  };

  const handleToggleStatusPagamento = (status: string) => {
    setStatusPagamentoFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleToggleStatusPedido = (status: StatusPedido) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const temFiltrosAtivos = statusFilter.length > 0 || statusPagamentoFilter.length > 0 || 
    vendedorFilter !== 'todos' || clienteFilter !== 'todos' || buscaFilter || dataInicioFilter || dataFimFilter;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestão de Pedidos</h1>
        {podeCriar && (
          <Button onClick={() => navigate('/pedidos/novo')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Pedido
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Pedidos</CardTitle>
            {temFiltrosAtivos && (
              <Button variant="ghost" size="sm" onClick={limparFiltros} className="text-muted-foreground">
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Busca sempre visível */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Buscar por Nº Pedido, Nome do Cliente ou Telefone..."
                value={buscaInput}
                onChange={(e) => setBuscaInput(e.target.value)}
                className="w-full"
              />
            </div>
            <Collapsible open={mostrarFiltrosAvancados} onOpenChange={setMostrarFiltrosAvancados}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="default" className="gap-2 whitespace-nowrap">
                  <Filter className="h-4 w-4" />
                  Filtros Avançados
                  {mostrarFiltrosAvancados ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>

          {/* Filtros avançados em collapsible */}
          <Collapsible open={mostrarFiltrosAvancados} onOpenChange={setMostrarFiltrosAvancados}>
            <CollapsibleContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg border">
                {/* Período */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Inicial</label>
                  <Input
                    type="date"
                    value={dataInicioFilter}
                    onChange={(e) => setDataInicioFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data Final</label>
                  <Input
                    type="date"
                    value={dataFimFilter}
                    onChange={(e) => setDataFimFilter(e.target.value)}
                  />
                </div>

                {/* Cliente */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cliente</label>
                  <Select value={clienteFilter} onValueChange={setClienteFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {clientes?.map((cliente) => (
                        <SelectItem key={cliente.id} value={cliente.id}>
                          {cliente.nome_razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vendedor */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendedor</label>
                  <Select value={vendedorFilter} onValueChange={setVendedorFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {vendedores?.map((vendedor) => (
                        <SelectItem key={vendedor.id} value={vendedor.id}>
                          {vendedor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status do Pedido */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status do Pedido</label>
                  <div className="flex flex-wrap gap-2">
                    {(['rascunho', 'em_producao', 'pronto', 'entregue', 'cancelado'] as StatusPedido[]).map((status) => (
                      <label key={status} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={statusFilter.includes(status)}
                          onCheckedChange={() => handleToggleStatusPedido(status)}
                        />
                        <span className="text-sm">{statusLabels[status]}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Status de Pagamento */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status Pagamento</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'aguardando', label: 'Aguardando' },
                      { value: 'parcial', label: 'Parcial' },
                      { value: 'quitado', label: 'Quitado' },
                    ].map((status) => (
                      <label key={status.value} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={statusPagamentoFilter.includes(status.value)}
                          onCheckedChange={() => handleToggleStatusPagamento(status.value)}
                        />
                        <span className="text-sm">{status.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Foto</TableHead>
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Valor Pendente</TableHead>
                <TableHead>Status Pagamento</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos?.map((pedido: any) => {
                const valorPendente = calcularValorPendente(pedido.id, Number(pedido.valor_total));
                // Priorizar imagem aprovada, senão pegar primeira foto disponível dos itens
                const primeiraFoto = (pedido.imagem_aprovada && pedido.imagem_aprovacao_url) 
                  ? pedido.imagem_aprovacao_url 
                  : pedido.itens?.find((item: any) => item.foto_modelo_url)?.foto_modelo_url;
                
                return (
                  <TableRow key={pedido.id}>
                    <TableCell>
                      {primeiraFoto ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <img 
                                src={primeiraFoto} 
                                alt="Produto" 
                                className="w-10 h-10 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(primeiraFoto, '_blank')}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <img src={primeiraFoto} alt="Preview" className="max-w-[200px] max-h-[200px] object-contain rounded" />
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded border flex items-center justify-center">
                          <Image className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">#{pedido.numero_pedido}</TableCell>
                    <TableCell>
                      {format(parseDateString(pedido.data_pedido) || new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{pedido.cliente?.nome_razao_social}</TableCell>
                    <TableCell>{formatCurrency(Number(pedido.valor_total))}</TableCell>
                    <TableCell>
                      <span className={valorPendente > 0 ? 'text-orange-600 font-semibold' : 'text-green-600'}>
                        {formatCurrency(valorPendente)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={pedido.status_pagamento === 'quitado' ? 'default' : 'secondary'}>
                          {pedido.status_pagamento === 'aguardando' && 'Aguardando'}
                          {pedido.status_pagamento === 'parcial' && 'Parcial'}
                          {pedido.status_pagamento === 'quitado' && 'Quitado'}
                        </Badge>
                        {temBoletoRejeitado(pedido.id, pedido.status_pagamento) && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="destructive" className="animate-pulse">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Pagamento em Atraso
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Boleto foi rejeitado por falta de pagamento</p>
                                <p className="text-xs">Regularize o pagamento</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {pedido.requer_aprovacao_preco && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="border-warning text-warning">
                                  ⚠️ Aguardando Aprovação
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Pedido com preços abaixo do mínimo - aguardando aprovação administrativa</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {pedido.etapa_producao ? (
                        <Badge 
                          variant="outline" 
                          style={{ 
                            borderColor: pedido.etapa_producao.cor_hex,
                            color: pedido.etapa_producao.cor_hex 
                          }}
                        >
                          {pedido.etapa_producao.nome_etapa}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[pedido.status as StatusPedido]}>
                        {statusLabels[pedido.status as StatusPedido]}
                      </Badge>
                    </TableCell>
                    <TableCell>{pedido.vendedor?.nome}</TableCell>
                    <TableCell className="text-right">
                      <TooltipProvider>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/pedidos/${pedido.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/pedidos/editar/${pedido.id}`)}
                                  disabled={!podeEditar || (isAdmin ? false : permissoesEdicao?.[pedido.id] === false)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {(!podeEditar || permissoesEdicao?.[pedido.id] === false) && (
                              <TooltipContent>
                                {!podeEditar ? (
                                  <p className="text-xs">Você não tem permissão para editar pedidos</p>
                                ) : (
                                  <>
                                    <p className="text-xs">Pedidos com pagamento não podem ser editados</p>
                                    <p className="text-xs">(exceto por administradores)</p>
                                  </>
                                )}
                              </TooltipContent>
                            )}
                          </Tooltip>

                          {/* Botão Duplicar */}
                          {podeEditar && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => navigate(`/pedidos/novo?duplicarDe=${pedido.id}`)}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Duplicar pedido</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(pedido.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TooltipProvider>
                  </TableCell>
                  </TableRow>
                );
              })}
              {!pedidos?.length && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
