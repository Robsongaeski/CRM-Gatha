import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserPlus, Users } from 'lucide-react';
import { useInstanceUsers, useAddUserToInstance, useRemoveUserFromInstance } from '@/hooks/whatsapp/useWhatsappInstanceUsers';
import { useUsuarios } from '@/hooks/useUsuarios';
import { Skeleton } from '@/components/ui/skeleton';

interface GerenciarUsuariosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceId: string;
  instanceName: string;
}

export default function GerenciarUsuariosDialog({
  open,
  onOpenChange,
  instanceId,
  instanceName
}: GerenciarUsuariosDialogProps) {
  const { data: instanceUsers = [], isLoading: loadingUsers } = useInstanceUsers(instanceId);
  const { data: allUsers = [], isLoading: loadingAllUsers } = useUsuarios();
  const addUser = useAddUserToInstance();
  const removeUser = useRemoveUserFromInstance();
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Filtrar usuários disponíveis (não vinculados e ativos)
  const linkedUserIds = instanceUsers.map(iu => iu.user_id);
  const availableUsers = allUsers.filter(
    u => u.ativo && !linkedUserIds.includes(u.id)
  );

  const handleAddUser = async () => {
    if (!selectedUserId) return;
    
    await addUser.mutateAsync({ instanceId, userId: selectedUserId });
    setSelectedUserId('');
  };

  const handleRemoveUser = async (userId: string) => {
    await removeUser.mutateAsync({ instanceId, userId });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Gerenciar Usuários - {instanceName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Adicionar usuário */}
          <div className="flex gap-2">
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={loadingAllUsers}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um usuário..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    Nenhum usuário disponível
                  </SelectItem>
                ) : (
                  availableUsers.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddUser}
              disabled={!selectedUserId || addUser.isPending}
              size="icon"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista de usuários vinculados */}
          <div className="border rounded-lg divide-y">
            {loadingUsers ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : instanceUsers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum usuário vinculado</p>
                <p className="text-xs mt-1">
                  Usuários não vinculados não terão acesso a esta instância no atendimento
                </p>
              </div>
            ) : (
              instanceUsers.map(iu => (
                <div key={iu.id} className="flex items-center gap-3 p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {getInitials(iu.user?.nome || '?')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {iu.user?.nome}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {iu.user?.email}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveUser(iu.user_id)}
                    disabled={removeUser.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {instanceUsers.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {instanceUsers.length} usuário(s) com acesso a esta instância
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
