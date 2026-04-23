import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateProposta, useUpdateProposta, useProposta, StatusProposta, PropostaFormData } from '@/hooks/usePropostas';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useUserRole } from '@/hooks/useUserRole';
import { useFaixaPrecoPorQuantidade } from '@/hooks/useFaixasPreco';
import { ClienteQuickAdd } from '@/components/Propostas/ClienteQuickAdd';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Plus, Trash2, UserPlus, Palette, Upload, ImageIcon, X, Copy, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompression';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

const propostaSchema = z.object({
  cliente_id: z.string().uuid('Selecione um cliente'),
  status: z.enum(['pendente', 'enviada', 'follow_up', 'ganha', 'perdida']),
  observacoes: z.string().optional().nullable(),
  desconto_percentual: z.number().min(0, 'Desconto minimo: 0%').max(100, 'Desconto maximo: 100%').default(0),
  data_follow_up: z.date().optional().nullable(),
  motivo_perda: z.string().optional().nullable(),
  criar_previa: z.boolean().default(false),
  caminho_arquivos: z.string().optional().nullable(),
  descricao_criacao: z.string().optional().nullable(),
  imagem_referencia_url: z.string().optional().nullable(),
  data_proposta: z.date(),
  vendedor_id: z.string().uuid().optional().nullable().or(z.literal('')),
  itens: z.array(z.object({
    produto_id: z.string().uuid('Selecione um produto'),
    quantidade: z.number().min(1, 'Quantidade mínima: 1'),
    valor_unitario: z.number().min(0, 'Valor deve ser positivo'),
    observacoes: z.string().optional().nullable(),
    nome_customizado: z.string().optional().nullable(),
    valor_base_customizado: z.number().optional().nullable(),
  })).min(1, 'Adicione ao menos um produto'),
}).refine((data) => {
  if (data.status === 'perdida') {
    return data.motivo_perda && data.motivo_perda.trim().length > 0;
  }
  return true;
}, {
  message: 'Motivo da perda é obrigatório',
  path: ['motivo_perda']
}).refine((data) => {
  if (data.criar_previa) {
    return data.caminho_arquivos && data.caminho_arquivos.trim().length > 0;
  }
  return true;
}, {
  message: 'Caminho dos arquivos é obrigatório quando criar prévia está marcado',
  path: ['caminho_arquivos']
}).refine((data) => {
  if (data.criar_previa) {
    return data.descricao_criacao && data.descricao_criacao.trim().length > 0;
  }
  return true;
}, {
  message: 'Descrição para criação é obrigatória quando criar prévia está marcado',
  path: ['descricao_criacao']
});

type PropostaFormValues = z.infer<typeof propostaSchema>;

const getQuantidadeMinimaAviso = (produto: any) => {
  const minimo = Number(produto?.quantidade_minima_venda);
  return Number.isFinite(minimo) && minimo >= 1 ? minimo : null;
};

export default function PropostaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/propostas';
  const isEditing = id !== undefined && id !== 'nova';
  const { user } = useAuth();
  const { can } = usePermissions();
  const { isAdmin } = useUserRole();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [clienteSearchOpen, setClienteSearchOpen] = useState(false);
  const [produtoSearchOpen, setProdutoSearchOpen] = useState<number | null>(null);
  const [faixasPreco, setFaixasPreco] = useState<Record<number, any>>({});
  const [descontoModo, setDescontoModo] = useState<'percentual' | 'valor'>('percentual');
  const [descontoValorInput, setDescontoValorInput] = useState(0);

  const { data: proposta } = useProposta(isEditing ? id : undefined);
  const createMutation = useCreateProposta();
  const updateMutation = useUpdateProposta(id || '');

  // Buscar etapa inicial de aprovação
  const { data: etapaInicial } = useQuery({
    queryKey: ['etapa-inicial-aprovacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('etapa_producao')
        .select('id')
        .eq('tipo_etapa', 'aprovacao_arte')
        .eq('ativa', true)
        .order('ordem')
        .limit(1)
        .single();
      
      if (error) return null;
      return data;
    },
  });

  const { data: clientes = [] } = useQuery({
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

  const { data: produtos = [] } = useQuery({
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

  // Buscar vendedores (apenas usuários com perfil vendedor)
  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-propostas'],
    queryFn: async () => {
      // Buscar user_profiles onde o system_profile tem codigo = 'vendedor'
      const { data: userProfiles, error: upError } = await supabase
        .from('user_profiles')
        .select(`
          user_id,
          system_profiles!inner(codigo)
        `)
        .eq('system_profiles.codigo', 'vendedor');
      
      if (upError) throw upError;
      
      const userIds = userProfiles?.map(up => up.user_id) || [];
      
      if (userIds.length === 0) return [];
      
      // Buscar os profiles desses usuários
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, nome')
        .eq('ativo', true)
        .in('id', userIds)
        .order('nome');
      
      if (pError) throw pError;
      return profiles || [];
    },
    enabled: isAdmin,
  });

  const vendedorAtualNaoListado = Boolean(
    isAdmin &&
    proposta?.vendedor_id &&
    !vendedores.some((vendedor) => vendedor.id === proposta.vendedor_id)
  );

  const form = useForm<PropostaFormValues>({
    resolver: zodResolver(propostaSchema),
    defaultValues: {
      cliente_id: '',
      status: 'enviada',
      observacoes: '',
      desconto_percentual: 0,
      data_follow_up: null,
      motivo_perda: '',
      criar_previa: false,
      caminho_arquivos: '',
      descricao_criacao: '',
      imagem_referencia_url: '',
      data_proposta: new Date(),
      vendedor_id: null,
      itens: [{ produto_id: '', quantidade: 1, valor_unitario: 0, observacoes: '', nome_customizado: '', valor_base_customizado: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'itens',
  });

  const status = form.watch('status');
  const criarPrevia = form.watch('criar_previa');
  const itensFormulario = form.watch('itens');
  const itensAbaixoQuantidadeMinima = itensFormulario
    .map((item, index) => {
      const produto = produtos.find((p) => p.id === item.produto_id);
      const quantidadeMinima = getQuantidadeMinimaAviso(produto);

      if (!produto || !quantidadeMinima || Number(item.quantidade) >= quantidadeMinima) {
        return null;
      }

      return {
        index,
        nome: produto.nome,
        quantidade: Number(item.quantidade) || 0,
        quantidadeMinima,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const subtotalProposta = itensFormulario.reduce((total, item) => total + (item.quantidade * item.valor_unitario), 0);
  const descontoPercentual = Math.min(Math.max(Number(form.watch('desconto_percentual') || 0), 0), 100);
  const descontoValorNormalizado =
    descontoModo === 'valor'
      ? Math.min(Math.max(descontoValorInput || 0, 0), subtotalProposta)
      : subtotalProposta * (descontoPercentual / 100);
  const descontoPercentualEfetivo =
    subtotalProposta > 0 ? Math.min((descontoValorNormalizado / subtotalProposta) * 100, 100) : 0;
  const descontoAcimaLimite = !isAdmin && descontoPercentualEfetivo > 3;
  const valorFinalProposta = Math.max(subtotalProposta - descontoValorNormalizado, 0);

  useEffect(() => {
    if (descontoModo === 'valor' && descontoValorInput > subtotalProposta) {
      setDescontoValorInput(subtotalProposta);
    }
  }, [descontoModo, descontoValorInput, subtotalProposta]);

  // useEffect para carregar dados da proposta ao editar
  useEffect(() => {
    if (proposta && isEditing) {
      const itens = proposta.itens?.map((item: any) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: parseFloat(item.valor_unitario),
        observacoes: item.observacoes || '',
        nome_customizado: item.nome_customizado || '',
        valor_base_customizado: item.valor_base_customizado ? parseFloat(item.valor_base_customizado) : 0,
      })) || [{ produto_id: '', quantidade: 1, valor_unitario: 0, observacoes: '', nome_customizado: '', valor_base_customizado: 0 }];

      form.reset({
        cliente_id: proposta.cliente_id,
        status: proposta.status as StatusProposta,
        observacoes: proposta.observacoes || '',
        desconto_percentual: Number((proposta as any).desconto_percentual || 0),
        data_follow_up: proposta.data_follow_up ? new Date(proposta.data_follow_up) : null,
        motivo_perda: proposta.motivo_perda || '',
        criar_previa: (proposta as any).criar_previa || false,
        caminho_arquivos: (proposta as any).caminho_arquivos || '',
        descricao_criacao: (proposta as any).descricao_criacao || '',
        imagem_referencia_url: (proposta as any).imagem_referencia_url || '',
        data_proposta: proposta.created_at ? new Date(proposta.created_at) : new Date(),
        vendedor_id: proposta.vendedor_id || null,
        itens,
      });
      const descontoInicial = Number((proposta as any).desconto_percentual || 0);
      const subtotalInicial = itens.reduce((total, item) => total + (item.quantidade * item.valor_unitario), 0);
      setDescontoModo('percentual');
      setDescontoValorInput((subtotalInicial * descontoInicial) / 100);

      // Buscar faixas de preço para os itens carregados
      itens.forEach((item, index) => {
        if (item.produto_id && item.quantidade) {
          buscarFaixaPreco(item.produto_id, item.quantidade, index);
        }
      });
    }
  }, [proposta, isEditing]);

  // Verificar permissões
  const podeEditarProposta = can('propostas.editar') || can('propostas.editar_todos') || can('propostas.editar_todas');
  const podeCriarProposta = can('propostas.criar');
  const podeEditarTodasPropostas = can('propostas.editar_todos') || can('propostas.editar_todas');

  // Verificar se é própria proposta ou tem permissão admin
  const isPropriaPropostaOuAdmin = !isEditing || 
    proposta?.vendedor_id === user?.id || 
    podeEditarTodasPropostas;

  // Determinar se campos devem ser desabilitados
  const camposDesabilitados = isEditing && (!podeEditarProposta || !isPropriaPropostaOuAdmin);

  const onSubmit = async (data: PropostaFormValues) => {
    const subtotalAtual = data.itens.reduce((total, item) => total + (item.quantidade * item.valor_unitario), 0);
    const descontoNormalizado =
      descontoModo === 'valor'
        ? (subtotalAtual > 0 ? Math.min((Math.max(descontoValorInput || 0, 0) / subtotalAtual) * 100, 100) : 0)
        : Math.min(Math.max(Number(data.desconto_percentual || 0), 0), 100);
    const descontoAguardandoAprovacao = !isAdmin && descontoNormalizado > 3;
    
    let vendedorIdFinal: string | undefined;
    if (isAdmin && data.vendedor_id && data.vendedor_id.length > 0) {
      vendedorIdFinal = data.vendedor_id;
    } else if (isEditing && proposta?.vendedor_id) {
      vendedorIdFinal = proposta.vendedor_id;
    }

    const formData: PropostaFormData = {
      cliente_id: data.cliente_id,
      status: data.status,
      observacoes: data.observacoes || null,
      desconto_percentual: descontoNormalizado,
      desconto_aguardando_aprovacao: descontoAguardandoAprovacao,
      data_follow_up: data.data_follow_up || null,
      motivo_perda: data.motivo_perda || null,
      criar_previa: data.criar_previa,
      caminho_arquivos: data.criar_previa ? data.caminho_arquivos : null,
      descricao_criacao: data.criar_previa ? data.descricao_criacao : null,
      etapa_aprovacao_id: data.criar_previa && etapaInicial ? etapaInicial.id : null,
      imagem_referencia_url: data.imagem_referencia_url || null,
      vendedor_id: vendedorIdFinal,
      created_at: !isEditing ? data.data_proposta : null,
      itens: data.itens.map(item => ({
        produto_id: item.produto_id!,
        quantidade: item.quantidade!,
        valor_unitario: item.valor_unitario!,
        observacoes: item.observacoes || null,
        nome_customizado: item.nome_customizado || null,
        valor_base_customizado: item.valor_base_customizado || null,
      })),
    };
    
    if (isEditing) {
      await updateMutation.mutateAsync(formData);
    } else {
      await createMutation.mutateAsync(formData);
    }
    navigate(returnTo);
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
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar faixa de preço:', error);
      return null;
    }
  };

  const handleProdutoSelect = async (index: number, produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (produto) {
      form.setValue(`itens.${index}.produto_id`, produtoId);
      
      const quantidade = form.watch(`itens.${index}.quantidade`) || 1;
      const faixa = await buscarFaixaPreco(produtoId, quantidade, index);
      
      const valorUnitario = faixa 
        ? Number(faixa.preco_maximo) 
        : Number(produto.valor_base);
      
      form.setValue(`itens.${index}.valor_unitario`, valorUnitario);
      
      if (produto.observacoes_padrao) {
        form.setValue(`itens.${index}.observacoes`, produto.observacoes_padrao);
      }
    }
    setProdutoSearchOpen(null);
  };

  const handleQuantidadeChange = async (index: number, quantidade: number) => {
    const produtoId = form.watch(`itens.${index}.produto_id`);
    
    if (produtoId && quantidade > 0) {
      const produto = produtos.find(p => p.id === produtoId);
      const faixa = await buscarFaixaPreco(produtoId, quantidade, index);
      
      const valorUnitario = faixa 
        ? Number(faixa.preco_maximo) 
        : Number(produto?.valor_base || 0);
      
      form.setValue(`itens.${index}.valor_unitario`, valorUnitario);
    }
  };

  const calcularValorTotal = () => subtotalProposta;
  const calcularValorDesconto = () => descontoValorNormalizado;
  const calcularValorFinal = () => valorFinalProposta;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleModoDescontoChange = (modo: 'percentual' | 'valor') => {
    if (modo === descontoModo) return;
    if (modo === 'valor') {
      setDescontoValorInput((subtotalProposta * descontoPercentual) / 100);
    } else {
      form.setValue('desconto_percentual', descontoPercentualEfetivo, { shouldDirty: true });
    }
    setDescontoModo(modo);
  };

  const handleDescontoValorChange = (valor: number) => {
    setDescontoValorInput(Math.min(Math.max(valor || 0, 0), subtotalProposta));
  };

  if (isEditing && !podeEditarProposta) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Editar Proposta</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Você não tem permissão para editar propostas.</p>
            <Button onClick={() => navigate(returnTo)} className="mt-4">Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{isEditing ? 'Editar Proposta' : 'Nova Proposta'}</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Dados da Proposta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_proposta"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data da Proposta</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                              {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Selecione uma data</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isAdmin && (
                  <FormField
                    control={form.control}
                    name="vendedor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendedor Responsável</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value || '')} value={field.value || ''}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione um vendedor" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {vendedorAtualNaoListado && proposta?.vendedor_id && (
                              <SelectItem value={proposta.vendedor_id}>
                                {proposta?.vendedor?.nome || 'Vendedor atual'}
                              </SelectItem>
                            )}
                            {vendedores.map((v) => <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="cliente_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Cliente</FormLabel>
                    <div className="flex gap-2">
                      <Popover open={clienteSearchOpen} onOpenChange={setClienteSearchOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" role="combobox" className={cn('flex-1 justify-between', !field.value && 'text-muted-foreground')}>
                              {field.value ? clientes.find((c) => c.id === field.value)?.nome_razao_social : 'Selecione um cliente'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandList>
                              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                              <CommandGroup>
                                {clientes.map((c) => (
                                  <CommandItem key={c.id} value={c.nome_razao_social} onSelect={() => { form.setValue('cliente_id', c.id); setClienteSearchOpen(false); }}>
                                    {c.nome_razao_social}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button type="button" variant="outline" size="icon" onClick={() => setQuickAddOpen(true)}><UserPlus className="h-4 w-4" /></Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="enviada">Enviada</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                        <SelectItem value="ganha">Ganha</SelectItem>
                        <SelectItem value="perdida">Perdida</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Select value={descontoModo} onValueChange={(v) => handleModoDescontoChange(v as any)} disabled={camposDesabilitados}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="percentual">Porcentagem (%)</SelectItem>
                          <SelectItem value="valor">Valor (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                      {descontoModo === 'percentual' ? (
                        <FormControl>
                          <Input type="number" min={0} max={100} step="0.1" value={field.value ?? 0} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} disabled={camposDesabilitados} />
                        </FormControl>
                      ) : (
                        <FormControl>
                          <CurrencyInput value={descontoValorInput} onChange={handleDescontoValorChange} disabled={camposDesabilitados} />
                        </FormControl>
                      )}
                    </div>
                    <FormDescription>Desconto liberado até 3% para vendedores.</FormDescription>
                    {descontoAcimaLimite && <p className="text-sm font-medium text-amber-600">Desconto acima de 3%: exige aprovação.</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {status === 'follow_up' && (
                <FormField
                  control={form.control}
                  name="data_follow_up"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Follow-up</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>
                              {field.value ? format(field.value, 'dd/MM/yyyy') : <span>Selecione uma data</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {status === 'perdida' && (
                <FormField
                  control={form.control}
                  name="motivo_perda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo da Perda</FormLabel>
                      <FormControl><Textarea {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea {...field} value={field.value || ''} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imagem_referencia_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem de Referência</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        {field.value && (
                          <div className="relative inline-block">
                            <img src={field.value} alt="Ref" className="max-h-48 rounded-lg border object-contain" />
                            <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => field.onChange('')}><X className="h-4 w-4" /></Button>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Input type="file" accept="image/*" className="hidden" id="img-ref" onChange={async (e) => {
                            const file = e.target.files?.[0]; if (!file) return;
                            const compressed = await compressImage(file);
                            const path = `propostas-referencia/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                            await supabase.storage.from('pedidos-fotos-modelos').upload(path, compressed);
                            const { data } = supabase.storage.from('pedidos-fotos-modelos').getPublicUrl(path);
                            field.onChange(data.publicUrl);
                          }} />
                          <Button type="button" variant="outline" onClick={() => document.getElementById('img-ref')?.click()}><Upload className="h-4 w-4 mr-2" />{field.value ? 'Trocar' : 'Enviar'}</Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-amber-600" />Criação de Arte</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="criar_previa"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none"><FormLabel className="cursor-pointer">Criar Prévia para Cliente</FormLabel></div>
                  </FormItem>
                )}
              />
              {criarPrevia && (
                <div className="space-y-4">
                  <FormField control={form.control} name="caminho_arquivos" render={({ field }) => (
                    <FormItem><FormLabel>Caminho dos Arquivos *</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="descricao_criacao" render={({ field }) => (
                    <FormItem><FormLabel>Descrição para Criação *</FormLabel><FormControl><Textarea {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Itens da Proposta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => {
                const item = form.watch(`itens.${index}`);
                const prod = produtos.find((p) => p.id === item.produto_id);
                const qtdMin = getQuantidadeMinimaAviso(prod);
                return (
                  <Card key={field.id} className="border-muted">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Item {index + 1}</h4>
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" onClick={() => append({ ...form.getValues(`itens.${index}`) })}><Copy className="h-4 w-4" /></Button>
                          {fields.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      </div>
                      <FormField
                        control={form.control}
                        name={`itens.${index}.produto_id`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Produto</FormLabel>
                            <Popover open={produtoSearchOpen === index} onOpenChange={(o) => setProdutoSearchOpen(o ? index : null)}>
                              <PopoverTrigger asChild>
                                <FormControl><Button variant="outline" className={cn('justify-between', !field.value && 'text-muted-foreground')}>
                                  {field.value ? produtos.find((p) => p.id === field.value)?.nome : 'Selecione um produto'}
                                </Button></FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0">
                                <Command>
                                  <CommandInput placeholder="Buscar produto..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                    <CommandGroup>
                                      {produtos.map((p) => (
                                        <CommandItem key={p.id} value={p.nome} onSelect={() => handleProdutoSelect(index, p.id)}>
                                          <div className="flex flex-col"><span>{p.nome}</span></div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {prod?.nome?.toLowerCase() === 'xx' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={form.control} name={`itens.${index}.nome_customizado`} render={({ field }) => (
                            <FormItem><FormLabel>Nome do Produto (Manual)</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`itens.${index}.valor_base_customizado`} render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor Base (Tabela)</FormLabel>
                              <FormControl><Input type="number" step="0.01" {...field} value={field.value || 0} onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                field.onChange(val);
                                if (form.getValues(`itens.${index}.valor_unitario`) === 0) form.setValue(`itens.${index}.valor_unitario`, val);
                              }} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name={`itens.${index}.quantidade`} render={({ field }) => (
                          <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => { const q = parseInt(e.target.value) || 0; field.onChange(q); handleQuantidadeChange(index, q); }} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name={`itens.${index}.valor_unitario`} render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor Unitário</FormLabel>
                            <FormControl>
                              <CurrencyInput 
                                value={field.value} 
                                onChange={field.onChange} 
                                disabled={camposDesabilitados}
                              />
                            </FormControl>
                            {faixasPreco[index] && (
                              <div className="space-y-1 mt-1">
                                <div className="text-[10px] text-muted-foreground flex gap-2">
                                  <span>Mín: {formatCurrency(Number(faixasPreco[index].preco_minimo))}</span>
                                  <span>Máx: {formatCurrency(Number(faixasPreco[index].preco_maximo))}</span>
                                </div>
                                {Number(field.value) < Number(faixasPreco[index].preco_minimo) && (
                                  <div className="flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                                    <span className="text-xs text-amber-600 font-medium">Abaixo do mínimo</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      {qtdMin && Number(item.quantidade) < qtdMin && <div className="text-xs text-amber-600">Atenção: quantidade mínima é {qtdMin}.</div>}
                      <FormField control={form.control} name={`itens.${index}.observacoes`} render={({ field }) => (
                        <FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} value={field.value || ''} rows={2} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </CardContent>
                  </Card>
                );
              })}
              <Button type="button" variant="outline" onClick={() => append({ produto_id: '', quantidade: 1, valor_unitario: 0, observacoes: '', nome_customizado: '', valor_base_customizado: 0 })} className="w-full"><Plus className="h-4 w-4 mr-2" />Adicionar Produto</Button>
              <div className="text-right space-y-1">
                <p className="text-sm text-muted-foreground">Subtotal: {formatCurrency(calcularValorTotal())}</p>
                <p className="text-2xl font-bold">Total Geral: {formatCurrency(calcularValorFinal())}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(returnTo)}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>Salvar</Button>
          </div>
        </form>
      </Form>
      <ClienteQuickAdd open={quickAddOpen} onOpenChange={setQuickAddOpen} onClienteCreated={(cid) => form.setValue('cliente_id', cid)} />
    </div>
  );
}
