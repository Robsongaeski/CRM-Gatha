import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Calendar,
  Check,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareWarning,
  Package,
  Pencil,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { usePedido } from '@/hooks/usePedidos';
import { usePermissions } from '@/hooks/usePermissions';
import { useCanViewPedidoValues } from '@/hooks/useCanViewPedidoValues';
import { useEtapasProducao } from '@/hooks/pcp/useEtapasProducao';
import { useMovimentoEtapa } from '@/hooks/pcp/useMovimentoEtapa';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeError } from '@/lib/errorHandling';
import { extractDateOnly, formatCurrency } from '@/lib/formatters';

interface PedidoDetalheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: {
    id: string;
    numero_pedido: number;
    data_pedido: string;
    valor_total?: number | null;
    status: string;
    etapa_producao_id: string | null;
  } | null;
}

interface PedidoItemDetalhado {
  id?: string;
  quantidade?: number | null;
  valor_unitario?: number | null;
  valor_total?: number | null;
  observacoes?: string | null;
  produto?: {
    nome?: string | null;
  } | null;
}

interface PedidoDetalhado {
  id?: string;
  numero_pedido?: number;
  data_pedido?: string | null;
  data_entrega?: string | null;
  valor_total?: number | null;
  status?: string | null;
  etapa_producao_id?: string | null;
  observacao?: string | null;
  caminho_arquivos?: string | null;
  vendedor?: {
    nome?: string | null;
  } | null;
  itens?: PedidoItemDetalhado[];
}

const statusLabels: Record<string, string> = {
  rascunho: 'Rascunho',
  orcamento: 'Orcamento',
  confirmado: 'Confirmado',
  em_producao: 'Em Producao',
  pronto: 'Pronto',
  pronto_entrega: 'Pronto p/ Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-800',
  orcamento: 'bg-blue-100 text-blue-800',
  confirmado: 'bg-green-100 text-green-800',
  em_producao: 'bg-yellow-100 text-yellow-800',
  pronto: 'bg-purple-100 text-purple-800',
  pronto_entrega: 'bg-purple-100 text-purple-800',
  entregue: 'bg-gray-100 text-gray-800',
  cancelado: 'bg-red-100 text-red-800',
};

const normalizeText = (value: string | null | undefined): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseObservacaoArray = (raw: string | null | undefined) => {
  if (!raw) return [] as Array<{ data: string; texto: string }>;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [{ data: new Date().toISOString(), texto: String(raw) }];

    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        data: String((item as { data?: string }).data || new Date().toISOString()),
        texto: String((item as { texto?: string }).texto || ''),
      }))
      .filter((item) => item.texto.trim().length > 0);
  } catch {
    return raw.trim().length > 0 ? [{ data: new Date().toISOString(), texto: raw }] : [];
  }
};

const safeFormatDate = (value: string | null | undefined, withTime = false): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return format(date, withTime ? "dd/MM/yyyy 'as' HH:mm" : 'dd/MM/yyyy', { locale: ptBR });
};

export default function PedidoDetalheDialog({
  open,
  onOpenChange,
  pedido,
}: PedidoDetalheDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can, isAdmin } = usePermissions();
  const { canViewPedidoValues } = useCanViewPedidoValues();
  const { etapas } = useEtapasProducao();
  const { moverPedido, isMoving } = useMovimentoEtapa();
  const { data: pedidoCompleto, isLoading } = usePedido(pedido?.id);

  const [textoAlteracao, setTextoAlteracao] = useState('');
  const [salvandoAlteracao, setSalvandoAlteracao] = useState(false);
  const [aprovandoPedido, setAprovandoPedido] = useState(false);
  const [editingEntrega, setEditingEntrega] = useState(false);
  const [novaDataEntrega, setNovaDataEntrega] = useState('');
  const [salvandoEntrega, setSalvandoEntrega] = useState(false);

  const pedidoId = pedido?.id ?? null;
  const pedidoAtual: PedidoDetalhado =
    ((pedidoCompleto as PedidoDetalhado | null) ??
      (pedido as unknown as PedidoDetalhado | null) ??
      {}) as PedidoDetalhado;
  const etapaAtualId = (pedidoAtual?.etapa_producao_id as string | null) ?? null;
  const statusAtual = (pedidoAtual?.status as string) || '';
  const numeroPedido = pedidoAtual?.numero_pedido ?? pedido?.numero_pedido;
  const valorTotal = Number(pedidoAtual?.valor_total ?? pedido?.valor_total ?? 0);
  const observacoes = parseObservacaoArray(pedidoAtual?.observacao);
  const itens = Array.isArray(pedidoAtual?.itens) ? pedidoAtual.itens : [];
  const dataEntregaAtual = extractDateOnly(pedidoAtual?.data_entrega);
  const podeEditarEntrega =
    isAdmin ||
    can('pedidos.editar') ||
    can('pedidos.editar_todos') ||
    can('pcp.kanban.movimentar');

  const etapaAtual = useMemo(
    () => etapas.find((etapa) => etapa.id === etapaAtualId),
    [etapas, etapaAtualId]
  );

  const etapaAlteracao = useMemo(
    () => etapas.find((etapa) => normalizeText(etapa.nome_etapa).includes('alteracao')),
    [etapas]
  );

  const etapaPedidoAprovado = useMemo(
    () =>
      etapas.find((etapa) => {
        const nome = normalizeText(etapa.nome_etapa);
        return nome.includes('pedido') && nome.includes('aprovado');
      }),
    [etapas]
  );

  const etapaAtualNormalizada = normalizeText(etapaAtual?.nome_etapa);
  const etapaElegivelAprovacao =
    etapaAtualNormalizada.includes('aguardando') && etapaAtualNormalizada.includes('aprov');
  const etapaElegivelAlteracao = etapaAtualNormalizada.includes('alteracao');
  const podeAvaliarNoAtendimento = etapaElegivelAprovacao || etapaElegivelAlteracao;

  const quantidadeTotal = itens.reduce((acc: number, item) => {
    return acc + Number(item?.quantidade || 0);
  }, 0);

  useEffect(() => {
    if (!open) return;
    setNovaDataEntrega(dataEntregaAtual);
    setEditingEntrega(false);
  }, [open, dataEntregaAtual, pedidoId]);

  const appendObservacaoNoPedido = async (targetPedidoId: string, texto: string) => {
    const { data: pedidoDoBanco, error: pedidoError } = await supabase
      .from('pedidos')
      .select('id, observacao')
      .eq('id', targetPedidoId)
      .maybeSingle();

    if (pedidoError) throw pedidoError;
    if (!pedidoDoBanco) throw new Error('Sem permissao para atualizar este pedido.');

    const lista = parseObservacaoArray(pedidoDoBanco.observacao);
    lista.push({
      data: new Date().toISOString(),
      texto,
    });

    const { data: pedidoAtualizado, error: updateError } = await supabase
      .from('pedidos')
      .update({ observacao: JSON.stringify(lista) })
      .eq('id', targetPedidoId)
      .select('id')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!pedidoAtualizado) throw new Error('Sem permissao para atualizar este pedido.');
  };

  const handlePedidoAprovado = async () => {
    if (!pedidoId || !etapaAtualId || !etapaPedidoAprovado) return;
    if (etapaAtualId === etapaPedidoAprovado.id) {
      toast.info('Este pedido ja esta em "Pedido Aprovado".');
      return;
    }

    setAprovandoPedido(true);
    try {
      await moverPedido({
        pedidoId,
        etapaNovaId: etapaPedidoAprovado.id,
        etapaAnteriorId: etapaAtualId,
        observacao: 'Aprovado no atendimento',
      });

      queryClient.invalidateQueries({ queryKey: ['cliente-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });
      onOpenChange(false);
    } catch (error) {
      toast.error(sanitizeError(error));
    } finally {
      setAprovandoPedido(false);
    }
  };

  const handleSolicitarAlteracao = async () => {
    if (!pedidoId || !etapaAtualId || !etapaAlteracao) return;
    const motivo = textoAlteracao.trim();
    if (!motivo) {
      toast.error('Descreva a alteracao solicitada pelo cliente.');
      return;
    }

    setSalvandoAlteracao(true);
    try {
      await appendObservacaoNoPedido(pedidoId, motivo);

      if (etapaAtualId !== etapaAlteracao.id) {
        await moverPedido({
          pedidoId,
          etapaNovaId: etapaAlteracao.id,
          etapaAnteriorId: etapaAtualId,
          observacao: motivo,
        });
      } else {
        toast.success('Alteracao registrada no pedido.');
      }

      queryClient.invalidateQueries({ queryKey: ['cliente-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });
      setTextoAlteracao('');
      onOpenChange(false);
    } catch (error) {
      toast.error(sanitizeError(error));
    } finally {
      setSalvandoAlteracao(false);
    }
  };

  const handleSalvarDataEntrega = async () => {
    if (!pedidoId) return;
    if (!novaDataEntrega) {
      toast.error('Informe uma data de entrega válida.');
      return;
    }

    const dataAtual = extractDateOnly(pedidoAtual?.data_entrega);
    if (dataAtual === novaDataEntrega) {
      setEditingEntrega(false);
      return;
    }

    setSalvandoEntrega(true);
    try {
      const { data: updatedPedido, error } = await supabase
        .from('pedidos')
        .update({ data_entrega: `${novaDataEntrega}T12:00:00` })
        .eq('id', pedidoId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!updatedPedido) throw new Error('Sem permissao para atualizar este pedido.');

      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['pedido-historico', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['cliente-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-calendario'] });

      setEditingEntrega(false);
      toast.success('Data de entrega atualizada com registro no histórico.');
    } catch (error) {
      toast.error(sanitizeError(error));
    } finally {
      setSalvandoEntrega(false);
    }
  };

  if (!pedido) return null;

  const processandoAcao = isMoving || salvandoAlteracao || aprovandoPedido || salvandoEntrega;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Pedido #{numeroPedido}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            Carregando detalhes...
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Informacoes
                  </h4>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Status</span>
                      <Badge className={statusColors[statusAtual] || 'bg-gray-100 text-gray-800'}>
                        {statusLabels[statusAtual] || statusAtual || 'Sem status'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Etapa Kanban</span>
                      <span className="font-medium">{etapaAtual?.nome_etapa || 'Nao definida'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Vendedor</span>
                      <span>{pedidoAtual?.vendedor?.nome || '-'}</span>
                    </div>
                    {pedidoAtual?.caminho_arquivos && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted-foreground">Arquivos</span>
                        <span className="text-right break-all">{pedidoAtual.caminho_arquivos}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Datas
                  </h4>
                  <div className="text-sm space-y-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Pedido</span>
                      <span>{safeFormatDate(pedidoAtual?.data_pedido || pedido.data_pedido)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Entrega</span>
                      <div className="flex items-center gap-2">
                        <span>{safeFormatDate(pedidoAtual?.data_entrega)}</span>
                        {podeEditarEntrega && !editingEntrega && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setEditingEntrega(true)}
                            title="Editar data de entrega"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {podeEditarEntrega && editingEntrega && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Nova entrega</span>
                        <div className="flex items-center gap-2">
                          <Input
                            type="date"
                            className="h-8 w-[150px]"
                            value={novaDataEntrega}
                            onChange={(e) => setNovaDataEntrega(e.target.value)}
                          />
                          <Button
                            size="icon"
                            className="h-8 w-8"
                            onClick={handleSalvarDataEntrega}
                            disabled={!novaDataEntrega || salvandoEntrega}
                            title="Salvar nova data"
                          >
                            {salvandoEntrega ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => {
                              setNovaDataEntrega(dataEntregaAtual);
                              setEditingEntrega(false);
                            }}
                            disabled={salvandoEntrega}
                            title="Cancelar edição"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {canViewPedidoValues && (
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          Valor Total
                        </span>
                        <span className="font-semibold">{formatCurrency(valorTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Itens do Pedido ({quantidadeTotal} pecas)
                </h4>
                <div className="space-y-2">
                  {itens.length > 0 ? (
                    itens.map((item) => {
                      const quantidade = Number(item?.quantidade || 0);
                      const valorUnitario = Number(item?.valor_unitario || 0);
                      const valorItem = Number(item?.valor_total || quantidade * valorUnitario);
                      const nomeProduto = item?.produto?.nome || 'Item sem nome';

                      return (
                        <div key={item?.id || `${nomeProduto}-${quantidade}`} className="rounded-md bg-secondary/40 p-3">
                          <div className="font-medium text-sm">{nomeProduto}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {quantidade} un
                            {canViewPedidoValues && (
                              <> x {formatCurrency(valorUnitario)} = {formatCurrency(valorItem)}</>
                            )}
                          </div>
                          {item?.observacoes && (
                            <div className="text-xs text-muted-foreground mt-1 italic">{item.observacoes}</div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                      Nenhum item encontrado para este pedido.
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Observacoes do Pedido</h4>
                {observacoes.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {observacoes.map((obs, idx) => (
                      <div key={`${obs.data}-${idx}`} className="rounded-md border bg-muted/30 p-3">
                        <div className="text-sm whitespace-pre-line">{obs.texto}</div>
                        <div className="text-xs text-muted-foreground mt-1">{safeFormatDate(obs.data, true)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                    Sem observacoes registradas.
                  </div>
                )}
              </div>

              <Separator />

              {podeAvaliarNoAtendimento && etapaAlteracao && etapaPedidoAprovado && etapaAtualId ? (
                <div className="space-y-3 rounded-lg border p-3">
                  <h4 className="text-sm font-semibold">Aprovacao do Cliente</h4>
                  <Textarea
                    placeholder="Se houver ajuste, descreva aqui o que precisa alterar..."
                    value={textoAlteracao}
                    onChange={(e) => setTextoAlteracao(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={handleSolicitarAlteracao} disabled={processandoAcao}>
                      {salvandoAlteracao ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <MessageSquareWarning className="h-4 w-4 mr-2" />
                          Alteracao
                        </>
                      )}
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handlePedidoAprovado}
                      disabled={processandoAcao}
                    >
                      {aprovandoPedido ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Pedido Aprovado
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                  Aprovacao pelo atendimento fica disponivel quando o pedido esta nas colunas
                  "Aguardando Aprovacao" ou "Alteracao" do Kanban.
                </div>
              )}

              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  navigate(`/pedidos/${pedido.id}`);
                  onOpenChange(false);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Detalhes Completos
              </Button>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
