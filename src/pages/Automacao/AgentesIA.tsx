import { useEffect, useMemo, useState } from 'react';
import { 
  Bot, 
  BookOpen, 
  CircleHelp, 
  Pencil, 
  Plus, 
  Save, 
  Settings2, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  LayoutDashboard,
  BrainCircuit,
  UserCog,
  ShieldCheck,
  History,
  Copy,
  Send,
  RotateCcw,
  MessageSquare,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { toast } from 'sonner';

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

type Preset = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  settings?: Partial<AgentFormState>;
};

const PRESETS: Preset[] = [
  {
    id: 'sdr_comercial',
    name: 'SDR Comercial (Gatha)',
    description: 'Atendimento inicial humanizado focado em qualificação e coleta de dados.',
    prompt: `Voce e atendente comercial da Gatha Confeccoes no WhatsApp. Seu papel e ser um SDR simpatico e humano.

REGRAS:
- NUNCA seja robotico. Evite confirmacoes como 'Entendi que voce quer...'.
- Fale como um humano: frases curtas e amigaveis. Use emojis :) !!
- Nao repita o que o cliente falou. Avance na conversa.

OBJETIVO:
Identificar: Produto, Quantidade, Estampa e Tecido.
Faca isso de forma fluida, uma pergunta por vez.`,
    settings: {
      temperature: 0.45,
      max_output_tokens: 250,
      confidence_threshold: 0.8,
    }
  },
  {
    id: 'suporte_tecnico',
    name: 'Suporte Técnico',
    description: 'Focado em resolução de dúvidas e triagem de problemas técnicos.',
    prompt: `Voce e o assistente de suporte tecnico. Seu objetivo e ajudar o cliente a resolver problemas ou triar para um tecnico humano.

DIRETRIZES:
- Seja paciente e analitico.
- Faca perguntas investigativas curtas.
- Se o problema for complexo, peca fotos/videos e transfira para um humano.`,
    settings: {
      temperature: 0.2,
      max_output_tokens: 350,
      confidence_threshold: 0.85,
    }
  },
  {
    id: 'atendimento_faq',
    name: 'FAQ Inteligente',
    description: 'Responde dúvidas frequentes com base na base de conhecimento.',
    prompt: `Voce e um assistente de FAQ. Sua principal fonte de informacao e a base de conhecimento.

REGRAS:
- Responda apenas o que estiver na base.
- Seja direto e educado.
- Se nao souber, nao invente; transfira para o atendimento.`,
    settings: {
      temperature: 0.1,
      max_output_tokens: 400,
    }
  }
];

const MODEL_OPTIONS = [
  { label: 'GPT-4o (Recomendado)', value: 'gpt-4o' },
  { label: 'GPT-4o Mini (Rápido/Econômico)', value: 'gpt-4o-mini' },
  { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
  { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
  { label: 'Outro (Personalizado)', value: 'custom' },
];

function toAgentForm(agent?: WhatsappAiAgent | null): AgentFormState {
  if (!agent) {
    return {
      agent_key: '',
      name: '',
      description: '',
      provider: 'openai',
      model: 'gpt-4o-mini',
      fallback_provider: '',
      fallback_model: '',
      system_prompt: '',
      temperature: 0.4,
      max_output_tokens: 300,
      max_context_messages: 16,
      confidence_threshold: 0.75,
      max_auto_replies: 5,
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
    temperature: Number(agent.temperature || 0.4),
    max_output_tokens: Number(agent.max_output_tokens || 300),
    max_context_messages: Number(agent.max_context_messages || 16),
    confidence_threshold: Number(agent.confidence_threshold || 0.75),
    max_auto_replies: Number(agent.max_auto_replies || 5),
    handoff_mode: agent.handoff_mode || 'round_robin',
    handoff_user_id: agent.handoff_user_id || '',
    eligible_user_ids: Array.isArray(agent.eligible_user_ids) ? agent.eligible_user_ids : [],
    is_active: agent.is_active !== false,
  };
}

function toKnowledgeForm(agentId: string, item?: WhatsappAiKnowledgeItem | null): any {
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

function LabelComAjuda({ label, ajuda }: { label: string; ajuda?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-sm font-semibold">{label}</Label>
      {ajuda ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={(e) => e.preventDefault()}
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
  const queryClient = (window as any).queryClient || null; // Access queryClient if needed
  
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
        .map((item: any) => ({ id: String(item.id), nome: String(item.nome || '') }));
    },
  });

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('geral');
  
  // Estado para o Chat de Teste (Sandbox)
  const [testMessages, setTestMessages] = useState<{ role: 'user' | 'assistant', content: string, decision?: any }[]>([]);
  const [testInput, setTestInput] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  
  const selectedAgentData = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId) || null,
    [agents, selectedAgentId],
  );

  const [agentForm, setAgentForm] = useState<AgentFormState>(() => toAgentForm(null));
  const [isEditing, setIsEditing] = useState(false);
  const [isModified, setIsModified] = useState(false);

  // Load agent data into form when selection changes
  useEffect(() => {
    if (selectedAgentId) {
      const agent = agents.find(a => a.id === selectedAgentId);
      if (agent) {
        setAgentForm(toAgentForm(agent));
        setIsModified(false);
      }
    }
  }, [selectedAgentId, agents]);

  // If no agent selected, select the first one
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const { data: knowledgeItems = [], isLoading: knowledgeLoading } = useWhatsappAiKnowledgeItems(selectedAgentId);

  const saveAgentMutation = useSaveWhatsappAiAgent();
  const deleteAgentMutation = useDeleteWhatsappAiAgent();
  const saveKnowledgeItem = useSaveWhatsappAiKnowledgeItem();
  const deleteKnowledgeItem = useDeleteWhatsappAiKnowledgeItem();

  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [deleteAgentId, setDeleteAgentId] = useState<string | null>(null);

  const [knowledgeDialogOpen, setKnowledgeDialogOpen] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState<any>(() => toKnowledgeForm(''));
  const [deleteKnowledgeState, setDeleteKnowledgeState] = useState<any>(null);

  const handleUpdateField = (field: keyof AgentFormState, value: any) => {
    setAgentForm(prev => ({ ...prev, [field]: value }));
    setIsModified(true);
  };

  const handleSave = async () => {
    try {
      await saveAgentMutation.mutateAsync({
        ...agentForm,
        description: agentForm.description || null,
        fallback_provider: agentForm.fallback_provider || null,
        fallback_model: agentForm.fallback_model || null,
        handoff_user_id: agentForm.handoff_user_id || null,
      });
      setIsModified(false);
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleActive = async (agentId: string, currentStatus: boolean) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    
    try {
      await saveAgentMutation.mutateAsync({
        ...agent,
        is_active: !currentStatus
      });
      toast.success(`Agente ${!currentStatus ? 'ativado' : 'desativado'}`);
    } catch (error) {
      toast.error('Erro ao alternar status do agente');
    }
  };

  const applyPreset = (preset: Preset) => {
    setAgentForm(prev => ({
      ...prev,
      system_prompt: preset.prompt,
      ...(preset.settings || {})
    }));
    setIsModified(true);
    toast.info(`Preset "${preset.name}" aplicado!`);
  };

  const handleSendTestMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!testInput.trim() || isSendingTest) return;

    const userMsg = testInput.trim();
    setTestInput('');
    setTestMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsSendingTest(true);

    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-ai-sandbox', {
        body: {
          system_prompt: agentForm.system_prompt,
          user_message: userMsg,
          temperature: agentForm.temperature,
          model: agentForm.model,
          provider: agentForm.provider,
          confidence_threshold: agentForm.confidence_threshold
        }
      });

      if (error) throw error;

      if (data.success) {
        setTestMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.decision.reply_text || data.text || 'A IA não gerou uma resposta textual.',
          decision: data.decision
        }]);
      } else {
        toast.error('Erro na simulação: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error: any) {
      console.error('Erro no sandbox:', error);
      toast.error('Falha ao conectar com o serviço de teste');
    } finally {
      setIsSendingTest(false);
    }
  };

  const clearTestChat = () => {
    setTestMessages([]);
    setTestInput('');
  };

  const handleOpenNewAgent = () => {
    setAgentForm(toAgentForm(null));
    setAgentDialogOpen(true);
  };

  const handleCreateAgent = async () => {
    if (!agentForm.name || !agentForm.agent_key) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    
    try {
      const result = await saveAgentMutation.mutateAsync(agentForm);
      if (result?.id) {
        setSelectedAgentId(result.id);
        setAgentDialogOpen(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenNewKnowledge = () => {
    if (!selectedAgentId) return;
    setKnowledgeForm(toKnowledgeForm(selectedAgentId, null));
    setKnowledgeDialogOpen(true);
  };

  const handleOpenEditKnowledge = (item: WhatsappAiKnowledgeItem) => {
    setKnowledgeForm(toKnowledgeForm(item.agent_id, item));
    setKnowledgeDialogOpen(true);
  };

  const handleSaveKnowledge = async () => {
    const tags = String(knowledgeForm.tags_text || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    await saveKnowledgeItem.mutateAsync({
      ...knowledgeForm,
      title: knowledgeForm.title || null,
      tags
    });
    setKnowledgeDialogOpen(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
            <Bot className="h-8 w-8 text-primary" />
            Agentes IA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure o comportamento, personalidade e base de conhecimento dos seus atendentes virtuais.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isModified && (
             <Button variant="default" className="bg-green-600 hover:bg-green-700 shadow-lg animate-pulse" onClick={handleSave} disabled={saveAgentMutation.isPending}>
               <Save className="h-4 w-4 mr-2" />
               {saveAgentMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
             </Button>
          )}
          <Button onClick={handleOpenNewAgent} className="shadow-md">
            <Plus className="h-4 w-4 mr-2" />
            Novo Agente
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px,1fr] flex-1 overflow-hidden">
        {/* SIDEBAR: LISTA DE AGENTES */}
        <Card className="flex flex-col overflow-hidden border-none shadow-xl bg-muted/20">
          <CardHeader className="pb-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Meus Agentes</CardTitle>
              <Badge variant="outline" className="font-mono">{agents.length}</Badge>
            </div>
            <CardDescription className="text-xs">Gerencie os fluxos de automação</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-3 space-y-3 pb-4 custom-scrollbar">
            {isLoading ? (
               <div className="flex flex-col gap-2">
                 {[1,2,3].map(i => <div key={i} className="h-24 w-full bg-muted animate-pulse rounded-lg" />)}
               </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-10 opacity-50">
                <Bot className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm">Nenhum agente</p>
              </div>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`group relative flex flex-col p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedAgentId === agent.id
                      ? 'border-primary bg-background shadow-lg scale-[1.02]'
                      : 'border-transparent bg-background/60 hover:border-muted-foreground/30 hover:bg-background'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 overflow-hidden">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                         <span className="font-bold text-sm truncate">{agent.name}</span>
                         {agent.is_active ? <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> : <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono mt-0.5 opacity-70 truncate">
                        {agent.agent_key}
                      </div>
                    </div>
                    <Switch 
                      checked={agent.is_active} 
                      onCheckedChange={() => handleToggleActive(agent.id, agent.is_active)}
                      onClick={(e) => e.stopPropagation()}
                      className="data-[state=checked]:bg-green-500 scale-75"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-muted/30">
                     <div className="flex items-center gap-1.5 overflow-hidden">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 capitalize truncate">
                          {agent.provider}
                        </Badge>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 truncate">
                          {agent.model}
                        </Badge>
                     </div>
                     <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); setDeleteAgentId(agent.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                     </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* MAIN AREA: CONFIGURAÇÕES COM ABAS */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {selectedAgentId ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <div className="bg-background/80 backdrop-blur-sm border-b px-2 flex items-center justify-between sticky top-0 z-10">
                <TabsList className="bg-transparent border-none h-14 gap-4 px-2">
                  <TabsTrigger value="geral" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-4 gap-2">
                     <LayoutDashboard className="h-4 w-4" /> Geral
                  </TabsTrigger>
                  <TabsTrigger value="personalidade" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-4 gap-2">
                     <Sparkles className="h-4 w-4" /> Personalidade
                  </TabsTrigger>
                  <TabsTrigger value="conhecimento" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-4 gap-2">
                     <BrainCircuit className="h-4 w-4" /> Inteligência
                  </TabsTrigger>
                  <TabsTrigger value="handoff" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-4 gap-2">
                     <UserCog className="h-4 w-4" /> Handoff
                  </TabsTrigger>
                  <TabsTrigger value="testar" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-4 gap-2">
                     <MessageSquare className="h-4 w-4" /> Testar Agente
                  </TabsTrigger>
                  <TabsTrigger value="avancado" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-full px-4 gap-2">
                     <Settings2 className="h-4 w-4" /> Técnico
                  </TabsTrigger>
                </TabsList>
                
                <div className="px-4 hidden md:block">
                   <div className="text-xs font-mono bg-muted px-2 py-1 rounded border">ID: {selectedAgentId.split('-')[0]}...</div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-muted/5 custom-scrollbar">
                
                {/* ABA 1: CONFIGURAÇÃO GERAL */}
                <TabsContent value="geral" className="m-0 space-y-6 animate-in slide-in-from-left-4 duration-300">
                  <div className="grid gap-6 md:grid-cols-2">
                    <Card className="shadow-sm border-muted/40">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base">Identificação</CardTitle>
                        <CardDescription>Nome e chave única para este agente.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                         <div className="space-y-2">
                           <LabelComAjuda label="Nome do Agente" ajuda="Exibido apenas internamente no sistema." />
                           <Input 
                             value={agentForm.name} 
                             onChange={(e) => handleUpdateField('name', e.target.value)}
                             placeholder="Ex: Comercial Gatha"
                           />
                         </div>
                         <div className="space-y-2">
                           <LabelComAjuda label="Chave (agent_key)" ajuda="Identificador técnico usado em automações. Use apenas letras, números e underline." />
                           <Input 
                             value={agentForm.agent_key} 
                             onChange={(e) => handleUpdateField('agent_key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                             placeholder="ex: comercial_v1"
                             disabled={!!agentForm.id}
                           />
                         </div>
                         <div className="space-y-2">
                           <Label>Descrição Curta</Label>
                           <Input 
                             value={agentForm.description} 
                             onChange={(e) => handleUpdateField('description', e.target.value)}
                             placeholder="Para que serve este agente?"
                           />
                         </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-muted/40">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base">Infraestrutura IA</CardTitle>
                        <CardDescription>Escolha quem fornece a inteligência.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                         <div className="space-y-2">
                           <Label>Provedor</Label>
                           <Select value={agentForm.provider} onValueChange={(v: any) => handleUpdateField('provider', v)}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                               <SelectItem value="gemini">Google Gemini</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                         <div className="space-y-2">
                           <Label>Modelo Ativo</Label>
                           <Select value={agentForm.model} onValueChange={(v) => handleUpdateField('model', v === 'custom' ? '' : v)}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                               {MODEL_OPTIONS.map(opt => (
                                 <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                           {(!MODEL_OPTIONS.some(o => o.value === agentForm.model) && agentForm.model) || (agentForm.model === '') ? (
                              <Input 
                                className="mt-2 text-xs font-mono h-8"
                                value={agentForm.model} 
                                placeholder="digite-o-nome-do-modelo..."
                                onChange={(e) => handleUpdateField('model', e.target.value)}
                              />
                           ) : null}
                         </div>
                         
                         <div className="pt-2">
                            <div className="flex items-center gap-2 mb-2">
                               <div className="h-px bg-muted flex-1" />
                               <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Fallback de Segurança</span>
                               <div className="h-px bg-muted flex-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <Select value={agentForm.fallback_provider || 'none'} onValueChange={(v) => handleUpdateField('fallback_provider', v === 'none' ? '' : v)}>
                                 <SelectTrigger className="text-xs h-9"><SelectValue placeholder="Provedor" /></SelectTrigger>
                                 <SelectContent>
                                   <SelectItem value="none">Nenhum</SelectItem>
                                   <SelectItem value="openai">OpenAI</SelectItem>
                                   <SelectItem value="gemini">Gemini</SelectItem>
                                 </SelectContent>
                               </Select>
                               <Input 
                                 className="text-xs h-9" 
                                 placeholder="Modelo p/ erro"
                                 value={agentForm.fallback_model}
                                 onChange={(e) => handleUpdateField('fallback_model', e.target.value)}
                               />
                            </div>
                         </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* ABA 2: PERSONALIDADE E PROMPT */}
                <TabsContent value="personalidade" className="m-0 space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="grid gap-6 md:grid-cols-[1fr,250px]">
                    <Card className="flex flex-col border-muted/40">
                      <CardHeader className="pb-3 flex-row items-center justify-between pointer-events-none">
                        <div>
                          <CardTitle className="text-base">Mente do Agente (System Prompt)</CardTitle>
                          <CardDescription>Defina quem ela é, como fala e o que não pode fazer.</CardDescription>
                        </div>
                        <Sparkles className="h-5 w-5 text-primary opacity-20" />
                      </CardHeader>
                      <CardContent className="p-0">
                         <div className="relative h-[500px] px-4 pb-4">
                           <Textarea 
                             className="h-full w-full font-mono text-sm leading-relaxed resize-none p-4 bg-muted/20 border-muted focus-visible:ring-primary"
                             placeholder="Ex: Você é um assistente simpático..."
                             value={agentForm.system_prompt}
                             onChange={(e) => handleUpdateField('system_prompt', e.target.value)}
                           />
                           <div className="absolute bottom-6 right-6 flex gap-2">
                              <Badge variant="outline" className="bg-background/80 backdrop-blur shadow-sm">
                                {agentForm.system_prompt.length} caracteres
                              </Badge>
                           </div>
                         </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                       <h4 className="text-sm font-bold flex items-center gap-2">
                         <Sparkles className="h-4 w-4 text-amber-500" /> Predefinições Rápidas
                       </h4>
                       <p className="text-[11px] text-muted-foreground leading-tight">Use estes templates para configurar o agente em segundos.</p>
                       <div className="grid gap-3">
                         {PRESETS.map(preset => (
                           <button
                             key={preset.id}
                             onClick={() => applyPreset(preset)}
                             className="group text-left p-3 rounded-xl border bg-background hover:border-primary/50 hover:shadow-md transition-all"
                           >
                             <div className="font-bold text-xs group-hover:text-primary transition-colors">{preset.name}</div>
                             <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{preset.description}</div>
                           </button>
                         ))}
                       </div>

                       <div className="mt-6 p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/20 shadow-sm border-amber-200 dark:border-amber-900/50">
                          <h5 className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1.5">
                             <AlertCircle className="h-3 w-3" /> Dica de Especialista
                          </h5>
                          <p className="text-[10px] text-amber-700 dark:text-amber-400">
                             Evite dar ordens contraditórias. Use listas (1, 2, 3) para facilitar a compreensão da IA sobre as regras.
                          </p>
                       </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ABA 3: BASE DE CONHECIMENTO */}
                <TabsContent value="conhecimento" className="m-0 space-y-4 animate-in zoom-in-95 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold">Cérebro do Agente</h3>
                      <p className="text-sm text-muted-foreground">Adicione documentos, regras e FAQs para a IA consultar.</p>
                    </div>
                    <Button size="sm" onClick={handleOpenNewKnowledge}>
                      <Plus className="h-4 w-4 mr-2" /> Novo Documento
                    </Button>
                  </div>

                  {knowledgeLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                       {[1,2,3].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}
                    </div>
                  ) : knowledgeItems.length === 0 ? (
                    <Card className="border-dashed border-2 py-20 text-center opacity-40 bg-transparent">
                       <BookOpen className="h-12 w-12 mx-auto mb-4" />
                       <p className="font-medium">Sua base está vazia.</p>
                       <p className="text-xs">Clique no botão acima para adicionar conhecimento.</p>
                    </Card>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {knowledgeItems.map((item) => (
                        <Card key={item.id} className={`group relative hover:shadow-lg transition-all ${!item.is_active && 'opacity-60 grayscale-[0.5]'}`}>
                          <CardHeader className="p-4 pb-2">
                             <div className="flex items-center justify-between mb-2">
                               <Badge variant={item.is_active ? "outline" : "secondary"} className={item.is_active ? "text-green-500 border-green-500/20 bg-green-500/5" : ""}>
                                 {item.is_active ? 'Ativo' : 'Inativo'}
                               </Badge>
                               <Badge variant="secondary" className="font-mono text-[9px]">P{item.priority}</Badge>
                             </div>
                             <CardTitle className="text-sm truncate leading-tight pr-6">{item.title || 'Sem título'}</CardTitle>
                          </CardHeader>
                          <CardContent className="p-4 pt-2">
                             <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed mb-4 min-h-[64px]">
                               {item.content}
                             </p>
                             <div className="flex items-center gap-2 pt-3 border-t border-muted/30">
                               <Button size="xs" variant="ghost" className="h-7 text-[10px] gap-1 px-2" onClick={() => handleOpenEditKnowledge(item)}>
                                 <Pencil className="h-3 w-3" /> Editar
                               </Button>
                               <div className="flex-1" />
                               <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all" onClick={() => setDeleteKnowledgeState({ id: item.id, agent_id: item.agent_id })}>
                                 <Trash2 className="h-3.5 w-3.5" />
                               </Button>
                             </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ABA 4: HANDOFF E TRANSFERÊNCIA */}
                <TabsContent value="handoff" className="m-0 space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                   <div className="grid gap-6 md:grid-cols-2">
                     <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <UserCog className="h-5 w-5 text-primary" /> Regras de Escalonação
                          </CardTitle>
                          <CardDescription>Como a IA deve passar a bola para o atendimento humano.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="space-y-2">
                             <LabelComAjuda label="Modo de Transferência" ajuda="Rodízio distribui entre os funcionários. Usuário Específico manda sempre para a mesma pessoa." />
                             <Select value={agentForm.handoff_mode} onValueChange={(v: any) => handleUpdateField('handoff_mode', v)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                   <SelectItem value="round_robin">Rodízio (Round Robin)</SelectItem>
                                   <SelectItem value="specific_user">Usuário Específico</SelectItem>
                                </SelectContent>
                             </Select>
                           </div>

                           {agentForm.handoff_mode === 'specific_user' && (
                             <div className="space-y-2 animate-in slide-in-from-top-2">
                               <Label>Usuário de Destino</Label>
                               <Select value={agentForm.handoff_user_id || 'none'} onValueChange={(v) => handleUpdateField('handoff_user_id', v === 'none' ? '' : v)}>
                                  <SelectTrigger><SelectValue placeholder="Selecione um atendente" /></SelectTrigger>
                                  <SelectContent>
                                     <SelectItem value="none">Ninguém</SelectItem>
                                     {systemUsers.map((u:any) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                                  </SelectContent>
                               </Select>
                             </div>
                           )}

                           <div className="space-y-4 pt-4 border-t">
                             <div className="flex items-center justify-between">
                               <Label className="font-bold">Limite de Autonomia</Label>
                               <Badge className="font-mono">{agentForm.max_auto_replies} msg</Badge>
                             </div>
                             <p className="text-[11px] text-muted-foreground">Quantas vezes a IA pode responder sozinha antes de chamar o humano por segurança.</p>
                             <Input 
                               type="range" 
                               min="0" max="15" step="1" 
                               value={agentForm.max_auto_replies} 
                               onChange={(e) => handleUpdateField('max_auto_replies', Number(e.target.value))}
                               className="accent-primary"
                             />
                           </div>
                        </CardContent>
                     </Card>

                     <Card>
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                             <ShieldCheck className="h-5 w-5 text-green-600" /> Operadores Qualificados
                          </CardTitle>
                          <CardDescription>Quais usuários podem receber conversas deste agente.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <div className="max-h-[300px] overflow-y-auto space-y-1 rounded-xl border bg-muted/30 p-2 custom-scrollbar">
                              {systemUsers.map((u:any) => (
                                <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-background transition-colors">
                                  <span className="text-sm font-medium">{u.nome}</span>
                                  <Switch 
                                    checked={agentForm.eligible_user_ids.includes(u.id)}
                                    onCheckedChange={() => {
                                      const ids = agentForm.eligible_user_ids.includes(u.id)
                                        ? agentForm.eligible_user_ids.filter(i => i !== u.id)
                                        : [...agentForm.eligible_user_ids, u.id];
                                      handleUpdateField('eligible_user_ids', ids);
                                    }}
                                  />
                                </div>
                              ))}
                           </div>
                        </CardContent>
                     </Card>
                   </div>
                </TabsContent>

                {/* ABA 5: ÁREA DE TESTE (SANDBOX) */}
                <TabsContent value="testar" className="m-0 space-y-6 animate-in zoom-in-95 duration-300 h-[calc(100vh-220px)] flex flex-col">
                  <div className="grid gap-6 md:grid-cols-[1fr,300px] flex-1 min-h-0">
                    <Card className="flex flex-col border-muted/40 overflow-hidden">
                      <CardHeader className="pb-3 border-b flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary" /> Simulador de Chat
                          </CardTitle>
                          <CardDescription>Teste o prompt atual sem afetar dados reais.</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={clearTestChat} className="text-xs gap-1">
                          <RotateCcw className="h-3 w-3" /> Limpar Chat
                        </Button>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-muted/10">
                        {testMessages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
                            <Bot className="h-12 w-12 mb-2" />
                            <p className="text-sm font-medium">Mande uma mensagem para começar o teste</p>
                          </div>
                        ) : (
                          testMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                              <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                                msg.role === 'user' 
                                  ? 'bg-primary text-primary-foreground rounded-tr-none' 
                                  : 'bg-background border rounded-tl-none'
                              }`}>
                                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                                {msg.decision && (
                                  <div className="mt-2 pt-2 border-t border-muted/20 flex flex-wrap gap-2">
                                    <Badge variant="outline" className="text-[9px] px-1 bg-muted/50">
                                      {msg.decision.action === 'reply' ? 'Resposta' : msg.decision.action === 'handoff' ? 'Transferência' : 'Ignorar'}
                                    </Badge>
                                    <Badge variant="outline" className="text-[9px] px-1 bg-muted/50 font-mono">
                                      {(msg.decision.confidence * 100).toFixed(0)}% Conf.
                                    </Badge>
                                    {msg.decision.intent && msg.decision.intent !== 'unknown' && (
                                      <Badge variant="outline" className="text-[9px] px-1 bg-muted/50">
                                        Intento: {msg.decision.intent}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        {isSendingTest && (
                           <div className="flex justify-start">
                              <div className="bg-background border rounded-2xl rounded-tl-none p-3 shadow-sm">
                                <div className="flex gap-1">
                                  <div className="h-2 w-2 bg-muted-foreground/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                  <div className="h-2 w-2 bg-muted-foreground/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                  <div className="h-2 w-2 bg-muted-foreground/30 rounded-full animate-bounce" />
                                </div>
                              </div>
                           </div>
                        )}
                      </CardContent>
                      <div className="p-4 border-t bg-background">
                         <form onSubmit={handleSendTestMessage} className="flex gap-2">
                           <Input 
                             placeholder="Digite sua mensagem de teste..." 
                             value={testInput}
                             onChange={(e) => setTestInput(e.target.value)}
                             disabled={isSendingTest}
                             className="rounded-full px-4"
                           />
                           <Button type="submit" size="icon" disabled={isSendingTest || !testInput.trim()} className="rounded-full shrink-0">
                             <Send className="h-4 w-4" />
                           </Button>
                         </form>
                      </div>
                    </Card>

                    <div className="space-y-6">
                      <Card className="border-muted/40 shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Sparkles className="h-3 w-3 text-amber-500" /> Como Testar?
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-xs">
                          <p className="text-muted-foreground leading-relaxed">
                            Use este simulador para validar se o agente está seguindo as regras do seu <span className="font-bold">Prompt do Sistema</span>.
                          </p>
                          <div className="space-y-2">
                             <div className="p-2 rounded border bg-muted/30">
                                <span className="font-bold block mb-1">Cenário 1: Saudação</span>
                                Diga "Oi" e veja se o tom é o esperado.
                             </div>
                             <div className="p-2 rounded border bg-muted/30">
                                <span className="font-bold block mb-1">Cenário 2: Qualificação</span>
                                Tente pedir um orçamento e veja se a IA extrai os dados corretamente.
                             </div>
                             <div className="p-2 rounded border bg-muted/30">
                                <span className="font-bold block mb-1">Cenário 3: Transferência</span>
                                Peça para falar com um gerente e valide o <span className="italic font-bold">handoff</span>.
                             </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="p-4 rounded-xl border bg-primary/5 text-primary text-[11px] leading-relaxed">
                        <p className="font-bold mb-1 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> Teste Seguro
                        </p>
                        Este chat usa o prompt atual (mesmo sem salvar), mas <span className="font-bold underline">não consome</span> tokens reais da sua cota de produção e não afeta o histórico de conversas dos seus clientes.
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ABA 6: CONFIGURAÇÕES TÉCNICAS (AVANÇADO) */}
                <TabsContent value="avancado" className="m-0 space-y-6 animate-in fade-in duration-500">
                  <div className="grid gap-6 md:grid-cols-2">
                     <Card>
                        <CardHeader>
                           <CardTitle className="text-base">Mecanismo de Resposta</CardTitle>
                           <CardDescription>Ajustes finos do mecanismo de chat.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                 <LabelComAjuda label="Temperatura" ajuda="Menor = Preciso e Robótico. Maior = Criativo e Humano." />
                                 <Badge variant="outline" className="font-mono">{agentForm.temperature}</Badge>
                              </div>
                              <Input 
                                type="range" min="0" max="1.5" step="0.05"
                                value={agentForm.temperature}
                                onChange={(e) => handleUpdateField('temperature', Number(e.target.value))}
                              />
                           </div>

                           <div className="space-y-4 pt-4 border-t">
                              <div className="flex items-center justify-between">
                                 <LabelComAjuda label="Nível de Confiança" ajuda="Abaixo deste valor de precisão, a IA desiste e chama um humano." />
                                 <Badge variant="outline" className="font-mono">{agentForm.confidence_threshold}</Badge>
                              </div>
                              <Input 
                                type="range" min="0.5" max="0.99" step="0.01"
                                value={agentForm.confidence_threshold}
                                onChange={(e) => handleUpdateField('confidence_threshold', Number(e.target.value))}
                              />
                           </div>
                        </CardContent>
                     </Card>

                     <Card>
                        <CardHeader>
                           <CardTitle className="text-base">Limites e Contexto</CardTitle>
                           <CardDescription>Proteção contra custos excessivos e limites de memória.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="space-y-2">
                              <LabelComAjuda label="Contexto de Memória" ajuda="Quantas mensagens anteriores a IA deve lembrar na conversa." />
                              <div className="flex items-center gap-4">
                                <Input 
                                  type="number" className="font-mono"
                                  value={agentForm.max_context_messages}
                                  onChange={(e) => handleUpdateField('max_context_messages', Number(e.target.value))}
                                />
                                <Badge variant="secondary" className="whitespace-nowrap">Msgs</Badge>
                              </div>
                           </div>

                           <div className="space-y-2">
                              <LabelComAjuda label="Tamanho Max da Resposta" ajuda="Limite de tokens gerados. 1 token ~= 4 caracteres." />
                              <div className="flex items-center gap-4">
                                <Input 
                                  type="number" className="font-mono"
                                  value={agentForm.max_output_tokens}
                                  onChange={(e) => handleUpdateField('max_output_tokens', Number(e.target.value))}
                                />
                                <Badge variant="secondary" className="whitespace-nowrap">Tokens</Badge>
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            <Card className="flex flex-col items-center justify-center flex-1 opacity-40 border-dashed border-2 m-6">
               <Sparkles className="h-16 w-16 mb-4 animate-pulse text-primary" />
               <h3 className="text-xl font-bold">Selecione um Agente</h3>
               <p className="text-sm">Clique em um agente na lista lateral para configurar.</p>
            </Card>
          )}
        </div>
      </div>

      {/* DIALOGS E ALERTS */}
      <Dialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Agente IA</DialogTitle>
            <DialogDescription>
              Defina o nome e a chave de acesso básica. Você poderá configurar os detalhes após criar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
             <div className="space-y-2">
               <Label>Nome do Agente (Público)</Label>
               <Input 
                 placeholder="Ex: Comercial Gatha" 
                 value={agentForm.name}
                 onChange={(e) => handleUpdateField('name', e.target.value)}
               />
             </div>
             <div className="space-y-2">
               <Label>Chave do Agente (Interno)</Label>
               <Input 
                 placeholder="ex: comercial_v1" 
                 value={agentForm.agent_key}
                 onChange={(e) => handleUpdateField('agent_key', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
               />
               <p className="text-[10px] text-muted-foreground">Esta chave não pode ser alterada depois.</p>
             </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setAgentDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateAgent} disabled={saveAgentMutation.isPending}>
               {saveAgentMutation.isPending ? 'Criando...' : 'Criar Agente'}
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
                onChange={(e) => setKnowledgeForm((prev:any) => ({ ...prev, title: e.target.value }))}
                placeholder="Politica de troca"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteudo</Label>
              <Textarea
                rows={8}
                value={knowledgeForm.content}
                onChange={(e) => setKnowledgeForm((prev:any) => ({ ...prev, content: e.target.value }))}
                placeholder="Descreva procedimentos, perguntas frequentes e regras..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Input
                  type="number"
                  value={knowledgeForm.priority}
                  onChange={(e) => setKnowledgeForm((prev:any) => ({ ...prev, priority: Number(e.target.value || 100) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Tags (CSV)</Label>
                <Input
                  value={knowledgeForm.tags_text}
                  onChange={(e) => setKnowledgeForm((prev:any) => ({ ...prev, tags_text: e.target.value }))}
                  placeholder="troca, frete, prazo"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={knowledgeForm.is_active}
                onCheckedChange={(value) => setKnowledgeForm((prev:any) => ({ ...prev, is_active: value }))}
              />
              <Label>Item ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setKnowledgeDialogOpen(false)}>Cancelar</Button>
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
              Esta acao remove o agente e todos os itens de conhecimento vinculados. Esta acao e irreversivel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(deleteAgentId) deleteAgentMutation.mutate(deleteAgentId); setDeleteAgentId(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
               Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteKnowledgeState} onOpenChange={() => setDeleteKnowledgeState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              O item sera removido da base de conhecimento do agente e nao podera ser recuperado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if(deleteKnowledgeState) deleteKnowledgeItem.mutate(deleteKnowledgeState); setDeleteKnowledgeState(null); }}>
               Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
