import { useEffect, useMemo, useState } from 'react';
import { Bot, BookOpen, CircleHelp, Pencil, Plus, Save, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AiProvider,
  WhatsappAiAgent,
  WhatsappAiKnowledgeItem,
  useDeleteWhatsappAiAgent,
  useDeleteWhatsappAiKnowledgeItem,
  useSaveWhatsappAiAgent,
  useSaveWhatsappAiKnowledgeItem,
  useWhatsappAiAgents,
  useWhatsappAiKnowledgeItems,
} from '@/hooks/useWhatsappAiAgents';

type AgentFormState = {
  id?: string;
  agent_key: string;
  name: string;
  description: string;
  provider: AiProvider;
  model: string;
  fallback_provider: '' | AiProvider;
  fallback_model: string;
  system_prompt: string;
  temperature: number;
  max_output_tokens: number;
  max_context_messages: number;
  confidence_threshold: number;
  max_auto_replies: number;
  handoff_mode: 'round_robin' | 'specific_user';
  handoff_user_id: string;
  eligible_user_ids: string[];
  is_active: boolean;
};

type SystemUserOption = {
  id: string;
  nome: string;
};

type KnowledgeFormState = {
  id?: string;
  agent_id: string;
  title: string;
  content: string;
  priority: number;
  tags_text: string;
  is_active: boolean;
};

const defaultSystemPrompt = [
  'Voce e um agente de primeiro atendimento no WhatsApp.',
  'Seja educado, objetivo e claro.',
  'Quando faltar informacao, solicite os dados essenciais.',
  'Se houver baixa confianca, acione handoff para humano.',
].join('\n');

function toAgentForm(agent?: WhatsappAiAgent | null): AgentFormState {
  if (!agent) {
    return {
      agent_key: '',
      name: '',
      description: '',
      provider: 'openai',
      model: 'gpt-5-mini',
      fallback_provider: '',
      fallback_model: '',
      system_prompt: defaultSystemPrompt,
      temperature: 0.2,
      max_output_tokens: 350,
      max_context_messages: 12,
      confidence_threshold: 0.7,
      max_auto_replies: 2,
      handoff_mode: 'round_robin',
      handoff_user_id: '',
      eligible_user_ids: [],
      is_active: true,
    };
  }

  return {
    id: agent.id,
    agent_key: agent.agent_key,
    name: agent.name,
    description: agent.description || '',
    provider: agent.provider,
    model: agent.model,
    fallback_provider: agent.fallback_provider || '',
    fallback_model: agent.fallback_model || '',
    system_prompt: agent.system_prompt,
    temperature: Number(agent.temperature || 0.2),
    max_output_tokens: Number(agent.max_output_tokens || 350),
    max_context_messages: Number(agent.max_context_messages || 12),
    confidence_threshold: Number(agent.confidence_threshold || 0.7),
    max_auto_replies: Number(agent.max_auto_replies || 2),
    handoff_mode: agent.handoff_mode || 'round_robin',
    handoff_user_id: agent.handoff_user_id || '',
    eligible_user_ids: Array.isArray(agent.eligible_user_ids) ? agent.eligible_user_ids : [],
    is_active: agent.is_active !== false,
  };
}

function toKnowledgeForm(agentId: string, item?: WhatsappAiKnowledgeItem | null): KnowledgeFormState {
  if (!item) {
    return {
      agent_id: agentId,
      title: '',
      content: '',
      priority: 100,
      tags_text: '',
      is_active: true,
    };
  }
  return {
    id: item.id,
    agent_id: item.agent_id,
    title: item.title || '',
    content: item.content,
    priority: Number(item.priority || 100),
    tags_text: Array.isArray(item.tags) ? item.tags.join(', ') : '',
    is_active: item.is_active !== false,
  };
}

function parseCsv(value: string): string[] {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function LabelComAjuda({ label, ajuda }: { label: string; ajuda?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label>{label}</Label>
      {ajuda ? (
        <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Ajuda: ${label}`}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <CircleHelp className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">
              {ajuda}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </div>
  );
}

export default function AgentesIA() {
  const { data: agents = [], isLoading } = useWhatsappAiAgents();
  const { data: systemUsers = [] } = useQuery({
    queryKey: ['whatsapp-ai-system-users'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, nome, ativo')
        .order('nome', { ascending: true });
      if (error) throw error;
      return (data || [])
        .filter((item: any) => item.ativo !== false)
        .map((item: any) => ({ id: String(item.id), nome: String(item.nome || '') })) as SystemUserOption[];
    },
  });
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  );

  const { data: knowledgeItems = [], isLoading: knowledgeLoading } = useWhatsappAiKnowledgeItems(selectedAgent?.id);

  const saveAgent = useSaveWhatsappAiAgent();
  const deleteAgent = useDeleteWhatsappAiAgent();
  const saveKnowledgeItem = useSaveWhatsappAiKnowledgeItem();
  const deleteKnowledgeItem = useDeleteWhatsappAiKnowledgeItem();

  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [agentForm, setAgentForm] = useState<AgentFormState>(() => toAgentForm(null));
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);

  const [knowledgeDialogOpen, setKnowledgeDialogOpen] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState<KnowledgeFormState>(() => toKnowledgeForm(''));
  const [deleteKnowledgeState, setDeleteKnowledgeState] = useState<{ id: string; agent_id: string } | null>(null);

  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    }
    if (selectedAgentId && !agents.some((agent) => agent.id === selectedAgentId)) {
      setSelectedAgentId(agents[0]?.id || null);
    }
  }, [agents, selectedAgentId]);

  const handleOpenNewAgent = () => {
    setAgentForm(toAgentForm(null));
    setAgentDialogOpen(true);
  };

  const handleOpenEditAgent = (agent: WhatsappAiAgent) => {
    setAgentForm(toAgentForm(agent));
    setAgentDialogOpen(true);
  };

  const handleSaveAgent = async () => {
    await saveAgent.mutateAsync({
      id: agentForm.id,
      agent_key: agentForm.agent_key,
      name: agentForm.name,
      description: agentForm.description || null,
      provider: agentForm.provider,
      model: agentForm.model,
      fallback_provider: agentForm.fallback_provider || null,
      fallback_model: agentForm.fallback_model || null,
      system_prompt: agentForm.system_prompt,
      temperature: agentForm.temperature,
      max_output_tokens: agentForm.max_output_tokens,
      max_context_messages: agentForm.max_context_messages,
      confidence_threshold: agentForm.confidence_threshold,
      max_auto_replies: agentForm.max_auto_replies,
      handoff_mode: agentForm.handoff_mode,
      handoff_user_id: agentForm.handoff_user_id || null,
      eligible_user_ids: agentForm.eligible_user_ids,
      is_active: agentForm.is_active,
    });

    setAgentDialogOpen(false);
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
    }
  };

  const handleDeleteAgent = async () => {
    if (!deleteAgentId) return;
    await deleteAgent.mutateAsync(deleteAgentId);
    setDeleteAgentId(null);
  };

  const toggleEligibleUser = (userId: string) => {
    setAgentForm((prev) => {
      const exists = prev.eligible_user_ids.includes(userId);
      return {
        ...prev,
        eligible_user_ids: exists
          ? prev.eligible_user_ids.filter((id) => id !== userId)
          : [...prev.eligible_user_ids, userId],
      };
    });
  };

  const handleOpenNewKnowledge = () => {
    if (!selectedAgent?.id) return;
    setKnowledgeForm(toKnowledgeForm(selectedAgent.id, null));
    setKnowledgeDialogOpen(true);
  };

  const handleOpenEditKnowledge = (item: WhatsappAiKnowledgeItem) => {
    setKnowledgeForm(toKnowledgeForm(item.agent_id, item));
    setKnowledgeDialogOpen(true);
  };

  const handleSaveKnowledge = async () => {
    await saveKnowledgeItem.mutateAsync({
      id: knowledgeForm.id,
      agent_id: knowledgeForm.agent_id,
      title: knowledgeForm.title || null,
      content: knowledgeForm.content,
      priority: knowledgeForm.priority,
      tags: parseCsv(knowledgeForm.tags_text),
      is_active: knowledgeForm.is_active,
    });
    setKnowledgeDialogOpen(false);
  };

  const handleDeleteKnowledge = async () => {
    if (!deleteKnowledgeState) return;
    await deleteKnowledgeItem.mutateAsync(deleteKnowledgeState);
    setDeleteKnowledgeState(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Agentes IA
          </h1>
          <p className="text-muted-foreground">
            Configure os agentes de atendimento e a base de conhecimento usada no primeiro contato.
          </p>
        </div>
        <Button onClick={handleOpenNewAgent}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agente
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px,1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Lista de Agentes</CardTitle>
            <CardDescription>Selecione um agente para editar configuracoes e conhecimento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando agentes...</p>
            ) : agents.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum agente cadastrado ainda.</p>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedAgentId(agent.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedAgentId === agent.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{agent.name}</div>
                    <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                      {agent.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <code>{agent.agent_key}</code> | {agent.provider}/{agent.model}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenEditAgent(agent);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteAgentId(agent.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Configuracao do Agente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedAgent ? (
                <p className="text-sm text-muted-foreground">Selecione um agente para ver detalhes.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Nome</p>
                    <p className="font-medium">{selectedAgent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Chave do agente</p>
                    <p className="font-medium"><code>{selectedAgent.agent_key}</code></p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Modelo principal</p>
                    <p className="font-medium">{selectedAgent.provider}/{selectedAgent.model}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Fallback</p>
                    <p className="font-medium">
                      {selectedAgent.fallback_provider && selectedAgent.fallback_model
                        ? `${selectedAgent.fallback_provider}/${selectedAgent.fallback_model}`
                        : 'Nao definido'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Confianca minima</p>
                    <p className="font-medium">{Number(selectedAgent.confidence_threshold).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Maximo de respostas automaticas</p>
                    <p className="font-medium">{selectedAgent.max_auto_replies}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground">Prompt do agente</p>
                    <pre className="mt-1 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
                      {selectedAgent.system_prompt}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Base de Conhecimento
                </CardTitle>
                <CardDescription>
                  Conteudos usados como contexto do agente selecionado.
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleOpenNewKnowledge} disabled={!selectedAgent}>
                <Plus className="h-4 w-4 mr-1" />
                Novo Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedAgent ? (
                <p className="text-sm text-muted-foreground">Selecione um agente para gerenciar conhecimento.</p>
              ) : knowledgeLoading ? (
                <p className="text-sm text-muted-foreground">Carregando base de conhecimento...</p>
              ) : knowledgeItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item de conhecimento cadastrado.</p>
              ) : (
                knowledgeItems.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">
                        {item.title || 'Sem titulo'}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={item.is_active ? 'default' : 'secondary'}>
                          {item.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Badge variant="outline">P{item.priority}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">
                      {item.content}
                    </p>
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => handleOpenEditKnowledge(item)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteKnowledgeState({ id: item.id, agent_id: item.agent_id })}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {agentForm.id ? 'Editar Agente IA' : 'Novo Agente IA'}
            </DialogTitle>
            <DialogDescription>
              Configure comportamento, modelo e regras de transferencia para o atendimento inicial.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <LabelComAjuda
                label="Chave do agente (agent_key)"
                ajuda="Identificador unico usado no fluxo. Exemplo: comercial_v1."
              />
              <Input
                value={agentForm.agent_key}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, agent_key: e.target.value }))}
                placeholder="comercial_v1"
              />
            </div>
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={agentForm.name}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="IA Comercial - Primeiro Atendimento"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <LabelComAjuda label="Descricao" ajuda="Resumo do objetivo e escopo deste agente." />
              <Input
                value={agentForm.description}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Resumo do escopo deste agente"
              />
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="Provedor principal"
                ajuda="Servico de IA usado primeiro para gerar a resposta."
              />
              <Select
                value={agentForm.provider}
                onValueChange={(value: AiProvider) => setAgentForm((prev) => ({ ...prev, provider: value }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="Modelo principal"
                ajuda="Modelo usado no provedor principal (ex.: gpt-5-mini)."
              />
              <Input
                value={agentForm.model}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, model: e.target.value }))}
                placeholder="gpt-5-mini"
              />
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="Provedor de fallback"
                ajuda="Servico alternativo usado se o principal falhar."
              />
              <Select
                value={agentForm.fallback_provider || 'none'}
                onValueChange={(value) =>
                  setAgentForm((prev) => ({ ...prev, fallback_provider: value === 'none' ? '' : (value as AiProvider) }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem fallback</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="gemini">Gemini</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="Modelo de fallback"
                ajuda="Modelo do provedor secundario."
              />
              <Input
                value={agentForm.fallback_model}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, fallback_model: e.target.value }))}
                placeholder="gemini-2.5-flash"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <LabelComAjuda
                label="Prompt do sistema"
                ajuda="Instrucoes de comportamento do agente (tom, regras, limites e quando transferir)."
              />
              <Textarea
                rows={7}
                value={agentForm.system_prompt}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, system_prompt: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="Temperatura"
                ajuda="Controla criatividade. Menor = mais objetivo; maior = mais variado."
              />
              <Input
                type="number"
                step="0.05"
                min="0"
                max="2"
                value={agentForm.temperature}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, temperature: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="Limite de confianca"
                ajuda="Confianca minima para responder automaticamente. Abaixo disso, transfere para humano."
              />
              <Input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={agentForm.confidence_threshold}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, confidence_threshold: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="Maximo de tokens de saida"
                ajuda="Limite de tamanho da resposta gerada pelo modelo."
              />
              <Input
                type="number"
                min="32"
                max="4096"
                value={agentForm.max_output_tokens}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, max_output_tokens: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="Maximo de mensagens no contexto"
                ajuda="Quantidade de mensagens recentes enviadas ao modelo como historico."
              />
              <Input
                type="number"
                min="1"
                max="50"
                value={agentForm.max_context_messages}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, max_context_messages: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="Maximo de respostas automaticas"
                ajuda="Quantidade maxima de respostas da IA antes de forcar transferencia."
              />
              <Input
                type="number"
                min="0"
                max="20"
                value={agentForm.max_auto_replies}
                onChange={(e) => setAgentForm((prev) => ({ ...prev, max_auto_replies: Number(e.target.value || 0) }))}
              />
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="Modo de transferencia"
                ajuda="Define para quem enviar quando a IA precisar escalar para atendimento humano."
              />
              <Select
                value={agentForm.handoff_mode}
                onValueChange={(value: 'round_robin' | 'specific_user') =>
                  setAgentForm((prev) => ({ ...prev, handoff_mode: value }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">Rodizio (Round Robin)</SelectItem>
                  <SelectItem value="specific_user">Usuario especifico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <LabelComAjuda
                label="ID do usuario para transferencia (opcional)"
                ajuda="Selecione o usuario que recebera a conversa quando o modo for Usuario especifico."
              />
              <Select
                value={agentForm.handoff_user_id || 'none'}
                onValueChange={(value) =>
                  setAgentForm((prev) => ({ ...prev, handoff_user_id: value === 'none' ? '' : value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {systemUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <LabelComAjuda
                label="Usuarios elegiveis para transferencia"
                ajuda="Marque quais usuarios podem receber transferencia deste agente."
              />
              {systemUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground rounded-md border p-3">
                  Nenhum usuario ativo encontrado.
                </p>
              ) : (
                <div className="max-h-40 overflow-y-auto space-y-2 rounded-lg border bg-muted/20 p-3">
                  {systemUsers.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={agentForm.eligible_user_ids.includes(user.id)}
                        onChange={() => toggleEligibleUser(user.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span>{user.nome}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {agentForm.eligible_user_ids.length} usuario(s) selecionado(s). Se nenhum for marcado, o sistema usa os usuarios da instancia.
              </p>
            </div>
            <div className="md:col-span-2 flex items-center gap-2 pt-2">
              <Switch
                checked={agentForm.is_active}
                onCheckedChange={(value) => setAgentForm((prev) => ({ ...prev, is_active: value }))}
              />
              <Label>Agente ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSaveAgent} disabled={saveAgent.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveAgent.isPending ? 'Salvando...' : 'Salvar Agente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={knowledgeDialogOpen} onOpenChange={setKnowledgeDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{knowledgeForm.id ? 'Editar Item de Conhecimento' : 'Novo Item de Conhecimento'}</DialogTitle>
            <DialogDescription>
              Esses conteudos sao usados como contexto para melhorar respostas do agente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input
                value={knowledgeForm.title}
                onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Politica de troca"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteudo</Label>
              <Textarea
                rows={8}
                value={knowledgeForm.content}
                onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Descreva procedimentos, perguntas frequentes e regras..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  value={knowledgeForm.priority}
                  onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, priority: Number(e.target.value || 100) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (CSV)</Label>
                <Input
                  value={knowledgeForm.tags_text}
                  onChange={(e) => setKnowledgeForm((prev) => ({ ...prev, tags_text: e.target.value }))}
                  placeholder="troca, frete, prazo"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={knowledgeForm.is_active}
                onCheckedChange={(value) => setKnowledgeForm((prev) => ({ ...prev, is_active: value }))}
              />
              <Label>Item ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleSaveKnowledge} disabled={saveKnowledgeItem.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveKnowledgeItem.isPending ? 'Salvando...' : 'Salvar Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteAgentId} onOpenChange={() => setDeleteAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente IA?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao remove o agente e todos os itens de conhecimento vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAgent}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteKnowledgeState} onOpenChange={() => setDeleteKnowledgeState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              O item sera removido da base de conhecimento do agente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteKnowledge}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
