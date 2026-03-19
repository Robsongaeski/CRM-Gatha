import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Search } from 'lucide-react';
import { useWhatsappQuickReplies } from '@/hooks/whatsapp/useWhatsappQuickReplies';

interface QuickRepliesPopoverProps {
  onSelect: (content: string) => void;
}

export default function QuickRepliesPopover({ onSelect }: QuickRepliesPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: replies = [] } = useWhatsappQuickReplies();

  const filteredReplies = replies.filter(
    (r) =>
      r.titulo.toLowerCase().includes(search.toLowerCase()) ||
      r.atalho?.toLowerCase().includes(search.toLowerCase()) ||
      r.conteudo.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (content: string) => {
    onSelect(content);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title="Respostas rápidas">
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar resposta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-64">
          {filteredReplies.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {replies.length === 0 ? 'Nenhuma resposta cadastrada' : 'Nenhum resultado'}
            </div>
          ) : (
            <div className="p-1">
              {filteredReplies.map((reply) => (
                <button
                  key={reply.id}
                  onClick={() => handleSelect(reply.conteudo)}
                  className="w-full text-left p-2 rounded hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{reply.titulo}</span>
                    {reply.atalho && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        /{reply.atalho}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {reply.conteudo}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
