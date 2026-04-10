import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2, AlertTriangle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClienteCombobox } from '@/components/Pedidos/ClienteCombobox';
import { ProdutoCombobox } from '@/components/Pedidos/ProdutoCombobox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Badge } from '@/components/ui/badge';
import { useCreatePedido, useUpdatePedido, usePedido, PedidoFormData, PedidoItemGrade, DetalheItem } from '@/hooks/usePedidos';
import { useProposta } from '@/hooks/usePropostas';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ClienteQuickAddButton } from '@/components/Pedidos/ClienteQuickAddButton';
import { FotoModeloUpload } from '@/components/Pedidos/FotoModeloUpload';
import { GradeTamanhosSelectorWrapper } from '@/components/Pedidos/GradeTamanhosSelectorWrapper';
import { DetalhesItemSelector } from '@/components/Pedidos/DetalhesItemSelector';
import { useTiposEstampa } from '@/hooks/pcp/useTiposEstampa';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useCreateSolicitacaoAprovacao } from '@/hooks/usePedidosAprovacao';
import { usePodeEditarPedido } from '@/hooks/usePodeEditarPedido';
import { useUserRole } from '@/hooks/useUserRole';
import {
  useCreateSolicitacaoAlteracaoPedido,
  usePedidoAlteracaoPendente,
} from '@/hooks/usePedidosAlteracoes';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatCurrency, parseDateString, extractDateOnly } from '@/lib/formatters';

// Schema com validação flexível para rascunhos
const pedidoSchemaBase = z.object({
  data_pedido: z.string(),
  cliente_id: z.string(),
  data_entrega: z.string(),
  observacao: z.string().optional(),
  caminho_arquivos: z.string().optional(),
  desconto_percentual: z.number().min(0, 'Desconto minimo: 0%').max(100, 'Desconto maximo: 100%').default(0),
  status: z.enum(['rascunho', 'em_producao', 'pronto', 'entregue', 'cancelado']),
  itens: z.array(
    z.object({
      id: z.string().optional(),
      produto_id: z.string(),
      quantidade: z.number().min(1, 'Quantidade mínima é 1'),
      valor_unitario: z.number().min(0, 'Valor deve ser positivo'),
      observacoes: z.string().optional(),
      foto_modelo_url: z.string().optional(),
      tipo_estampa_id: z.string().optional(),
      grades: z.array(z.object({
        codigo: z.string(),
        nome: z.string(),
        quantidade: z.number(),
      })).optional(),
      detalhes: z.array(z.object({
        tipo_detalhe: z.string(),
        valor: z.string(),
      })).optional(),
    })
  ),
});

// Validação completa para pedidos ativos
const pedidoSchema = pedidoSchemaBase.refine((data) => {
  if (data.status === 'rascunho') return true;
  return data.cliente_id && data.cliente_id.length > 0;
}, { message: 'Cliente é obrigatório', path: ['cliente_id'] }).refine((data) => {
  if (data.status === 'rascunho') return true;
  return data.data_entrega && data.data_entrega.length > 0;
}, { message: 'Data de entrega é obrigatória', path: ['data_entrega'] }).refine((data) => {
  if (data.status === 'rascunho') return true;
  return data.itens.length > 0 && data.itens.every(item => item.produto_id && item.produto_id.length > 0);
}, { message: 'Adicione pelo menos um item com produto', path: ['itens'] });

const MASTER_ADMIN_EMAIL = 'robsongaeski@gmail.com';
const normalizarDescontoPercentual = (valor: number) => Math.min(Math.max(valor || 0, 0), 100);
const calcularSubtotalItens = (itens: Array<{ quantidade: number; valor_unitario: number }>) =>
  itens.reduce((total, item) => total + (Number(item.quantidade) * Number(item.valor_unitario)), 0);
const calcularPercentualPorValor = (descontoValor: number, subtotal: number) => {
  if (subtotal <= 0) return 0;
  return normalizarDescontoPercentual((Math.max(descontoValor || 0, 0) / subtotal) * 100);
};
const ETAPAS_PERMITIDAS_SOLICITACAO_ALTERACAO = new Set([
  'entrada',
  'aguardando aprovacao',
  'alteracao',
  'pedido aprovado',
]);
const normalizarTexto = (valor: string) =>
  valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
const aguardar = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const dispararCelebracaoFechamentoPedido = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const styleId = 'pedido-celebracao-confete-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes pedido-confete-cair {
        0% {
          transform: translate3d(0, -10vh, 0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translate3d(var(--drift), 110vh, 0) rotate(720deg);
          opacity: 0;
        }
      }
      @keyframes pedido-confete-explodir {
        0% {
          transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate3d(var(--dx), var(--dy), 0) rotate(540deg) scale(0.9);
          opacity: 0;
        }
      }
      @keyframes pedido-felicitacoes-entrada {
        0% {
          transform: translate(-50%, -50%) scale(0.82);
          opacity: 0;
          filter: blur(1px);
        }
        100% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
          filter: blur(0);
        }
      }
      @keyframes pedido-felicitacoes-saida {
        0% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(0.96);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  const container = document.createElement('div');
  container.setAttribute('aria-hidden', 'true');
  container.style.position = 'fixed';
  container.style.inset = '0';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'hidden';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.position = 'fixed';
  overlay.style.left = '50%';
  overlay.style.top = '50%';
  overlay.style.transform = 'translate(-50%, -50%)';
  overlay.style.padding = '16px 22px';
  overlay.style.borderRadius = '14px';
  overlay.style.background = 'linear-gradient(135deg, rgba(22,163,74,0.97), rgba(37,99,235,0.95))';
  overlay.style.color = '#ffffff';
  overlay.style.textAlign = 'center';
  overlay.style.boxShadow = '0 12px 36px rgba(0,0,0,0.28)';
  overlay.style.zIndex = '10000';
  overlay.style.pointerEvents = 'none';
  overlay.style.animation = reduzirMovimento
    ? 'none'
    : 'pedido-felicitacoes-entrada 320ms ease-out forwards';
  overlay.innerHTML = '<div style="font-size:18px;font-weight:800;line-height:1.1;">Parabéns!</div><div style="font-size:13px;margin-top:4px;opacity:0.96;">Pedido lançado com sucesso</div>';
  document.body.appendChild(overlay);

  if (!reduzirMovimento) {
    const cores = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#14b8a6', '#a855f7', '#eab308'];
    const totalQueda = window.innerWidth < 768 ? 120 : 190;
    const totalExplosao = window.innerWidth < 768 ? 40 : 70;

    for (let i = 0; i < totalQueda; i++) {
      const particula = document.createElement('span');
      const largura = 4 + Math.random() * 6;
      const altura = 7 + Math.random() * 11;
      particula.style.position = 'absolute';
      particula.style.top = '-12vh';
      particula.style.left = `${Math.random() * 100}vw`;
      particula.style.width = `${largura}px`;
      particula.style.height = `${altura}px`;
      particula.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
      particula.style.opacity = '0.96';
      particula.style.borderRadius = Math.random() > 0.6 ? '999px' : '2px';
      particula.style.transform = `rotate(${Math.random() * 360}deg)`;
      particula.style.setProperty('--drift', `${(Math.random() - 0.5) * 420}px`);
      particula.style.animation = `pedido-confete-cair ${1.7 + Math.random() * 1.3}s cubic-bezier(0.22, 0.61, 0.36, 1) forwards`;
      particula.style.animationDelay = `${Math.random() * 0.28}s`;
      container.appendChild(particula);
    }

    for (let i = 0; i < totalExplosao; i++) {
      const particula = document.createElement('span');
      const origemEsquerda = i % 2 === 0;
      const anguloBase = origemEsquerda ? -25 : 205;
      const angulo = (anguloBase + (Math.random() * 70)) * (Math.PI / 180);
      const distancia = 180 + Math.random() * 320;
      particula.style.position = 'absolute';
      particula.style.left = origemEsquerda ? '8vw' : '92vw';
      particula.style.top = `${35 + Math.random() * 20}vh`;
      particula.style.width = `${4 + Math.random() * 6}px`;
      particula.style.height = `${7 + Math.random() * 10}px`;
      particula.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
      particula.style.borderRadius = Math.random() > 0.5 ? '999px' : '2px';
      particula.style.opacity = '0.95';
      particula.style.setProperty('--dx', `${Math.cos(angulo) * distancia}px`);
      particula.style.setProperty('--dy', `${Math.sin(angulo) * distancia}px`);
      particula.style.animation = `pedido-confete-explodir ${1 + Math.random() * 0.7}s ease-out forwards`;
      particula.style.animationDelay = `${Math.random() * 0.16}s`;
      container.appendChild(particula);
    }
  }

  window.setTimeout(() => {
    if (!reduzirMovimento) {
      overlay.style.animation = 'pedido-felicitacoes-saida 260ms ease-in forwards';
    }
  }, 1650);

  window.setTimeout(() => {
    container.remove();
    overlay.remove();
  }, 2350);
};

const pedidoToSnapshot = (pedido: any): PedidoFormData => ({
  data_pedido: extractDateOnly(pedido.data_pedido) || '',
  cliente_id: pedido.cliente_id,
  data_entrega: extractDateOnly(pedido.data_entrega) || undefined,
  observacao: pedido.observacao || '',
  caminho_arquivos: pedido.caminho_arquivos || '',
  desconto_percentual: Number(pedido.desconto_percentual || 0),
  desconto_aguardando_aprovacao: Boolean(pedido.desconto_aguardando_aprovacao),
  status: pedido.status,
  itens: (pedido.itens || []).map((item: any) => ({
    id: item.id,
    produto_id: item.produto_id,
    quantidade: item.quantidade,
    valor_unitario: Number(item.valor_unitario),
    observacoes: item.observacoes || '',
    foto_modelo_url: item.foto_modelo_url || '',
    tipo_estampa_id: item.tipo_estampa_id || '',
    grades: (item.grades || []).map((g: any) => ({
      codigo: g.tamanho_codigo,
      nome: g.tamanho_nome,
      quantidade: g.quantidade,
    })),
    detalhes: (item.detalhes || []).map((d: any) => ({
      tipo_detalhe: d.tipo_detalhe || '',
      valor: d.valor || '',
    })),
  })),
});

const getCamposAlterados = (anterior: PedidoFormData, novo: PedidoFormData) => {
  const campos: string[] = [];
  if ((anterior.data_pedido || '') !== (novo.data_pedido || '')) campos.push('data_pedido');
  if ((anterior.cliente_id || '') !== (novo.cliente_id || '')) campos.push('cliente_id');
  if ((anterior.data_entrega || '') !== (novo.data_entrega || '')) campos.push('data_entrega');
  if ((anterior.observacao || '') !== (novo.observacao || '')) campos.push('observacao');
  if ((anterior.caminho_arquivos || '') !== (novo.caminho_arquivos || '')) campos.push('caminho_arquivos');
  if (Number(anterior.desconto_percentual || 0) !== Number(novo.desconto_percentual || 0)) campos.push('desconto_percentual');
  if (anterior.status !== novo.status) campos.push('status');
  if (JSON.stringify(anterior.itens || []) !== JSON.stringify(novo.itens || [])) campos.push('itens');
  return campos;
};

export default function PedidoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const propostaId = searchParams.get('propostaId');
  const duplicarDeId = searchParams.get('duplicarDe');
  const isEditing = id !== undefined && id !== 'novo';
  const { user } = useAuth();
  const { can, canAny } = usePermissions();
  const { isAdmin: isRoleAdmin } = useUserRole();
  const [itemsAbaixoMinimo, setItemsAbaixoMinimo] = useState<number[]>([]);
  const [faixasPreco, setFaixasPreco] = useState<Record<number, any>>({});
  const [validandoPrecos, setValidandoPrecos] = useState(false);
  const [salvandoRascunho, setSalvandoRascunho] = useState(false);
  const [descontoModo, setDescontoModo] = useState<'percentual' | 'valor'>('percentual');
  const [descontoValorInput, setDescontoValorInput] = useState(0);

  // Verificar permissões específicas
  const podeAlterarStatus = can('pedidos.alterar_status');
  const isMasterAdmin = user?.email?.toLowerCase() === MASTER_ADMIN_EMAIL;
  const isAdmin = isRoleAdmin || isMasterAdmin;
  const podeEditarPedidoCompleto = isAdmin || canAny('pedidos.editar', 'pedidos.editar_todos');
  const podeSolicitarAlteracaoAprovacao = isAdmin || can('pedidos.alteracoes.solicitar');
  const podeApenasAlterarStatus = podeAlterarStatus && !podeEditarPedidoCompleto;

  const { data: pedido } = usePedido(isEditing ? id : undefined);
  const { data: proposta } = useProposta(propostaId || undefined);
  const { data: pedidoDuplicar } = usePedido(duplicarDeId || undefined);
  const { data: podeEditar, isLoading: loadingPermissao } = usePodeEditarPedido(isEditing ? id : undefined);
  const { tipos: tiposEstampa } = useTiposEstampa();
  const createPedido = useCreatePedido();
  const updatePedido = useUpdatePedido(id || '');
  const createSolicitacao = useCreateSolicitacaoAprovacao();
  const createSolicitacaoAlteracao = useCreateSolicitacaoAlteracaoPedido();
  const { data: solicitacaoAlteracaoPendente } = usePedidoAlteracaoPendente(isEditing ? id : undefined);

  const pedidoEmRascunho = isEditing && pedido?.status === 'rascunho';
  const etapaAtualNome = ((pedido as any)?.etapa_producao?.nome_etapa || '') as string;
  const pedidoEmEtapaElegivelSolicitacao =
    isEditing &&
    !!etapaAtualNome &&
    ETAPAS_PERMITIDAS_SOLICITACAO_ALTERACAO.has(normalizarTexto(etapaAtualNome));
  const fluxoSolicitacaoPedidoAprovacao =
    isEditing &&
    pedidoEmEtapaElegivelSolicitacao &&
    !podeEditarPedidoCompleto &&
    podeSolicitarAlteracaoAprovacao;
  const bloqueioPorEtapaForaFluxo =
    isEditing &&
    !pedidoEmEtapaElegivelSolicitacao &&
    !podeEditarPedidoCompleto &&
    podeSolicitarAlteracaoAprovacao &&
    !podeApenasAlterarStatus;
  const bloqueioSemPermissao =
    isEditing &&
    !podeEditarPedidoCompleto &&
    !podeSolicitarAlteracaoAprovacao &&
    !podeApenasAlterarStatus &&
    !pedidoEmRascunho;
  const bloqueioPorPagamento = isEditing && !pedidoEmRascunho && !fluxoSolicitacaoPedidoAprovacao && podeEditar === false;
  const podeEditarRascunho = pedidoEmRascunho && podeAlterarStatus;

  // Determinar modo de edição baseado em permissões + pagamentos
  const modoEdicao = {
    completo:
      isEditing &&
      !bloqueioPorPagamento &&
      !bloqueioPorEtapaForaFluxo &&
      !bloqueioSemPermissao &&
      (podeEditarPedidoCompleto || podeEditarRascunho || fluxoSolicitacaoPedidoAprovacao),
    apenasStatus:
      isEditing &&
      !bloqueioPorPagamento &&
      !bloqueioPorEtapaForaFluxo &&
      !bloqueioSemPermissao &&
      !fluxoSolicitacaoPedidoAprovacao &&
      podeApenasAlterarStatus &&
      !pedidoEmRascunho,
    bloqueado: bloqueioPorPagamento || bloqueioPorEtapaForaFluxo || bloqueioSemPermissao,
  };

  // Campos desabilitados se modo "apenas status" ou bloqueado
  const camposDesabilitados = modoEdicao.apenasStatus || modoEdicao.bloqueado;

  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome_razao_social');
      if (error) throw error;
      return data;
    },
  });

  const { data: produtos } = useQuery({
    queryKey: ['produtos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof pedidoSchema>>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      data_pedido: format(new Date(), 'yyyy-MM-dd'),
      cliente_id: '',
      data_entrega: '',
      observacao: '',
      caminho_arquivos: '',
      desconto_percentual: 0,
      status: 'em_producao',
      itens: [{ 
        produto_id: '', 
        quantidade: 1, 
        valor_unitario: 0, 
        observacoes: '', 
        foto_modelo_url: '', 
        tipo_estampa_id: '',
        grades: [],
        detalhes: [],
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'itens',
  });

  // Limpar validações ao adicionar/remover itens
  useEffect(() => {
    const currentLength = form.watch('itens').length;
    setItemsAbaixoMinimo(prev => prev.filter(i => i < currentLength));
  }, [form.watch('itens').length]);

  useEffect(() => {
    if (pedido && isEditing) {
      form.reset({
        data_pedido: extractDateOnly(pedido.data_pedido) || format(new Date(), 'yyyy-MM-dd'),
        cliente_id: pedido.cliente_id,
        data_entrega: extractDateOnly(pedido.data_entrega) || '',
        observacao: pedido.observacao || '',
        caminho_arquivos: (pedido as any).caminho_arquivos || '',
        desconto_percentual: Number((pedido as any).desconto_percentual || 0),
        status: pedido.status,
        itens: pedido.itens?.map((item: any) => ({
          id: item.id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_unitario: Number(item.valor_unitario),
          observacoes: item.observacoes || '',
          foto_modelo_url: item.foto_modelo_url || '',
          tipo_estampa_id: item.tipo_estampa_id || '',
          grades: (item.grades || []).map((g: any) => ({
            codigo: g.tamanho_codigo,
            nome: g.tamanho_nome,
            quantidade: g.quantidade,
          })),
          detalhes: (item.detalhes || []).map((d: any) => ({
            tipo_detalhe: d.tipo_detalhe || '',
            valor: d.valor || '',
          })),
        })) || [],
      });
    } else if (proposta && !isEditing && propostaId) {
      // Preencher com dados da proposta (incluindo dados de criação de arte)
      form.reset({
        data_pedido: format(new Date(), 'yyyy-MM-dd'),
        cliente_id: proposta.cliente_id,
        data_entrega: '',
        observacao: proposta.observacoes || '',
        caminho_arquivos: proposta.caminho_arquivos || '',
        desconto_percentual: Number((proposta as any).desconto_percentual || 0),
        status: 'em_producao',
        itens: proposta.itens?.map((item: any, index: number) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_unitario: Number(item.valor_unitario),
          observacoes: item.observacoes || '',
          // Usar imagem de aprovação como foto modelo no primeiro item
          foto_modelo_url: index === 0 ? (proposta.imagem_aprovacao_url || '') : '',
          grades: [],
          detalhes: [],
        })) || [],
      });
    } else if (pedidoDuplicar && !isEditing && duplicarDeId) {
      // Duplicar pedido existente
      form.reset({
        data_pedido: format(new Date(), 'yyyy-MM-dd'),
        cliente_id: pedidoDuplicar.cliente_id,
        data_entrega: '',
        observacao: pedidoDuplicar.observacao || '',
        caminho_arquivos: (pedidoDuplicar as any).caminho_arquivos || '',
        desconto_percentual: Number((pedidoDuplicar as any).desconto_percentual || 0),
        status: 'rascunho',
        itens: pedidoDuplicar.itens?.map((item: any) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_unitario: Number(item.valor_unitario),
          observacoes: item.observacoes || '',
          foto_modelo_url: item.foto_modelo_url || '',
          tipo_estampa_id: item.tipo_estampa_id || '',
          grades: (item.grades || []).map((g: any) => ({
            codigo: g.tamanho_codigo,
            nome: g.tamanho_nome,
            quantidade: g.quantidade,
          })),
          detalhes: (item.detalhes || []).map((d: any) => ({
            tipo_detalhe: d.tipo_detalhe || '',
            valor: d.valor || '',
          })),
        })) || [],
      });
    }

    const descontoInicial = normalizarDescontoPercentual(Number(form.getValues('desconto_percentual') || 0));
    const subtotalInicial = calcularSubtotalItens(form.getValues('itens') || []);
    setDescontoModo('percentual');
    setDescontoValorInput((subtotalInicial * descontoInicial) / 100);
  }, [pedido, proposta, pedidoDuplicar, isEditing, propostaId, duplicarDeId, form]);

  // Buscar faixas de preço quando pedido for carregado em modo de edição
  useEffect(() => {
    if (isEditing && pedido?.itens && produtos) {
      const buscarTodasFaixas = async () => {
        for (let i = 0; i < pedido.itens.length; i++) {
          const item = pedido.itens[i];
          await buscarFaixaPreco(item.produto_id, item.quantidade, i);
        }
        // Após buscar todas as faixas, verificar todos os itens
        setTimeout(() => verificarTodosItens(), 100);
      };
      
      buscarTodasFaixas();
    }
  }, [isEditing, pedido?.itens, produtos]);

  const onSubmit = async (data: z.infer<typeof pedidoSchema>) => {
    setValidandoPrecos(true);
    
    try {
      // Validar grades antes de salvar
      for (let i = 0; i < data.itens.length; i++) {
        const item = data.itens[i];
        if (item.grades && item.grades.length > 0) {
          const somaGrades = item.grades.reduce((acc, g) => acc + g.quantidade, 0);
          if (somaGrades !== item.quantidade) {
            const produto = produtos?.find(p => p.id === item.produto_id);
            toast({
              title: 'Grade de tamanhos incompleta',
              description: `O item "${produto?.nome || 'Item ' + (i + 1)}" tem ${item.quantidade} unidades, mas a grade soma ${somaGrades}.`,
              variant: 'destructive',
            });
            setValidandoPrecos(false);
            return;
          }
        }
      }

      // Verificar permissão de edição
      if (modoEdicao.bloqueado) {
        toast({
          title: 'Operação não permitida',
          description: bloqueioPorPagamento
            ? 'Este pedido possui pagamentos aprovados e nao pode ser editado.'
            : bloqueioPorEtapaForaFluxo
              ? 'Este pedido nao esta em etapa elegivel para solicitacao de alteracao.'
              : 'Voce nao possui permissao para editar este pedido.',
          variant: 'destructive',
        });
        return;
      }

      // NOVA VALIDAÇÃO: Se modo "apenas status", verificar se apenas status mudou
      const subtotalAtual = calcularSubtotalItens(data.itens);
      const descontoNormalizado =
        descontoModo === 'valor'
          ? calcularPercentualPorValor(descontoValorInput, subtotalAtual)
          : normalizarDescontoPercentual(Number(data.desconto_percentual || 0));
      const descontoAguardandoAprovacao = !isAdmin && descontoNormalizado > 3;

      if (modoEdicao.apenasStatus && pedido) {
        // Verificar se algo além do status foi alterado
        const statusMudou = data.status !== pedido.status;
        const outrosCamposMudaram = 
          data.data_pedido !== (extractDateOnly(pedido.data_pedido) || format(new Date(), 'yyyy-MM-dd')) ||
          data.cliente_id !== pedido.cliente_id ||
          data.data_entrega !== (extractDateOnly(pedido.data_entrega) || '') ||
          data.observacao !== (pedido.observacao || '') ||
          Number(descontoNormalizado) !== Number((pedido as any).desconto_percentual || 0) ||
          JSON.stringify(data.itens) !== JSON.stringify(pedido.itens?.map((item: any) => ({
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            valor_unitario: Number(item.valor_unitario),
            observacoes: item.observacoes || '',
            foto_modelo_url: item.foto_modelo_url || '',
          })));

        if (outrosCamposMudaram) {
          toast({
            title: 'Operação não permitida',
            description: 'Você tem permissão apenas para alterar o status do pedido.',
            variant: 'destructive',
          });
          return;
        }

        if (!statusMudou) {
          toast({
            title: 'Nenhuma alteração',
            description: 'O status não foi modificado.',
            variant: 'default',
          });
          return;
        }

        // Se chegou aqui, apenas o status mudou - permitir
        await updatePedido.mutateAsync({
          data_pedido: data.data_pedido,
          cliente_id: data.cliente_id,
          data_entrega: data.data_entrega || undefined,
          observacao: data.observacao,
          caminho_arquivos: data.caminho_arquivos,
          desconto_percentual: descontoNormalizado,
          desconto_aguardando_aprovacao: descontoAguardandoAprovacao,
          status: data.status,
          itens: data.itens.map(item => ({
            id: item.id,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            valor_unitario: item.valor_unitario,
            observacoes: item.observacoes,
            foto_modelo_url: item.foto_modelo_url,
            tipo_estampa_id: item.tipo_estampa_id,
            grades: item.grades?.filter(g => g.codigo && g.nome && g.quantidade) as PedidoItemGrade[] | undefined,
            detalhes: item.detalhes?.filter(d => d.tipo_detalhe && d.valor) as DetalheItem[] | undefined,
          })),
        });

        toast({
          title: 'Status atualizado!',
          description: 'O status do pedido foi alterado com sucesso.',
        });
        navigate('/pedidos');
        return;
      }

      const formData: PedidoFormData = {
        data_pedido: data.data_pedido,
        cliente_id: data.cliente_id,
        data_entrega: data.data_entrega || undefined,
        observacao: data.observacao,
        caminho_arquivos: data.caminho_arquivos,
        desconto_percentual: descontoNormalizado,
        desconto_aguardando_aprovacao: descontoAguardandoAprovacao,
        // Se era rascunho e está salvando normalmente, ativar para em_producao
        status: data.status === 'rascunho' ? 'em_producao' : data.status,
        itens: data.itens.map(item => ({
          id: item.id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          observacoes: item.observacoes,
          foto_modelo_url: item.foto_modelo_url,
          tipo_estampa_id: item.tipo_estampa_id,
          grades: item.grades?.filter(g => g.codigo && g.nome && g.quantidade) as PedidoItemGrade[] | undefined,
          detalhes: item.detalhes?.filter(d => d.tipo_detalhe && d.valor) as DetalheItem[] | undefined,
        })),
      };

      if (fluxoSolicitacaoPedidoAprovacao && isEditing && pedido) {
        if (!user) {
          throw new Error('Usuário não autenticado para solicitar alteração.');
        }

        const dadosAnteriores = pedidoToSnapshot(pedido);
        const camposAlterados = getCamposAlterados(dadosAnteriores, formData);
        const motivoSolicitacao = camposAlterados.length
          ? `Alteracao solicitada para aprovacao. Campos alterados: ${camposAlterados.join(', ')}.`
          : 'Alteracao solicitada para aprovacao.';

        await createSolicitacaoAlteracao.mutateAsync({
          pedido_id: id!,
          solicitado_por: user.id,
          motivo_solicitacao: motivoSolicitacao,
          observacao_solicitante: data.observacao || null,
          dados_anteriores: dadosAnteriores,
          dados_propostos: formData,
        });

        toast({
          title: 'Solicitação enviada!',
          description: 'A alteração foi enviada para aprovação. O pedido será atualizado após liberação.',
        });
        navigate('/pedidos');
        return;
      }

      // GARANTIR que todas as faixas foram buscadas antes de validar
      const itens = data.itens;
      const faixasPromises = itens.map(async (item, index) => {
        // Se a faixa já existe, não precisa buscar de novo
        if (faixasPreco[index]) return;
        
        // Buscar faixa que está faltando
        await buscarFaixaPreco(item.produto_id, item.quantidade, index);
      });

      await Promise.all(faixasPromises);

      // Aguardar um momento para o estado atualizar
      await new Promise(resolve => setTimeout(resolve, 100));

      // Validar todos os itens antes de submeter - RE-BUSCAR DO BANCO (segurança extra)
      const problemas: number[] = [];

      for (let index = 0; index < itens.length; index++) {
        const item = itens[index];
        
        // Buscar faixa diretamente do banco (segurança extra)
        const { data: faixaData, error } = await supabase.rpc('buscar_faixa_preco', {
          p_produto_id: item.produto_id,
          p_quantidade: item.quantidade,
        });
        
        if (!error && faixaData && faixaData.length > 0) {
          const faixa = faixaData[0];
          const precoMin = Number(faixa.preco_minimo);
          const valor = Number(item.valor_unitario);
          
          if (valor < precoMin) {
            problemas.push(index);
            // Atualizar faixasPreco para exibição
            setFaixasPreco(prev => ({ ...prev, [index]: faixa }));
          }
        }
      }

      setItemsAbaixoMinimo(problemas);
      const requerAprovacaoPreco = problemas.length > 0;
      const requerAprovacaoDesconto = descontoAguardandoAprovacao;
      const requerAprovacao = requerAprovacaoPreco || requerAprovacaoDesconto;

    let pedidoId: string;
    
    if (isEditing) {
      await updatePedido.mutateAsync(formData);
      pedidoId = id!;
    } else {
      const novoPedido = await createPedido.mutateAsync(formData);
      pedidoId = novoPedido.id;
    }

      // Se há itens abaixo do mínimo, criar solicitação de aprovação
      if (requerAprovacao && user) {
        const itensProblema = problemas.map(index => {
          const item = data.itens[index];
          const produto = produtos?.find(p => p.id === item.produto_id);
          const faixa = faixasPreco[index];
          return `${produto?.nome} (Qtd: ${item.quantidade}, Preço: ${formatCurrency(item.valor_unitario)}, Mínimo: ${formatCurrency(faixa?.preco_minimo || 0)})`;
        }).join('; ');

        const motivosSolicitacao: string[] = [];
        if (requerAprovacaoPreco) {
          motivosSolicitacao.push(`Precos abaixo do minimo permitido: ${itensProblema}`);
        }
        if (requerAprovacaoDesconto) {
          motivosSolicitacao.push(
            `Desconto a vista acima do limite do vendedor: ${descontoNormalizado.toFixed(2)}% (limite: 3,00%)`
          );
        }

        await createSolicitacao.mutateAsync({
          pedido_id: pedidoId,
          motivo_solicitacao: motivosSolicitacao.join(' | '),
          solicitado_por: user.id,
        });

        // Atualizar flag no pedido
        await supabase
          .from('pedidos')
          .update({ requer_aprovacao_preco: true })
          .eq('id', pedidoId);
        
        // Toast de alerta ao editar pedido que estava aprovado
        if (requerAprovacao && isEditing && !pedido?.requer_aprovacao_preco) {
          toast({
            title: '⚠️ Pedido enviado para nova aprovação',
            description: 'Ha pendencia de politica comercial (preco e/ou desconto a vista). O pedido sera enviado novamente para aprovacao administrativa.',
            variant: 'default',
          });
        }
      }

      const pedidoLancadoAgora =
        !isEditing &&
        formData.status !== 'rascunho' &&
        formData.status !== 'cancelado';
      if (pedidoLancadoAgora) {
        dispararCelebracaoFechamentoPedido();
        toast({
          title: 'Pedido lançado com sucesso!',
          description: 'Parabéns! O pedido foi registrado no sistema.',
        });
        await aguardar(1700);
      } else {
        toast({
          title: modoEdicao.apenasStatus ? 'Status atualizado!' : 'Pedido salvo!',
          description: isEditing 
            ? (modoEdicao.apenasStatus ? 'O status do pedido foi alterado com sucesso.' : 'Pedido atualizado com sucesso.')
            : 'Pedido criado com sucesso.',
        });
      }

      navigate('/pedidos');
    } finally {
      setValidandoPrecos(false);
    }
  };

  const buscarFaixaPreco = async (produtoId: string, quantidade: number, index: number) => {
    try {
      const { data, error } = await supabase.rpc('buscar_faixa_preco', {
        p_produto_id: produtoId,
        p_quantidade: quantidade,
      });

      if (error) throw error;
      
      if (data && data.length > 0) {
        const faixa = data[0];
        setFaixasPreco(prev => ({ ...prev, [index]: faixa }));
        return faixa;
      }
      
      setFaixasPreco(prev => {
        const { [index]: _, ...rest } = prev;
        return rest;
      });
      return null;
    } catch (error) {
      console.error('Erro ao buscar faixa de preço:', error);
      return null;
    }
  };

  const handleProdutoChange = async (index: number, produtoId: string) => {
    const produto = produtos?.find(p => p.id === produtoId);
    const quantidade = form.watch(`itens.${index}.quantidade`) || 1;
    
    if (produto && quantidade > 0) {
      const faixa = await buscarFaixaPreco(produtoId, quantidade, index);
      
      if (faixa) {
        form.setValue(`itens.${index}.valor_unitario`, Number(faixa.preco_maximo));
      } else {
        form.setValue(`itens.${index}.valor_unitario`, Number(produto.valor_base));
      }
      
      // Aguardar atualização do estado antes de verificar
      await new Promise(resolve => setTimeout(resolve, 100));
      verificarPrecoMinimo(index);
    }
  };

  const handleQuantidadeChange = async (index: number, quantidade: number) => {
    const produtoId = form.watch(`itens.${index}.produto_id`);
    
    if (produtoId && quantidade > 0) {
      const faixa = await buscarFaixaPreco(produtoId, quantidade, index);
      
      if (faixa) {
        form.setValue(`itens.${index}.valor_unitario`, Number(faixa.preco_maximo));
      }
      
      // Aguardar atualização do estado antes de verificar
      await new Promise(resolve => setTimeout(resolve, 100));
      verificarPrecoMinimo(index);
    }
  };

  const verificarPrecoMinimo = (index: number) => {
    const item = form.watch(`itens.${index}`);
    const valorUnitario = item?.valor_unitario;
    const faixa = faixasPreco[index];
    
    // Debug log para investigação
    console.log(`Verificando item ${index}:`, {
      valor: valorUnitario,
      faixa: faixa ? { min: faixa.preco_minimo, max: faixa.preco_maximo } : null
    });
    
    if (faixa && valorUnitario !== undefined) {
      const precoMin = Number(faixa.preco_minimo);
      const valor = Number(valorUnitario);
      
      // Adicionar tolerância de 0.01 para evitar problemas de arredondamento
      if (valor < (precoMin - 0.01)) {
        setItemsAbaixoMinimo(prev => {
          const newSet = new Set([...prev, index]);
          console.log(`Item ${index} ABAIXO do mínimo:`, { valor, precoMin });
          return Array.from(newSet);
        });
      } else {
        setItemsAbaixoMinimo(prev => {
          const filtered = prev.filter(i => i !== index);
          if (prev.includes(index)) {
            console.log(`Item ${index} REMOVIDO da lista (valor OK):`, { valor, precoMin });
          }
          return filtered;
        });
      }
    } else {
      // Se não há faixa, remover da lista
      setItemsAbaixoMinimo(prev => prev.filter(i => i !== index));
    }
  };

  const verificarTodosItens = () => {
    const itens = form.watch('itens');
    const problemas: number[] = [];
    
    itens.forEach((item, index) => {
      const faixa = faixasPreco[index];
      if (faixa) {
        const precoMin = Number(faixa.preco_minimo);
        const valor = Number(item.valor_unitario);
        
        if (valor < precoMin) {
          problemas.push(index);
        }
      }
    });
    
    setItemsAbaixoMinimo(problemas);
  };

  // Validação reativa quando faixas ou itens mudarem
  useEffect(() => {
    // Debounce para evitar validações excessivas
    const timer = setTimeout(() => {
      verificarTodosItens();
    }, 200);
    
    return () => clearTimeout(timer);
  }, [faixasPreco, form.watch('itens')]);

  const itensFormulario = form.watch('itens');
  const subtotalPedido = calcularSubtotalItens(itensFormulario);
  const descontoPercentualForm = normalizarDescontoPercentual(Number(form.watch('desconto_percentual') || 0));
  const descontoValorNormalizado =
    descontoModo === 'valor'
      ? Math.min(Math.max(descontoValorInput || 0, 0), subtotalPedido)
      : (subtotalPedido * descontoPercentualForm) / 100;
  const descontoPercentualEfetivo =
    subtotalPedido > 0 ? calcularPercentualPorValor(descontoValorNormalizado, subtotalPedido) : 0;
  const descontoAcimaLimite = !isAdmin && descontoPercentualEfetivo > 3;
  const valorTotal = Math.max(subtotalPedido - descontoValorNormalizado, 0);

  useEffect(() => {
    if (descontoModo === 'valor' && descontoValorInput > subtotalPedido) {
      setDescontoValorInput(subtotalPedido);
    }
  }, [descontoModo, descontoValorInput, subtotalPedido]);

  const handleModoDescontoChange = (modo: 'percentual' | 'valor') => {
    if (modo === descontoModo) return;

    if (modo === 'valor') {
      setDescontoValorInput((subtotalPedido * descontoPercentualForm) / 100);
    } else {
      form.setValue('desconto_percentual', descontoPercentualEfetivo, { shouldDirty: true });
    }

    setDescontoModo(modo);
  };

  const handleDescontoValorChange = (valor: number) => {
    setDescontoValorInput(Math.min(Math.max(valor || 0, 0), subtotalPedido));
  };

  const appendItem = () => {
    append({
      produto_id: '',
      quantidade: 1,
      valor_unitario: 0,
      observacoes: '',
      foto_modelo_url: '',
      tipo_estampa_id: '',
      grades: [],
      detalhes: [],
    });
  };

  const duplicarItem = (index: number) => {
    const item = form.watch(`itens.${index}`);
    append({
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      observacoes: item.observacoes,
      foto_modelo_url: '', // Não copiar foto
      tipo_estampa_id: item.tipo_estampa_id,
      grades: [...(item.grades || [])],
      detalhes: [...(item.detalhes || [])],
    });
    toast({
      title: 'Item duplicado',
      description: 'Um novo item foi adicionado com os mesmos detalhes.',
    });
  };

  if (isEditing && !pedido) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{isEditing ? 'Editar Pedido' : 'Novo Pedido'}</h1>
      </div>

      {propostaId && proposta && (
        <Alert className="border-primary bg-primary/5">
          <AlertDescription>
            <strong>✅ Pedido criado a partir da Proposta #{propostaId.slice(0, 8).toUpperCase()}</strong>
            <br />
            Os dados foram pré-preenchidos. Revise e complete as informações necessárias.
          </AlertDescription>
        </Alert>
      )}

      {isEditing && !loadingPermissao && modoEdicao.bloqueado && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {bloqueioPorPagamento ? (
              <>
                <strong>Atencao:</strong> Este pedido possui pagamentos aprovados e nao pode ser editado.
                Apenas administradores podem modificar pedidos com pagamentos aprovados.
              </>
            ) : bloqueioPorEtapaForaFluxo ? (
              <>
                <strong>Atencao:</strong> Este pedido nao esta em etapa elegivel para solicitar alteracao.
                Etapas permitidas: Entrada, Aguardando Aprovacao, Alteracao e Pedido Aprovado.
              </>
            ) : (
              <>
                <strong>Atencao:</strong> Voce nao possui permissao para editar este pedido.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {isEditing && fluxoSolicitacaoPedidoAprovacao && (
        <Alert className="border-amber-500 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900">
            <strong>Pedido em etapa de aprovacao</strong>
            <p className="mt-1 text-sm">
              Voce pode editar os dados e salvar para enviar uma solicitacao.
              A alteracao so sera aplicada apos aprovacao.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {isEditing && solicitacaoAlteracaoPendente && (
        <Alert className="border-primary bg-primary/5">
          <AlertDescription>
            <strong>Solicitacao pendente para este pedido</strong>
            <p className="mt-1 text-sm">
              Existe uma solicitacao de alteracao aguardando analise desde{' '}
              {new Date(solicitacaoAlteracaoPendente.data_solicitacao).toLocaleString('pt-BR')}.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de Modo de Edicao Limitado */}
      {modoEdicao.apenasStatus && (
        <Alert className="border-blue-500 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <strong>Modo de Edicao Limitado</strong>
            <p className="mt-1 text-sm">
              Voce tem permissao apenas para <strong>alterar o status deste pedido</strong>.
              Os demais campos estao bloqueados para edicao.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Alerta de Pedido Aguardando Aprovacao */}
      {isEditing && pedido?.requer_aprovacao_preco && (
        <Alert variant="destructive" className="border-warning bg-warning/10">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <AlertDescription className="text-warning">
            <strong>Este pedido esta aguardando aprovacao administrativa</strong>
            <p className="mt-2 text-sm text-muted-foreground">
              Ha pendencia de politica comercial (preco e/ou desconto a vista). Voce pode ajustar os valores para corrigir.
              Se os precos ficarem dentro da faixa permitida e o desconto a vista ficar em ate 3%, a solicitacao sera removida automaticamente.
            </p>
          </AlertDescription>
        </Alert>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Cabeçalho do Pedido */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_pedido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data do Pedido</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={camposDesabilitados} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cliente_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <ClienteCombobox
                            clientes={clientes}
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={camposDesabilitados}
                          />
                        </FormControl>
                        {!camposDesabilitados && (
                          <ClienteQuickAddButton onClienteAdded={(clienteId) => field.onChange(clienteId)} />
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_entrega"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Entrega</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={camposDesabilitados} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status do Pedido</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={modoEdicao.bloqueado}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(field.value === 'rascunho' || pedido?.status === 'rascunho') && (
                            <SelectItem value="rascunho">Rascunho</SelectItem>
                          )}
                          <SelectItem value="em_producao">Em Produção</SelectItem>
                          <SelectItem value="pronto">Pronto</SelectItem>
                          <SelectItem value="entregue">Entregue</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="caminho_arquivos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Caminho dos Arquivos/Logos</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ex: \\\\servidor\\arquivos\\cliente\\logos" 
                        disabled={camposDesabilitados} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação Geral</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Observações do pedido..." disabled={camposDesabilitados} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="desconto_percentual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desconto para pagamento a vista</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Select
                        value={descontoModo}
                        onValueChange={(value) => handleModoDescontoChange(value as 'percentual' | 'valor')}
                        disabled={camposDesabilitados}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentual">Porcentagem (%)</SelectItem>
                          <SelectItem value="valor">Valor (R$)</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="md:col-span-2">
                        {descontoModo === 'percentual' ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step="0.1"
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(normalizarDescontoPercentual(Number.parseFloat(e.target.value) || 0))
                            }
                            disabled={camposDesabilitados}
                          />
                        ) : (
                          <CurrencyInput
                            value={descontoValorInput}
                            onChange={handleDescontoValorChange}
                            disabled={camposDesabilitados}
                          />
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      Use somente para pagamento integral no ato do pedido (a vista). Ate 3% e liberado para vendedor.
                      Acima disso, o pedido fica aguardando aprovacao do administrador.
                    </p>
                    {descontoModo === 'valor' && descontoValorNormalizado > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Equivale a {descontoPercentualEfetivo.toFixed(2)}% sobre o subtotal.
                      </p>
                    )}
                    {descontoAcimaLimite && (
                      <p className="text-xs font-medium text-amber-600">
                        Desconto a vista acima de 3%: este pedido sera enviado para aprovacao.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Itens do Pedido */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Itens do Pedido</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ produto_id: '', quantidade: 1, valor_unitario: 0, observacoes: '', foto_modelo_url: '' })}
                  disabled={camposDesabilitados}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <Card key={field.id} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`itens.${index}.produto_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Produto</FormLabel>
                            <FormControl>
                              <ProdutoCombobox
                                produtos={produtos}
                                value={field.value}
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleProdutoChange(index, value);
                                }}
                                disabled={camposDesabilitados}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <FormField
                        control={form.control}
                        name={`itens.${index}.quantidade`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Qtd</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => {
                                  const qtd = Number(e.target.value);
                                  field.onChange(qtd);
                                  handleQuantidadeChange(index, qtd);
                                }}
                                disabled={camposDesabilitados}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`itens.${index}.valor_unitario`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Unit.</FormLabel>
                            <FormControl>
                              <CurrencyInput
                                value={field.value}
                                onChange={(val) => {
                                  field.onChange(val);
                                  verificarPrecoMinimo(index);
                                }}
                                disabled={camposDesabilitados}
                              />
                            </FormControl>
                            {itemsAbaixoMinimo.includes(index) && faixasPreco[index] && (
                              <div className="flex items-center gap-1 mt-1">
                                <AlertTriangle className="h-3 w-3 text-warning" />
                                <span className="text-xs text-warning">
                                  Abaixo do mínimo ({formatCurrency(faixasPreco[index].preco_minimo)})
                                </span>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`itens.${index}.tipo_estampa_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Estampa</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={camposDesabilitados}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Tipo estampa..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {tiposEstampa?.map((tipo: any) => (
                                  <SelectItem key={tipo.id} value={tipo.id}>
                                    {tipo.nome_tipo_estampa}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`itens.${index}.observacoes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Obs</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Observações" disabled={camposDesabilitados} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="md:col-span-1 flex items-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicarItem(index)}
                        disabled={camposDesabilitados}
                        title="Duplicar item"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1 || camposDesabilitados}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Detalhes Adicionais */}
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name={`itens.${index}.detalhes`}
                      render={({ field }) => (
                        <FormItem>
                          <DetalhesItemSelector
                            value={(field.value || []) as Array<{ tipo_detalhe: string; valor: string }>}
                            onChange={field.onChange}
                            disabled={camposDesabilitados}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Foto do Modelo/Estampa */}
                  <div className="mt-4">
                    <FormField
                      control={form.control}
                      name={`itens.${index}.foto_modelo_url`}
                      render={({ field }) => (
                        <FormItem>
                          <FotoModeloUpload
                            value={field.value}
                            onChange={field.onChange}
                            pedidoId={id}
                            itemIndex={index}
                            disabled={camposDesabilitados}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Grade de Tamanhos */}
                  {(() => {
                    const produtoId = form.watch(`itens.${index}.produto_id`);
                    const produto = produtos?.find(p => p.id === produtoId);
                    
                    if (!produto?.grade_tamanho_id) return null;
                    
                    const grades = (form.watch(`itens.${index}.grades`) || []).filter(
                      (g): g is { codigo: string; nome: string; quantidade: number } => 
                        !!g.codigo && !!g.nome && typeof g.quantidade === 'number'
                    );
                    
                    return (
                      <div className="mt-4">
                        <GradeTamanhosSelectorWrapper
                          gradeId={produto.grade_tamanho_id}
                          quantidadeTotal={form.watch(`itens.${index}.quantidade`)}
                          value={grades}
                          onChange={(grades) => form.setValue(`itens.${index}.grades`, grades)}
                          disabled={camposDesabilitados}
                        />
                      </div>
                    );
                  })()}
                </Card>
              ))}

              {/* Card de Resumo do Valor Total */}
              <Card className="bg-muted">
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotalPedido)}</span>
                    </div>
                    {descontoValorNormalizado > 0 && (
                      <div className="flex justify-between items-center text-sm text-green-600">
                        <span>Desconto ({descontoPercentualEfetivo.toFixed(2)}%)</span>
                        <span>-{formatCurrency(descontoValorNormalizado)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Valor Total do Pedido</span>
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(valorTotal)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {(itemsAbaixoMinimo.length > 0 || descontoAcimaLimite) && (
            <Alert variant="destructive" className="border-warning bg-warning/10">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atencao:</strong> politica comercial fora do limite.
                {itemsAbaixoMinimo.length > 0 && (
                  <span> {itemsAbaixoMinimo.length} item(ns) com preco abaixo do minimo.</span>
                )}
                {descontoAcimaLimite && (
                  <span> Desconto a vista equivalente a {descontoPercentualEfetivo.toFixed(2)}% (limite do vendedor: 3%).</span>
                )}
                <span> Este pedido sera enviado para aprovacao do administrador.</span>
              </AlertDescription>
            </Alert>
          )}

          {!isEditing && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <p className="text-sm text-blue-900">
                  <strong>Informação:</strong> Após criar o pedido, você poderá registrar os pagamentos 
                  acessando os detalhes do pedido.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate('/pedidos')}>
              Cancelar
            </Button>
            {!fluxoSolicitacaoPedidoAprovacao && (
              <Button 
                type="button"
                variant="secondary"
                disabled={
                  createPedido.isPending || 
                  updatePedido.isPending || 
                  salvandoRascunho ||
                  validandoPrecos ||
                  modoEdicao.bloqueado
                }
                onClick={async () => {
                setSalvandoRascunho(true);
                try {
                  const data = form.getValues();
                  const subtotalRascunho = calcularSubtotalItens(data.itens);
                  const descontoPercentualRascunho =
                    descontoModo === 'valor'
                      ? calcularPercentualPorValor(descontoValorInput, subtotalRascunho)
                      : normalizarDescontoPercentual(Number(data.desconto_percentual || 0));
                  const formData = {
                    data_pedido: data.data_pedido,
                    cliente_id: data.cliente_id || '',
                    data_entrega: data.data_entrega || undefined,
                    observacao: data.observacao,
                    caminho_arquivos: data.caminho_arquivos,
                    desconto_percentual: descontoPercentualRascunho,
                    desconto_aguardando_aprovacao: !isAdmin && descontoPercentualRascunho > 3,
                    status: 'rascunho' as const,
                    itens: data.itens.map(item => ({
                      id: item.id,
                      produto_id: item.produto_id || '',
                      quantidade: item.quantidade || 1,
                      valor_unitario: item.valor_unitario || 0,
                      observacoes: item.observacoes,
                      foto_modelo_url: item.foto_modelo_url,
                      tipo_estampa_id: item.tipo_estampa_id || null,
                      grades: item.grades?.filter(g => g.codigo && g.nome && g.quantidade) as PedidoItemGrade[] | undefined,
                      detalhes: item.detalhes?.filter(d => d.tipo_detalhe && d.valor) as DetalheItem[] | undefined,
                    })),
                  };

                  if (isEditing) {
                    await updatePedido.mutateAsync(formData);
                  } else {
                    await createPedido.mutateAsync(formData);
                  }

                  toast({
                    title: 'Rascunho salvo!',
                    description: 'O pedido foi salvo como rascunho.',
                  });
                  navigate('/pedidos');
                } catch (error: any) {
                  const { sanitizeError } = await import('@/lib/errorHandling');
                  toast({
                    title: 'Erro ao salvar rascunho',
                    description: sanitizeError(error),
                    variant: 'destructive',
                  });
                } finally {
                  setSalvandoRascunho(false);
                }
                }}
              >
                {salvandoRascunho ? 'Salvando...' : 'Salvar como Rascunho'}
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={
                createPedido.isPending || 
                updatePedido.isPending || 
                validandoPrecos ||
                salvandoRascunho ||
                modoEdicao.bloqueado
              }
            >
              {validandoPrecos ? 'Validando preços...' : 
               createPedido.isPending || updatePedido.isPending ? 'Salvando...' : 
               fluxoSolicitacaoPedidoAprovacao ? 'Enviar para Aprovação' :
               (isEditing && pedido?.status === 'rascunho' ? 'Ativar Pedido' : 'Salvar Pedido')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
