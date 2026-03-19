import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProblemaPedido, useCreateProblemaPedido, useUpdateProblemaPedido } from '@/hooks/useProblemasPedido';
import { useAuth } from '@/hooks/useAuth';
import { EcommerceOrderSelector } from '@/components/TrocasDevolucoes/EcommerceOrderSelector';
import { Order } from '@/hooks/useOrders';
import { useMotivos } from '@/hooks/useMotivosTrocaDevolucao';

const formSchema = z.object({
  numero_pedido: z.string().min(1, 'Número do pedido é obrigatório'),
  motivo_id: z.string().optional(),
  problema_outro: z.string().optional(),
  nome_cliente: z.string().optional(),
  email_cliente: z.string().optional(),
  telefone_cliente: z.string().optional(),
  endereco_cliente: z.string().optional(),
  valor_pedido: z.coerce.number().min(0).optional(),
  codigo_rastreio: z.string().optional(),
  transportadora: z.string().optional(),
  numero_chamado: z.string().optional(),
  status: z.enum(['pendente', 'resolvido', 'nao_resolvido']).default('pendente'),
  observacao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ProblemaForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;

  const { data: problema, isLoading } = useProblemaPedido(id);
  const { data: motivos = [] } = useMotivos('problema');
  const createMutation = useCreateProblemaPedido();
  const updateMutation = useUpdateProblemaPedido();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_pedido: '',
      motivo_id: '',
      problema_outro: '',
      nome_cliente: '',
      email_cliente: '',
      telefone_cliente: '',
      endereco_cliente: '',
      valor_pedido: 0,
      codigo_rastreio: '',
      transportadora: '',
      numero_chamado: '',
      status: 'pendente',
      observacao: '',
    },
  });

  const motivoSelecionado = form.watch('motivo_id');
  const motivoOutro = motivos.find(m => m.id === motivoSelecionado)?.nome === 'Outro';

  useEffect(() => {
    if (problema) {
      form.reset({
        numero_pedido: problema.numero_pedido,
        motivo_id: problema.motivo_id || '',
        problema_outro: problema.problema_outro || '',
        nome_cliente: problema.nome_cliente || '',
        email_cliente: problema.email_cliente || '',
        telefone_cliente: problema.telefone_cliente || '',
        endereco_cliente: problema.endereco_cliente || '',
        valor_pedido: problema.valor_pedido || 0,
        codigo_rastreio: problema.codigo_rastreio || '',
        transportadora: problema.transportadora || '',
        numero_chamado: problema.numero_chamado || '',
        status: problema.status,
        observacao: problema.observacao || '',
      });
    }
  }, [problema, form]);

  const handleOrderSelect = (order: Order | null) => {
    if (order) {
      form.setValue('nome_cliente', order.customer_name);
      form.setValue('email_cliente', order.customer_email || '');
      form.setValue('telefone_cliente', order.customer_phone || '');
      form.setValue('endereco_cliente', order.shipping_address || '');
      form.setValue('valor_pedido', order.total);
      form.setValue('codigo_rastreio', order.tracking_code || '');
      form.setValue('transportadora', order.carrier || '');
    }
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      // tipo_problema é obrigatório no banco - usar 'outro' como padrão já que usamos motivo_id
      tipo_problema: 'outro' as const,
      motivo_id: data.motivo_id || null,
      problema_outro: motivoOutro ? data.problema_outro || null : null,
      nome_cliente: data.nome_cliente || null,
      email_cliente: data.email_cliente || null,
      telefone_cliente: data.telefone_cliente || null,
      endereco_cliente: data.endereco_cliente || null,
      valor_pedido: data.valor_pedido || null,
      codigo_rastreio: data.codigo_rastreio || null,
      transportadora: data.transportadora || null,
      numero_chamado: data.numero_chamado || null,
      observacao: data.observacao || null,
    };

    if (isEditing && id) {
      await updateMutation.mutateAsync({ id, ...payload });
    } else {
      await createMutation.mutateAsync(payload as any);
    }
    navigate('/ecommerce/suporte/chamados');
  };

  if (isLoading && isEditing) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ecommerce/suporte/chamados')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar' : 'Novo'} Problema</h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Atualize os dados do problema' : 'Registre um novo problema de pedido'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Pedido</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero_pedido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Pedido *</FormLabel>
                    <FormControl>
                      <EcommerceOrderSelector
                        value={field.value || ''}
                        onChange={field.onChange}
                        onOrderSelect={handleOrderSelect}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="motivo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Problema *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o problema" />
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
                  name="problema_outro"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Especifique o Problema</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="valor_pedido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor do Pedido (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input type="email" {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endereco_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dados de Rastreamento</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="transportadora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transportadora</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="codigo_rastreio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Rastreio</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="numero_chamado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Chamado</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status do Problema</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full md:w-[300px]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        <SelectItem value="nao_resolvido">Não Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea rows={4} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/ecommerce/suporte/chamados')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Salvar Alterações' : 'Registrar Problema'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
