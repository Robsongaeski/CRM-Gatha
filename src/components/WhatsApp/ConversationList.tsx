import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Users, ArrowUp, ArrowDown, WifiOff, User, LayoutGrid, ListFilter, AlertCircle } from 'lucide-react';
import { ConversationFilters, WhatsappConversation } from '@/hooks/whatsapp/useWhatsappConversations';
import { useGroupedConversations, GroupedConversation } from '@/hooks/whatsapp/useGroupedConversations';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import IniciarConversaDialog from './IniciarConversaDialog';

interface ConversationListProps {
  conversations: WhatsappConversation[];
  groupedConversations: GroupedConversation[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  filters: ConversationFilters;
  onFiltersChange: (filters: ConversationFilters) => void;
  canFilterByAttendant?: boolean;
  attendants?: Array<{ id: string; nome: string }>;
  selectedGroupKey?: string;
  onSelectGroup: (group: GroupedConversation) => void;
  instances: Array<{ id: string; nome: string; status?: string }>;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onConversationOpened?: (conversationId: string, instanceId: string) => void;
}

export default function ConversationList({
  conversations,
  groupedConversations,
  loading,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  filters,
  onFiltersChange,
  canFilterByAttendant = false,
  attendants = [],
  selectedGroupKey,
  onSelectGroup,
  instances,
  sortOrder,
  onSortOrderChange,
  onConversationOpened,
}: ConversationListProps) {
  const normalizePreviewText = (raw: string | null | undefined) => {
    if (!raw) return '';
    const text = String(raw).trim();
    if (!text) return '';

    const pseudoMatch = text.match(/(?:^|[,{]\s*)text\s*:\s*(['"])([\s\S]*?)\1/i);
    if (pseudoMatch?.[2]) {
      return pseudoMatch[2]
        .replace(/\\n/g, '\n')
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .trim();
    }

    return text;
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
    <TooltipProvider>
      <div className="flex flex-col h-full bg-white overflow-hidden">
        {/* Header */}
        <div className="bg-[#f0f2f5] h-[59px] px-4 flex items-center justify-between flex-shrink-0">
          <Avatar className="h-10 w-10 cursor-pointer">
            <AvatarFallback className="bg-[#dfe5e7] text-[#54656f]">
              <Users className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-2 text-[#54656f]">
            <IniciarConversaDialog 
              instances={instances} 
              onConversationOpened={onConversationOpened}
            />
          </div>
        </div>

        {/* Search */}
        <div className="p-2 bg-white flex-shrink-0 border-b border-[#f0f2f5] flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2 h-4 w-4 text-[#54656f]" />
            <Input
              placeholder="Pesquisar conversa, cliente ou pedido"
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-10 h-8 bg-[#f0f2f5] border-none rounded-lg text-sm text-[#111b21] placeholder:text-[#667781] focus-visible:ring-0"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 text-[#54656f] hover:bg-[#f0f2f5] shrink-0",
              filters.status === 'unread' && "bg-[#20c978]/10 text-[#20c978] hover:bg-[#20c978]/20"
            )}
            onClick={() => onFiltersChange({ 
              ...filters, 
              status: filters.status === 'unread' ? 'active' : 'unread' 
            })}
            title={filters.status === 'unread' ? "Mostrar todas" : "Filtrar conversas não lidas"}
          >
            <ListFilter className="h-5 w-5" />
          </Button>
        </div>

        {/* Filters */}
        <div className="px-2 pb-2 flex gap-2 bg-white flex-shrink-0">
          <Select
            value={filters.assignment}
            onValueChange={(value: 'mine' | 'mine_and_new' | 'all') => {
              onFiltersChange({
                ...filters,
                assignment: value,
                assignedUserId: value === 'all' ? filters.assignedUserId : undefined,
                status: value === 'all' ? 'all' : filters.status,
              });
            }}
          >
            <SelectTrigger className="flex-1 h-8 text-xs bg-[#f0f2f5] border-none text-[#54656f]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mine_and_new">Minhas + Novas</SelectItem>
              <SelectItem value="mine">Minhas</SelectItem>
              {canFilterByAttendant && (
                <SelectItem value="all">Todas</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select
            value={filters.status}
            onValueChange={(value: 'all' | 'active' | 'unread' | 'finished' | 'followup_pending') => {
              onFiltersChange({ ...filters, status: value });
            }}
          >
            <SelectTrigger className="flex-1 h-8 text-xs bg-[#f0f2f5] border-none text-[#54656f]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="followup_pending">Retornos Pendentes</SelectItem>
              <SelectItem value="unread">Não lidas</SelectItem>
              <SelectItem value="finished">Finalizadas</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 bg-[#f0f2f5] hover:bg-[#e9edef]"
            onClick={() => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')}
            title={sortOrder === 'desc' ? 'Mais recentes primeiro' : 'Mais antigas primeiro'}
          >
            {sortOrder === 'desc' ? (
              <ArrowDown className="h-4 w-4 text-[#54656f]" />
            ) : (
              <ArrowUp className="h-4 w-4 text-[#54656f]" />
            )}
          </Button>
        </div>

        {canFilterByAttendant && attendants.length > 0 && (
          <div className="px-2 pb-2 bg-white flex-shrink-0">
            <Select
              value={filters.assignedUserId || 'all'}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  assignment: 'all',
                  assignedUserId: value === 'all' ? undefined : value,
                })
              }
            >
              <SelectTrigger className="h-8 text-xs bg-[#f0f2f5] border-none text-[#54656f]">
                <SelectValue placeholder="Todos os atendentes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os atendentes</SelectItem>
                {(attendants || []).map((attendant) => (
                  <SelectItem key={attendant.id} value={attendant.id}>
                    {attendant.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {instances.length > 1 && (
          <div className="px-2 pb-2 bg-white flex-shrink-0">
            <Select
              value={filters.instanceId || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, instanceId: value === 'all' ? undefined : value })}
            >
              <SelectTrigger className="h-8 text-xs bg-[#f0f2f5] border-none text-[#54656f]">
                <SelectValue placeholder="Todas instâncias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas instâncias</SelectItem>
                {(instances || []).map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    <span className="flex items-center gap-1.5">
                      {inst.nome}
                      {inst.status !== 'connected' && (
                        <WifiOff className="h-3 w-3 text-amber-500" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Conversations list */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-[#667781]">Carregando...</div>
          ) : groupedConversations.length === 0 ? (
            <div className="p-4 text-center text-[#667781]">
              Nenhuma conversa encontrada
            </div>
          ) : (
            <div>
              {(groupedConversations || []).map((group) => {
                const hasMultipleInstances = group.instances.length > 1;
                const isSelected = group.groupKey === selectedGroupKey;
                const unreadCount = group.totalUnread || 0;
                const followupColor = group.followupColor || '#f59e0b';
                
                return (
                  <div
                    key={group.groupKey}
                    onClick={() => onSelectGroup(group)}
                    className={cn(
                      'w-full px-3 py-3 flex gap-3 hover:bg-[#f5f6f6] transition-colors text-left border-b border-[#e9edef] cursor-pointer',
                      isSelected && 'bg-[#f0f2f5]',
                      unreadCount > 0 && !isSelected && 'bg-[#f0fdf4]'
                    )}
                    style={group.hasFollowup ? { borderLeft: `3px solid ${followupColor}` } : undefined}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={group.photoUrl || undefined} />
                      <AvatarFallback className="bg-[#dfe5e7] text-[#54656f]">
                        {group.isGroup ? (
                          <Users className="h-5 w-5" />
                        ) : (
                          getInitials(group.mainName || '?')
                        )}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center py-0">
                      {/* Linha 1: Nome + Hora */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {group.hasFollowup && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" style={{ color: followupColor }} />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {group.followupReason || 'Conversa marcada para retorno'}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <span className={cn(
                            'text-[16px] text-[#111b21] truncate',
                            unreadCount > 0 ? 'font-semibold' : 'font-normal'
                          )}>
                            {group.mainName}
                          </span>
                        </div>
                        <span className={cn(
                          'text-xs whitespace-nowrap flex-shrink-0',
                          unreadCount > 0 ? 'text-[#25d366] font-medium' : 'text-[#667781]'
                        )}>
                          {formatDistanceToNow(new Date(group.lastMessageAt), {
                            addSuffix: false,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      
                      {/* Linha 2: Preview + Badge */}
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={cn(
                          'text-sm truncate flex-1',
                          unreadCount > 0 ? 'text-[#111b21] font-medium' : 'text-[#667781]'
                        )}>
                          {normalizePreviewText(group.lastMessagePreview) || 'Sem mensagens'}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {hasMultipleInstances && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px] bg-[#f0f2f5] text-[#54656f] border border-[#d1d7db]">
                              {group.instances.length} inst
                            </Badge>
                          )}
                          {unreadCount > 0 && (
                            <span className="flex items-center justify-center bg-[#25d366] text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] px-1.5">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Linha 3: Atendente e Instância (Mockup Style) */}
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-[#667781]">
                        <div className="flex items-center gap-1 truncate max-w-[50%]">
                          {group.isGroup ? (
                            <Users className="h-3 w-3 text-green-500" />
                          ) : (
                            <User className="h-3 w-3 text-[#6a67f1]" />
                          )}
                          <span className="truncate">
                            {group.isGroup ? 'Grupo' : (group.assignedUser?.nome || 'Sem atendente')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 truncate max-w-[50%]">
                          <LayoutGrid className="h-3 w-3 text-[#6a67f1]" />
                          <span className="truncate">
                            {(group.instances || []).map(i => i.nome).join(', ')}
                          </span>
                        </div>
                        {group.hasFollowup && (
                          <span className="inline-flex items-center gap-1 truncate" style={{ color: followupColor }}>
                            <AlertCircle className="h-3 w-3" />
                            Retorno
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div className="p-3 border-t border-[#e9edef] bg-white">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={onLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Carregando...' : 'Ver mais conversas'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
