import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Send, User, Users, Loader2 } from 'lucide-react';
import { useWhatsappConversations, WhatsappConversation } from '@/hooks/whatsapp/useWhatsappConversations';
import { useSendWhatsappMessage } from '@/hooks/whatsapp/useWhatsappMessages';
import { useAuth } from '@/hooks/useAuth';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: {
    content: string | null;
    type: string;
    media_url: string | null;
    media_mimetype: string | null;
  } | null;
}

export default function ForwardMessageDialog({ open, onOpenChange, message }: ForwardMessageDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [isForwarding, setIsForwarding] = useState<string | null>(null);

  const { data: conversations = [], isLoading } = useWhatsappConversations({
    assignment: 'all',
    status: 'active',
    search: search
  });

  const sendMessage = useSendWhatsappMessage();

  const handleForward = async (target: WhatsappConversation) => {
    if (!message) return;

    try {
      setIsForwarding(target.id);
      
      await sendMessage.mutateAsync({
        conversationId: target.id,
        instanceId: target.instance_id,
        remoteJid: target.remote_jid,
        content: message.content || '',
        messageType: message.type as any,
        mediaUrl: message.media_url || undefined,
        mediaMimeType: message.media_mimetype || undefined,
        senderName: 'Encaminhado', // Ou o nome do usuário atual
      });

      toast.success(`Mensagem encaminhada para ${target.contact_name || target.group_name || 'contato'}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao encaminhar mensagem:', error);
      toast.error('Erro ao encaminhar mensagem');
    } finally {
      setIsForwarding(null);
    }
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
      <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Encaminhar mensagem</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 bg-[#f0f2f5]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#667781]" />
            <Input
              placeholder="Pesquisar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white border-none focus-visible:ring-1 focus-visible:ring-[#00a884]"
            />
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full p-8 text-[#667781]">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Carregando conversas...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-[#667781]">
              Nenhuma conversa encontrada
            </div>
          ) : (
            <div className="divide-y divide-[#e9edef]">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-3 hover:bg-[#f5f6f6] cursor-pointer transition-colors"
                  onClick={() => !isForwarding && handleForward(conv)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conv.is_group ? conv.group_photo_url || undefined : conv.contact_photo_url || undefined} />
                      <AvatarFallback className="bg-[#dfe5e7] text-[#54656f]">
                        {conv.is_group ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-[#111b21] truncate">
                        {conv.is_group ? conv.group_name : (conv.contact_name || conv.contact_phone)}
                      </p>
                      <p className="text-xs text-[#667781] truncate">
                        {conv.instance?.nome}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-[#00a884] hover:bg-[#00a884]/10 rounded-full"
                    disabled={!!isForwarding}
                  >
                    {isForwarding === conv.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
