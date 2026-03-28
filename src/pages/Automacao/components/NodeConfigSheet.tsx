import React from 'react';
import { Node } from '@xyflow/react';
import { Trash2, Zap, Send, GitBranch, Clock, Copy, Info } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
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

interface AutomationWhatsappInstanceOption {
  id: string;
  nome: string;
}

interface AutomationAttendantOption {
  id: string;
  nome: string;
}

interface AutomationInstanceUserLink {
  instance_id: string;
  user_id: string;
}

function useAutomationWhatsappOptions(enabled: boolean) {
  const instancesQuery = useQuery({
    queryKey: ['automation-whatsapp-instances'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('id, nome')
        .eq('is_active', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data || []) as AutomationWhatsappInstanceOption[];
    },
  });

  const attendantsQuery = useQuery({
    queryKey: ['automation-attendants'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, ativo')
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data || [])
        .filter((item: any) => item.ativo !== false)
        .map((item: any) => ({ id: String(item.id), nome: String(item.nome || '') })) as AutomationAttendantOption[];
    },
  });

  const linksQuery = useQuery({
    queryKey: ['automation-whatsapp-instance-users'],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instance_users')
        .select('instance_id, user_id');
      if (error) throw error;
      return (data || []) as AutomationInstanceUserLink[];
    },
  });

  return {
    instances: instancesQuery.data || [],
    attendants: attendantsQuery.data || [],
    links: linksQuery.data || [],
    isLoading: instancesQuery.isLoading || attendantsQuery.isLoading || linksQuery.isLoading,
  };
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

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
  const isWhatsappTrigger = ['whatsapp_message', 'whatsapp_new_lead', 'whatsapp_inactive'].includes(subtype);
  const { instances, isLoading } = useAutomationWhatsappOptions(isWhatsappTrigger);
  const selectedInstanceIds = toStringArray(config.instance_ids);

  const toggleInstance = (instanceId: string) => {
    const next = selectedInstanceIds.includes(instanceId)
      ? selectedInstanceIds.filter((id) => id !== instanceId)
      : [...selectedInstanceIds, instanceId];
    onUpdate({ ...config, instance_ids: next });
  };

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

      {isWhatsappTrigger && (
        <>
          <FormSection
            title="Instâncias Monitoradas"
            hint="Se nenhuma instância for marcada, o gatilho considera todas as instâncias com acesso"
          >
            {isLoading ? (
              <div className="text-xs text-muted-foreground">Carregando instâncias...</div>
            ) : instances.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhuma instância ativa encontrada.</div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 rounded-lg border bg-muted/20 p-2">
                {instances.map((instance) => (
                  <label key={instance.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedInstanceIds.includes(instance.id)}
                      onChange={() => toggleInstance(instance.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span>{instance.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </FormSection>

          {subtype === 'whatsapp_message' && (
            <FormSection title="Filtros">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.skip_groups === true}
                  onChange={(e) => onUpdate({ ...config, skip_groups: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Ignorar conversas em grupo
              </label>
            </FormSection>
          )}

          {subtype === 'whatsapp_new_lead' && (
            <FormSection title="Regras de Novo Lead">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.only_unassigned !== false}
                    onChange={(e) => onUpdate({ ...config, only_unassigned: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Somente conversas sem atendente
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.skip_groups !== false}
                    onChange={(e) => onUpdate({ ...config, skip_groups: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Ignorar grupos
                </label>
              </div>
            </FormSection>
          )}

          {subtype === 'whatsapp_inactive' && (
            <>
              <FormSection title="Prazo de Inatividade">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={config.inactivity_days || 3}
                    onChange={(e) => {
                      const inactivityDays = Math.max(1, parseInt(e.target.value, 10) || 1);
                      onUpdate({
                        ...config,
                        inactivity_days: inactivityDays,
                        min_inactivity_days: inactivityDays,
                      });
                    }}
                    className="w-24 bg-muted/50"
                  />
                  <span className="text-sm text-muted-foreground">dias sem interação do cliente</span>
                </div>
              </FormSection>

              <FormSection title="Escopo">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={config.only_assigned !== false}
                    onChange={(e) => onUpdate({ ...config, only_assigned: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Apenas conversas com atendente atribuído
                </label>
              </FormSection>
            </>
          )}
        </>
      )}

      {!['order_status_changed', 'lead_status_changed', 'whatsapp_message', 'whatsapp_new_lead', 'whatsapp_inactive'].includes(subtype) && (
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
  const needsWhatsappOptions = [
    'send_whatsapp',
    'assign_to_user',
    'assign_round_robin',
  ].includes(subtype);
  const {
    instances: whatsappInstances,
    attendants,
    links,
    isLoading: loadingWhatsappOptions,
  } = useAutomationWhatsappOptions(needsWhatsappOptions);

  // Inicializar config com valores existentes para suportar formatos antigos
  const normalizedConfig = {
    ...config,
    // Normalizar campos de mensagem
    message: config.message || (config.messages?.[0] || ''),
    randomMessages: config.randomMessages || false,
    messages: config.messages || [],
  };

  const selectedEligibleUserIds = toStringArray(config.eligible_user_ids);
  const instanceIdsFromConfig = toStringArray(config.instance_ids);
  const availableAttendants = React.useMemo(() => {
    if (instanceIdsFromConfig.length === 0) return attendants;
    const allowedIds = new Set(
      links
        .filter((link) => instanceIdsFromConfig.includes(String(link.instance_id)))
        .map((link) => String(link.user_id)),
    );
    return attendants.filter((attendant) => allowedIds.has(attendant.id));
  }, [attendants, instanceIdsFromConfig, links]);

  const rules = Array.isArray(config.rules) ? config.rules : [];
  const keywordVariables = [
    '[saudação]',
    '[nome atendente]',
    '[nome]',
    '[telefone]',
    '[data atual]',
    '[hora atual]',
  ];

  const toggleEligibleUser = (userId: string) => {
    const next = selectedEligibleUserIds.includes(userId)
      ? selectedEligibleUserIds.filter((id) => id !== userId)
      : [...selectedEligibleUserIds, userId];
    onUpdate({ ...config, eligible_user_ids: next });
  };

  const updateKeywordRule = (index: number, patch: Record<string, unknown>) => {
    const nextRules = rules.map((rule, currentIndex) => {
      if (currentIndex !== index) return rule;
      return { ...(rule as Record<string, unknown>), ...patch };
    });
    onUpdate({ ...config, rules: nextRules });
  };

  const removeKeywordRule = (index: number) => {
    const nextRules = rules.filter((_, currentIndex) => currentIndex !== index);
    onUpdate({ ...config, rules: nextRules });
  };

  const addKeywordRule = () => {
    const nextRules = [
      ...rules,
      {
        keyword: '',
        response: '',
        responses: [''],
        match_type: config.match_type || 'contains',
      },
    ];
    onUpdate({ ...config, rules: nextRules });
    setTimeout(() => {
      const scrollContainer = document.querySelector('[data-automation-config-scroll]') as HTMLElement | null;
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }, 0);
  };

  const getKeywordRuleResponses = (rule: Record<string, unknown>): string[] => {
    const responses = Array.isArray(rule.responses)
      ? rule.responses.map((item) => String(item ?? ''))
      : [];
    if (responses.length > 0) return responses;
    if (typeof rule.response === 'string') return [rule.response];
    return [''];
  };

  const updateKeywordRuleResponses = (index: number, responses: string[]) => {
    const normalizedResponses = responses.length > 0 ? responses : [''];
    updateKeywordRule(index, {
      responses: normalizedResponses,
      response: normalizedResponses[0] || '',
    });
  };

  const updateKeywordRuleResponseAt = (index: number, responseIndex: number, value: string) => {
    const currentRule = (rules[index] as Record<string, unknown>) || {};
    const currentResponses = getKeywordRuleResponses(currentRule);
    const nextResponses = currentResponses.map((item, i) => (i === responseIndex ? value : item));
    updateKeywordRuleResponses(index, nextResponses);
  };

  const addKeywordRuleResponse = (index: number) => {
    const currentRule = (rules[index] as Record<string, unknown>) || {};
    const currentResponses = getKeywordRuleResponses(currentRule);
    updateKeywordRuleResponses(index, [...currentResponses, '']);
    setTimeout(() => {
      const scrollContainer = document.querySelector('[data-automation-config-scroll]') as HTMLElement | null;
      if (scrollContainer) {
        scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
      }
    }, 0);
  };

  const removeKeywordRuleResponse = (index: number, responseIndex: number) => {
    const currentRule = (rules[index] as Record<string, unknown>) || {};
    const currentResponses = getKeywordRuleResponses(currentRule);
    const nextResponses = currentResponses.filter((_, currentIndex) => currentIndex !== responseIndex);
    updateKeywordRuleResponses(index, nextResponses.length > 0 ? nextResponses : ['']);
  };

  const appendVariableToKeywordRuleResponse = (index: number, responseIndex: number, variable: string) => {
    const currentRule = (rules[index] as Record<string, unknown>) || {};
    const currentResponses = getKeywordRuleResponses(currentRule);
    const currentValue = currentResponses[responseIndex] || '';
    const separator = currentValue.trim() ? ' ' : '';
    updateKeywordRuleResponseAt(index, responseIndex, `${currentValue}${separator}${variable}`);
  };

  const renderKeywordRulesEditor = (isExpanded = false) => (
    <FormSection
      title="Regras de Palavra/Frase"
      hint={isExpanded ? 'Editor ampliado para facilitar textos maiores.' : undefined}
    >
      <div className="space-y-3">
        {rules.length === 0 && (
          <div className="text-xs text-muted-foreground rounded-lg border border-dashed p-3">
            Nenhuma regra cadastrada.
          </div>
        )}

        {rules.map((rule, index) => {
          const typedRule = rule as Record<string, unknown>;
          const responseList = getKeywordRuleResponses(typedRule);
          return (
            <div key={`${index}-${String(typedRule.keyword || '')}`} className="rounded-xl border bg-muted/20 p-3 sm:p-4 space-y-3">
              <div className="grid gap-2 sm:grid-cols-[1fr,10rem]">
                <Input
                  value={String(typedRule.keyword || '')}
                  onChange={(e) => updateKeywordRule(index, { keyword: e.target.value })}
                  placeholder="Palavra ou frase"
                  className="bg-background"
                />
                <Select
                  value={String(typedRule.match_type || config.match_type || 'contains')}
                  onValueChange={(value) => updateKeywordRule(index, { match_type: value })}
                >
                  <SelectTrigger className="w-40 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contém</SelectItem>
                    <SelectItem value="exact">Exata</SelectItem>
                    <SelectItem value="starts_with">Começa com</SelectItem>
                    <SelectItem value="ends_with">Termina com</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                {responseList.map((responseValue, responseIndex) => (
                  <div key={`${index}-response-${responseIndex}`} className="space-y-2 rounded-lg border bg-background/70 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">
                        Resposta {responseIndex + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeKeywordRuleResponse(index, responseIndex)}
                      >
                        Remover resposta
                      </Button>
                    </div>
                    <Textarea
                      value={responseValue}
                      onChange={(e) => updateKeywordRuleResponseAt(index, responseIndex, e.target.value)}
                      placeholder="Resposta automática"
                      rows={isExpanded ? 5 : 3}
                      className="bg-background resize-none min-h-[120px]"
                    />
                    <div className="flex flex-wrap gap-1">
                      {keywordVariables.map((variable) => (
                        <Badge
                          key={`${index}-${responseIndex}-${variable}`}
                          variant="secondary"
                          className="text-[10px] cursor-pointer"
                          onClick={() => appendVariableToKeywordRuleResponse(index, responseIndex, variable)}
                        >
                          {variable}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addKeywordRuleResponse(index)}
                >
                  Adicionar resposta
                </Button>
                <p className="text-xs text-muted-foreground">
                  Se houver mais de uma resposta, o envio sera aleatorio.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeKeywordRule(index)}
                >
                  Remover regra
                </Button>
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addKeywordRule}
        >
          Adicionar regra
        </Button>
      </div>
    </FormSection>
  );

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
                    onUpdate({
                      ...config,
                      randomMessages: true,
                      messages: [config.message || '', '', '', '']
                    });
                  } else {
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
                  Uma mensagem será escolhida aleatoriamente a cada envio
                </p>
              </div>
            )}
          </FormSection>

          <FormSection
            title="Instância de Envio"
            hint="Opcional para fluxos de WhatsApp; obrigatório para fluxos fora do atendimento"
          >
            <Select
              value={config.instance_id || 'auto'}
              onValueChange={(value) => onUpdate({ ...config, instance_id: value === 'auto' ? undefined : value })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Usar instância da conversa</SelectItem>
                {whatsappInstances.map((instance) => (
                  <SelectItem key={instance.id} value={instance.id}>{instance.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                <SelectItem value="info">Informação</SelectItem>
                <SelectItem value="warning">Alerta</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
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

      {subtype === 'assign_to_user' && (
        <>
          <FormSection title="Atendente Responsável">
            {loadingWhatsappOptions ? (
              <div className="text-xs text-muted-foreground">Carregando atendentes...</div>
            ) : attendants.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum atendente ativo encontrado.</div>
            ) : (
              <Select
                value={config.user_id || 'none'}
                onValueChange={(value) => onUpdate({ ...config, user_id: value === 'none' ? undefined : value })}
              >
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Selecione um atendente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione</SelectItem>
                  {attendants.map((attendant) => (
                    <SelectItem key={attendant.id} value={attendant.id}>{attendant.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormSection>

          <FormSection title="Comportamento">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.mark_in_progress !== false}
                onChange={(e) => onUpdate({ ...config, mark_in_progress: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              Marcar conversa como em atendimento
            </label>
          </FormSection>
        </>
      )}

      {subtype === 'assign_round_robin' && (
        <>
          <FormSection
            title="Atendentes Elegíveis"
            hint="Se nenhum atendente for marcado, a ação usa os usuários vinculados à instância"
          >
            {loadingWhatsappOptions ? (
              <div className="text-xs text-muted-foreground">Carregando atendentes...</div>
            ) : availableAttendants.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum atendente disponível para seleção.</div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 rounded-lg border bg-muted/20 p-2">
                {availableAttendants.map((attendant) => (
                  <label key={attendant.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedEligibleUserIds.includes(attendant.id)}
                      onChange={() => toggleEligibleUser(attendant.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <span>{attendant.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection title="Regras de Distribuição">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.only_unassigned !== false}
                  onChange={(e) => onUpdate({ ...config, only_unassigned: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Distribuir apenas se não houver atendente definido
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.skip_groups !== false}
                  onChange={(e) => onUpdate({ ...config, skip_groups: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Ignorar grupos
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.mark_in_progress !== false}
                  onChange={(e) => onUpdate({ ...config, mark_in_progress: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Marcar conversa como em atendimento
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.create_system_message !== false}
                  onChange={(e) => onUpdate({ ...config, create_system_message: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Registrar mensagem interna da distribuição
              </label>
            </div>
          </FormSection>
        </>
      )}

      {subtype === 'set_followup_flag' && (
        <>
          <FormSection title="Cor da Marcação">
            <div className="flex gap-2">
              <Input
                type="color"
                value={config.color || '#f59e0b'}
                onChange={(e) => onUpdate({ ...config, color: e.target.value })}
                className="w-14 h-10 p-1 bg-muted/50"
              />
              <Input
                value={config.color || '#f59e0b'}
                onChange={(e) => onUpdate({ ...config, color: e.target.value })}
                placeholder="#f59e0b"
                className="flex-1 bg-muted/50 font-mono"
              />
            </div>
          </FormSection>

          <FormSection title="Motivo">
            <Textarea
              value={config.reason || ''}
              onChange={(e) => onUpdate({ ...config, reason: e.target.value })}
              placeholder="Conversa sem interação recente"
              rows={3}
              className="bg-muted/50 resize-none"
            />
          </FormSection>

          <FormSection title="Notificação">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.notify_assigned_user === true}
                onChange={(e) => onUpdate({ ...config, notify_assigned_user: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              Notificar atendente atribuído
            </label>
          </FormSection>
        </>
      )}

      {subtype === 'keyword_auto_reply' && (
        <>
          <FormSection title="Correspondência Padrão">
            <Select
              value={config.match_type || 'contains'}
              onValueChange={(value) => onUpdate({ ...config, match_type: value })}
            >
              <SelectTrigger className="bg-muted/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contém</SelectItem>
                <SelectItem value="exact">Exata</SelectItem>
                <SelectItem value="starts_with">Começa com</SelectItem>
                <SelectItem value="ends_with">Termina com</SelectItem>
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm mt-2">
              <input
                type="checkbox"
                checked={config.case_sensitive === true}
                onChange={(e) => onUpdate({ ...config, case_sensitive: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              Diferenciar maiúsculas e minúsculas
            </label>
          </FormSection>

          <FormSection title="Cooldown">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                value={config.cooldown_minutes ?? 60}
                onChange={(e) => onUpdate({ ...config, cooldown_minutes: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-24 bg-muted/50"
              />
              <span className="text-sm text-muted-foreground">minutos sem repetir resposta automática</span>
            </div>
          </FormSection>

          {renderKeywordRulesEditor(true)}
        </>
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
  // CONDIÇÃ•ES ESPECIAIS DE TEMPO
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
  // CONDIÇÃ•ES DE INTERAÇÃƒO
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
  // CONDIÇÃ•ES DE VALOR
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
  // CONDIÇÃ•ES DE RELACIONAMENTO
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
  // CONDIÇÃ•ES DE LOGÃSTICA (E-COMMERCE)
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
  // CONDIÇÃ•ES ESPECIAIS ORIGINAIS
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
  // CONDIÇÃƒO PADRÃƒO: comparação de campo
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
  const nodeSubtype = String(node.data.subtype || 'padrao');
  
  return (
    <Dialog open={!!node} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[98vw] max-w-[1240px] max-h-[94dvh] h-[94dvh] p-0 overflow-hidden border shadow-2xl rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Configurações do Nó</DialogTitle>
          <DialogDescription>
            Configure as propriedades do nó selecionado no fluxo de automação.
          </DialogDescription>
        </DialogHeader>

        <div className="h-full min-h-0 flex flex-col lg:flex-row bg-gradient-to-br from-background via-background to-muted/15">
          <aside className="lg:w-[320px] xl:w-[360px] shrink-0 border-b lg:border-b-0 lg:border-r bg-card/65 backdrop-blur flex flex-col min-h-0">
            <div className="min-h-0 overflow-y-auto">
              <div className={cn('p-5 border-b', typeConfig.bgColor)}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                    'bg-gradient-to-br from-background to-muted border shadow-sm',
                    typeConfig.color
                  )}>
                    {typeConfig.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className={cn('mb-2', typeConfig.color, typeConfig.borderColor)}>
                      {typeConfig.label}
                    </Badge>
                    {onUpdateLabel ? (
                      <Input
                        value={node.data.label as string}
                        onChange={(e) => onUpdateLabel(e.target.value)}
                        className="font-semibold text-base bg-background/90"
                        placeholder="Nome do nó"
                      />
                    ) : (
                      <h3 className="text-lg font-semibold truncate">{node.data.label as string}</h3>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">Tipo</p>
                  <p className="text-sm font-medium">{typeConfig.label}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs text-muted-foreground mb-1">Subtipo</p>
                  <p className="text-sm font-medium break-all">{nodeSubtype}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ajuste os campos no painel ao lado. As alterações são aplicadas em tempo real.
                </p>
              </div>
            </div>

            <div className="shrink-0 p-4 sm:p-5 border-t bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 space-y-2">
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
                  <Button variant="destructive" className="w-full">
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
          </aside>

          <section className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-background">
            <div className="shrink-0 px-5 sm:px-6 py-4 border-b bg-gradient-to-r from-background to-muted/20">
              <h4 className="text-base font-semibold">Configurações</h4>
              <p className="text-sm text-muted-foreground">
                Defina como este nó deve se comportar dentro do fluxo.
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-automation-config-scroll>
              <div className="mx-auto w-full max-w-4xl p-4 sm:p-6 pb-10">
                {nodeType === 'trigger' && <TriggerConfig node={node} onUpdate={onUpdate} />}
                {nodeType === 'action' && <ActionConfig node={node} onUpdate={onUpdate} />}
                {nodeType === 'condition' && <ConditionConfig node={node} onUpdate={onUpdate} entityType={entityType} />}
                {nodeType === 'control' && <ControlConfig node={node} onUpdate={onUpdate} />}
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}




