import React, { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTroca, useCreateTroca, useUpdateTroca } from '@/hooks/useTrocas';
import { useMotivos } from '@/hooks/useMotivosTrocaDevolucao';

const formSchema = z.object({
  numero_pedido: z.string().min(1, 'Número do pedido é obrigatório'),
  nome_cliente: z.string().min(1, 'Nome do cliente é obrigatório'),
  email_cliente: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone_cliente: z.string().optional(),
  valor_pedido: z.coerce.number().min(0, 'Valor deve ser positivo'),
  data_pedido_original: z.string().optional(),
  motivo_id: z.string().optional(),
  motivo_outro: z.string().optional(),
  transportadora: z.string().optional(),
  observacao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function TrocaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: troca, isLoading: isLoadingTroca } = useTroca(id);
  const { data: motivos = [] } = useMotivos('troca');
  const createTroca = useCreateTroca();
  const updateTroca = useUpdateTroca();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_pedido: '',
      nome_cliente: '',
      email_cliente: '',
      telefone_cliente: '',
      valor_pedido: 0,
      data_pedido_original: '',
      motivo_id: '',
      motivo_outro: '',
      transportadora: '',
      observacao: '',
    },
  });

  const motivoSelecionado = form.watch('motivo_id');
  const motivoOutro = motivos.find(m => m.id === motivoSelecionado)?.nome === 'Outro';

  useEffect(() => {
    if (troca) {
      form.reset({
        numero_pedido: troca.numero_pedido,
        nome_cliente: troca.nome_cliente,
        email_cliente: troca.email_cliente || '',
        telefone_cliente: troca.telefone_cliente || '',
        valor_pedido: troca.valor_pedido,
        data_pedido_original: troca.data_pedido_original || '',
        motivo_id: troca.motivo_id || '',
        motivo_outro: troca.motivo_outro || '',
        transportadora: troca.transportadora || '',
        observacao: troca.observacao || '',
      });
    }
  }, [troca, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const data = {
        numero_pedido: values.numero_pedido,
        nome_cliente: values.nome_cliente,
        valor_pedido: values.valor_pedido,
        email_cliente: values.email_cliente || null,
        telefone_cliente: values.telefone_cliente || null,
        data_pedido_original: values.data_pedido_original || null,
        motivo_id: values.motivo_id || null,
        motivo_outro: motivoOutro ? values.motivo_outro || null : null,
        transportadora: values.transportadora || null,
        observacao: values.observacao || null,
      };

      if (isEditing) {
        await updateTroca.mutateAsync({ id, ...data });
      } else {
        await createTroca.mutateAsync(data);
      }

      navigate('/ecommerce/suporte/trocas');
    } catch (error) {
      console.error('Erro ao salvar troca:', error);
    }
  };

  if (isEditing && isLoadingTroca) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/ecommerce/suporte/trocas">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Editar Troca' : 'Nova Troca'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Atualize os dados da troca' : 'Registre uma nova troca de produto'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="numero_pedido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Pedido *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valor_pedido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total do Pedido</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="data_pedido_original"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data do Pedido Original</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="transportadora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transportadora</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da transportadora" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="nome_cliente"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome do Cliente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo do cliente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Motivo e Observações</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="motivo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo da Troca</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {motivos.map((motivo) => (
                          <SelectItem key={motivo.id} value={motivo.id}>
                            {motivo.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {motivoOutro && (
                <FormField
                  control={form.control}
                  name="motivo_outro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especifique o Motivo</FormLabel>
                      <FormControl>
                        <Input placeholder="Descreva o motivo" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação (O que foi combinado com o cliente)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva o que foi combinado com o cliente..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link to="/ecommerce/suporte/trocas">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={createTroca.isPending || updateTroca.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
