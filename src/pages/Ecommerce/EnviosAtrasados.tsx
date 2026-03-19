import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  AlertTriangle, 
  Phone, 
  Eye,
  MoreHorizontal,
  HelpCircle,
  PackageX,
  ArrowUpDown,
  Clock,
  ExternalLink,
  CheckCircle,
  Loader2,
  Edit,
  Truck,
  Package,
  MessageSquare,
  Save,
  X
} from 'lucide-react';
import {
  useEnviosAtrasados,
  SituacaoFiltro,
  TipoAtrasoFiltro,
  TipoAtraso,
  TIPOS_ATRASO,
  EnvioAtrasado,
  getStatusSituacao,
  getTipoAtrasoBadge,
  getOrderStatusLabel,
  getOrderStatusColor,
  marcarPedidoConcluido,
  atualizarStatusPedido,
  atualizarTipoAtraso,
} from '@/hooks/useEnviosAtrasados';
import { Order } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CriarChamadoDialog } from '@/components/Envios/CriarChamadoDialog';
import { CriarExtravioDialog } from '@/components/Envios/CriarExtravioDialog';
import { EditarStatusDialog } from '@/components/Envios/EditarStatusDialog';
import { OrderDetailDialog } from '@/components/TrocasDevolucoes/OrderDetailDialog';
import { usePermissions } from '@/hooks/usePermissions';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type SortField = 'dias_atraso' | 'delivery_estimate' | 'order_number';
type SortOrder = 'asc' | 'desc';

function ObservacaoCell({ orderId, initialValue, onSaved }: { orderId: string; initialValue: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ observacao_atraso: value || null } as any)
        .eq('id', orderId);
      if (error) throw error;
      toast.success('Observação salva');
      onSaved();
      setOpen(false);
    } catch {
      toast.error('Erro ao salvar observação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setValue(initialValue); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 max-w-[180px] text-xs truncate gap-1">
          <MessageSquare className="h-3 w-3 shrink-0" />
          {initialValue ? (
            <span className="truncate">{initialValue}</span>
          ) : (
            <span className="text-muted-foreground">Adicionar</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <Textarea
            placeholder="Observação sobre este pedido..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-3 w-3 mr-1" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3 w-3 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function EnviosAtrasados() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [situacao, setSituacao] = useState<SituacaoFiltro>('sem_chamado');
  const [tipoAtraso, setTipoAtraso] = useState<TipoAtrasoFiltro>('todos');
  const [apenasDespachados, setApenasDespachados] = useState(true);
  const [apenasSemRastreio, setApenasSemRastreio] = useState(false);
  const [sortField, setSortField] = useState<SortField>('dias_atraso');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [marcandoConcluido, setMarcandoConcluido] = useState<string | null>(null);
  
  const [chamadoDialogOpen, setChamadoDialogOpen] = useState(false);
  const [extravioDialogOpen, setExtravioDialogOpen] = useState(false);
  const [editarStatusDialogOpen, setEditarStatusDialogOpen] = useState(false);
  const [detalhesDialogOpen, setDetalhesDialogOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<EnvioAtrasado | null>(null);

  const { data: pedidosAtrasados, isLoading } = useEnviosAtrasados({
    search: search || undefined,
    situacao,
    apenasDespachados,
    apenasSemRastreio,
    tipoAtraso,
  });

  const canCreateChamado = can('ecommerce.suporte.problemas');
  const canCreateExtravio = can('ecommerce.suporte.extravios');

  const handleMarcarConcluido = async (pedido: EnvioAtrasado) => {
    try {
      setMarcandoConcluido(pedido.id);
      await marcarPedidoConcluido(pedido.id);
      toast.success(`Pedido #${pedido.order_number} marcado como concluído`);
      queryClient.invalidateQueries({ queryKey: ['envios-atrasados'] });
    } catch (error) {
      console.error('Erro ao marcar como concluído:', error);
      toast.error('Erro ao marcar pedido como concluído');
    } finally {
      setMarcandoConcluido(null);
    }
  };

  // Ordenação local
  const sortedPedidos = [...(pedidosAtrasados || [])].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'dias_atraso':
        comparison = a.dias_atraso - b.dias_atraso;
        break;
      case 'delivery_estimate':
        comparison = new Date(a.delivery_estimate || 0).getTime() - new Date(b.delivery_estimate || 0).getTime();
        break;
      case 'order_number':
        comparison = a.order_number.localeCompare(b.order_number);
        break;
    }
    
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleAbrirChamado = (pedido: EnvioAtrasado) => {
    setSelectedPedido(pedido);
    setChamadoDialogOpen(true);
  };

  const handleRegistrarExtravio = (pedido: EnvioAtrasado) => {
    setSelectedPedido(pedido);
    setExtravioDialogOpen(true);
  };

  const handleEditarStatus = (pedido: EnvioAtrasado) => {
    setSelectedPedido(pedido);
    setEditarStatusDialogOpen(true);
  };

  const handleAbrirDetalhes = (pedido: EnvioAtrasado) => {
    setSelectedPedido(pedido);
    setDetalhesDialogOpen(true);
  };

  const handleConfirmEditarStatus = async (newStatusCode: number) => {
    if (!selectedPedido) return;
    
    try {
      await atualizarStatusPedido(selectedPedido.id, newStatusCode);
      toast.success(`Status do pedido #${selectedPedido.order_number} atualizado`);
      queryClient.invalidateQueries({ queryKey: ['envios-atrasados'] });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do pedido');
      throw error;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  // Estatísticas
  const stats = {
    total: pedidosAtrasados?.length || 0,
    semChamado: pedidosAtrasados?.filter(p => !p.problema && !p.extravio).length || 0,
    comChamado: pedidosAtrasados?.filter(p => p.problema).length || 0,
    comExtravio: pedidosAtrasados?.filter(p => p.extravio).length || 0,
    atrasoTransportadora: pedidosAtrasados?.filter(p => p.tipo_atraso === 'transportadora').length || 0,
    atrasoEnvio: pedidosAtrasados?.filter(p => p.tipo_atraso === 'envio').length || 0,
  };

  // Converter EnvioAtrasado para Order para o dialog de detalhes
  const selectedOrderForDialog: Order | null = selectedPedido ? {
    ...selectedPedido,
    items: selectedPedido.items || [],
  } : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            Pedidos Atrasados
          </h1>
          <p className="text-muted-foreground">
            Pedidos com atraso na transportadora ou sem envio após 5 dias
          </p>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardDescription>Total Atrasados</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription className="flex items-center gap-1">
              <Truck className="h-3 w-3" /> Atraso Transportadora
            </CardDescription>
            <CardTitle className="text-2xl text-orange-600">{stats.atrasoTransportadora}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription className="flex items-center gap-1">
              <Package className="h-3 w-3" /> Atraso de Envio
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.atrasoEnvio}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription>Sem Chamado</CardDescription>
            <CardTitle className="text-2xl text-muted-foreground">{stats.semChamado}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription>Com Chamado</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{stats.comChamado}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription>Com Extravio</CardDescription>
            <CardTitle className="text-2xl text-destructive">{stats.comExtravio}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por pedido, rastreio ou cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={situacao} onValueChange={(v) => setSituacao(v as SituacaoFiltro)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="sem_chamado">Sem chamado</SelectItem>
                  <SelectItem value="com_chamado">Com chamado</SelectItem>
                  <SelectItem value="com_extravio">Com extravio</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tipoAtraso} onValueChange={(v) => setTipoAtraso(v as TipoAtrasoFiltro)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Tipo de Atraso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tipos</SelectItem>
                  <SelectItem value="transportadora">Atraso Transportadora</SelectItem>
                  <SelectItem value="envio">Atraso de Envio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="apenasDespachados"
                  checked={apenasDespachados}
                  onCheckedChange={(checked) => {
                    setApenasDespachados(checked === true);
                    if (checked) setApenasSemRastreio(false);
                  }}
                />
                <Label htmlFor="apenasDespachados" className="cursor-pointer text-sm">
                  Apenas despachados (com código de rastreio)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="apenasSemRastreio"
                  checked={apenasSemRastreio}
                  onCheckedChange={(checked) => {
                    setApenasSemRastreio(checked === true);
                    if (checked) setApenasDespachados(false);
                  }}
                />
                <Label htmlFor="apenasSemRastreio" className="cursor-pointer text-sm">
                  Apenas sem código de rastreio
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sortedPedidos.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">Nenhum pedido atrasado encontrado</p>
              <p className="text-muted-foreground">
                {search || situacao !== 'todos' || apenasDespachados || apenasSemRastreio || tipoAtraso !== 'todos'
                  ? 'Tente ajustar os filtros'
                  : 'Todos os pedidos estão dentro do prazo!'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('order_number')}>
                      Pedido
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Data Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status Pedido</TableHead>
                  <TableHead>Tipo Atraso</TableHead>
                  <TableHead>Transportadora</TableHead>
                  <TableHead>Rastreio</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort('delivery_estimate')}>
                      Data Estimada
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" onClick={() => handleSort('dias_atraso')}>
                      Dias Atraso
                      <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPedidos.map((pedido) => {
                  const situacaoInfo = getStatusSituacao(pedido);
                  const tipoAtrasoInfo = getTipoAtrasoBadge(pedido.tipo_atraso);
                  const isMuitoAtrasado = pedido.dias_atraso >= 10;
                  
                  return (
                    <TableRow key={pedido.id} className={isMuitoAtrasado ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => handleAbrirDetalhes(pedido)}
                          className="text-primary hover:underline cursor-pointer"
                        >
                          #{pedido.order_number}
                        </button>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDateTime(pedido.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <button
                            onClick={() => handleAbrirDetalhes(pedido)}
                            className="font-medium text-primary hover:underline cursor-pointer text-left"
                          >
                            {pedido.customer_name}
                          </button>
                          {pedido.customer_phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {pedido.customer_phone}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getOrderStatusColor(pedido)}>
                          {getOrderStatusLabel(pedido)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={pedido.tipo_atraso}
                          onValueChange={async (value: string) => {
                            try {
                              await atualizarTipoAtraso(pedido.id, value as TipoAtraso);
                              toast.success(`Tipo de atraso atualizado`);
                              queryClient.invalidateQueries({ queryKey: ['envios-atrasados'] });
                            } catch (error) {
                              toast.error('Erro ao atualizar tipo de atraso');
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 w-auto min-w-[140px] text-xs border-0 p-0 focus:ring-0">
                            <Badge variant="outline" className={tipoAtrasoInfo.color}>
                              {tipoAtrasoInfo.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TIPOS_ATRASO).map(([key, val]) => (
                              <SelectItem key={key} value={key}>
                                <Badge variant="outline" className={val.color + ' text-xs'}>
                                  {val.label}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>{pedido.carrier || '-'}</TableCell>
                      <TableCell>
                        {pedido.tracking_code ? (
                          <a
                            href={`https://app.shippy.com.br/tracking/${pedido.tracking_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs bg-muted px-1 py-0.5 rounded font-mono text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {pedido.tracking_code}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(pedido.delivery_estimate)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className={`h-4 w-4 ${isMuitoAtrasado ? 'text-destructive' : 'text-yellow-600'}`} />
                          <span className={`font-bold ${isMuitoAtrasado ? 'text-destructive' : 'text-yellow-600'}`}>
                            {pedido.dias_atraso} dias
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={situacaoInfo.variant} className={situacaoInfo.color}>
                          {situacaoInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ObservacaoCell
                          orderId={pedido.id}
                          initialValue={(pedido as any).observacao_atraso || ''}
                          onSaved={() => queryClient.invalidateQueries({ queryKey: ['envios-atrasados'] })}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleAbrirDetalhes(pedido)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem 
                              onClick={() => handleMarcarConcluido(pedido)}
                              disabled={marcandoConcluido === pedido.id}
                            >
                              {marcandoConcluido === pedido.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              )}
                              Marcar como Concluído
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem onClick={() => handleEditarStatus(pedido)}>
                              <Edit className="mr-2 h-4 w-4 text-blue-600" />
                              Editar Status
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            {!pedido.problema && !pedido.extravio && canCreateChamado && (
                              <DropdownMenuItem onClick={() => handleAbrirChamado(pedido)}>
                                <HelpCircle className="mr-2 h-4 w-4" />
                                Abrir Chamado
                              </DropdownMenuItem>
                            )}
                            
                            {pedido.problema && (
                              <DropdownMenuItem asChild>
                                <Link 
                                  to={`/ecommerce/suporte/chamados/${pedido.problema.id}/editar`} 
                                  className="cursor-pointer"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver Chamado
                                </Link>
                              </DropdownMenuItem>
                            )}
                            
                            {!pedido.extravio && canCreateExtravio && (
                              <DropdownMenuItem 
                                onClick={() => handleRegistrarExtravio(pedido)}
                                className="text-destructive"
                              >
                                <PackageX className="mr-2 h-4 w-4" />
                                Registrar Extravio
                              </DropdownMenuItem>
                            )}
                            
                            {pedido.extravio && (
                              <DropdownMenuItem asChild>
                                <Link 
                                  to={`/ecommerce/suporte/extravios/${pedido.extravio.id}/editar`} 
                                  className="cursor-pointer text-destructive"
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Ver Extravio
                                </Link>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CriarChamadoDialog
        open={chamadoDialogOpen}
        onOpenChange={(open) => {
          setChamadoDialogOpen(open);
          if (!open) queryClient.invalidateQueries({ queryKey: ['envios-atrasados'] });
        }}
        pedido={selectedPedido}
      />

      <CriarExtravioDialog
        open={extravioDialogOpen}
        onOpenChange={(open) => {
          setExtravioDialogOpen(open);
          if (!open) queryClient.invalidateQueries({ queryKey: ['envios-atrasados'] });
        }}
        pedido={selectedPedido}
      />

      <EditarStatusDialog
        open={editarStatusDialogOpen}
        onOpenChange={setEditarStatusDialogOpen}
        orderNumber={selectedPedido?.order_number || ''}
        currentStatusCode={selectedPedido?.wbuy_status_code || null}
        onConfirm={handleConfirmEditarStatus}
      />

      <OrderDetailDialog
        order={selectedOrderForDialog}
        open={detalhesDialogOpen}
        onOpenChange={setDetalhesDialogOpen}
      />
    </div>
  );
}
