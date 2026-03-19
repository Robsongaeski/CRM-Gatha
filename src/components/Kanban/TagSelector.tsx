import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePedidoTags } from '@/hooks/pcp/usePedidoTags';

interface TagSelectorProps {
  pedidoId: string;
}

const CORES_SUGERIDAS = [
  { nome: 'Vermelho', cor: '#ef4444' },
  { nome: 'Laranja', cor: '#f97316' },
  { nome: 'Amarelo', cor: '#eab308' },
  { nome: 'Verde', cor: '#22c55e' },
  { nome: 'Azul', cor: '#3b82f6' },
  { nome: 'Roxo', cor: '#a855f7' },
  { nome: 'Rosa', cor: '#ec4899' },
  { nome: 'Cinza', cor: '#6b7280' },
];

export function TagSelector({ pedidoId }: TagSelectorProps) {
  const { tags, addTag, removeTag, isAdding, isRemoving } = usePedidoTags(pedidoId);
  const [isOpen, setIsOpen] = useState(false);
  const [novaTag, setNovaTag] = useState('');
  const [corSelecionada, setCorSelecionada] = useState(CORES_SUGERIDAS[4].cor);

  const handleAddTag = async () => {
    if (!novaTag.trim()) return;

    await addTag({ pedidoId, nome: novaTag.trim(), cor: corSelecionada });
    setNovaTag('');
    setCorSelecionada(CORES_SUGERIDAS[4].cor);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant="outline"
            className="gap-1 px-2 py-1"
            style={{ borderColor: tag.cor, color: tag.cor }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: tag.cor }}
            />
            {tag.nome}
            <button
              onClick={() => removeTag(tag.id)}
              disabled={isRemoving}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 gap-1">
              <Plus className="h-3 w-3" />
              Adicionar tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="start">
            <div className="space-y-3">
              <div>
                <Input
                  placeholder="Nome da tag"
                  value={novaTag}
                  onChange={(e) => setNovaTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  maxLength={50}
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Cor</p>
                <div className="grid grid-cols-4 gap-2">
                  {CORES_SUGERIDAS.map((cor) => (
                    <button
                      key={cor.cor}
                      onClick={() => setCorSelecionada(cor.cor)}
                      className="relative w-full aspect-square rounded-md transition-transform hover:scale-110"
                      style={{ backgroundColor: cor.cor }}
                      title={cor.nome}
                    >
                      {corSelecionada === cor.cor && (
                        <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleAddTag}
                disabled={!novaTag.trim() || isAdding}
                className="w-full"
              >
                Adicionar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
