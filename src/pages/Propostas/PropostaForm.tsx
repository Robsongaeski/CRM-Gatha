import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Plus, Trash2, UserPlus, Palette, Upload, ImageIcon, X, Copy } from 'lucide-react';
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

export default function PropostaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = id !== undefined && id !== 'nova';
  const { user } = useAuth();
  const { can } = usePermissions();
  const { isAdmin } = useUserRole();

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [clienteSearchOpen, setClienteSearchOpen] = useState(false);
  const [produtoSearchOpen, setProdutoSearchOpen] = useState<number | null>(null);
  const [faixasPreco, setFaixasPreco] = useState<Record<number, any>>({});

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
      status: 'pendente',
      observacoes: '',
      data_follow_up: null,
      motivo_perda: '',
      criar_previa: false,
      caminho_arquivos: '',
      descricao_criacao: '',
      imagem_referencia_url: '',
      data_proposta: new Date(),
      vendedor_id: null,
      itens: [{ produto_id: '', quantidade: 1, valor_unitario: 0, observacoes: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'itens',
  });

  const status = form.watch('status');
  const criarPrevia = form.watch('criar_previa');
  
  // useEffect para carregar dados da proposta ao editar
  useEffect(() => {
    if (proposta && isEditing) {
      const itens = proposta.itens?.map((item: any) => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        valor_unitario: parseFloat(item.valor_unitario),
        observacoes: item.observacoes || '',
      })) || [{ produto_id: '', quantidade: 1, valor_unitario: 0, observacoes: '' }];

      form.reset({
        cliente_id: proposta.cliente_id,
        status: proposta.status as StatusProposta,
        observacoes: proposta.observacoes || '',
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

      // Buscar faixas de preço para os itens carregados
      itens.forEach((item, index) => {
        if (item.produto_id && item.quantidade) {
          buscarFaixaPreco(item.produto_id, item.quantidade, index);
        }
      });
    }
  }, [proposta, isEditing]);
  
  // Verificar permissões (APÓS todos os hooks)
  const podeEditarProposta = can('propostas.editar') || can('propostas.editar_todos') || can('propostas.editar_todas');
  const podeCriarProposta = can('propostas.criar');
  const podeEditarTodasPropostas = can('propostas.editar_todos') || can('propostas.editar_todas');
  
  // Verificar se é própria proposta ou tem permissão admin
  const isPropriaPropostaOuAdmin = !isEditing || 
    proposta?.vendedor_id === user?.id || 
    podeEditarTodasPropostas;
  
  // Determinar se campos devem ser desabilitados
  const camposDesabilitados = isEditing && (!podeEditarProposta || !isPropriaPropostaOuAdmin);

  // Bloquear acesso se não tem permissão (APÓS todos os hooks)
  if (isEditing && !podeEditarProposta) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Editar Proposta</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para editar propostas.
            </p>
            <Button onClick={() => navigate('/propostas')} className="mt-4">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!isEditing && !podeCriarProposta) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Nova Proposta</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para criar propostas.
            </p>
            <Button onClick={() => navigate('/propostas')} className="mt-4">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing && proposta && !isPropriaPropostaOuAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Editar Proposta</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para editar propostas de outros vendedores.
            </p>
            <Button onClick={() => navigate('/propostas')} className="mt-4">
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: PropostaFormValues) => {
    // Se for admin e selecionou vendedor válido, usar esse. Se for edição, manter o vendedor atual.
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
      })),
    };
    
    if (isEditing) {
      await updateMutation.mutateAsync(formData);
    } else {
      await createMutation.mutateAsync(formData);
    }
    navigate('/propostas');
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
      
      // Buscar faixa de preço baseada na quantidade atual
      const quantidade = form.watch(`itens.${index}.quantidade`) || 1;
      const faixa = await buscarFaixaPreco(produtoId, quantidade, index);
      
      // Usar preço da faixa ou valor base
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
      
      // Usar preço da faixa ou valor base
      const valorUnitario = faixa 
        ? Number(faixa.preco_maximo) 
        : Number(produto?.valor_base || 0);
      
      form.setValue(`itens.${index}.valor_unitario`, valorUnitario);
    }
  };

  const calcularValorTotal = () => {
    const itens = form.watch('itens');
    return itens.reduce((total, item) => {
      return total + (item.quantidade * item.valor_unitario);
    }, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {isEditing ? 'Editar Proposta' : 'Nova Proposta'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Proposta</CardTitle>
            </CardHeader>
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
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy')
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
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
                        <Select 
                          onValueChange={(value) => field.onChange(value || '')} 
                          value={field.value || ''}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um vendedor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vendedorAtualNaoListado && proposta?.vendedor_id && (
                              <SelectItem value={proposta.vendedor_id}>
                                {proposta?.vendedor?.nome || 'Vendedor atual (inativo ou sem perfil vendedor)'}
                              </SelectItem>
                            )}
                            {vendedores.map((vendedor) => (
                              <SelectItem key={vendedor.id} value={vendedor.id}>
                                {vendedor.nome}
                              </SelectItem>
                            ))}
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
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                'flex-1 justify-between',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value
                                ? clientes.find((c) => c.id === field.value)?.nome_razao_social
                                : 'Selecione um cliente'}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command>
                            <CommandInput placeholder="Buscar cliente..." />
                            <CommandList>
                              <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                              <CommandGroup>
                                {clientes.map((cliente) => (
                                  <CommandItem
                                    key={cliente.id}
                                    value={cliente.nome_razao_social}
                                    onSelect={() => {
                                      form.setValue('cliente_id', cliente.id);
                                      setClienteSearchOpen(false);
                                    }}
                                  >
                                    {cliente.nome_razao_social}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setQuickAddOpen(true)}
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
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
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
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
                            <Button
                              variant="outline"
                              className={cn(
                                'pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: undefined })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value || undefined}
                            onSelect={field.onChange}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
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
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} />
                      </FormControl>
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
                    <FormControl>
                      <Textarea {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Campo de Imagem de Referência - sempre visível */}
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
                            <img 
                              src={field.value} 
                              alt="Imagem de referência" 
                              className="max-h-48 rounded-lg border object-contain"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={() => field.onChange('')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="imagem-referencia-upload-principal"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              const compressed = await compressImage(file);
                              const fileExt = 'jpg';
                              const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                              const filePath = `propostas-referencia/${fileName}`;
                              
                              const { error: uploadError } = await supabase.storage
                                .from('pedidos-fotos-modelos')
                                .upload(filePath, compressed);
                              
                              if (uploadError) {
                                console.error('Erro ao fazer upload:', uploadError);
                                return;
                              }
                              
                              const { data: urlData } = supabase.storage
                                .from('pedidos-fotos-modelos')
                                .getPublicUrl(filePath);
                              
                              field.onChange(urlData.publicUrl);
                              e.target.value = '';
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById('imagem-referencia-upload-principal')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {field.value ? 'Trocar Imagem' : 'Enviar Imagem'}
                          </Button>
                          {!field.value && (
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <ImageIcon className="h-4 w-4" />
                              Nenhuma imagem selecionada
                            </span>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Imagem enviada pelo cliente como referência para a proposta
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Card de Criação de Arte */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-amber-600" />
                Criação de Arte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="criar_previa"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="cursor-pointer">
                        Criar Prévia para Cliente
                      </FormLabel>
                      <FormDescription>
                        Marque se for necessário criar uma arte de aprovação antes de confirmar o pedido.
                        A proposta será enviada para o Kanban de aprovação.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {criarPrevia && (
                <>
                  <FormField
                    control={form.control}
                    name="caminho_arquivos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Caminho dos Arquivos / Logos *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: \\servidor\clientes\nome_cliente\logos" 
                            {...field} 
                            value={field.value || ''} 
                          />
                        </FormControl>
                        <FormDescription>
                          Informe o caminho onde estão os arquivos e logos do cliente
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="descricao_criacao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição Detalhada para Criação *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva detalhadamente o que o cliente deseja para que os designers possam criar o modelo..."
                            rows={4}
                            {...field} 
                            value={field.value || ''} 
                          />
                        </FormControl>
                        <FormDescription>
                          Quanto mais detalhes, melhor será o resultado da criação
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Itens da Proposta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => {
                const item = form.watch(`itens.${index}`);
                const valorTotal = item.quantidade * item.valor_unitario;

                return (
                  <Card key={field.id} className="border-muted">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold">Item {index + 1}</h4>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const currentItem = form.getValues(`itens.${index}`);
                              append({
                                produto_id: currentItem.produto_id,
                                quantidade: currentItem.quantidade,
                                valor_unitario: currentItem.valor_unitario,
                                observacoes: currentItem.observacoes || '',
                              });
                            }}
                            title="Duplicar item"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name={`itens.${index}.produto_id`}
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Produto</FormLabel>
                            <Popover
                              open={produtoSearchOpen === index}
                              onOpenChange={(open) => setProdutoSearchOpen(open ? index : null)}
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      'justify-between',
                                      !field.value && 'text-muted-foreground'
                                    )}
                                  >
                                    {field.value
                                      ? produtos.find((p) => p.id === field.value)?.nome
                                      : 'Selecione um produto'}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0" align="start">
                                <Command shouldFilter={true}>
                                  <CommandInput placeholder="Buscar produto..." autoFocus />
                                  <CommandList className="max-h-[300px] overflow-y-auto">
                                    <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                    <CommandGroup>
                                      {produtos.map((produto) => (
                                        <CommandItem
                                          key={produto.id}
                                          value={produto.nome}
                                          onSelect={() => handleProdutoSelect(index, produto.id)}
                                        >
                                          <div className="flex flex-col">
                                            <span>{produto.nome}</span>
                                            {(produto as any).codigo && (
                                              <span className="text-xs text-muted-foreground font-mono">
                                                Código: {(produto as any).codigo}
                                              </span>
                                            )}
                                          </div>
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

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`itens.${index}.quantidade`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantidade</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  {...field}
                                  onChange={(e) => {
                                    const qtd = parseInt(e.target.value) || 0;
                                    field.onChange(qtd);
                                    handleQuantidadeChange(index, qtd);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`itens.${index}.valor_unitario`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Valor Unitário</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  className={cn(
                                    faixasPreco[index] && 
                                    field.value < Number(faixasPreco[index].preco_minimo) && 
                                    "border-red-500 focus-visible:ring-red-500"
                                  )}
                                />
                              </FormControl>
                              {faixasPreco[index] && (
                                <div className="mt-1 space-y-1">
                                  <p className="text-xs text-muted-foreground">
                                    Min: {formatCurrency(Number(faixasPreco[index].preco_minimo))} / 
                                    Max: {formatCurrency(Number(faixasPreco[index].preco_maximo))}
                                  </p>
                                  {field.value < Number(faixasPreco[index].preco_minimo) && (
                                    <p className="text-xs font-medium text-red-500 animate-pulse">
                                      Atenção: valor abaixo do mínimo para esta quantidade
                                    </p>
                                  )}
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="text-sm font-medium">
                        Valor Total: {formatCurrency(valorTotal)}
                      </div>

                      <FormField
                        control={form.control}
                        name={`itens.${index}.observacoes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações</FormLabel>
                            <FormControl>
                              <Textarea {...field} value={field.value || ''} rows={2} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                );
              })}

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  append({ produto_id: '', quantidade: 1, valor_unitario: 0, observacoes: '' })
                }
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>

              <div className="text-right">
                <p className="text-2xl font-bold">
                  Total Geral: {formatCurrency(calcularValorTotal())}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/propostas')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Form>

      <ClienteQuickAdd
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onClienteCreated={(clienteId) => {
          form.setValue('cliente_id', clienteId);
        }}
      />
    </div>
  );
}
