import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2, Edit } from 'lucide-react';
import { sanitizeError } from '@/lib/errorHandling';
import { useFaixasPreco, useCreateFaixaPreco, useUpdateFaixaPreco, useDeleteFaixaPreco, FaixaPrecoFormData, FaixaPreco } from '@/hooks/useFaixasPreco';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency } from '@/lib/formatters';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGradesTamanho } from '@/hooks/useGradesTamanho';

const produtoSchema = z.object({
  codigo: z.string().max(50).optional(),
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(200),
  tipo: z.string().max(100).optional(),
  observacoes_padrao: z.string().max(1000).optional(),
  quantidade_minima_venda: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    const parsed = Number(val);
    return Number.isInteger(parsed) && parsed >= 1;
  }, {
    message: 'Informe um número inteiro maior ou igual a 1',
  }),
  valor_base: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
    message: 'Valor deve ser um número válido',
  }),
  grade_tamanho_id: z.string().optional(),
});

type ProdutoFormData = z.infer<typeof produtoSchema>;

const faixaSchema = z.object({
  quantidade_minima: z.number().min(1, 'Mínimo 1'),
  quantidade_maxima: z.number().nullable(),
  preco_minimo: z.number().min(0, 'Preço deve ser positivo'),
  preco_maximo: z.number().min(0, 'Preço deve ser positivo'),
  ordem: z.number().default(0),
}).refine((data) => data.preco_maximo >= data.preco_minimo, {
  message: 'Preço máximo deve ser maior ou igual ao preço mínimo',
  path: ['preco_maximo'],
}).refine((data) => !data.quantidade_maxima || data.quantidade_maxima >= data.quantidade_minima, {
  message: 'Quantidade máxima deve ser maior ou igual à mínima',
  path: ['quantidade_maxima'],
});

export default function ProdutoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const { can } = usePermissions();
  const podeGerenciarFaixas = can('produtos.gerenciar_faixas');
  const podeEditarProduto = can('produtos.editar');
  const podeCriarProduto = can('produtos.criar');

  // All hooks must be called before any conditional returns
  const [novaFaixa, setNovaFaixa] = useState<Partial<FaixaPrecoFormData> | null>(null);
  const [editandoFaixa, setEditandoFaixa] = useState<string | null>(null);
  const [faixaEditTemp, setFaixaEditTemp] = useState<Partial<FaixaPrecoFormData> | null>(null);

  const { data: faixas = [] } = useFaixasPreco(id);
  const createFaixa = useCreateFaixaPreco(id || '');
  const updateFaixa = useUpdateFaixaPreco(id || '');
  const deleteFaixa = useDeleteFaixaPreco(id || '');
  const { data: grades = [] } = useGradesTamanho();

  const { data: produto } = useQuery({
    queryKey: ['produto', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return { 
        ...data, 
        valor_base: String(data.valor_base),
        grade_tamanho_id: data.grade_tamanho_id || '',
      };
    },
    enabled: isEditing,
  });

  const form = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      codigo: '',
      nome: '',
      tipo: '',
      observacoes_padrao: '',
      quantidade_minima_venda: '',
      valor_base: '0',
      grade_tamanho_id: '',
    },
    values: produto ? {
      codigo: (produto as any).codigo || '',
      nome: produto.nome,
      tipo: produto.tipo || '',
      observacoes_padrao: produto.observacoes_padrao || '',
      quantidade_minima_venda: (produto as any).quantidade_minima_venda ? String((produto as any).quantidade_minima_venda) : '',
      valor_base: produto.valor_base,
      grade_tamanho_id: (produto as any).grade_tamanho_id || '',
    } : undefined,
  });

  const mutation = useMutation({
    mutationFn: async (data: ProdutoFormData) => {
      const submitData = {
        codigo: data.codigo || null,
        nome: data.nome,
        tipo: data.tipo || null,
        observacoes_padrao: data.observacoes_padrao || null,
        quantidade_minima_venda: data.quantidade_minima_venda ? Number(data.quantidade_minima_venda) : null,
        valor_base: Number(data.valor_base),
        grade_tamanho_id: data.grade_tamanho_id || null,
      };
      
      if (isEditing) {
        const { error } = await supabase
          .from('produtos')
          .update(submitData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('produtos')
          .insert([submitData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success(isEditing ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!');
      navigate('/produtos');
    },
    onError: (error: any) => {
      toast.error(sanitizeError(error));
    },
  });

  // Permission checks after all hooks
  if (isEditing && !podeEditarProduto) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/produtos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para editar produtos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!isEditing && !podeCriarProduto) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/produtos')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para criar produtos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = (data: ProdutoFormData) => {
    mutation.mutate(data);
  };

  const handleAddFaixa = async () => {
    if (!novaFaixa || !id) return;
    
    try {
      await faixaSchema.parseAsync(novaFaixa);
      await createFaixa.mutateAsync(novaFaixa as FaixaPrecoFormData);
      setNovaFaixa(null);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleDeleteFaixa = async (faixaId: string) => {
    if (confirm('Deseja realmente excluir esta faixa de preço?')) {
      await deleteFaixa.mutateAsync(faixaId);
    }
  };

  const handleStartEdit = (faixa: FaixaPreco) => {
    setEditandoFaixa(faixa.id);
    setFaixaEditTemp({
      quantidade_minima: faixa.quantidade_minima,
      quantidade_maxima: faixa.quantidade_maxima,
      preco_minimo: faixa.preco_minimo,
      preco_maximo: faixa.preco_maximo,
      ordem: faixa.ordem,
    });
  };

  const handleSaveEdit = async (faixaId: string) => {
    if (!faixaEditTemp) return;
    
    try {
      await faixaSchema.parseAsync(faixaEditTemp);
      await updateFaixa.mutateAsync({ id: faixaId, data: faixaEditTemp as FaixaPrecoFormData });
      setEditandoFaixa(null);
      setFaixaEditTemp(null);
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleCancelEdit = () => {
    setEditandoFaixa(null);
    setFaixaEditTemp(null);
  };

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/produtos')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Produto' : 'Novo Produto'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código do Produto</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: CAM-001, SKU-123" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Camiseta Gola Redonda" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Uniforme, Esportivo" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="quantidade_minima_venda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Qtd. Mínima para Aviso</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" step="1" placeholder="Ex: 30" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Quando proposta ou pedido ficar abaixo dessa quantidade, o sistema apenas exibe um aviso ao vendedor.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="valor_base"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Base (R$) *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" min="0" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="grade_tamanho_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade de Tamanhos</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)} 
                      value={field.value || '__none__'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (opcional para produtos sem tamanho)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Sem grade (ex: Bandeira, Placa)</SelectItem>
                        {grades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.id}>
                            {grade.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacoes_padrao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações Padrão</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} placeholder="Ex: Tecido PV, verificar cores disponíveis" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/produtos')}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isEditing && podeGerenciarFaixas && (
        <Card>
          <CardHeader>
            <CardTitle>Faixas de Preço por Quantidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {faixas.length > 0 && (
              <div className="space-y-2">
                {faixas.map((faixa) => (
                  <div key={faixa.id} className="p-3 border rounded-lg">
                    {editandoFaixa === faixa.id ? (
                      // MODO DE EDIÇÃO
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-medium">Qtd Mínima *</label>
                            <Input
                              type="number"
                              min="1"
                              value={faixaEditTemp?.quantidade_minima || ''}
                              onChange={(e) => setFaixaEditTemp({ 
                                ...faixaEditTemp, 
                                quantidade_minima: Number(e.target.value) 
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium">Qtd Máxima</label>
                            <Input
                              type="number"
                              min="1"
                              value={faixaEditTemp?.quantidade_maxima || ''}
                              onChange={(e) => setFaixaEditTemp({ 
                                ...faixaEditTemp, 
                                quantidade_maxima: e.target.value ? Number(e.target.value) : null 
                              })}
                              placeholder="∞"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium">Preço Min (R$) *</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={faixaEditTemp?.preco_minimo || ''}
                              onChange={(e) => setFaixaEditTemp({ 
                                ...faixaEditTemp, 
                                preco_minimo: Number(e.target.value) 
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium">Preço Max (R$) *</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={faixaEditTemp?.preco_maximo || ''}
                              onChange={(e) => setFaixaEditTemp({ 
                                ...faixaEditTemp, 
                                preco_maximo: Number(e.target.value) 
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium">Ordem</label>
                            <Input
                              type="number"
                              min="0"
                              value={faixaEditTemp?.ordem || 0}
                              onChange={(e) => setFaixaEditTemp({ 
                                ...faixaEditTemp, 
                                ordem: Number(e.target.value) 
                              })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSaveEdit(faixa.id)} disabled={updateFaixa.isPending}>
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // MODO DE VISUALIZAÇÃO
                      <div className="flex items-center gap-4">
                        <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="font-semibold">Qtd:</span> {faixa.quantidade_minima} - {faixa.quantidade_maxima || '∞'}
                          </div>
                          <div>
                            <span className="font-semibold">Min:</span> {formatCurrency(faixa.preco_minimo)}
                          </div>
                          <div>
                            <span className="font-semibold">Max:</span> {formatCurrency(faixa.preco_maximo)}
                          </div>
                          <div>
                            <span className="font-semibold">Ordem:</span> {faixa.ordem}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleStartEdit(faixa)}
                          >
                            <Edit className="h-4 w-4 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteFaixa(faixa.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {novaFaixa ? (
              <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
                <h3 className="font-semibold">Nova Faixa de Preço</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Quantidade Mínima *</label>
                    <Input
                      type="number"
                      min="1"
                      value={novaFaixa.quantidade_minima || ''}
                      onChange={(e) => setNovaFaixa({ ...novaFaixa, quantidade_minima: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantidade Máxima</label>
                    <Input
                      type="number"
                      min="1"
                      value={novaFaixa.quantidade_maxima || ''}
                      onChange={(e) => setNovaFaixa({ ...novaFaixa, quantidade_maxima: e.target.value ? Number(e.target.value) : null })}
                      placeholder="Deixe vazio para ilimitado"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Preço Mínimo (R$) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={novaFaixa.preco_minimo || ''}
                      onChange={(e) => setNovaFaixa({ ...novaFaixa, preco_minimo: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Preço Máximo (R$) *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={novaFaixa.preco_maximo || ''}
                      onChange={(e) => setNovaFaixa({ ...novaFaixa, preco_maximo: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Ordem</label>
                    <Input
                      type="number"
                      min="0"
                      value={novaFaixa.ordem || 0}
                      onChange={(e) => setNovaFaixa({ ...novaFaixa, ordem: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddFaixa} disabled={createFaixa.isPending}>
                    Adicionar
                  </Button>
                  <Button variant="outline" onClick={() => setNovaFaixa(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setNovaFaixa({ quantidade_minima: 1, quantidade_maxima: null, preco_minimo: 0, preco_maximo: 0, ordem: faixas.length })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Faixa de Preço
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
