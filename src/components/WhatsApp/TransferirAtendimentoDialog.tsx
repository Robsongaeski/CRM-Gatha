import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAssignConversation, useCreateSystemMessage } from '@/hooks/whatsapp/useWhatsappConversations';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';
import { Loader2 } from 'lucide-react';

interface TransferirAtendimentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  instanceId: string;
}

export default function TransferirAtendimentoDialog({
  open,
  onOpenChange,
  conversationId,
  instanceId,
}: TransferirAtendimentoDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');
  const assignConversation = useAssignConversation();
  const createSystemMessage = useCreateSystemMessage();
  // Buscar usuários que têm acesso a esta instância
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['instance-users', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];

      // Buscar acessos de instância
      const { data: instanceAccess } = await supabase
        .from('whatsapp_instance_users')
        .select('user_id')
        .eq('instance_id', instanceId);

      if (!instanceAccess || instanceAccess.length === 0) return [];

      // Buscar dados dos usuários
      const userIds = instanceAccess.map(ia => ia.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, email')
        .in('id', userIds)
        .eq('ativo', true);

      return profiles || [];
    },
    enabled: open && !!instanceId,
  });

  const handleTransfer = async () => {
    if (!selectedUserId) return;

    try {
      // 1. Criar mensagem de sistema sobre a transferência
      await createSystemMessage.mutateAsync({
        conversationId,
        instanceId,
        content: `👤 Atendimento transferido para ${selectedUserName}`
      });
      
      // 2. Atribuir conversa ao novo atendente
      await assignConversation.mutateAsync({
        conversationId,
        userId: selectedUserId,
      });
      toast.success('Atendimento transferido com sucesso');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleSelectUser = (userId: string, userName: string) => {
    setSelectedUserId(userId);
    setSelectedUserName(userName);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Atendimento</DialogTitle>
          <DialogDescription>
            Selecione um atendente para transferir esta conversa
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            Nenhum atendente disponível
          </div>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="space-y-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user.id, user.nome)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    selectedUserId === user.id
                      ? 'bg-primary/10 border border-primary'
                      : 'hover:bg-muted border border-transparent'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(user.nome)}</AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-medium">{user.nome}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedUserId || assignConversation.isPending}
          >
            {assignConversation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Transferir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
