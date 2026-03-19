import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, FolderOpen, Image, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PropostaCardKanbanProps {
  proposta: {
    id: string;
    cliente: { nome_razao_social: string } | null;
    vendedor: { nome: string } | null;
    valor_total: number;
    created_at: string;
    caminho_arquivos: string | null;
    descricao_criacao: string | null;
    imagem_aprovacao_url: string | null;
    imagem_referencia_url: string | null;
    proposta_tags: { id: string; nome: string; cor: string }[];
  };
  onClick: () => void;
}

export function PropostaCardKanban({ proposta, onClick }: PropostaCardKanbanProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `proposta-${proposta.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} data-kanban-card data-proposta-id={proposta.id} className="kanban-card">
      <Card
        className={cn(
          'cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow max-h-[180px] overflow-hidden',
          'border-l-4 border-l-amber-500 bg-amber-500/5',
          isDragging && 'opacity-50 shadow-lg'
        )}
        onClick={onClick}
      >
        <CardContent className="p-2 space-y-1">
          {/* Cabeçalho: Badge + Tags */}
          <div className="flex items-center justify-between gap-1">
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-amber-500/20 text-amber-700 border-amber-500/30">
              <FileText className="h-2.5 w-2.5 mr-0.5" />
              PROPOSTA
            </Badge>
            <div className="flex gap-0.5">
              {proposta.proposta_tags.slice(0, 3).map((tag) => (
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
            {proposta.cliente?.nome_razao_social || 'Cliente não informado'}
          </p>

          {/* Vendedor + Data */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5 truncate">
              <User className="h-2.5 w-2.5 flex-shrink-0" />
              {proposta.vendedor?.nome || 'Vendedor'}
            </span>
            <span className="flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {format(new Date(proposta.created_at), 'dd/MM', { locale: ptBR })}
            </span>
          </div>

          {/* Caminho arquivos */}
          {proposta.caminho_arquivos && (
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <FolderOpen className="h-2.5 w-2.5 flex-shrink-0" />
              <span className="truncate font-mono">{proposta.caminho_arquivos}</span>
            </div>
          )}

          {/* Preview imagem aprovação ou referência - menor */}
          {(proposta.imagem_aprovacao_url || proposta.imagem_referencia_url) && (
            <div className="w-full h-12 rounded overflow-hidden border border-border relative">
              <img 
                src={proposta.imagem_aprovacao_url || proposta.imagem_referencia_url || ''} 
                alt="" 
                className="w-full h-full object-cover" 
              />
              {!proposta.imagem_aprovacao_url && proposta.imagem_referencia_url && (
                <span className="absolute top-0 right-0 text-[8px] bg-muted/80 px-1 rounded-bl">
                  REF
                </span>
              )}
            </div>
          )}

          {/* Descrição */}
          {proposta.descricao_criacao && (
            <p className="text-[10px] text-muted-foreground italic line-clamp-1">
              {proposta.descricao_criacao}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
