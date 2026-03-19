import React, { useState, useEffect } from 'react';
import { 
  Zap, ShoppingCart, Users, MessageSquare, FileText, Mail, Bell, 
  RefreshCw, Tag, User, Webhook, GitBranch, Clock, Calendar, 
  Split, StopCircle, Gauge, CreditCard, Truck,
  ChevronDown, ChevronRight, Search, GripVertical, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'automation-palette-collapsed';

interface DraggableNodePaletteProps {
  onAddNode: (nodeType: string, nodeSubtype: string, label: string) => void;
}

interface NodeItem {
  type: string;
  subtype: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const triggerNodes: NodeItem[] = [
  { type: 'trigger', subtype: 'order_created', label: 'Novo Pedido', icon: <ShoppingCart className="h-4 w-4" />, description: 'Pedido e-commerce criado' },
  { type: 'trigger', subtype: 'order_status_changed', label: 'Status Alterado', icon: <RefreshCw className="h-4 w-4" />, description: 'Status do pedido mudou' },
  { type: 'trigger', subtype: 'order_shipped', label: 'Pedido Despachado', icon: <Truck className="h-4 w-4" />, description: 'Pedido foi enviado' },
  { type: 'trigger', subtype: 'lead_created', label: 'Novo Lead', icon: <Users className="h-4 w-4" />, description: 'Lead cadastrado' },
  { type: 'trigger', subtype: 'lead_status_changed', label: 'Lead Status', icon: <RefreshCw className="h-4 w-4" />, description: 'Status do lead mudou' },
  { type: 'trigger', subtype: 'pedido_created', label: 'Pedido Comercial', icon: <FileText className="h-4 w-4" />, description: 'Pedido comercial criado' },
  { type: 'trigger', subtype: 'whatsapp_message', label: 'Msg WhatsApp', icon: <MessageSquare className="h-4 w-4" />, description: 'Mensagem recebida' },
  { type: 'trigger', subtype: 'payment_confirmed', label: 'Pagamento', icon: <CreditCard className="h-4 w-4" />, description: 'Pagamento aprovado' },
];

const actionNodes: NodeItem[] = [
  { type: 'action', subtype: 'send_whatsapp', label: 'Enviar WhatsApp', icon: <MessageSquare className="h-4 w-4" />, description: 'Envia mensagem WhatsApp' },
  { type: 'action', subtype: 'send_email', label: 'Enviar E-mail', icon: <Mail className="h-4 w-4" />, description: 'Envia e-mail' },
  { type: 'action', subtype: 'create_notification', label: 'Notificação', icon: <Bell className="h-4 w-4" />, description: 'Notificação interna' },
  { type: 'action', subtype: 'update_status', label: 'Alterar Status', icon: <RefreshCw className="h-4 w-4" />, description: 'Atualiza status' },
  { type: 'action', subtype: 'add_tag', label: 'Adicionar Tag', icon: <Tag className="h-4 w-4" />, description: 'Adiciona tag' },
  { type: 'action', subtype: 'assign_to_user', label: 'Atribuir Usuário', icon: <User className="h-4 w-4" />, description: 'Atribui responsável' },
  { type: 'action', subtype: 'call_webhook', label: 'Webhook', icon: <Webhook className="h-4 w-4" />, description: 'Requisição HTTP' },
];

const conditionNodes: NodeItem[] = [
  { type: 'condition', subtype: 'check_field', label: 'Verificar Campo', icon: <GitBranch className="h-4 w-4" />, description: 'Verifica valor' },
  { type: 'condition', subtype: 'check_status', label: 'Verificar Status', icon: <GitBranch className="h-4 w-4" />, description: 'Verifica status' },
  { type: 'condition', subtype: 'check_value', label: 'Comparar Valor', icon: <GitBranch className="h-4 w-4" />, description: 'Compara números' },
  { type: 'condition', subtype: 'check_response', label: 'Aguardar Resposta', icon: <GitBranch className="h-4 w-4" />, description: 'Verifica resposta' },
];

const controlNodes: NodeItem[] = [
  { type: 'control', subtype: 'delay', label: 'Aguardar', icon: <Clock className="h-4 w-4" />, description: 'Espera tempo' },
  { type: 'control', subtype: 'schedule', label: 'Agendar', icon: <Calendar className="h-4 w-4" />, description: 'Horário específico' },
  { type: 'control', subtype: 'split_ab', label: 'Teste A/B', icon: <Split className="h-4 w-4" />, description: 'Divide fluxo' },
  { type: 'control', subtype: 'limit_rate', label: 'Limitar Taxa', icon: <Gauge className="h-4 w-4" />, description: 'Limita execuções' },
  { type: 'control', subtype: 'stop_flow', label: 'Encerrar', icon: <StopCircle className="h-4 w-4" />, description: 'Finaliza fluxo' },
];

const nodeTypeStyles: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
  trigger: { 
    bg: 'bg-green-500/10', 
    text: 'text-green-600 dark:text-green-400',
    border: 'border-green-500/20',
    gradient: 'from-green-500 to-emerald-600'
  },
  action: { 
    bg: 'bg-blue-500/10', 
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/20',
    gradient: 'from-blue-500 to-indigo-600'
  },
  condition: { 
    bg: 'bg-amber-500/10', 
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/20',
    gradient: 'from-amber-500 to-orange-600'
  },
  control: { 
    bg: 'bg-purple-500/10', 
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/20',
    gradient: 'from-purple-500 to-violet-600'
  },
};

function DraggableNodeCard({ 
  node, 
  onAddNode,
  isCollapsed 
}: { 
  node: NodeItem; 
  onAddNode: DraggableNodePaletteProps['onAddNode'];
  isCollapsed: boolean;
}) {
  const styles = nodeTypeStyles[node.type];
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: node.type,
      subtype: node.subtype,
      label: node.label,
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button
              draggable
              onDragStart={handleDragStart}
              onClick={() => onAddNode(node.type, node.subtype, node.label)}
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-lg transition-all',
                'hover:scale-105 active:scale-95 cursor-grab active:cursor-grabbing',
                styles.bg, styles.text, styles.border, 'border'
              )}
            >
              {node.icon}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex flex-col">
            <span className="font-medium">{node.label}</span>
            <span className="text-xs text-muted-foreground">{node.description}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      onClick={() => onAddNode(node.type, node.subtype, node.label)}
      className={cn(
        'w-full flex items-center gap-3 p-2.5 rounded-xl transition-all',
        'hover:scale-[1.02] active:scale-[0.98] cursor-grab active:cursor-grabbing',
        'border shadow-sm hover:shadow-md',
        styles.bg, styles.border
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
        'bg-gradient-to-br text-white shadow-sm',
        styles.gradient
      )}>
        {node.icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="font-medium text-sm truncate text-foreground">{node.label}</div>
        <div className="text-xs text-muted-foreground truncate">{node.description}</div>
      </div>
      <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </button>
  );
}

function NodeGroup({ 
  title, 
  icon,
  nodes, 
  onAddNode,
  defaultOpen = true,
  isCollapsed
}: { 
  title: string;
  icon: React.ReactNode;
  nodes: NodeItem[];
  onAddNode: DraggableNodePaletteProps['onAddNode'];
  defaultOpen?: boolean;
  isCollapsed: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const styles = nodes[0] ? nodeTypeStyles[nodes[0].type] : nodeTypeStyles.trigger;

  if (isCollapsed) {
    return (
      <div className="space-y-1.5">
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <div className={cn('w-9 h-9 flex items-center justify-center rounded-lg', styles.bg, styles.text)}>
                {icon}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">{title}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="space-y-1.5">
          {nodes.map((node) => (
            <DraggableNodeCard
              key={node.subtype}
              node={node}
              onAddNode={onAddNode}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <CollapsibleTrigger className="flex items-center gap-2 w-full hover:bg-muted/50 rounded-lg p-2 transition-colors">
        <div className={cn('w-6 h-6 rounded flex items-center justify-center', styles.bg, styles.text)}>
          {icon}
        </div>
        <span className="text-sm font-semibold flex-1 text-left">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1.5 pl-1">
        {nodes.map((node) => (
          <DraggableNodeCard
            key={node.subtype}
            node={node}
            onAddNode={onAddNode}
            isCollapsed={isCollapsed}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DraggableNodePalette({ onAddNode }: DraggableNodePaletteProps) {
  const [search, setSearch] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed));
  }, [isCollapsed]);

  const filterNodes = (nodes: NodeItem[]) => {
    if (!search) return nodes;
    const searchLower = search.toLowerCase();
    return nodes.filter(
      n => n.label.toLowerCase().includes(searchLower) || 
           n.description.toLowerCase().includes(searchLower)
    );
  };

  const filteredTriggers = filterNodes(triggerNodes);
  const filteredActions = filterNodes(actionNodes);
  const filteredConditions = filterNodes(conditionNodes);
  const filteredControls = filterNodes(controlNodes);

  return (
    <div className={cn(
      'absolute left-4 top-4 z-20 transition-all duration-300',
      isCollapsed ? 'w-14' : 'w-72'
    )}>
      <div className="bg-background/95 backdrop-blur-md border rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className={cn(
          'flex items-center gap-2 p-3 border-b bg-muted/30',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}>
          {!isCollapsed && (
            <div>
              <h2 className="font-semibold text-sm">Componentes</h2>
              <p className="text-xs text-muted-foreground">Arraste ou clique</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar componente..."
                className="pl-8 h-8 text-sm bg-muted/50 border-transparent focus:border-primary"
              />
            </div>
          </div>
        )}

        {/* Node groups */}
        <ScrollArea className={isCollapsed ? 'h-[calc(100vh-14rem)]' : 'h-[calc(100vh-16rem)]'}>
          <div className={cn('p-3 space-y-4', isCollapsed && 'px-2.5')}>
            {filteredTriggers.length > 0 && (
              <NodeGroup
                title="Gatilhos"
                icon={<Zap className="h-3.5 w-3.5" />}
                nodes={filteredTriggers}
                onAddNode={onAddNode}
                isCollapsed={isCollapsed}
              />
            )}
            {filteredActions.length > 0 && (
              <NodeGroup
                title="Ações"
                icon={<MessageSquare className="h-3.5 w-3.5" />}
                nodes={filteredActions}
                onAddNode={onAddNode}
                isCollapsed={isCollapsed}
              />
            )}
            {filteredConditions.length > 0 && (
              <NodeGroup
                title="Condições"
                icon={<GitBranch className="h-3.5 w-3.5" />}
                nodes={filteredConditions}
                onAddNode={onAddNode}
                isCollapsed={isCollapsed}
              />
            )}
            {filteredControls.length > 0 && (
              <NodeGroup
                title="Controles"
                icon={<Clock className="h-3.5 w-3.5" />}
                nodes={filteredControls}
                onAddNode={onAddNode}
                isCollapsed={isCollapsed}
              />
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
