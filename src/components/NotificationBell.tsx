import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificacoesNaoLidas, useMarcarComoLida, useMarcarTodasComoLidas } from '@/hooks/useNotificacoes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export function NotificationBell() {
  const notificacoes = useNotificacoesNaoLidas();
  const marcarComoLida = useMarcarComoLida();
  const marcarTodasComoLidas = useMarcarTodasComoLidas();
  const navigate = useNavigate();

  const handleNotificationClick = async (notificacao: any) => {
    await marcarComoLida.mutateAsync(notificacao.id);
    if (notificacao.link) {
      navigate(notificacao.link);
    }
  };

  const handleMarcarTodasComoLidas = async () => {
    await marcarTodasComoLidas.mutateAsync();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {notificacoes.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {notificacoes.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notificações</h3>
          {notificacoes.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarcarTodasComoLidas}
              className="text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {notificacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação nova</p>
            </div>
          ) : (
            <div className="divide-y">
              {notificacoes.map((notificacao) => (
                <div
                  key={notificacao.id}
                  className="p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleNotificationClick(notificacao)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {notificacao.tipo === 'retorno_lead' && '🔔 Retorno Agendado'}
                        {notificacao.tipo === 'pagamento_aprovado' && '✅ Pagamento Aprovado'}
                        {notificacao.tipo === 'pedido_aprovacao' && '⚠️ Pedido Aguardando Aprovação'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {notificacao.mensagem}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notificacao.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        marcarComoLida.mutateAsync(notificacao.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
