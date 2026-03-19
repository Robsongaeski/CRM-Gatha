import { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { useMovimentoEtapa } from './useMovimentoEtapa';
import { toast } from 'sonner';

interface PedidoKanban {
  id: string;
  etapa_producao_id: string | null;
}

interface EtapaProducao {
  id: string;
  nome_etapa: string;
}

export function useKanbanDragDrop(pedidos: PedidoKanban[], etapas: EtapaProducao[]) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const { moverPedido, isMoving } = useMovimentoEtapa();

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const pedidoId = active.id as string;
    
    // Buscar a etapa de destino
    // over.id pode ser o ID de uma coluna (etapa) ou de um card (pedido)
    let novaEtapaId = over.id as string;
    
    // Se o ID não for uma etapa válida, buscar pelo data-column-id do elemento
    const isEtapaValida = etapas.some(e => e.id === novaEtapaId);
    if (!isEtapaValida) {
      // Procurar o pedido que está sendo usado como over e pegar sua etapa
      const pedidoOver = pedidos.find(p => p.id === novaEtapaId);
      if (pedidoOver?.etapa_producao_id) {
        novaEtapaId = pedidoOver.etapa_producao_id;
      } else {
        // Tentar obter do DOM usando data-column-id
        const element = document.querySelector(`[data-pedido-id="${novaEtapaId}"]`);
        const columnId = element?.closest('[data-column-id]')?.getAttribute('data-column-id');
        if (columnId) {
          novaEtapaId = columnId;
        } else {
          toast.error('Não foi possível identificar a etapa de destino');
          return;
        }
      }
    }

    // Encontrar o pedido que está sendo movido
    const pedido = pedidos.find((p) => p.id === pedidoId);
    if (!pedido) return;

    // Se moveu para a mesma etapa, não faz nada
    if (pedido.etapa_producao_id === novaEtapaId) return;

    try {
      await moverPedido({
        pedidoId,
        etapaNovaId: novaEtapaId,
        etapaAnteriorId: pedido.etapa_producao_id,
      });
    } catch (error) {
      console.error('Erro ao mover pedido:', error);
      toast.error('Erro ao mover pedido');
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  return {
    activeId,
    overId,
    isMoving,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
