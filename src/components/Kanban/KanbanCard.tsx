import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Package, DollarSign, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { parseDateString } from '@/lib/formatters';

interface KanbanCardProps {
  pedido: {
    id: string;
    numero_pedido: number;
    cliente: { nome_razao_social: string } | null;
    valor_total: number;
    data_entrega: string | null;
    observacao: string | null;
    imagem_aprovacao_url?: string | null;
    imagem_aprovada?: boolean | null;
    pedido_itens: {
      quantidade: number;
      foto_modelo_url?: string | null;
      tipo_estampa?: { id: string; nome_tipo_estampa: string } | null;
    }[];
    pedido_tags: { id: string; nome: string; cor: string }[];
  };
  onClick: () => void;
}

export function KanbanCard({ pedido, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pedido.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calcular quantidade total
  const quantidadeTotal = pedido.pedido_itens.reduce((acc, item) => acc + item.quantidade, 0);

  // Foto principal: prioriza imagem aprovada, depois foto do primeiro item
  const primeiraFoto = (pedido.imagem_aprovada && pedido.imagem_aprovacao_url)
    ? pedido.imagem_aprovacao_url
    : pedido.pedido_itens.find(item => item.foto_modelo_url)?.foto_modelo_url;

  // Tipos de estampa únicos
  const tiposEstampa = [...new Set(
    pedido.pedido_itens
      .map(item => item.tipo_estampa?.nome_tipo_estampa)
      .filter(Boolean)
  )];

  // Calcular urgência
  const diasParaEntrega = pedido.data_entrega
    ? differenceInDays(parseDateString(pedido.data_entrega) || new Date(), new Date())
    : null;

  const isUrgente = diasParaEntrega !== null && diasParaEntrega <= 3 && diasParaEntrega >= 0;
  const isAtrasado = diasParaEntrega !== null && diasParaEntrega < 0;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-kanban-card data-pedido-id={pedido.id} className="kanban-card">
      <Card
        className={cn(
          'cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow max-h-[160px] overflow-hidden',
          isDragging && 'opacity-50 shadow-lg',
          isAtrasado && 'border-l-4 border-l-destructive',
          isUrgente && !isAtrasado && 'border-l-4 border-l-orange-500'
        )}
        onClick={onClick}
      >
        <CardContent className="p-2 space-y-1">
          {/* Cabeçalho: Número + Foto + Tags */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-xs">#{pedido.numero_pedido}</span>
              {primeiraFoto && (
                <div className="w-6 h-6 rounded overflow-hidden border border-border flex-shrink-0">
                  <img src={primeiraFoto} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div className="flex gap-0.5">
              {pedido.pedido_tags.slice(0, 3).map((tag) => (
                <div
                  key={tag.id}
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: tag.cor }}
                  title={tag.nome}
                />
              ))}
            </div>
          </div>

          {/* Cliente */}
          <p className="text-xs font-medium text-foreground truncate">
            {pedido.cliente?.nome_razao_social || 'Cliente não informado'}
          </p>

          {/* Qtd + Valor + Entrega em uma linha */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Package className="h-2.5 w-2.5" />
              {quantidadeTotal}
            </span>
            <span className="flex items-center gap-0.5">
              <DollarSign className="h-2.5 w-2.5" />
              {pedido.valor_total.toFixed(0)}
            </span>
              {pedido.data_entrega && (
              <span className={cn(
                'flex items-center gap-0.5',
                isAtrasado && 'text-destructive font-semibold',
                isUrgente && !isAtrasado && 'text-orange-500 font-semibold'
              )}>
                <Calendar className="h-2.5 w-2.5" />
                {format(parseDateString(pedido.data_entrega) || new Date(), 'dd/MM', { locale: ptBR })}
              </span>
            )}
          </div>

          {/* Tipos de estampa */}
          {tiposEstampa.length > 0 && (
            <div className="flex flex-wrap gap-0.5">
              {tiposEstampa.slice(0, 2).map((tipo, idx) => (
                <Badge key={idx} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  {tipo}
                </Badge>
              ))}
            </div>
          )}

          {/* Observação */}
          {pedido.observacao && (
            <p className="text-[10px] text-muted-foreground italic line-clamp-1">
              {pedido.observacao}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
