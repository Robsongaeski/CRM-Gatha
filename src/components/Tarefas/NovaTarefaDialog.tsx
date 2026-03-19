import { useState } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useCreateTarefa, TarefaTipoConteudo, TarefaPrioridade } from '@/hooks/useTarefas';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface NovaTarefaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NovaTarefaDialog({ open, onOpenChange, onSuccess }: NovaTarefaDialogProps) {
  const { user } = useAuth();
  const { data: usuarios = [] } = useUsuarios();
  const createTarefa = useCreateTarefa();
  
  const [titulo, setTitulo] = useState('');
  const [tipoConteudo, setTipoConteudo] = useState<TarefaTipoConteudo>('texto');
  const [descricao, setDescricao] = useState('');
  const [checklistItens, setChecklistItens] = useState<string[]>(['']);
  const [executorId, setExecutorId] = useState(user?.id || '');
  const [prioridade, setPrioridade] = useState<TarefaPrioridade>('media');
  const [dataLimite, setDataLimite] = useState<Date>();

  const handleAddChecklistItem = () => {
    setChecklistItens([...checklistItens, '']);
  };

  const handleRemoveChecklistItem = (index: number) => {
    setChecklistItens(checklistItens.filter((_, i) => i !== index));
  };

  const handleChecklistItemChange = (index: number, value: string) => {
    const newItens = [...checklistItens];
    newItens[index] = value;
    setChecklistItens(newItens);
  };

  const handleSubmit = async () => {
    if (!titulo.trim() || !dataLimite || !executorId) return;

    const itensValidos = checklistItens.filter(i => i.trim());
    if (tipoConteudo === 'checklist' && itensValidos.length === 0) return;

    await createTarefa.mutateAsync({
      titulo: titulo.trim(),
      tipo_conteudo: tipoConteudo,
      descricao: tipoConteudo === 'texto' ? descricao.trim() : undefined,
      prioridade,
      data_limite: format(dataLimite, 'yyyy-MM-dd'),
      executor_id: executorId,
      checklist_itens: tipoConteudo === 'checklist' ? itensValidos : undefined,
    });

    // Reset form
    setTitulo('');
    setTipoConteudo('texto');
    setDescricao('');
    setChecklistItens(['']);
    setExecutorId(user?.id || '');
    setPrioridade('media');
    setDataLimite(undefined);

    onSuccess?.();
  };

  const isValid = titulo.trim() && dataLimite && executorId && 
    (tipoConteudo === 'texto' || checklistItens.some(i => i.trim()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              placeholder="Resumo da tarefa"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          {/* Tipo de Conteúdo */}
          <div className="space-y-2">
            <Label>Tipo de Conteúdo</Label>
            <RadioGroup
              value={tipoConteudo}
              onValueChange={(value) => setTipoConteudo(value as TarefaTipoConteudo)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="texto" id="tipo-texto" />
                <Label htmlFor="tipo-texto" className="cursor-pointer">Texto Livre</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="checklist" id="tipo-checklist" />
                <Label htmlFor="tipo-checklist" className="cursor-pointer">Checklist</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Conteúdo */}
          {tipoConteudo === 'texto' ? (
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o que precisa ser feito..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Itens do Checklist *</Label>
              <div className="space-y-2">
                {checklistItens.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Item ${index + 1}`}
                      value={item}
                      onChange={(e) => handleChecklistItemChange(index, e.target.value)}
                    />
                    {checklistItens.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveChecklistItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddChecklistItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </div>
          )}

          {/* Atribuir para */}
          <div className="space-y-2">
            <Label>Atribuir para *</Label>
            <Select value={executorId} onValueChange={setExecutorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o executor" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome} {u.id === user?.id ? '(eu)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prioridade */}
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={prioridade} onValueChange={(v) => setPrioridade(v as TarefaPrioridade)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Baixa
                  </div>
                </SelectItem>
                <SelectItem value="media">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    Média
                  </div>
                </SelectItem>
                <SelectItem value="alta">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    Alta
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Data Limite */}
          <div className="space-y-2">
            <Label>Data Limite *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataLimite && "text-muted-foreground"
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dataLimite ? format(dataLimite, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={dataLimite}
                  onSelect={setDataLimite}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || createTarefa.isPending}
          >
            {createTarefa.isPending ? 'Criando...' : 'Criar Tarefa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
