import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface PropostaTagSelectorProps {
  propostaId: string;
}

const CORES_PADRAO = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#6366f1', // indigo
];

export function PropostaTagSelector({ propostaId }: PropostaTagSelectorProps) {
  const queryClient = useQueryClient();
  const [novaTagNome, setNovaTagNome] = useState('');
  const [novaTagCor, setNovaTagCor] = useState(CORES_PADRAO[0]);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { data: tags = [] } = useQuery({
    queryKey: ['proposta-tags', propostaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('proposta_tags')
        .select('*')
        .eq('proposta_id', propostaId)
        .order('created_at');

      if (error) throw error;
      return data;
    },
  });

  const addTagMutation = useMutation({
    mutationFn: async ({ nome, cor }: { nome: string; cor: string }) => {
      const { error } = await supabase
        .from('proposta_tags')
        .insert({ proposta_id: propostaId, nome, cor });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposta-tags', propostaId] });
      queryClient.invalidateQueries({ queryKey: ['propostas-kanban'] });
      setNovaTagNome('');
      setPopoverOpen(false);
      toast.success('Tag adicionada');
    },
    onError: () => {
      toast.error('Erro ao adicionar tag');
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('proposta_tags')
        .delete()
        .eq('id', tagId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposta-tags', propostaId] });
      queryClient.invalidateQueries({ queryKey: ['propostas-kanban'] });
      toast.success('Tag removida');
    },
    onError: () => {
      toast.error('Erro ao remover tag');
    },
  });

  const handleAddTag = () => {
    if (!novaTagNome.trim()) return;
    addTagMutation.mutate({ nome: novaTagNome.trim(), cor: novaTagCor });
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag) => (
        <Badge 
          key={tag.id} 
          style={{ backgroundColor: tag.cor }}
          className="text-white flex items-center gap-1"
        >
          {tag.nome}
          <button 
            onClick={() => removeTagMutation.mutate(tag.id)}
            className="ml-1 hover:bg-white/20 rounded-full p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-6 px-2">
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-3">
            <Input
              placeholder="Nome da tag"
              value={novaTagNome}
              onChange={(e) => setNovaTagNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
            />
            <div className="flex flex-wrap gap-2">
              {CORES_PADRAO.map((cor) => (
                <button
                  key={cor}
                  className={`w-6 h-6 rounded-full border-2 ${novaTagCor === cor ? 'border-foreground' : 'border-transparent'}`}
                  style={{ backgroundColor: cor }}
                  onClick={() => setNovaTagCor(cor)}
                />
              ))}
            </div>
            <Button 
              size="sm" 
              onClick={handleAddTag}
              disabled={!novaTagNome.trim() || addTagMutation.isPending}
              className="w-full"
            >
              Adicionar Tag
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
