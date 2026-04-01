import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, ExternalLink, Loader2, MessageSquareWarning } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/formatters';
import { sanitizeError } from '@/lib/errorHandling';
import { useEtapasProducao } from '@/hooks/pcp/useEtapasProducao';
import { useMovimentoEtapa } from '@/hooks/pcp/useMovimentoEtapa';
import { supabase } from '@/integrations/supabase/client';

interface PedidoDetalheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: {
    id: string;
    numero_pedido: number;
    data_pedido: string;
    valor_total: number;
    status: string;
    etapa_producao_id: string | null;
  } | null;
}

const statusLabels: Record<string, string> = {
  orcamento: 'Orcamento',
  confirmado: 'Confirmado',
  em_producao: 'Em Producao',
  pronto_entrega: 'Pronto p/ Entrega',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  orcamento: 'bg-blue-100 text-blue-800',
  confirmado: 'bg-green-100 text-green-800',
  em_producao: 'bg-yellow-100 text-yellow-800',
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

export default function PedidoDetalheDialog({
  open,
  onOpenChange,
  pedido,
}: PedidoDetalheDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { etapas } = useEtapasProducao();
  const { moverPedido, isMoving } = useMovimentoEtapa();
  const [textoAlteracao, setTextoAlteracao] = useState('');
  const [salvandoAlteracao, setSalvandoAlteracao] = useState(false);
  const [aprovandoPedido, setAprovandoPedido] = useState(false);

  const etapaAtual = useMemo(
    () => etapas.find((etapa) => etapa.id === pedido?.etapa_producao_id),
    [etapas, pedido?.etapa_producao_id]
  );

  const etapaAlteracao = useMemo(
    () =>
      etapas.find((etapa) => normalizeText(etapa.nome_etapa).includes('alteracao')),
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

  const appendObservacaoNoPedido = async (pedidoId: string, texto: string) => {
    const { data: pedidoAtual, error: pedidoError } = await supabase
      .from('pedidos')
      .select('id, observacao')
      .eq('id', pedidoId)
      .maybeSingle();

    if (pedidoError) throw pedidoError;
    if (!pedidoAtual) throw new Error('Sem permissao para atualizar este pedido.');

    const observacoes = parseObservacaoArray(pedidoAtual.observacao);
    observacoes.push({
      data: new Date().toISOString(),
      texto,
    });

    const { data: pedidoAtualizado, error: updateError } = await supabase
      .from('pedidos')
      .update({ observacao: JSON.stringify(observacoes) })
      .eq('id', pedidoId)
      .select('id')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!pedidoAtualizado) throw new Error('Sem permissao para atualizar este pedido.');
  };

  const handlePedidoAprovado = async () => {
    if (!pedido || !pedido.etapa_producao_id || !etapaPedidoAprovado) return;
    if (pedido.etapa_producao_id === etapaPedidoAprovado.id) {
      toast.info('Este pedido ja esta em "Pedido Aprovado".');
      return;
    }

    setAprovandoPedido(true);
    try {
      await moverPedido({
        pedidoId: pedido.id,
        etapaNovaId: etapaPedidoAprovado.id,
        etapaAnteriorId: pedido.etapa_producao_id,
        observacao: 'Aprovado no atendimento',
      });

      queryClient.invalidateQueries({ queryKey: ['cliente-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] });
      onOpenChange(false);
    } catch (error) {
      toast.error(sanitizeError(error));
    } finally {
      setAprovandoPedido(false);
    }
  };

  const handleSolicitarAlteracao = async () => {
    if (!pedido || !pedido.etapa_producao_id || !etapaAlteracao) return;
    const motivo = textoAlteracao.trim();
    if (!motivo) {
      toast.error('Descreva a alteracao solicitada pelo cliente.');
      return;
    }

    setSalvandoAlteracao(true);
    try {
      await appendObservacaoNoPedido(pedido.id, motivo);

      if (pedido.etapa_producao_id !== etapaAlteracao.id) {
        await moverPedido({
          pedidoId: pedido.id,
          etapaNovaId: etapaAlteracao.id,
          etapaAnteriorId: pedido.etapa_producao_id,
          observacao: motivo,
        });
      } else {
        toast.success('Alteracao registrada no pedido.');
      }

      queryClient.invalidateQueries({ queryKey: ['cliente-pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido', pedido.id] });
      setTextoAlteracao('');
      onOpenChange(false);
    } catch (error) {
      toast.error(sanitizeError(error));
    } finally {
      setSalvandoAlteracao(false);
    }
  };

  if (!pedido) return null;

  const processandoAcao = isMoving || salvandoAlteracao || aprovandoPedido;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pedido #{pedido.numero_pedido}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Status</span>
            <Badge className={statusColors[pedido.status] || 'bg-gray-100'}>
              {statusLabels[pedido.status] || pedido.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Etapa Kanban</span>
            <span className="font-medium text-sm">{etapaAtual?.nome_etapa || 'Nao definida'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Data</span>
            <span className="font-medium">
              {format(new Date(pedido.data_pedido), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Valor Total</span>
            <span className="font-semibold text-lg">
              {formatCurrency(pedido.valor_total)}
            </span>
          </div>

          {podeAvaliarNoAtendimento && etapaAlteracao && etapaPedidoAprovado && pedido.etapa_producao_id ? (
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
                <Button
                  variant="outline"
                  onClick={handleSolicitarAlteracao}
                  disabled={processandoAcao}
                >
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
      </DialogContent>
    </Dialog>
  );
}
