import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCreateEmprestimo, EmprestimoItem } from '@/hooks/useEmprestimosGradeProva';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClienteCombobox } from '@/components/Pedidos/ClienteCombobox';
import { ProdutoCombobox } from '@/components/Pedidos/ProdutoCombobox';

interface EmprestimoItemComProduto extends EmprestimoItem {
  produto_id?: string;
}

const formSchema = z.object({
  cliente_id: z.string().min(1, 'Selecione um cliente'),
  data_prevista_devolucao: z.date({ required_error: 'Selecione o prazo de devolução' }),
  observacao_saida: z.string().optional(),
});

interface EmprestimoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (emprestimoId: string) => void;
}

export function EmprestimoForm({ open, onOpenChange, onSuccess }: EmprestimoFormProps) {
  const { user } = useAuth();
  const createEmprestimo = useCreateEmprestimo();
  
  const [itens, setItens] = useState<EmprestimoItemComProduto[]>([
    { descricao: '', quantidade: 1, tamanhos: '', produto_id: '' }
  ]);

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-emprestimo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_razao_social, cpf_cnpj, responsavel')
        .order('nome_razao_social');
      if (error) throw error;
      return data;
    },
  });

  const { data: produtos = [] } = useQuery({
    queryKey: ['produtos-emprestimo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, codigo')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cliente_id: '',
      data_prevista_devolucao: addDays(new Date(), 10),
      observacao_saida: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        cliente_id: '',
        data_prevista_devolucao: addDays(new Date(), 10),
        observacao_saida: '',
      });
      setItens([{ descricao: '', quantidade: 1, tamanhos: '', produto_id: '' }]);
    }
  }, [open, form]);

  const adicionarItem = () => {
    setItens([...itens, { descricao: '', quantidade: 1, tamanhos: '', produto_id: '' }]);
  };

  const duplicarItem = (index: number) => {
    const itemOriginal = itens[index];
    const novosItens = [...itens];
    novosItens.splice(index + 1, 0, { ...itemOriginal });
    setItens(novosItens);
  };

  const removerItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const atualizarItem = (index: number, field: keyof EmprestimoItemComProduto, value: string | number) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [field]: value };
    
    // Se selecionou um produto, atualizar a descrição automaticamente
    if (field === 'produto_id' && value) {
      const produto = produtos.find(p => p.id === value);
      if (produto) {
        novosItens[index].descricao = produto.codigo 
          ? `${produto.nome} (${produto.codigo})`
          : produto.nome;
      }
    }
    
    setItens(novosItens);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;

    // Validar que tem pelo menos um item com descrição
    const itensValidos = itens.filter(i => i.descricao.trim() !== '');
    if (itensValidos.length === 0) {
      form.setError('root', { message: 'Adicione pelo menos um item ao empréstimo' });
      return;
    }

    try {
      const result = await createEmprestimo.mutateAsync({
        cliente_id: values.cliente_id,
        vendedor_id: user.id,
        data_emprestimo: format(new Date(), 'yyyy-MM-dd') + 'T12:00:00',
        data_prevista_devolucao: format(values.data_prevista_devolucao, 'yyyy-MM-dd') + 'T12:00:00',
        observacao_saida: values.observacao_saida,
        itens: itensValidos.map(i => ({
          descricao: i.descricao.trim(),
          quantidade: i.quantidade || 1,
          tamanhos: i.tamanhos?.trim() || undefined,
        })),
      });

      onOpenChange(false);
      if (onSuccess && result?.id) {
        onSuccess(result.id);
      }
    } catch (error) {
      // Erro já tratado pelo hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Empréstimo de Grade para Prova</DialogTitle>
          <DialogDescription>
            Registre as peças que serão emprestadas ao cliente para prova de tamanhos.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Cliente */}
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    <ClienteCombobox
                      clientes={clientes}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Selecione o cliente"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prazo de devolução */}
            <FormField
              control={form.control}
              name="data_prevista_devolucao"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Prazo de Devolução *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
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
                        disabled={(date) => date < new Date()}
                        locale={ptBR}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Itens do empréstimo */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Itens do Empréstimo *</Label>
                <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Item
                </Button>
              </div>

              <div className="space-y-2">
                {itens.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <ProdutoCombobox
                        produtos={produtos}
                        value={item.produto_id || ''}
                        onValueChange={(value) => atualizarItem(index, 'produto_id', value)}
                        placeholder="Selecione o produto"
                      />
                      <Input
                        placeholder="Descrição adicional (opcional)"
                        value={item.descricao}
                        onChange={(e) => atualizarItem(index, 'descricao', e.target.value)}
                      />
                      <div className="flex gap-2">
                        <div className="w-24">
                          <Input
                            type="number"
                            min={1}
                            placeholder="Qtd"
                            value={item.quantidade}
                            onChange={(e) => atualizarItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder="Tamanhos (opcional: 2x P, 3x M, 1x G)"
                            value={item.tamanhos || ''}
                            onChange={(e) => atualizarItem(index, 'tamanhos', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicarItem(index)}
                        className="text-muted-foreground hover:text-primary"
                        title="Duplicar item"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerItem(index)}
                        disabled={itens.length === 1}
                        className="text-muted-foreground hover:text-destructive"
                        title="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacao_saida"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações adicionais sobre o empréstimo..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createEmprestimo.isPending}>
                {createEmprestimo.isPending ? 'Salvando...' : 'Registrar Empréstimo'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
