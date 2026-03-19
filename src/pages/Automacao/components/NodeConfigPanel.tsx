import React from 'react';
import { Node } from '@xyflow/react';
import { X, Trash2, Zap, Send, GitBranch, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (config: any) => void;
  onDelete: () => void;
  onClose: () => void;
}

// Trigger config
function TriggerConfig({ node, onUpdate }: { node: Node; onUpdate: (config: any) => void }) {
  const config = (node.data.config as any) || {};
  const subtype = node.data.subtype as string;
  
  return (
    <div className="space-y-4">
      {subtype === 'order_status_changed' && (
        <div className="space-y-2">
          <Label>Status do Pedido</Label>
          <Select
            value={config.status || ''}
            onValueChange={(value) => onUpdate({ ...config, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Qualquer status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="shipped">Enviado</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      
      {subtype === 'lead_status_changed' && (
        <div className="space-y-2">
          <Label>Status do Lead</Label>
          <Select
            value={config.status || ''}
            onValueChange={(value) => onUpdate({ ...config, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Qualquer status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer status</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="contatando">Contatando</SelectItem>
              <SelectItem value="qualificado">Qualificado</SelectItem>
              <SelectItem value="convertido">Convertido</SelectItem>
              <SelectItem value="perdido">Perdido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// Action config
function ActionConfig({ node, onUpdate }: { node: Node; onUpdate: (config: any) => void }) {
  const config = (node.data.config as any) || {};
  const subtype = node.data.subtype as string;
  
  return (
    <div className="space-y-4">
      {subtype === 'send_whatsapp' && (
        <>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={config.message || ''}
              onChange={(e) => onUpdate({ ...config, message: e.target.value })}
              placeholder="Digite a mensagem..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Use variáveis: {'{nome}'}, {'{numero_pedido}'}, {'{valor}'}
            </p>
          </div>
        </>
      )}
      
      {subtype === 'send_email' && (
        <>
          <div className="space-y-2">
            <Label>Assunto</Label>
            <Input
              value={config.subject || ''}
              onChange={(e) => onUpdate({ ...config, subject: e.target.value })}
              placeholder="Assunto do e-mail"
            />
          </div>
          <div className="space-y-2">
            <Label>Corpo do E-mail</Label>
            <Textarea
              value={config.body || ''}
              onChange={(e) => onUpdate({ ...config, body: e.target.value })}
              placeholder="Conteúdo do e-mail..."
              rows={4}
            />
          </div>
        </>
      )}
      
      {subtype === 'create_notification' && (
        <>
          <div className="space-y-2">
            <Label>Tipo de Notificação</Label>
            <Select
              value={config.notificationType || 'info'}
              onValueChange={(value) => onUpdate({ ...config, notificationType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informação</SelectItem>
                <SelectItem value="warning">Alerta</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea
              value={config.message || ''}
              onChange={(e) => onUpdate({ ...config, message: e.target.value })}
              placeholder="Mensagem da notificação..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Destinatário</Label>
            <Select
              value={config.recipient || 'owner'}
              onValueChange={(value) => onUpdate({ ...config, recipient: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Responsável</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      
      {subtype === 'update_status' && (
        <div className="space-y-2">
          <Label>Novo Status</Label>
          <Input
            value={config.newStatus || ''}
            onChange={(e) => onUpdate({ ...config, newStatus: e.target.value })}
            placeholder="Digite o novo status"
          />
        </div>
      )}
      
      {subtype === 'call_webhook' && (
        <>
          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <Input
              value={config.webhookUrl || ''}
              onChange={(e) => onUpdate({ ...config, webhookUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>Método</Label>
            <Select
              value={config.method || 'POST'}
              onValueChange={(value) => onUpdate({ ...config, method: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

// Condition config
function ConditionConfig({ node, onUpdate }: { node: Node; onUpdate: (config: any) => void }) {
  const config = (node.data.config as any) || {};
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Campo</Label>
        <Input
          value={config.field || ''}
          onChange={(e) => onUpdate({ ...config, field: e.target.value })}
          placeholder="Ex: status, valor_total"
        />
      </div>
      <div className="space-y-2">
        <Label>Operador</Label>
        <Select
          value={config.operator || 'equals'}
          onValueChange={(value) => onUpdate({ ...config, operator: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="equals">Igual a</SelectItem>
            <SelectItem value="not_equals">Diferente de</SelectItem>
            <SelectItem value="contains">Contém</SelectItem>
            <SelectItem value="greater">Maior que</SelectItem>
            <SelectItem value="less">Menor que</SelectItem>
            <SelectItem value="is_empty">Está vazio</SelectItem>
            <SelectItem value="is_not_empty">Não está vazio</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Valor</Label>
        <Input
          value={config.value || ''}
          onChange={(e) => onUpdate({ ...config, value: e.target.value })}
          placeholder="Valor para comparar"
        />
      </div>
    </div>
  );
}

// Control config
function ControlConfig({ node, onUpdate }: { node: Node; onUpdate: (config: any) => void }) {
  const config = (node.data.config as any) || {};
  const subtype = node.data.subtype as string;
  
  return (
    <div className="space-y-4">
      {subtype === 'delay' && (
        <>
          <div className="space-y-2">
            <Label>Tempo de Espera</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={config.delay || ''}
                onChange={(e) => onUpdate({ ...config, delay: parseInt(e.target.value) })}
                placeholder="Ex: 30"
                className="flex-1"
              />
              <Select
                value={config.delayUnit || 'minutes'}
                onValueChange={(value) => onUpdate({ ...config, delayUnit: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutos</SelectItem>
                  <SelectItem value="hours">Horas</SelectItem>
                  <SelectItem value="days">Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}
      
      {subtype === 'schedule' && (
        <>
          <div className="space-y-2">
            <Label>Horário</Label>
            <Input
              type="time"
              value={config.time || ''}
              onChange={(e) => onUpdate({ ...config, time: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Dias da Semana</Label>
            <Select
              value={config.weekdays || 'all'}
              onValueChange={(value) => onUpdate({ ...config, weekdays: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os dias</SelectItem>
                <SelectItem value="weekdays">Segunda a Sexta</SelectItem>
                <SelectItem value="weekends">Sábado e Domingo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      
      {subtype === 'split_ab' && (
        <div className="space-y-2">
          <Label>Percentual para Caminho A</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              value={config.splitPercentage || 50}
              onChange={(e) => onUpdate({ ...config, splitPercentage: parseInt(e.target.value) })}
              className="w-20"
            />
            <span className="text-muted-foreground">%</span>
          </div>
        </div>
      )}
      
      {subtype === 'limit_rate' && (
        <>
          <div className="space-y-2">
            <Label>Limite de Execuções</Label>
            <Input
              type="number"
              value={config.limit || ''}
              onChange={(e) => onUpdate({ ...config, limit: parseInt(e.target.value) })}
              placeholder="Ex: 10"
            />
          </div>
          <div className="space-y-2">
            <Label>Por Período</Label>
            <Select
              value={config.period || 'hour'}
              onValueChange={(value) => onUpdate({ ...config, period: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minute">Minuto</SelectItem>
                <SelectItem value="hour">Hora</SelectItem>
                <SelectItem value="day">Dia</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

export function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
  const nodeType = node.type as string;
  
  const getIcon = () => {
    switch (nodeType) {
      case 'trigger': return <Zap className="h-5 w-5 text-green-500" />;
      case 'action': return <Send className="h-5 w-5 text-blue-500" />;
      case 'condition': return <GitBranch className="h-5 w-5 text-amber-500" />;
      case 'control': return <Clock className="h-5 w-5 text-purple-500" />;
      default: return null;
    }
  };
  
  const getTitle = () => {
    switch (nodeType) {
      case 'trigger': return 'Gatilho';
      case 'action': return 'Ação';
      case 'condition': return 'Condição';
      case 'control': return 'Controle';
      default: return 'Nó';
    }
  };
  
  return (
    <div className="w-80 border-l bg-background flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getIcon()}
          <div>
            <div className="font-semibold">{node.data.label as string}</div>
            <div className="text-xs text-muted-foreground">{getTitle()}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4">
          {nodeType === 'trigger' && <TriggerConfig node={node} onUpdate={onUpdate} />}
          {nodeType === 'action' && <ActionConfig node={node} onUpdate={onUpdate} />}
          {nodeType === 'condition' && <ConditionConfig node={node} onUpdate={onUpdate} />}
          {nodeType === 'control' && <ControlConfig node={node} onUpdate={onUpdate} />}
        </div>
      </ScrollArea>
      
      <Separator />
      
      <div className="p-4">
        <Button variant="destructive" className="w-full" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir Nó
        </Button>
      </div>
    </div>
  );
}
