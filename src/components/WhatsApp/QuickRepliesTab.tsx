import { useState } from 'react';
import { 
  useAllWhatsappQuickReplies, 
  useCreateQuickReply, 
  useUpdateQuickReply, 
  useDeleteQuickReply,
  MESSAGE_VARIABLES
} from '@/hooks/whatsapp/useWhatsappQuickReplies';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Pencil, Trash2, X, Save, MessageSquare, Info, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ReplyForm {
  titulo: string;
  conteudo: string;
  atalho: string;
  ativo: boolean;
  mostrar_botao: boolean;
  ordem: number;
}

const emptyForm: ReplyForm = { titulo: '', conteudo: '', atalho: '', ativo: true, mostrar_botao: true, ordem: 0 };

// Componente sortable para cada item
interface SortableReplyItemProps {
  reply: any;
  onEdit: (reply: any) => void;
  onDelete: (id: string) => void;
}

function SortableReplyItem({ reply, onEdit, onDelete }: SortableReplyItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: reply.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start justify-between p-3 rounded-lg border bg-background ${!reply.ativo ? 'opacity-50 bg-muted/30' : ''}`}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted mt-0.5 touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground font-mono">#{reply.ordem}</span>
            <span className="font-medium">{reply.titulo}</span>
            {reply.atalho && (
              <Badge variant="secondary" className="text-xs">
                /{reply.atalho}
              </Badge>
            )}
            {reply.mostrar_botao && (
              <Badge variant="default" className="text-xs bg-green-600">
                Botão
              </Badge>
            )}
            {!reply.ativo && (
              <Badge variant="outline" className="text-xs">
                Inativo
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">
            {reply.conteudo}
          </p>
        </div>
      </div>
      <div className="flex gap-1 ml-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(reply)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => onDelete(reply.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function QuickRepliesTab() {
  const { data: replies = [], isLoading } = useAllWhatsappQuickReplies();
  const createReply = useCreateQuickReply();
  const updateReply = useUpdateQuickReply();
  const deleteReply = useDeleteQuickReply();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReplyForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [variablesOpen, setVariablesOpen] = useState(false);

  // Sensors para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handler para quando o drag termina
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = replies.findIndex(r => r.id === active.id);
    const newIndex = replies.findIndex(r => r.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Calcular novas ordens
    const reordered = arrayMove([...replies], oldIndex, newIndex);
    
    // Atualizar ordem de todos os itens afetados
    try {
      await Promise.all(
        reordered.map((reply, index) => 
          updateReply.mutateAsync({ id: reply.id, ordem: index })
        )
      );
      toast.success('Ordem atualizada');
    } catch (error) {
      toast.error('Erro ao reordenar');
    }
  };

  const handleEdit = (reply: any) => {
    setEditingId(reply.id);
    setForm({
      titulo: reply.titulo,
      conteudo: reply.conteudo,
      atalho: reply.atalho || '',
      ativo: reply.ativo,
      mostrar_botao: reply.mostrar_botao ?? true,
      ordem: reply.ordem ?? 0,
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast.error('Preencha o título e conteúdo');
      return;
    }

    try {
      if (editingId) {
        await updateReply.mutateAsync({
          id: editingId,
          titulo: form.titulo,
          conteudo: form.conteudo,
          atalho: form.atalho || null,
          ativo: form.ativo,
          mostrar_botao: form.mostrar_botao,
          ordem: form.ordem,
        });
      } else {
        await createReply.mutateAsync({ 
          titulo: form.titulo, 
          conteudo: form.conteudo, 
          atalho: form.atalho || null, 
          variaveis: [], 
          ordem: form.ordem || replies.length, 
          ativo: form.ativo,
          mostrar_botao: form.mostrar_botao,
        });
      }
      handleCancel();
    } catch (error: any) {
      // Toast já é exibido pelo hook
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteReply.mutateAsync(deleteId);
      setDeleteId(null);
    } catch (error: any) {
      // Toast já é exibido pelo hook
    }
  };

  const insertVariable = (key: string) => {
    setForm(prev => ({
      ...prev,
      conteudo: prev.conteudo + key
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Variables Info */}
      <Collapsible open={variablesOpen} onOpenChange={setVariablesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Variáveis Disponíveis</CardTitle>
                </div>
                <Badge variant="outline">{MESSAGE_VARIABLES.length} variáveis</Badge>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid gap-2 md:grid-cols-2">
                {MESSAGE_VARIABLES.map((v) => (
                  <div key={v.key} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {v.key}
                    </code>
                    <div className="text-sm">
                      <span className="font-medium">{v.label}</span>
                      <p className="text-muted-foreground text-xs">{v.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Editar Resposta' : 'Nova Resposta Rápida'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  placeholder="Ex: Saudação"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Atalho (opcional)</Label>
                <Input
                  placeholder="Ex: ola"
                  value={form.atalho}
                  onChange={(e) => setForm({ ...form, atalho: e.target.value.replace(/\s/g, '').toLowerCase() })}
                />
                <p className="text-xs text-muted-foreground">
                  Use digitando /{form.atalho || 'atalho'} no campo de mensagem
                </p>
              </div>
              <div className="space-y-2">
                <Label>Ordem de exibição</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.ordem}
                  onChange={(e) => setForm({ ...form, ordem: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Menor número = aparece primeiro
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo *</Label>
                <div className="flex flex-wrap gap-1">
                  {MESSAGE_VARIABLES.slice(0, 4).map((v) => (
                    <Button
                      key={v.key}
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => insertVariable(v.key)}
                    >
                      {v.key}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                placeholder="Olá {nome}, {saudacao}! Tudo bem?"
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.ativo}
                    onCheckedChange={(checked) => setForm({ ...form, ativo: checked })}
                  />
                  <Label>Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.mostrar_botao}
                    onCheckedChange={(checked) => setForm({ ...form, mostrar_botao: checked })}
                  />
                  <Label>Mostrar como botão rápido</Label>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={createReply.isPending || updateReply.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Suas Respostas Rápidas
              </CardTitle>
              <CardDescription>
                Suas mensagens pré-definidas pessoais (cada usuário gerencia as suas)
              </CardDescription>
            </div>
            {!showForm && (
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Resposta
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {replies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma resposta cadastrada</p>
              <Button variant="link" onClick={handleNew} className="mt-2">
                Criar primeira resposta
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={replies.map(r => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {replies.map((reply) => (
                    <SortableReplyItem
                      key={reply.id}
                      reply={reply}
                      onEdit={handleEdit}
                      onDelete={setDeleteId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir resposta rápida?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
