import React from 'react';
import { 
  Zap, ShoppingCart, Users, MessageSquare, FileText, Mail, Bell, 
  RefreshCw, Tag, User, Webhook, GitBranch, Clock, Calendar, 
  Split, StopCircle, Gauge, Package, CreditCard, Truck,
  Timer, MessageCircle, DollarSign, UserCheck, Package2, LogOut, Bot
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NodePaletteProps {
  onAddNode: (nodeType: string, nodeSubtype: string, label: string) => void;
  entityType?: string | null;
}

interface NodeItem {
  type: string;
  subtype: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  appliesTo?: string[]; // Entidades para as quais esta condição se aplica
}

const triggerNodes: NodeItem[] = [
  { type: 'trigger', subtype: 'order_created', label: 'Novo Pedido', icon: <ShoppingCart className="h-4 w-4" />, description: 'Quando um pedido e-commerce é criado' },
  { type: 'trigger', subtype: 'order_status_changed', label: 'Status Alterado', icon: <RefreshCw className="h-4 w-4" />, description: 'Quando o status do pedido muda' },
  { type: 'trigger', subtype: 'order_shipped', label: 'Pedido Despachado', icon: <Truck className="h-4 w-4" />, description: 'Quando o pedido é enviado' },
  { type: 'trigger', subtype: 'lead_created', label: 'Novo Lead', icon: <Users className="h-4 w-4" />, description: 'Quando um lead é cadastrado' },
  { type: 'trigger', subtype: 'lead_status_changed', label: 'Lead Status', icon: <RefreshCw className="h-4 w-4" />, description: 'Quando o status do lead muda' },
  { type: 'trigger', subtype: 'pedido_created', label: 'Pedido Comercial', icon: <FileText className="h-4 w-4" />, description: 'Quando um pedido comercial é criado' },
  { type: 'trigger', subtype: 'whatsapp_message', label: 'Mensagem WhatsApp', icon: <MessageSquare className="h-4 w-4" />, description: 'Quando uma mensagem é recebida' },
  { type: 'trigger', subtype: 'payment_confirmed', label: 'Pagamento Confirmado', icon: <CreditCard className="h-4 w-4" />, description: 'Quando um pagamento é aprovado' },
];

const actionNodes: NodeItem[] = [
  { type: 'action', subtype: 'send_whatsapp', label: 'Enviar WhatsApp', icon: <MessageSquare className="h-4 w-4" />, description: 'Envia mensagem via WhatsApp' },
  { type: 'action', subtype: 'ai_agent', label: 'Agente IA', icon: <Bot className="h-4 w-4" />, description: 'Atendimento com agente IA' },
  { type: 'action', subtype: 'send_email', label: 'Enviar E-mail', icon: <Mail className="h-4 w-4" />, description: 'Envia e-mail via Resend' },
  { type: 'action', subtype: 'create_notification', label: 'Notificação Interna', icon: <Bell className="h-4 w-4" />, description: 'Cria notificação no sistema' },
  { type: 'action', subtype: 'update_status', label: 'Alterar Status', icon: <RefreshCw className="h-4 w-4" />, description: 'Atualiza status da entidade' },
  { type: 'action', subtype: 'add_tag', label: 'Adicionar Tag', icon: <Tag className="h-4 w-4" />, description: 'Adiciona uma tag' },
  { type: 'action', subtype: 'assign_to_user', label: 'Atribuir Usuário', icon: <User className="h-4 w-4" />, description: 'Atribui a um usuário' },
  { type: 'action', subtype: 'call_webhook', label: 'Chamar Webhook', icon: <Webhook className="h-4 w-4" />, description: 'Faz requisição HTTP externa' },
];

// Condições básicas
const basicConditionNodes: NodeItem[] = [
  { type: 'condition', subtype: 'check_field', label: 'Verificar Campo', icon: <GitBranch className="h-4 w-4" />, description: 'Verifica valor de um campo' },
  { type: 'condition', subtype: 'exit_condition', label: 'Condição de Saída', icon: <LogOut className="h-4 w-4" />, description: 'Encerra fluxo em determinado status' },
];

// Condições de tempo
const timeConditionNodes: NodeItem[] = [
  { type: 'condition', subtype: 'time_condition', label: 'Horário e Dias', icon: <Clock className="h-4 w-4" />, description: 'Verifica horário e dias da semana' },
  { type: 'condition', subtype: 'time_elapsed', label: 'Tempo Decorrido', icon: <Timer className="h-4 w-4" />, description: 'Passou X tempo desde criação' },
  { type: 'condition', subtype: 'business_hours', label: 'Horário Comercial', icon: <Clock className="h-4 w-4" />, description: 'Está dentro do horário comercial' },
  { type: 'condition', subtype: 'weekday', label: 'Dia da Semana', icon: <Calendar className="h-4 w-4" />, description: 'É dia útil, fim de semana, etc.' },
  { type: 'condition', subtype: 'date_passed', label: 'Data Passou', icon: <Calendar className="h-4 w-4" />, description: 'Prazo de entrega passou', appliesTo: ['pedido', 'order'] },
];

// Condições de interação
const interactionConditionNodes: NodeItem[] = [
  { type: 'condition', subtype: 'customer_replied', label: 'Cliente Respondeu', icon: <MessageCircle className="h-4 w-4" />, description: 'Cliente respondeu à mensagem', appliesTo: ['whatsapp_conversation'] },
  { type: 'condition', subtype: 'no_reply_timeout', label: 'Sem Resposta', icon: <Clock className="h-4 w-4" />, description: 'Não houve resposta em X tempo', appliesTo: ['whatsapp_conversation', 'lead'] },
  { type: 'condition', subtype: 'last_interaction', label: 'Última Interação', icon: <Timer className="h-4 w-4" />, description: 'Tempo desde última interação', appliesTo: ['lead'] },
];

// Condições de valor
const valueConditionNodes: NodeItem[] = [
  { type: 'condition', subtype: 'value_range', label: 'Faixa de Valor', icon: <DollarSign className="h-4 w-4" />, description: 'Valor está em uma faixa', appliesTo: ['pedido', 'order'] },
  { type: 'condition', subtype: 'has_discount', label: 'Tem Desconto', icon: <Tag className="h-4 w-4" />, description: 'Pedido tem desconto aplicado', appliesTo: ['pedido'] },
];

// Condições de relacionamento
const relationshipConditionNodes: NodeItem[] = [
  { type: 'condition', subtype: 'returning_customer', label: 'Cliente Recorrente', icon: <UserCheck className="h-4 w-4" />, description: 'Cliente já fez pedidos antes', appliesTo: ['pedido', 'order'] },
  { type: 'condition', subtype: 'customer_segment', label: 'Segmento do Cliente', icon: <Users className="h-4 w-4" />, description: 'Cliente pertence a segmento', appliesTo: ['pedido', 'lead'] },
];

// Condições de logística (E-commerce)
const logisticsConditionNodes: NodeItem[] = [
  { type: 'condition', subtype: 'delivery_delayed', label: 'Entrega Atrasada', icon: <Package2 className="h-4 w-4" />, description: 'Entrega passou da estimativa', appliesTo: ['order'] },
  { type: 'condition', subtype: 'carrier_check', label: 'Verificar Transportadora', icon: <Truck className="h-4 w-4" />, description: 'Está com transportadora X', appliesTo: ['order'] },
  { type: 'condition', subtype: 'tracking_status', label: 'Status do Rastreio', icon: <Package className="h-4 w-4" />, description: 'Tem ou não código de rastreio', appliesTo: ['order'] },
];

const controlNodes: NodeItem[] = [
  { type: 'control', subtype: 'delay', label: 'Aguardar', icon: <Clock className="h-4 w-4" />, description: 'Espera X tempo antes de continuar' },
  { type: 'control', subtype: 'schedule', label: 'Agendar', icon: <Calendar className="h-4 w-4" />, description: 'Executa em horário específico' },
  { type: 'control', subtype: 'business_hours_handoff', label: 'IA -> Distribuir no Horário', icon: <Clock className="h-4 w-4" />, description: 'No horário comercial, envia da IA para Distribuir Lead' },
  { type: 'control', subtype: 'split_ab', label: 'Teste A/B', icon: <Split className="h-4 w-4" />, description: 'Divide fluxo por percentual' },
  { type: 'control', subtype: 'limit_rate', label: 'Limitar Taxa', icon: <Gauge className="h-4 w-4" />, description: 'Limita execuções por período' },
  { type: 'control', subtype: 'stop_flow', label: 'Encerrar Fluxo', icon: <StopCircle className="h-4 w-4" />, description: 'Finaliza a execução' },
];

function NodeGroup({ title, nodes, onAddNode, entityType }: { 
  title: string; 
  nodes: NodeItem[]; 
  onAddNode: NodePaletteProps['onAddNode'];
  entityType?: string | null;
}) {
  // Filtrar nós baseado no entityType se tiver appliesTo
  const filteredNodes = nodes.filter(node => {
    if (!node.appliesTo) return true;
    if (!entityType) return true; // Mostrar todos se não tiver trigger ainda
    return node.appliesTo.includes(entityType);
  });
  
  if (filteredNodes.length === 0) return null;
  
  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
        {title}
      </h3>
      <div className="space-y-1">
        {filteredNodes.map((node) => (
          <button
            key={node.subtype}
            onClick={() => onAddNode(node.type, node.subtype, node.label)}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors text-left"
          >
            <div className={`p-1.5 rounded ${
              node.type === 'trigger' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
              node.type === 'action' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' :
              node.type === 'condition' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400' :
              'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400'
            }`}>
              {node.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{node.label}</div>
              <div className="text-xs text-muted-foreground truncate">{node.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function NodePalette({ onAddNode, entityType }: NodePaletteProps) {
  return (
    <div className="w-64 border-r bg-background">
      <div className="p-3 border-b">
        <h2 className="font-semibold">Componentes</h2>
        <p className="text-xs text-muted-foreground">Clique para adicionar</p>
      </div>
      <ScrollArea className="h-[calc(100%-4rem)]">
        <div className="p-2">
          <NodeGroup title="Gatilhos" nodes={triggerNodes} onAddNode={onAddNode} entityType={entityType} />
          <Separator className="my-4" />
          <NodeGroup title="Ações" nodes={actionNodes} onAddNode={onAddNode} entityType={entityType} />
          <Separator className="my-4" />
          
          {/* Condições agrupadas por categoria */}
          <NodeGroup title="Condições Básicas" nodes={basicConditionNodes} onAddNode={onAddNode} entityType={entityType} />
          <NodeGroup title="⏰ Tempo" nodes={timeConditionNodes} onAddNode={onAddNode} entityType={entityType} />
          <NodeGroup title="💬 Interação" nodes={interactionConditionNodes} onAddNode={onAddNode} entityType={entityType} />
          <NodeGroup title="💰 Valor" nodes={valueConditionNodes} onAddNode={onAddNode} entityType={entityType} />
          <NodeGroup title="🤝 Relacionamento" nodes={relationshipConditionNodes} onAddNode={onAddNode} entityType={entityType} />
          <NodeGroup title="📦 Logística" nodes={logisticsConditionNodes} onAddNode={onAddNode} entityType={entityType} />
          
          <Separator className="my-4" />
          <NodeGroup title="Controles" nodes={controlNodes} onAddNode={onAddNode} entityType={entityType} />
        </div>
      </ScrollArea>
    </div>
  );
}
