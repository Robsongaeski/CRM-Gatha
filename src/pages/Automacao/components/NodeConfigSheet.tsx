import React from 'react';
import { Node } from '@xyflow/react';
import { Trash2, Zap, Send, GitBranch, Clock, Copy, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { 
  camposEntidades, 
  getCamposParaEntidade, 
  getCamposAgrupados,
  getCondicoesEspeciaisParaEntidade,
  operatorLabels, 
  operadoresPorTipo,
  categoryIcons,
  CampoEntidade,
  CondicaoEspecial
} from '../data/camposEntidades';

interface NodeConfigSheetProps {
  node: Node | null;
  entityType?: string | null;
  onUpdate: (config: any) => void;
  onUpdateLabel?: (label: string) => void;
  onDelete: () => void;
  onClose: () => void;
  onDuplicate?: () => void;
}

const nodeTypeConfig: Record<string, { 
  icon: React.ReactNode; 
  label: string; 
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  trigger: { 
    icon: <Zap className="h-5 w-5" />, 
    label: 'Gatilho',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30'
  },
  action: { 
    icon: <Send className="h-5 w-5" />, 
    label: 'Ação',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  condition: { 
    icon: <GitBranch className="h-5 w-5" />, 
    label: 'Condição',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30'
  },
  control: { 
    icon: <Clock className="h-5 w-5" />, 
    label: 'Controle',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30'
  },
};

function FormSection({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">{title}</h4>
        {hint && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{hint}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
    </div>
  );
}

function TriggerConfig({ node, onUpdate }: { node: Node; onUpdate: (config: any) => void }) {
  const config = (node.data.config as any) || {};
  const subtype = node.data.subtype as string;
  
  return (
    <div className="space-y-6">
      {(subtype === 'order_status_changed' || subtype === 'lead_status_changed') && (
        <FormSection 
          title="Filtrar por Status" 
          hint="O fluxo será executado apenas quando o status for igual ao selecionado"
        >
          <Select
            value={config.status || 'any'}
            onValueChange={(value) => onUpdate({ ...config, status: value })}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue placeholder="Qualquer status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer status</SelectItem>
              {subtype === 'order_status_changed' ? (
                <>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="contatando">Contatando</SelectItem>
                  <SelectItem value="qualificado">Qualificado</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </FormSection>
      )}
      
      {!['order_status_changed', 'lead_status_changed'].includes(subtype) && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
          Este gatilho não requer configuração adicional. Ele será ativado sempre que o evento ocorrer.
        </div>
      )}
    </div>
  );
}

function ActionConfig({ node, onUpdate }: { node: Node; onUpdate: (config: any) => void }) {
  const config = (node.data.config as any) || {};
  const subtype = node.data.subtype as string;
  
  // Inicializar config com valores existentes para suportar formatos antigos
  const normalizedConfig = {
    ...config,
    // Normalizar campos de mensagem
    message: config.message || (config.messages?.[0] || ''),
    randomMessages: config.randomMessages || false,
    messages: config.messages || [],
  };
  
  return (
    <div className="space-y-6">
      {subtype === 'send_whatsapp' && (
        <>
          <FormSection 
            title="Mensagem Principal" 
            hint="Use variáveis como {nome}, {numero_pedido}, {valor} para personalizar"
          >
            <Textarea
              value={normalizedConfig.randomMessages ? (normalizedConfig.messages[0] || '') : (config.message || '')}
              onChange={(e) => {
                if (normalizedConfig.randomMessages) {
                  const newMessages = [...(normalizedConfig.messages || [])];
                  newMessages[0] = e.target.value;
                  onUpdate({ ...config, messages: newMessages, randomMessages: true });
                } else {
                  onUpdate({ ...config, message: e.target.value });
                }
              }}
              placeholder="Olá {nome}, seu pedido #{numero_pedido} foi confirmado!"
              rows={4}
              className="bg-muted/50 resize-none"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['{nome}', '{numero_pedido}', '{valor}', '{status}', '{saudacao}'].map(v => (
                <Badge 
                  key={v} 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => {
                    if (normalizedConfig.randomMessages) {
                      const newMessages = [...(normalizedConfig.messages || [''])];
                      newMessages[0] = (newMessages[0] || '') + ' ' + v;
                      onUpdate({ ...config, messages: newMessages, randomMessages: true });
                    } else {
                      onUpdate({ ...config, message: (config.message || '') + ' ' + v });
                    }
                  }}
                >
                  {v}
                </Badge>
              ))}
            </div>
          </FormSection>
          
          <FormSection 
            title="Mensagens Alternativas" 
            hint="Ative para enviar mensagens aleatórias (evita detecção de bot)"
          >
            <div className="flex items-center gap-2 mb-3">
              <input 
                type="checkbox" 
                id="randomMessages"
                checked={normalizedConfig.randomMessages}
                onChange={(e) => {
                  if (e.target.checked) {
                    // Converter para formato de mensagens múltiplas
                    onUpdate({ 
                      ...config, 
                      randomMessages: true, 
                      messages: [config.message || '', '', '', '']
                    });
                  } else {
                    // Converter para mensagem única
                    const firstMessage = config.messages?.[0] || config.message || '';
                    onUpdate({ 
                      ...config, 
                      randomMessages: false, 
                      message: firstMessage,
                      messages: undefined
                    });
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="randomMessages" className="text-sm">
                Usar mensagens aleatórias
              </label>
            </div>
            
            {normalizedConfig.randomMessages && (
              <div className="space-y-2">
                {[1, 2, 3].map((idx) => (
                  <Textarea
                    key={idx}
                    value={normalizedConfig.messages[idx] || ''}
                    onChange={(e) => {
                      const newMessages = [...(normalizedConfig.messages || ['', '', '', ''])];
                      newMessages[idx] = e.target.value;
                      onUpdate({ ...config, messages: newMessages, randomMessages: true });
                    }}
                    placeholder={`Mensagem alternativa ${idx + 1} (opcional)`}
                    rows={2}
                    className="bg-muted/50 resize-none text-sm"
                  />
                ))}
                <p className="text-xs text-muted-foreground">
                  💡 Uma mensagem será escolhida aleatoriamente a cada envio
                </p>
              </div>
            )}
          </FormSection>
        </>
      )}
      
      {subtype === 'send_email' && (
        <>
          <FormSection title="Assunto">
            <Input
              value={config.subject || ''}
              onChange={(e) => onUpdate({ ...config, subject: e.target.value })}
              placeholder="Atualização do seu pedido #{numero_pedido}"
              className="bg-muted/50"
            />
          </FormSection>
          <FormSection title="Corpo do E-mail">
            <Textarea
              value={config.body || ''}
              onChange={(e) => onUpdate({ ...config, body: e.target.value })}
              placeholder="Olá {nome},\n\nSeu pedido foi atualizado..."
              rows={6}
              className="bg-muted/50 resize-none font-mono text-sm"
            />
          </FormSection>
        </>
      )}
      
      {subtype === 'create_notification' && (
        <>
          <FormSection title="Tipo">
            <Select
              value={config.notificationType || 'info'}
              onValueChange={(value) => onUpdate({ ...config, notificationType: value })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">ℹ️ Informação</SelectItem>
                <SelectItem value="warning">⚠️ Alerta</SelectItem>
                <SelectItem value="success">✅ Sucesso</SelectItem>
              </SelectContent>
            </Select>
          </FormSection>
          <FormSection title="Mensagem">
            <Textarea
              value={config.message || ''}
              onChange={(e) => onUpdate({ ...config, message: e.target.value })}
              placeholder="Novo pedido recebido..."
              rows={3}
              className="bg-muted/50 resize-none"
            />
          </FormSection>
          <FormSection title="Link (opcional)">
            <Input
              value={config.link || ''}
              onChange={(e) => onUpdate({ ...config, link: e.target.value })}
              placeholder="/pedidos/{entity_id}"
              className="bg-muted/50"
            />
          </FormSection>
        </>
      )}
      
      {subtype === 'update_status' && (
        <FormSection title="Novo Status">
          <Input
            value={config.newStatus || config.status || ''}
            onChange={(e) => onUpdate({ ...config, newStatus: e.target.value, status: e.target.value })}
            placeholder="Ex: em_andamento, concluido"
            className="bg-muted/50"
          />
        </FormSection>
      )}
      
      {subtype === 'add_tag' && (
        <>
          <FormSection title="Nome da Tag">
            <Input
              value={config.tag_name || config.tag || ''}
              onChange={(e) => onUpdate({ ...config, tag_name: e.target.value })}
              placeholder="Ex: urgente, personalizado"
              className="bg-muted/50"
            />
          </FormSection>
          <FormSection title="Cor da Tag">
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.tag_color || '#6366f1'}
                onChange={(e) => onUpdate({ ...config, tag_color: e.target.value })}
                className="w-14 h-10 p-1 bg-muted/50"
              />
              <Input
                value={config.tag_color || '#6366f1'}
                onChange={(e) => onUpdate({ ...config, tag_color: e.target.value })}
                placeholder="#6366f1"
                className="flex-1 bg-muted/50 font-mono"
              />
            </div>
          </FormSection>
        </>
      )}
      
      {subtype === 'remove_tag' && (
        <FormSection title="Nome da Tag a Remover">
          <Input
            value={config.tag_name || config.tag || ''}
            onChange={(e) => onUpdate({ ...config, tag_name: e.target.value })}
            placeholder="Ex: urgente"
            className="bg-muted/50"
          />
        </FormSection>
      )}
      
      {subtype === 'call_webhook' && (
        <>
          <FormSection title="URL do Webhook">
            <Input
              value={config.webhookUrl || config.url || ''}
              onChange={(e) => onUpdate({ ...config, webhookUrl: e.target.value, url: e.target.value })}
              placeholder="https://api.exemplo.com/webhook"
              className="bg-muted/50"
            />
          </FormSection>
          <FormSection title="Método HTTP">
            <Select
              value={config.method || 'POST'}
              onValueChange={(value) => onUpdate({ ...config, method: value })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
          </FormSection>
        </>
      )}
    </div>
  );
}

function ConditionConfig({ node, onUpdate, entityType }: { node: Node; onUpdate: (config: any) => void; entityType?: string | null }) {
  const config = (node.data.config as any) || {};
  const subtype = node.data.subtype as string;
  
  // Campos disponíveis para a entidade atual
  const camposDisponiveis = getCamposParaEntidade(entityType || null);
  const camposAgrupados = getCamposAgrupados(entityType || null);
  const campoSelecionado = camposDisponiveis.find(c => c.field === config.field);
  const operadoresDisponiveis = campoSelecionado 
    ? operadoresPorTipo[campoSelecionado.type] || ['equals', 'not_equals']
    : ['equals', 'not_equals', 'contains', 'greater', 'less', 'is_empty', 'is_not_empty'];
  
  // ==========================================
  // CONDIÇÕES ESPECIAIS DE TEMPO
  // ==========================================
  
  if (subtype === 'time_elapsed') {
    return (
      <div className="space-y-6">
        <FormSection 
          title="Tempo Decorrido" 
          hint="Verifica se passou X tempo desde a criação ou última atualização"
        >
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={config.timeValue || ''}
              onChange={(e) => onUpdate({ ...config, timeValue: parseInt(e.target.value) || 0 })}
              placeholder="1"
              className="flex-1 bg-muted/50"
            />
            <Select
              value={config.timeUnit || 'hours'}
              onValueChange={(v) => onUpdate({ ...config, timeUnit: v })}
            >
              <SelectTrigger className="w-28 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutos</SelectItem>
                <SelectItem value="hours">Horas</SelectItem>
                <SelectItem value="days">Dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormSection>
        
        <FormSection title="Desde">
          <Select
            value={config.since || 'criacao'}
            onValueChange={(v) => onUpdate({ ...config, since: v })}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="criacao">Data de Criação</SelectItem>
              <SelectItem value="ultima_atualizacao">Última Atualização</SelectItem>
            </SelectContent>
          </Select>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Passou o tempo especificado<br/>
            <strong>Não →</strong> Ainda não passou
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'business_hours') {
    return (
      <div className="space-y-6">
        <FormSection title="Horário Comercial">
          <div className="flex gap-2 items-center">
            <Select
              value={config.startHour || '08:00'}
              onValueChange={(v) => onUpdate({ ...config, startHour: v })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['06:00', '07:00', '08:00', '09:00', '10:00'].map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">até</span>
            <Select
              value={config.endHour || '18:00'}
              onValueChange={(v) => onUpdate({ ...config, endHour: v })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map(h => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Dentro do horário comercial<br/>
            <strong>Não →</strong> Fora do horário
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'weekday') {
    return (
      <div className="space-y-6">
        <FormSection title="Tipo de Dia">
          <Select
            value={config.dayType || 'dia_util'}
            onValueChange={(v) => onUpdate({ ...config, dayType: v })}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dia_util">Dia Útil (Seg-Sex)</SelectItem>
              <SelectItem value="fim_de_semana">Fim de Semana</SelectItem>
              <SelectItem value="segunda">Segunda-feira</SelectItem>
              <SelectItem value="terca">Terça-feira</SelectItem>
              <SelectItem value="quarta">Quarta-feira</SelectItem>
              <SelectItem value="quinta">Quinta-feira</SelectItem>
              <SelectItem value="sexta">Sexta-feira</SelectItem>
              <SelectItem value="sabado">Sábado</SelectItem>
              <SelectItem value="domingo">Domingo</SelectItem>
            </SelectContent>
          </Select>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> É o dia selecionado<br/>
            <strong>Não →</strong> Não é o dia selecionado
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'date_passed') {
    const dateFields = entityType === 'order' 
      ? [{ value: 'delivery_estimate', label: 'Previsão de Entrega' }, { value: 'created_at', label: 'Data do Pedido' }]
      : [{ value: 'data_entrega', label: 'Data de Entrega' }, { value: 'data_pedido', label: 'Data do Pedido' }];
    
    return (
      <div className="space-y-6">
        <FormSection title="Campo de Data">
          <Select
            value={config.dateField || dateFields[0].value}
            onValueChange={(v) => onUpdate({ ...config, dateField: v })}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFields.map(f => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormSection>
        
        <FormSection title="Margem (dias)">
          <Input
            type="number"
            min="0"
            value={config.margin || 0}
            onChange={(e) => onUpdate({ ...config, margin: parseInt(e.target.value) || 0 })}
            placeholder="0"
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground mt-1">
            0 = exatamente na data, 1 = 1 dia após, etc.
          </p>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Data já passou<br/>
            <strong>Não →</strong> Data ainda não passou
          </p>
        </div>
      </div>
    );
  }
  
  // ==========================================
  // CONDIÇÕES DE INTERAÇÃO
  // ==========================================
  
  if (subtype === 'customer_replied') {
    return (
      <div className="space-y-6">
        <div className="bg-muted/30 rounded-lg p-4 text-sm">
          <p className="text-muted-foreground">
            Esta condição verifica se o cliente respondeu após a última mensagem enviada pelo atendente.
          </p>
        </div>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Cliente respondeu<br/>
            <strong>Não →</strong> Cliente não respondeu
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'no_reply_timeout') {
    return (
      <div className="space-y-6">
        <FormSection title="Tempo sem Resposta">
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={config.timeValue || 24}
              onChange={(e) => onUpdate({ ...config, timeValue: parseInt(e.target.value) || 24 })}
              placeholder="24"
              className="flex-1 bg-muted/50"
            />
            <Select
              value={config.timeUnit || 'hours'}
              onValueChange={(v) => onUpdate({ ...config, timeUnit: v })}
            >
              <SelectTrigger className="w-28 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Horas</SelectItem>
                <SelectItem value="days">Dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Passou o tempo sem resposta<br/>
            <strong>Não →</strong> Respondeu dentro do prazo
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'last_interaction') {
    return (
      <div className="space-y-6">
        <FormSection title="Condição">
          <Select
            value={config.operator || 'mais_de'}
            onValueChange={(v) => onUpdate({ ...config, operator: v })}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mais_de">Mais de</SelectItem>
              <SelectItem value="menos_de">Menos de</SelectItem>
            </SelectContent>
          </Select>
        </FormSection>
        
        <FormSection title="Tempo">
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={config.timeValue || 7}
              onChange={(e) => onUpdate({ ...config, timeValue: parseInt(e.target.value) || 7 })}
              placeholder="7"
              className="flex-1 bg-muted/50"
            />
            <Select
              value={config.timeUnit || 'days'}
              onValueChange={(v) => onUpdate({ ...config, timeUnit: v })}
            >
              <SelectTrigger className="w-28 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Horas</SelectItem>
                <SelectItem value="days">Dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Última interação atende à condição<br/>
            <strong>Não →</strong> Não atende
          </p>
        </div>
      </div>
    );
  }
  
  // ==========================================
  // CONDIÇÕES DE VALOR
  // ==========================================
  
  if (subtype === 'value_range') {
    return (
      <div className="space-y-6">
        <FormSection title="Faixa de Valor">
          <div className="flex gap-2 items-center">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Mínimo (R$)</label>
              <Input
                type="number"
                min="0"
                value={config.minValue || ''}
                onChange={(e) => onUpdate({ ...config, minValue: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="bg-muted/50"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Máximo (R$)</label>
              <Input
                type="number"
                min="0"
                value={config.maxValue || ''}
                onChange={(e) => onUpdate({ ...config, maxValue: parseFloat(e.target.value) || 0 })}
                placeholder="1000"
                className="bg-muted/50"
              />
            </div>
          </div>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Valor está na faixa<br/>
            <strong>Não →</strong> Valor fora da faixa
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'has_discount') {
    return (
      <div className="space-y-6">
        <div className="bg-muted/30 rounded-lg p-4 text-sm">
          <p className="text-muted-foreground">
            Verifica se o pedido tem algum desconto aplicado (valor do desconto maior que zero).
          </p>
        </div>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Tem desconto<br/>
            <strong>Não →</strong> Sem desconto
          </p>
        </div>
      </div>
    );
  }
  
  // ==========================================
  // CONDIÇÕES DE RELACIONAMENTO
  // ==========================================
  
  if (subtype === 'returning_customer') {
    return (
      <div className="space-y-6">
        <FormSection title="Mínimo de Pedidos Anteriores">
          <Input
            type="number"
            min="1"
            value={config.minOrders || 1}
            onChange={(e) => onUpdate({ ...config, minOrders: parseInt(e.target.value) || 1 })}
            placeholder="1"
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Quantos pedidos anteriores o cliente precisa ter
          </p>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Cliente recorrente<br/>
            <strong>Não →</strong> Primeiro pedido
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'customer_segment') {
    return (
      <div className="space-y-6">
        <FormSection title="Segmento">
          <Input
            value={config.segmentName || ''}
            onChange={(e) => onUpdate({ ...config, segmentName: e.target.value })}
            placeholder="Nome do segmento"
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Nome parcial ou completo do segmento
          </p>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Cliente está no segmento<br/>
            <strong>Não →</strong> Cliente não está
          </p>
        </div>
      </div>
    );
  }
  
  // ==========================================
  // CONDIÇÕES DE LOGÍSTICA (E-COMMERCE)
  // ==========================================
  
  if (subtype === 'delivery_delayed') {
    return (
      <div className="space-y-6">
        <FormSection title="Dias de Atraso">
          <Input
            type="number"
            min="1"
            value={config.delayDays || 1}
            onChange={(e) => onUpdate({ ...config, delayDays: parseInt(e.target.value) || 1 })}
            placeholder="1"
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Quantos dias após a previsão de entrega
          </p>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Entrega atrasada<br/>
            <strong>Não →</strong> Dentro do prazo
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'carrier_check') {
    return (
      <div className="space-y-6">
        <FormSection title="Transportadora">
          <Input
            value={config.carrier || ''}
            onChange={(e) => onUpdate({ ...config, carrier: e.target.value })}
            placeholder="Correios, Jadlog, Total Express..."
            className="bg-muted/50"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Nome parcial ou completo da transportadora
          </p>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> É a transportadora indicada<br/>
            <strong>Não →</strong> Outra transportadora
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'tracking_status') {
    return (
      <div className="space-y-6">
        <FormSection title="Condição do Rastreio">
          <Select
            value={config.hasTracking || 'tem_rastreio'}
            onValueChange={(v) => onUpdate({ ...config, hasTracking: v })}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tem_rastreio">Tem código de rastreio</SelectItem>
              <SelectItem value="sem_rastreio">Não tem código de rastreio</SelectItem>
            </SelectContent>
          </Select>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Condição atendida<br/>
            <strong>Não →</strong> Condição não atendida
          </p>
        </div>
      </div>
    );
  }
  
  // ==========================================
  // CONDIÇÕES ESPECIAIS ORIGINAIS
  // ==========================================
  
  if (subtype === 'exit_condition') {
    // Status disponíveis baseado na entidade
    const statusOptions = camposDisponiveis.find(c => c.field === 'status')?.options || [];
    
    return (
      <div className="space-y-6">
        <FormSection 
          title="Status que Encerram o Fluxo" 
          hint="O fluxo será encerrado se o registro atingir um destes status"
        >
          {statusOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {statusOptions.map(status => {
                const exitStatuses = Array.isArray(config.exitOnStatus) ? config.exitOnStatus : [];
                const isSelected = exitStatuses.includes(status);
                return (
                  <Badge
                    key={status}
                    variant={isSelected ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      const newStatuses = isSelected
                        ? exitStatuses.filter((s: string) => s !== status)
                        : [...exitStatuses, status];
                      onUpdate({ ...config, exitOnStatus: newStatuses });
                    }}
                  >
                    {status}
                  </Badge>
                );
              })}
            </div>
          ) : (
            <Input
              value={Array.isArray(config.exitOnStatus) ? config.exitOnStatus.join(', ') : (config.exitOnStatus || '')}
              onChange={(e) => onUpdate({ 
                ...config, 
                exitOnStatus: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              placeholder="Ex: cancelado, convertido"
              className="bg-muted/50"
            />
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Clique para selecionar os status que encerram o fluxo
          </p>
        </FormSection>
        
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
          <p className="text-destructive">
            <strong>Sim →</strong> Status bateu, encerra fluxo<br/>
            <strong>Não →</strong> Continua normalmente
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'wait_for_status') {
    const statusOptions = camposDisponiveis.find(c => c.field === 'status')?.options || [];
    
    return (
      <div className="space-y-6">
        <FormSection 
          title="Status Alvo" 
          hint="O fluxo aguardará até o registro atingir este status"
        >
          {statusOptions.length > 0 ? (
            <Select
              value={config.targetStatus || ''}
              onValueChange={(v) => onUpdate({ ...config, targetStatus: v })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Selecione o status alvo" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={config.targetStatus || ''}
              onChange={(e) => onUpdate({ ...config, targetStatus: e.target.value })}
              placeholder="Ex: em_producao, enviado"
              className="bg-muted/50"
            />
          )}
        </FormSection>
        
        <FormSection title="Timeout">
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={config.timeout || 24}
              onChange={(e) => onUpdate({ ...config, timeout: parseInt(e.target.value) || 24 })}
              className="flex-1 bg-muted/50"
            />
            <Select
              value={config.timeoutUnit || 'hours'}
              onValueChange={(value) => onUpdate({ ...config, timeoutUnit: value })}
            >
              <SelectTrigger className="w-28 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Horas</SelectItem>
                <SelectItem value="days">Dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormSection>
        
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 text-sm">
          <p className="text-primary">
            O fluxo pausará aqui até o status mudar ou timeout expirar
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'wait_for_stage') {
    return (
      <div className="space-y-6">
        <FormSection 
          title="Etapa de Produção Alvo" 
          hint="O fluxo aguardará até a etapa de produção mudar"
        >
          <Input
            value={config.targetStage || ''}
            onChange={(e) => onUpdate({ ...config, targetStage: e.target.value })}
            placeholder="Ex: impressao, acabamento, expedicao"
            className="bg-muted/50"
          />
        </FormSection>
        
        <FormSection title="Timeout">
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={config.timeout || 48}
              onChange={(e) => onUpdate({ ...config, timeout: parseInt(e.target.value) || 48 })}
              className="flex-1 bg-muted/50"
            />
            <Select
              value={config.timeoutUnit || 'hours'}
              onValueChange={(value) => onUpdate({ ...config, timeoutUnit: value })}
            >
              <SelectTrigger className="w-28 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Horas</SelectItem>
                <SelectItem value="days">Dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </FormSection>
      </div>
    );
  }
  
  if (subtype === 'time_condition') {
    return (
      <div className="space-y-6">
        <FormSection title="Horário Comercial">
          <div className="flex gap-2 items-center">
            <Input
              type="time"
              value={config.startTime || '08:00'}
              onChange={(e) => onUpdate({ ...config, startTime: e.target.value })}
              className="bg-muted/50"
            />
            <span className="text-muted-foreground">até</span>
            <Input
              type="time"
              value={config.endTime || '18:00'}
              onChange={(e) => onUpdate({ ...config, endTime: e.target.value })}
              className="bg-muted/50"
            />
          </div>
        </FormSection>
        
        <FormSection title="Dias da Semana">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'mon', label: 'Seg' },
              { key: 'tue', label: 'Ter' },
              { key: 'wed', label: 'Qua' },
              { key: 'thu', label: 'Qui' },
              { key: 'fri', label: 'Sex' },
              { key: 'sat', label: 'Sáb' },
              { key: 'sun', label: 'Dom' },
            ].map(day => {
              const days = config.days || ['mon', 'tue', 'wed', 'thu', 'fri'];
              const isActive = days.includes(day.key);
              return (
                <Badge
                  key={day.key}
                  variant={isActive ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    const newDays = isActive 
                      ? days.filter((d: string) => d !== day.key)
                      : [...days, day.key];
                    onUpdate({ ...config, days: newDays });
                  }}
                >
                  {day.label}
                </Badge>
              );
            })}
          </div>
        </FormSection>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Dentro do horário comercial<br/>
            <strong>Não →</strong> Fora do horário
          </p>
        </div>
      </div>
    );
  }
  
  if (subtype === 'field_contains') {
    return (
      <div className="space-y-6">
        <FormSection title="Campo a Verificar">
          {camposDisponiveis.length > 0 ? (
            <Select
              value={config.field || ''}
              onValueChange={(v) => onUpdate({ ...config, field: v })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Selecione o campo" />
              </SelectTrigger>
              <SelectContent>
                {camposDisponiveis.filter(c => c.type === 'text').map(campo => (
                  <SelectItem key={campo.field} value={campo.field}>
                    {campo.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={config.field || ''}
              onChange={(e) => onUpdate({ ...config, field: e.target.value })}
              placeholder="Ex: items, nome_produto"
              className="bg-muted/50"
            />
          )}
        </FormSection>
        
        <FormSection title="Valor a Procurar">
          <Input
            value={config.value || ''}
            onChange={(e) => onUpdate({ ...config, value: e.target.value })}
            placeholder="Ex: Personalizado"
            className="bg-muted/50"
          />
        </FormSection>
        
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            id="caseSensitive"
            checked={config.caseSensitive || false}
            onChange={(e) => onUpdate({ ...config, caseSensitive: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="caseSensitive" className="text-sm">
            Diferenciar maiúsculas/minúsculas
          </label>
        </div>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
          <p className="text-amber-700 dark:text-amber-300">
            <strong>Sim →</strong> Campo contém o valor<br/>
            <strong>Não →</strong> Campo não contém
          </p>
        </div>
      </div>
    );
  }
  
  // ==========================================
  // CONDIÇÃO PADRÃO: comparação de campo
  // ==========================================
  
  return (
    <div className="space-y-6">
      <FormSection title="Campo a Verificar" hint="Selecione o campo do registro que será avaliado">
        {camposDisponiveis.length > 0 ? (
          <Select
            value={config.field || ''}
            onValueChange={(v) => {
              // Limpar valor ao trocar campo
              onUpdate({ ...config, field: v, value: '' });
            }}
          >
            <SelectTrigger className="bg-muted/50">
              <SelectValue placeholder="Selecione o campo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(camposAgrupados).map(([category, campos]) => (
                <React.Fragment key={category}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                    {category}
                  </div>
                  {campos.map(campo => (
                    <SelectItem key={campo.field} value={campo.field}>
                      {campo.label}
                    </SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="space-y-2">
            <Input
              value={config.field || ''}
              onChange={(e) => onUpdate({ ...config, field: e.target.value })}
              placeholder="Ex: status, valor_total, cidade"
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              💡 Adicione um nó Trigger para ver os campos disponíveis
            </p>
          </div>
        )}
      </FormSection>
      
      <FormSection title="Operador">
        <Select
          value={config.operator || 'equals'}
          onValueChange={(value) => onUpdate({ ...config, operator: value })}
        >
          <SelectTrigger className="bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operadoresDisponiveis.map(op => (
              <SelectItem key={op} value={op}>
                {operatorLabels[op] || op}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormSection>
      
      {/* Valor de comparação - dinâmico baseado no tipo de campo */}
      {!['is_empty', 'is_not_empty'].includes(config.operator || '') && (
        <FormSection title="Valor de Comparação">
          {campoSelecionado?.type === 'select' && campoSelecionado.options ? (
            <Select
              value={config.value || ''}
              onValueChange={(v) => onUpdate({ ...config, value: v })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Selecione o valor" />
              </SelectTrigger>
              <SelectContent>
                {campoSelecionado.options.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : campoSelecionado?.type === 'number' ? (
            <Input
              type="number"
              value={config.value || ''}
              onChange={(e) => onUpdate({ ...config, value: e.target.value })}
              placeholder="Digite o valor numérico"
              className="bg-muted/50"
            />
          ) : campoSelecionado?.type === 'boolean' ? (
            <Select
              value={config.value || ''}
              onValueChange={(v) => onUpdate({ ...config, value: v })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Sim</SelectItem>
                <SelectItem value="false">Não</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={config.value || ''}
              onChange={(e) => onUpdate({ ...config, value: e.target.value })}
              placeholder="Valor para comparar"
              className="bg-muted/50"
            />
          )}
        </FormSection>
      )}
      
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">
        <p className="text-amber-700 dark:text-amber-300">
          <strong>Sim →</strong> Se a condição for verdadeira<br/>
          <strong>Não →</strong> Se a condição for falsa
        </p>
      </div>
    </div>
  );
}

function ControlConfig({ node, onUpdate }: { node: Node; onUpdate: (config: any) => void }) {
  const config = (node.data.config as any) || {};
  const subtype = node.data.subtype as string;
  
  // Normalizar valores - suporta ambos formatos (amount/unit e delay/delayUnit)
  const delayValue = config.delay || config.amount || '';
  const delayUnit = config.delayUnit || config.unit || 'minutes';
  
  return (
    <div className="space-y-6">
      {subtype === 'delay' && (
        <FormSection title="Tempo de Espera">
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={delayValue}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                // Salvar em ambos os formatos para compatibilidade
                onUpdate({ ...config, delay: value, amount: value });
              }}
              placeholder="30"
              className="flex-1 bg-muted/50"
            />
            <Select
              value={delayUnit}
              onValueChange={(value) => {
                // Salvar em ambos os formatos para compatibilidade
                onUpdate({ ...config, delayUnit: value, unit: value });
              }}
            >
              <SelectTrigger className="w-28 bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minutes">Minutos</SelectItem>
                <SelectItem value="hours">Horas</SelectItem>
                <SelectItem value="days">Dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            O fluxo pausará aqui pelo tempo especificado
          </p>
        </FormSection>
      )}
      
      {subtype === 'schedule' && (
        <>
          <FormSection title="Tipo de Agendamento">
            <Select
              value={config.scheduleType || 'specific_time'}
              onValueChange={(value) => onUpdate({ ...config, scheduleType: value })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="specific_time">Horário específico</SelectItem>
                <SelectItem value="next_business_day">Próximo dia útil</SelectItem>
              </SelectContent>
            </Select>
          </FormSection>
          <FormSection title="Horário de Execução">
            <Input
              type="time"
              value={config.time || '08:00'}
              onChange={(e) => onUpdate({ ...config, time: e.target.value })}
              className="bg-muted/50"
            />
          </FormSection>
        </>
      )}
      
      {subtype === 'split_ab' && (
        <FormSection title="Divisão do Teste A/B" hint="Percentual de execuções que seguirão o caminho A">
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="0"
              max="100"
              value={config.splitPercentage || 50}
              onChange={(e) => onUpdate({ ...config, splitPercentage: parseInt(e.target.value) || 50 })}
              className="w-20 bg-muted/50 text-center"
            />
            <span className="text-muted-foreground">% → Caminho A</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Os outros {100 - (config.splitPercentage || 50)}% seguirão o caminho B
          </p>
        </FormSection>
      )}
      
      {subtype === 'limit_rate' && (
        <>
          <FormSection title="Limite de Execuções">
            <Input
              type="number"
              min="1"
              value={config.limit || ''}
              onChange={(e) => onUpdate({ ...config, limit: parseInt(e.target.value) || 0 })}
              placeholder="10"
              className="bg-muted/50"
            />
          </FormSection>
          <FormSection title="Por Período">
            <Select
              value={config.period || 'hour'}
              onValueChange={(value) => onUpdate({ ...config, period: value })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minute">Por minuto</SelectItem>
                <SelectItem value="hour">Por hora</SelectItem>
                <SelectItem value="day">Por dia</SelectItem>
              </SelectContent>
            </Select>
          </FormSection>
        </>
      )}
      
      {subtype === 'stop_flow' && (
        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
          Este nó encerra a execução do fluxo. Nenhuma ação após este ponto será executada.
        </div>
      )}
    </div>
  );
}

export function NodeConfigSheet({ node, entityType, onUpdate, onUpdateLabel, onDelete, onClose, onDuplicate }: NodeConfigSheetProps) {
  if (!node) return null;
  
  const nodeType = node.type as string;
  const typeConfig = nodeTypeConfig[nodeType] || nodeTypeConfig.trigger;
  
  return (
    <Sheet open={!!node} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[420px] sm:max-w-[420px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className={cn(
          'p-4 border-b',
          typeConfig.bgColor
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
              'bg-gradient-to-br from-background to-muted border shadow-sm',
              typeConfig.color
            )}>
              {typeConfig.icon}
            </div>
            <div className="flex-1 min-w-0">
              <SheetDescription className="sr-only">
                Configure as propriedades deste nó do tipo {typeConfig.label}
              </SheetDescription>
              <Badge 
                variant="outline" 
                className={cn('mb-2', typeConfig.color, typeConfig.borderColor)}
              >
                {typeConfig.label}
              </Badge>
              {onUpdateLabel ? (
                <Input
                  value={node.data.label as string}
                  onChange={(e) => onUpdateLabel(e.target.value)}
                  className="font-semibold text-base bg-background/50"
                  placeholder="Nome do nó"
                />
              ) : (
                <SheetTitle className="text-lg truncate">
                  {node.data.label as string}
                </SheetTitle>
              )}
            </div>
          </div>
        </SheetHeader>
        
        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {nodeType === 'trigger' && <TriggerConfig node={node} onUpdate={onUpdate} />}
            {nodeType === 'action' && <ActionConfig node={node} onUpdate={onUpdate} />}
            {nodeType === 'condition' && <ConditionConfig node={node} onUpdate={onUpdate} entityType={entityType} />}
            {nodeType === 'control' && <ControlConfig node={node} onUpdate={onUpdate} />}
          </div>
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-4 border-t bg-muted/30 space-y-2">
          {onDuplicate && (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={onDuplicate}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicar Nó
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Nó
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir nó?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O nó "{node.data.label as string}" será removido permanentemente do fluxo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}
