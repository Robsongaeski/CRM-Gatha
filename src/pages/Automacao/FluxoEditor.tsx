import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAutomationWorkflow, useSaveWorkflow, useToggleWorkflow } from '@/hooks/useAutomationWorkflows';
import { TriggerNode } from './components/nodes/TriggerNode';
import { ActionNode } from './components/nodes/ActionNode';
import { ConditionNode } from './components/nodes/ConditionNode';
import { ControlNode } from './components/nodes/ControlNode';
import { DraggableNodePalette } from './components/DraggableNodePalette';
import { NodeConfigSheet } from './components/NodeConfigSheet';
import { EmptyCanvasHint } from './components/EmptyCanvasHint';
import { FlowToolbar } from './components/FlowToolbar';
import { CustomEdge, EdgeMarkerDefs } from './components/CustomEdge';
import { GaleriaFluxosDialog } from './components/GaleriaFluxosDialog';
import { ExecutionHistoryTab } from './components/ExecutionHistoryTab';
import { WorkflowVersionsTab } from './components/WorkflowVersionsTab';
import { FluxoExemplo } from './data/fluxosExemplo';
import { getEntityTypeFromTrigger } from './data/camposEntidades';
import { cn } from '@/lib/utils';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  control: ControlNode,
};

const edgeTypes = {
  custom: CustomEdge,
};

const defaultEdgeOptions = {
  type: 'custom',
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed },
};

const legacyActionSubtypeMap: Record<string, string> = {
  keyword_reply: 'keyword_auto_reply',
  auto_reply_keyword: 'keyword_auto_reply',
  whatsapp_keyword_reply: 'keyword_auto_reply',
  resposta_por_palavra: 'keyword_auto_reply',
  resposta_palavra: 'keyword_auto_reply',
};

const standaloneControlSubtypes = new Set([
  'business_hours_handoff',
]);

function extractAiAgentKeyFromWebhookConfig(rawConfig: unknown): string {
  const config = (rawConfig && typeof rawConfig === 'object')
    ? (rawConfig as Record<string, unknown>)
    : {};
  const rawUrl = String(config.url || config.webhookUrl || '').trim();
  if (!rawUrl || !/whatsapp-ai-router/i.test(rawUrl)) return '';

  try {
    const parsed = rawUrl.startsWith('http')
      ? new URL(rawUrl)
      : new URL(rawUrl, 'https://local.invalid');
    return String(parsed.searchParams.get('agent_key') || '').trim();
  } catch {
    const match = rawUrl.match(/[?&]agent_key=([^&]+)/i);
    if (!match?.[1]) return '';
    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return String(match[1] || '').trim();
    }
  }
}

function normalizeActionSubtype(node: Node): Node {
  if (node.type !== 'action') return node;

  const data = (node.data as Record<string, unknown>) || {};
  const rawSubtype = String(
    data.subtype ??
      data.actionSubtype ??
      data.action_subtype ??
      data.actionType ??
      data.action_type ??
      ''
  ).trim();
  const label = String(data.label || '').trim().toLowerCase();
  const config = (data.config as Record<string, unknown>) || {};

  let normalizedSubtype = legacyActionSubtypeMap[rawSubtype.toLowerCase()] || rawSubtype;
  const aiAgentKeyFromWebhook = extractAiAgentKeyFromWebhookConfig(config);
  if (rawSubtype.toLowerCase() === 'call_webhook' && aiAgentKeyFromWebhook) {
    normalizedSubtype = 'ai_agent';
  }
  if (!normalizedSubtype && label.includes('resposta por palavra')) {
    normalizedSubtype = 'keyword_auto_reply';
  }

  if (!normalizedSubtype || normalizedSubtype === String(data.subtype || '').trim()) {
    return node;
  }

  return {
    ...node,
    data: {
      ...node.data,
      subtype: normalizedSubtype,
      config: normalizedSubtype === 'ai_agent'
        ? {
            ...config,
            agent_key: String(config.agent_key || aiAgentKeyFromWebhook || '').trim(),
            agent_name: String(config.agent_name || '').trim() || undefined,
          }
        : config,
    },
  };
}

function normalizeLoadedNodes(nodes: Node[]) {
  return nodes.map(normalizeActionSubtype);
}

function buildDraftWorkflowName(now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  return `Fluxo sem nome ${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function FluxoEditorInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'novo';
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  
  const { data: workflow, isLoading, refetch: refetchWorkflow } = useAutomationWorkflow(isNew ? undefined : id);
  const saveWorkflow = useSaveWorkflow();
  const toggleWorkflow = useToggleWorkflow();
  
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<string>('geral');
  const [ativo, setAtivo] = useState(false);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Derive selectedNode from nodes array to keep it in sync
  const selectedNode = selectedNodeId 
    ? nodes.find(n => n.id === selectedNodeId) || null 
    : null;
  
  // Detectar tipo de entidade baseado no trigger
  const entityType = React.useMemo(() => {
    const triggerNode = nodes.find(n => n.type === 'trigger');
    if (!triggerNode) return null;
    const subtype = triggerNode.data.subtype as string | undefined;
    return getEntityTypeFromTrigger(subtype || null);
  }, [nodes]);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('editor');
  
  useEffect(() => {
    if (workflow) {
      setNome(workflow.nome);
      setDescricao(workflow.descricao || '');
      setTipo(workflow.tipo);
      setAtivo(workflow.ativo);
      
      if (workflow.flow_data) {
        const loadedNodes = Array.isArray(workflow.flow_data.nodes)
          ? (workflow.flow_data.nodes as Node[])
          : [];
        setNodes(normalizeLoadedNodes(loadedNodes));
        setEdges(workflow.flow_data.edges || []);
      }
    }
  }, [workflow, setNodes, setEdges]);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );
  
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);
  
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);
  
  const onAddNode = useCallback((nodeType: string, nodeSubtype: string, label: string) => {
    const newNode: Node = {
      id: `${nodeType}_${Date.now()}`,
      type: nodeType,
      position: { x: 300 + Math.random() * 100, y: nodes.length * 120 + 100 },
      data: { label, subtype: nodeSubtype, config: {} },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;
      
      const { type, subtype, label } = JSON.parse(data);
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      
      const position = {
        x: event.clientX - bounds.left - 100,
        y: event.clientY - bounds.top - 40,
      };
      
      const newNode: Node = {
        id: `${type}_${Date.now()}`,
        type,
        position,
        data: { label, subtype, config: {} },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDraggingOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  const onDropEnd = useCallback(() => {
    setIsDraggingOver(false);
  }, []);
  
  // Flow validation
  const validateFlow = useCallback(() => {
    const errors: string[] = [];
    
    // Check for at least one trigger
    const triggers = nodes.filter(n => n.type === 'trigger');
    if (triggers.length === 0) {
      errors.push('Adicione pelo menos um gatilho para iniciar o fluxo');
    }
    
    // Check triggers have connections
    triggers.forEach(trigger => {
      const hasConnection = edges.some(e => e.source === trigger.id);
      if (!hasConnection) {
        errors.push(`O gatilho "${trigger.data.label}" precisa estar conectado a uma ação`);
      }
    });
    
    // Alguns nós de controle funcionam como marcadores globais do fluxo e não precisam de conexão no grafo.
    nodes.filter(n => {
      if (n.type === 'trigger') return false;
      const subtype = String(n.data?.subtype || '').trim();
      return !(n.type === 'control' && standaloneControlSubtypes.has(subtype));
    }).forEach(node => {
      const hasIncoming = edges.some(e => e.target === node.id);
      if (!hasIncoming) {
        errors.push(`O nó "${node.data.label}" não está conectado ao fluxo`);
      }
    });

    // Check trigger minimum config
    nodes.filter(n => n.type === 'trigger').forEach(node => {
      const config = node.data.config as any;
      const subtype = node.data.subtype;

      if (subtype === 'whatsapp_inactive') {
        const inactivityDays = Number(config?.inactivity_days || config?.min_inactivity_days || 0);
        if (!Number.isFinite(inactivityDays) || inactivityDays < 1) {
          errors.push(`Gatilho "${node.data.label}" precisa de prazo de inatividade (>= 1 dia)`);
        }
      }
    });

    // Check actions have required config
    nodes.filter(n => n.type === 'action').forEach(node => {
      const config = node.data.config as any;
      const subtype = node.data.subtype;

      // WhatsApp: aceitar message único ou messages array
      if (subtype === 'send_whatsapp') {
        const hasMessage = config?.message || (config?.randomMessages && Array.isArray(config?.messages) && config.messages.some((m: string) => m?.trim()));
        if (!hasMessage) {
          errors.push(`Ação "${node.data.label}" precisa de uma mensagem configurada`);
        }
      }
      if (subtype === 'send_email' && (!config?.subject || !config?.body)) {
        errors.push(`Ação "${node.data.label}" precisa de assunto e corpo do e-mail`);
      }
      if (subtype === 'call_webhook' && !config?.webhookUrl && !config?.url) {
        errors.push(`Ação "${node.data.label}" precisa de uma URL do webhook`);
      }
      if (subtype === 'ai_agent' && !String(config?.agent_key || '').trim()) {
        errors.push(`Ação "${node.data.label}" precisa de um agente IA selecionado`);
      }
      if (subtype === 'assign_to_user' && !config?.user_id) {
        errors.push(`Ação "${node.data.label}" precisa de um atendente selecionado`);
      }
      if (subtype === 'keyword_auto_reply') {
        const rules = Array.isArray(config?.rules) ? config.rules : [];
        const hasValidRule = rules.some((rule: any) => {
          const responses = Array.isArray(rule?.responses)
            ? rule.responses
            : [rule?.response];
          const hasResponse = responses.some((value: any) => String(value || '').trim());
          return rule?.keyword?.trim() && hasResponse;
        });
        if (!hasValidRule) {
          errors.push(`Ação "${node.data.label}" precisa de pelo menos uma regra palavra/resposta`);
        }
      }
    });    
    return errors;
  }, [nodes, edges]);
  
  const onUpdateNodeConfig = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, config } } : node
      )
    );
  }, [setNodes]);

  const onUpdateNodeLabel = useCallback((nodeId: string, label: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, label } } : node
      )
    );
  }, [setNodes]);
  
  const onDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  const onDuplicateNode = useCallback(() => {
    if (!selectedNode) return;
    const newNode: Node = {
      id: `${selectedNode.type}_${Date.now()}`,
      type: selectedNode.type,
      position: { x: selectedNode.position.x + 50, y: selectedNode.position.y + 50 },
      data: { ...selectedNode.data },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [selectedNode, setNodes]);
  
  const handleSave = async () => {
    // Validate flow before saving
    const errors = validateFlow();
    if (errors.length > 0) {
      errors.forEach(error => toast.error(error));
      return;
    }

    const normalizedNome = nome.trim() || buildDraftWorkflowName();
    if (!nome.trim()) {
      setNome(normalizedNome);
      toast.info('Nome provisorio aplicado automaticamente.');
    }

    let normalizedTipo = tipo;
    if (entityType === 'whatsapp_conversation' && !['whatsapp', 'geral'].includes(tipo)) {
      normalizedTipo = 'whatsapp';
      setTipo('whatsapp');
      toast.info('Tipo do fluxo ajustado automaticamente para WhatsApp.');
    }

    const normalizedNodes = nodes.map((node) => {
      if (node.type !== 'control' || node.data?.subtype !== 'delay') return node;

      const rawConfig = (node.data?.config as Record<string, unknown>) || {};
      const amountRaw = Number(rawConfig.amount ?? rawConfig.delay ?? rawConfig.delayValue ?? 1);
      const safeAmount = Number.isFinite(amountRaw) && amountRaw > 0 ? Math.trunc(amountRaw) : 1;
      const unitRaw = String(rawConfig.unit ?? rawConfig.delayUnit ?? 'minutes');
      const safeUnit = ['minutes', 'hours', 'days'].includes(unitRaw) ? unitRaw : 'minutes';

      return {
        ...node,
        data: {
          ...node.data,
          config: {
            ...rawConfig,
            amount: safeAmount,
            delay: safeAmount,
            unit: safeUnit,
            delayUnit: safeUnit,
          },
        },
      };
    });
    
    const workflowData = {
      id: isNew ? undefined : id,
      nome: normalizedNome,
      descricao,
      tipo: normalizedTipo as any,
      flow_data: { nodes: normalizedNodes, edges },
      trigger_config: nodes.find(n => n.type === 'trigger')?.data?.config || {},
    };
    await saveWorkflow.mutateAsync(workflowData);
    if (isNew) navigate('/automacao');
  };
  
  const handleToggleActive = () => {
    if (!isNew && id) {
      toggleWorkflow.mutate({ id, ativo: !ativo });
      setAtivo(!ativo);
    }
  };

  const handleImportFluxo = (fluxo: FluxoExemplo) => {
    setNome(fluxo.nome);
    setDescricao(fluxo.descricao);
    setTipo(fluxo.tipo);
    setNodes(fluxo.nodes);
    setEdges(fluxo.edges);
    toast.success(`Fluxo "${fluxo.nome}" importado! Personalize e salve.`);
  };
  
  if (isLoading && !isNew) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  return (
    <div className="h-[100dvh] flex flex-col bg-gradient-to-b from-muted/35 via-background to-background">
      <FlowToolbar
        nome={nome}
        setNome={setNome}
        ativo={ativo}
        isNew={isNew}
        isSaving={saveWorkflow.isPending}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
        onOpenSettings={() => setShowSettings(true)}
        onOpenGallery={() => setShowGallery(true)}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView()}
      />
      
      {/* Tabs para alternar entre editor e historico */}
      {!isNew && id && (
        <div className="px-3 sm:px-4 pt-2 pb-2 border-b bg-background/80 backdrop-blur shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-9 bg-muted/70 border rounded-lg p-1">
              <TabsTrigger value="editor" className="text-sm">Editor</TabsTrigger>
              <TabsTrigger value="historico" className="text-sm">Historico de Execucoes</TabsTrigger>
              <TabsTrigger value="versoes" className="text-sm">Versoes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}
      
      {activeTab === 'editor' ? (
        <div className="flex-1 min-h-0 relative" ref={reactFlowWrapper}>
          {nodes.length === 0 && <EmptyCanvasHint />}
          
          {/* Drop zone indicator */}
          <div className={cn(
            'absolute inset-0 z-10 pointer-events-none transition-all duration-200',
            isDraggingOver 
              ? 'bg-primary/5 border-2 border-dashed border-primary/40 rounded-lg' 
              : 'opacity-0'
          )} />
          
          <EdgeMarkerDefs />
          
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDrop={(e) => { onDrop(e); onDropEnd(); }}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            className="bg-background"
          >
            <MiniMap 
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-background/80 !border !rounded-lg !shadow-lg"
              style={{ width: 150, height: 100 }}
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-muted/20" />
          </ReactFlow>
          
          <DraggableNodePalette onAddNode={onAddNode} />
        </div>
      ) : activeTab === 'historico' ? (
        <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
          <ExecutionHistoryTab workflowId={id!} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
          <WorkflowVersionsTab
            workflowId={id!}
            onRestored={async () => {
              await refetchWorkflow();
              setActiveTab('editor');
            }}
          />
        </div>
      )}
      
      <NodeConfigSheet
        node={selectedNode}
        entityType={entityType}
        onUpdate={(config) => selectedNode && onUpdateNodeConfig(selectedNode.id, config)}
        onUpdateLabel={(label) => selectedNode && onUpdateNodeLabel(selectedNode.id, label)}
        onDelete={() => selectedNode && onDeleteNode(selectedNode.id)}
        onClose={() => setSelectedNodeId(null)}
        onDuplicate={onDuplicateNode}
      />
      
      <Sheet open={showSettings} onOpenChange={setShowSettings}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Configuracoes do Fluxo</SheetTitle>
            <SheetDescription>Configure as propriedades gerais</SheetDescription>
          </SheetHeader>
          <div className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label>Nome do Fluxo</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Boas-vindas" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Objetivo..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <GaleriaFluxosDialog
        open={showGallery}
        onOpenChange={setShowGallery}
        onSelectFluxo={handleImportFluxo}
      />
    </div>
  );
}

export default function FluxoEditor() {
  return (
    <ReactFlowProvider>
      <FluxoEditorInner />
    </ReactFlowProvider>
  );
}


