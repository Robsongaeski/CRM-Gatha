import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tarefa, TarefaPrioridade, TarefaEditInput, useEditarTarefaComLog } from '@/hooks/useTarefas';
import { useUsuarios } from '@/hooks/useUsuarios';

interface EditarTarefaDialogProps {
  tarefa: Tarefa;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarTarefaDialog({ tarefa, open, onOpenChange }: EditarTarefaDialogProps) {
  const [titulo, setTitulo] = useState(tarefa.titulo);
  const [descricao, setDescricao] = useState(tarefa.descricao || '');
  const [prioridade, setPrioridade] = useState<TarefaPrioridade>(tarefa.prioridade);
  const [dataLimite, setDataLimite] = useState(tarefa.data_limite);
  const [executorId, setExecutorId] = useState(tarefa.executor_id);

  const { data: usuarios = [] } = useUsuarios();
  const editarTarefa = useEditarTarefaComLog();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setTitulo(tarefa.titulo);
      setDescricao(tarefa.descricao || '');
      setPrioridade(tarefa.prioridade);
      setDataLimite(tarefa.data_limite);
      setExecutorId(tarefa.executor_id);
    }
  }, [open, tarefa]);

  const handleSubmit = async () => {
    const alteracoes: TarefaEditInput = {};
    
    if (titulo !== tarefa.titulo) alteracoes.titulo = titulo;
    if (descricao !== (tarefa.descricao || '')) alteracoes.descricao = descricao;
    if (prioridade !== tarefa.prioridade) alteracoes.prioridade = prioridade;
    if (dataLimite !== tarefa.data_limite) alteracoes.data_limite = dataLimite;
    if (executorId !== tarefa.executor_id) alteracoes.executor_id = executorId;

    // Só faz a requisição se houve alterações
    if (Object.keys(alteracoes).length === 0) {
      onOpenChange(false);
      return;
    }

    await editarTarefa.mutateAsync({
      tarefaId: tarefa.id,
      tarefaOriginal: tarefa,
      alteracoes,
    });
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da tarefa"
            />
          </div>

          {tarefa.tipo_conteudo === 'texto' && (
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descrição da tarefa"
                rows={4}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select value={prioridade} onValueChange={(v) => setPrioridade(v as TarefaPrioridade)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_limite">Data Limite</Label>
              <Input
                id="data_limite"
                type="date"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="executor">Executor</Label>
            <Select value={executorId} onValueChange={setExecutorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o executor" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={editarTarefa.isPending || !titulo.trim()}
          >
            {editarTarefa.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
