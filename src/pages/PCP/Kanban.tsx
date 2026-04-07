import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { useDragScroll } from '@/hooks/useDragScroll';
import { usePedidosKanban, FiltrosKanban } from '@/hooks/pcp/usePedidosKanban';
import { usePropostasKanban } from '@/hooks/pcp/usePropostasKanban';
import { useMovimentoEtapa } from '@/hooks/pcp/useMovimentoEtapa';
import { useMovimentoEtapaProposta } from '@/hooks/pcp/useMovimentoEtapaProposta';
import { usePermissions } from '@/hooks/usePermissions';
import { KanbanCard } from '@/components/Kanban/KanbanCard';
import { KanbanColumn } from '@/components/Kanban/KanbanColumn';
import { KanbanFilters } from '@/components/Kanban/KanbanFilters';
import { PedidoDetalheKanban } from '@/components/Kanban/PedidoDetalheKanban';
import { PropostaCardKanban } from '@/components/Kanban/PropostaCardKanban';
import { PropostaDetalheKanban } from '@/components/Kanban/PropostaDetalheKanban';
import { GerenciarColunasDialog } from '@/components/Kanban/GerenciarColunasDialog';
import PedidoDetalheDialog from '@/components/WhatsApp/PedidoDetalheDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { printPedidoFichaById } from '@/lib/pedidoPrint';
import { sanitizeError } from '@/lib/errorHandling';

export default function Kanban() {
  const [filtros, setFiltros] = useState<FiltrosKanban>({});
  const [pedidoSelecionado, setPedidoSelecionado] = useState<string | null>(null);
  const [pedidoDetalheCompletoId, setPedidoDetalheCompletoId] = useState<string | null>(null);
  const [propostaSelecionada, setPropostaSelecionada] = useState<string | null>(null);
  const [gerenciarColunasOpen, setGerenciarColunasOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Verificar permissões do usuário
  const { can, isAdmin } = usePermissions();
  
  // Verificar se usuário pode ver colunas de aprovação de propostas
  const canViewApprovalColumns = isAdmin || can('pcp.kanban.aprovacao.visualizar');

  // Hook para drag-to-scroll horizontal
  const dragScrollRef = useDragScroll();

  // Hook para pedidos (etapas de produção)
  const { etapas, pedidos, pedidosPorEtapa, pedidosSemEtapa, isLoading: loadingPedidos } = usePedidosKanban(filtros);
  
  // Hook para propostas (etapas de aprovação) - só buscar se tiver permissão
  const { etapasAprovacao, propostas, propostasPorEtapa, isLoading: loadingPropostas } = usePropostasKanban({
    busca: filtros.busca,
    clienteId: filtros.clienteId,
  });

  const { moverPedido } = useMovimentoEtapa();
  const { moverProposta } = useMovimentoEtapaProposta();

  // Usar MouseSensor e TouchSensor em vez de PointerSensor
  // para evitar conflito com o scroll horizontal por arrastar
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10, // Aumentado para evitar conflito com scroll
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Encontrar item ativo (pedido ou proposta)
  const activePedido = activeId ? pedidos.find((p) => p.id === activeId) : null;
  const activeProposta = activeId?.startsWith('proposta-') 
    ? propostas.find((p) => `proposta-${p.id}` === activeId) 
    : null;
  const pedidoDetalheCompleto = pedidoDetalheCompletoId
    ? pedidos.find((p) => p.id === pedidoDetalheCompletoId) || null
    : null;

  const handlePrintPedido = async (pedidoId: string) => {
    try {
      await printPedidoFichaById(pedidoId);
    } catch (error) {
      toast.error(sanitizeError(error));
    }
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over ? (event.over.id as string) : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const isProposta = activeIdStr.startsWith('proposta-');
    const todasEtapas = [...etapasAprovacao, ...etapas];

    // Determinar etapa de destino
    let novaEtapaId = over.id as string;
    const isEtapaValida = todasEtapas.some(e => e.id === novaEtapaId);
    
    if (!isEtapaValida) {
      // Buscar pelo elemento DOM
      const element = document.querySelector(`[data-pedido-id="${novaEtapaId}"], [data-proposta-id="${novaEtapaId.replace('proposta-', '')}"]`);
      const columnId = element?.closest('[data-column-id]')?.getAttribute('data-column-id');
      if (columnId) {
        novaEtapaId = columnId;
      } else {
        toast.error('Não foi possível identificar a etapa de destino');
        return;
      }
    }

    if (isProposta) {
      const propostaId = activeIdStr.replace('proposta-', '');
      const proposta = propostas.find(p => p.id === propostaId);
      if (!proposta || proposta.etapa_aprovacao_id === novaEtapaId) return;

      // Verificar se está movendo para etapa de aprovação
      const etapaDestino = etapasAprovacao.find(e => e.id === novaEtapaId);
      if (!etapaDestino) {
        toast.error('Propostas só podem ser movidas entre etapas de aprovação');
        return;
      }

      try {
        await moverProposta({
          propostaId,
          etapaNovaId: novaEtapaId,
          etapaAnteriorId: proposta.etapa_aprovacao_id,
        });
      } catch (error) {
        console.error('Erro ao mover proposta:', error);
      }
    } else {
      const pedido = pedidos.find(p => p.id === activeIdStr);
      if (!pedido || pedido.etapa_producao_id === novaEtapaId) return;

      // Verificar se está movendo para etapa de produção
      const etapaDestino = etapas.find(e => e.id === novaEtapaId);
      if (!etapaDestino) {
        toast.error('Pedidos só podem ser movidos entre etapas de produção');
        return;
      }

      // Impedir que pedidos voltem para colunas de aprovação
      const etapaDestinoAprovacao = etapasAprovacao.find(e => e.id === novaEtapaId);
      if (etapaDestinoAprovacao) {
        toast.error('Pedidos não podem voltar para etapas de aprovação');
        return;
      }

      // Encontrar a etapa "Entrada" (primeira etapa de produção)
      const etapaEntrada = etapas.find(e => e.ordem === Math.min(...etapas.map(et => et.ordem)));
      const etapaAtual = etapas.find(e => e.id === pedido.etapa_producao_id);

      // Impedir voltar para antes da entrada se já está em produção
      if (etapaAtual && etapaEntrada && etapaDestino.ordem < etapaEntrada.ordem) {
        toast.error('Pedidos não podem voltar para antes da Entrada');
        return;
      }

      try {
        await moverPedido({
          pedidoId: activeIdStr,
          etapaNovaId: novaEtapaId,
          etapaAnteriorId: pedido.etapa_producao_id,
        });
      } catch (error) {
        console.error('Erro ao mover pedido:', error);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  const isLoading = loadingPedidos || loadingPropostas;

  if (isLoading) {
    return (
      <div className="w-full px-4 py-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[600px] flex-1 min-w-[280px]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Kanban de Produção</h1>
        <p className="text-muted-foreground">
          Gerencie propostas e pedidos arrastando entre as etapas
          <span className="ml-2 text-xs opacity-70">(Shift + Scroll para navegar)</span>
        </p>
      </div>

      <KanbanFilters
        filtros={filtros}
        onFiltrosChange={setFiltros}
        onGerenciarColunas={() => setGerenciarColunasOpen(true)}
      />

      {/* Container de scroll horizontal com drag-to-scroll */}
      <div 
        ref={dragScrollRef}
        className="w-full flex gap-4 overflow-x-auto pb-4 items-start min-h-[calc(100vh-220px)]"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {/* Colunas de Aprovação de Propostas - só mostrar se tiver permissão */}
          {canViewApprovalColumns && propostasPorEtapa.map(({ etapa, propostas: propostasEtapa }) => (
            <KanbanColumn
              key={etapa.id}
              etapa={etapa}
              pedidos={[]}
              isOver={overId === etapa.id}
              title={etapa.nome_etapa}
              badge={`${propostasEtapa.length}`}
              variant="approval"
            >
              {propostasEtapa.map((proposta) => (
                <PropostaCardKanban
                  key={proposta.id}
                  proposta={proposta as any}
                  onClick={() => setPropostaSelecionada(proposta.id)}
                />
              ))}
            </KanbanColumn>
          ))}

          {/* Separador visual - só mostrar se tiver colunas de aprovação visíveis */}
          {canViewApprovalColumns && propostasPorEtapa.length > 0 && (
            <div className="flex items-center px-2">
              <div className="h-full w-px bg-border" />
            </div>
          )}

          {/* Coluna de Pedidos Sem Etapa */}
          {pedidosSemEtapa.length > 0 && (
            <KanbanColumn
              etapa={{
                id: 'sem-etapa',
                nome_etapa: 'Sem Etapa',
                cor_hex: '#ef4444',
              }}
              pedidos={pedidosSemEtapa}
              isOver={overId === 'sem-etapa'}
            >
              {pedidosSemEtapa.map((pedido) => (
                <KanbanCard
                  key={pedido.id}
                  pedido={pedido}
                  onClick={() => setPedidoSelecionado(pedido.id)}
                  onPrint={() => {
                    void handlePrintPedido(pedido.id);
                  }}
                />
              ))}
            </KanbanColumn>
          )}

          {/* Colunas de Produção */}
          {pedidosPorEtapa.map(({ etapa, pedidos: pedidosEtapa }) => (
            <KanbanColumn
              key={etapa.id}
              etapa={etapa}
              pedidos={pedidosEtapa}
              isOver={overId === etapa.id}
            >
              {pedidosEtapa.map((pedido) => (
                <KanbanCard
                  key={pedido.id}
                  pedido={pedido}
                  onClick={() => setPedidoSelecionado(pedido.id)}
                  onPrint={() => {
                    void handlePrintPedido(pedido.id);
                  }}
                />
              ))}
            </KanbanColumn>
          ))}

          <DragOverlay>
            {activePedido ? (
              <div className="rotate-3 scale-105">
                <KanbanCard pedido={activePedido} onClick={() => {}} />
              </div>
            ) : activeProposta ? (
              <div className="rotate-3 scale-105">
                <PropostaCardKanban proposta={activeProposta as any} onClick={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <PedidoDetalheKanban
        pedidoId={pedidoSelecionado}
        onClose={() => setPedidoSelecionado(null)}
        onOpenPedidoDetalheCompleto={(pedidoId) => {
          setPedidoSelecionado(null);
          setPedidoDetalheCompletoId(pedidoId);
        }}
      />

      <PropostaDetalheKanban
        propostaId={propostaSelecionada}
        onClose={() => setPropostaSelecionada(null)}
      />

      <PedidoDetalheDialog
        open={!!pedidoDetalheCompletoId}
        onOpenChange={(open) => {
          if (!open) setPedidoDetalheCompletoId(null);
        }}
        pedido={
          pedidoDetalheCompleto
            ? {
                id: pedidoDetalheCompleto.id,
                numero_pedido: pedidoDetalheCompleto.numero_pedido,
                data_pedido: pedidoDetalheCompleto.data_pedido,
                valor_total: Number(pedidoDetalheCompleto.valor_total || 0),
                status: pedidoDetalheCompleto.status,
                etapa_producao_id: pedidoDetalheCompleto.etapa_producao_id,
              }
            : null
        }
      />

      <GerenciarColunasDialog
        open={gerenciarColunasOpen}
        onClose={() => setGerenciarColunasOpen(false)}
      />
    </div>
  );
}
