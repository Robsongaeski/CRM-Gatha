import { useState } from 'react';
import { useWhatsappQuickReplies, useCreateQuickReply, useUpdateQuickReply, useDeleteQuickReply } from '@/hooks/whatsapp/useWhatsappQuickReplies';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

interface QuickRepliesManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReplyForm {
  titulo: string;
  conteudo: string;
  atalho: string;
}

const emptyForm: ReplyForm = { titulo: '', conteudo: '', atalho: '' };

export default function QuickRepliesManager({ open, onOpenChange }: QuickRepliesManagerProps) {
  const { data: replies = [] } = useWhatsappQuickReplies();
  const createReply = useCreateQuickReply();
  const updateReply = useUpdateQuickReply();
  const deleteReply = useDeleteQuickReply();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReplyForm>(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const handleEdit = (reply: any) => {
    setEditingId(reply.id);
    setForm({
      titulo: reply.titulo,
      conteudo: reply.conteudo,
      atalho: reply.atalho || '',
    });
    setShowForm(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
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
        });
        toast.success('Resposta atualizada');
      } else {
        await createReply.mutateAsync({ titulo: form.titulo, conteudo: form.conteudo, atalho: form.atalho || null, variaveis: [], ordem: 0, ativo: true, mostrar_botao: true });
        toast.success('Resposta criada');
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta resposta?')) return;
    try {
      await deleteReply.mutateAsync(id);
      toast.success('Resposta excluída');
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Respostas Rápidas</DialogTitle>
        </DialogHeader>

        {showForm ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
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
                Use o atalho digitando /{form.atalho || 'atalho'} no campo de mensagem
              </p>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea
                placeholder="Olá {nome}, tudo bem?"
                value={form.conteudo}
                onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Variáveis disponíveis: {'{nome}'}, {'{numero_pedido}'}, {'{data_entrega}'}
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={createReply.isPending || updateReply.isPending}>
                {editingId ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Button onClick={handleNew}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Resposta
              </Button>
            </div>
            <ScrollArea className="max-h-96">
              {replies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma resposta cadastrada
                </div>
              ) : (
                <div className="space-y-2">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="flex items-start justify-between p-3 rounded-lg border"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{reply.titulo}</span>
                          {reply.atalho && (
                            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                              /{reply.atalho}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {reply.conteudo}
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(reply)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(reply.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
