import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExtravio, useCreateExtravio, useUpdateExtravio, checkExtravioDuplicado, Extravio } from '@/hooks/useExtravios';
import { useAuth } from '@/hooks/useAuth';
import { EcommerceOrderSelector } from '@/components/TrocasDevolucoes/EcommerceOrderSelector';
import { Order } from '@/hooks/useOrders';
import { extrairNumeroNF } from '@/lib/nfUtils';

const formSchema = z.object({
  numero_pedido: z.string().min(1, 'Número do pedido é obrigatório'),
  nome_cliente: z.string().min(1, 'Nome do cliente é obrigatório'),
  email_cliente: z.string().email().optional().or(z.literal('')),
  telefone_cliente: z.string().optional(),
  endereco_cliente: z.string().optional(),
  data_pedido_original: z.string().optional(),
  valor_pedido: z.coerce.number().min(0).optional(),
  transportadora: z.string().optional(),
  numero_rastreio: z.string().optional(),
  numero_chamado: z.string().optional(),
  numero_nf: z.string().optional(),
  chave_nf: z.string().optional(),
  solicitado_ressarcimento: z.boolean().default(false),
  status_ressarcimento: z.enum(['pendente', 'aprovado', 'negado']).default('pendente'),
  valor_ressarcimento: z.coerce.number().min(0).optional(),
  motivo_negacao: z.string().optional(),
  observacao: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ExtravioForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;

  const { data: extravio, isLoading } = useExtravio(id);
  const createMutation = useCreateExtravio();
  const updateMutation = useUpdateExtravio();
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateRecord, setDuplicateRecord] = useState<Extravio | null>(null);
  const [pendingPayload, setPendingPayload] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_pedido: '',
      nome_cliente: '',
      email_cliente: '',
      telefone_cliente: '',
      endereco_cliente: '',
      data_pedido_original: '',
      valor_pedido: 0,
      transportadora: '',
      numero_rastreio: '',
      numero_chamado: '',
      numero_nf: '',
      chave_nf: '',
      solicitado_ressarcimento: false,
      status_ressarcimento: 'pendente',
      valor_ressarcimento: 0,
      motivo_negacao: '',
      observacao: '',
    },
  });

  const solicitadoRessarcimento = form.watch('solicitado_ressarcimento');
  const statusRessarcimento = form.watch('status_ressarcimento');

  useEffect(() => {
    if (extravio) {
      form.reset({
        numero_pedido: extravio.numero_pedido,
        nome_cliente: extravio.nome_cliente,
        email_cliente: extravio.email_cliente || '',
        telefone_cliente: extravio.telefone_cliente || '',
        endereco_cliente: '',
        data_pedido_original: extravio.data_pedido_original || '',
        valor_pedido: extravio.valor_pedido || 0,
        transportadora: extravio.transportadora || '',
        numero_rastreio: extravio.numero_rastreio || '',
        numero_chamado: extravio.numero_chamado || '',
        numero_nf: extravio.numero_nf || '',
        chave_nf: extravio.chave_nf || '',
        solicitado_ressarcimento: extravio.solicitado_ressarcimento || false,
        status_ressarcimento: extravio.status_ressarcimento || 'pendente',
        valor_ressarcimento: extravio.valor_ressarcimento || 0,
        motivo_negacao: extravio.motivo_negacao || '',
        observacao: extravio.observacao || '',
      });
    }
  }, [extravio, form]);

  const handleOrderSelect = (order: Order | null) => {
    if (order) {
      form.setValue('nome_cliente', order.customer_name);
      form.setValue('email_cliente', order.customer_email || '');
      form.setValue('telefone_cliente', order.customer_phone || '');
      form.setValue('endereco_cliente', order.shipping_address || '');
      form.setValue('valor_pedido', order.total);
      form.setValue('numero_rastreio', order.tracking_code || '');
      form.setValue('transportadora', order.carrier || '');
      // Preencher dados da NF
      form.setValue('chave_nf', order.chave_nfe || '');
      form.setValue('numero_nf', extrairNumeroNF(order.chave_nfe) || '');
      // Parse date from order created_at
      if (order.created_at) {
        const date = new Date(order.created_at);
        form.setValue('data_pedido_original', date.toISOString().split('T')[0]);
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      email_cliente: data.email_cliente || null,
      telefone_cliente: data.telefone_cliente || null,
      data_pedido_original: data.data_pedido_original || null,
      valor_pedido: data.valor_pedido || null,
      transportadora: data.transportadora || null,
      numero_rastreio: data.numero_rastreio || null,
      numero_chamado: data.numero_chamado || null,
      numero_nf: data.numero_nf || null,
      chave_nf: data.chave_nf || null,
      valor_ressarcimento: data.valor_ressarcimento || null,
      motivo_negacao: data.motivo_negacao || null,
      observacao: data.observacao || null,
      created_by: user?.id || '',
    };

    // Remove endereco_cliente as it's not in the extravios table
    delete (payload as any).endereco_cliente;

    // Check for duplicates only when creating
    if (!isEditing) {
      const { exists, record } = await checkExtravioDuplicado(
        data.numero_pedido,
        data.numero_rastreio || undefined
      );
      if (exists && record) {
        setDuplicateRecord(record);
        setPendingPayload(payload);
        setDuplicateDialogOpen(true);
        return;
      }
    }

    await saveRecord(payload);
  };

  const saveRecord = async (payload: any) => {
    if (isEditing && id) {
      await updateMutation.mutateAsync({ id, ...payload });
    } else {
      await createMutation.mutateAsync(payload as any);
    }
    navigate('/ecommerce/suporte/extravios');
  };

  const handleConfirmDuplicate = async () => {
    if (pendingPayload) {
      await saveRecord(pendingPayload);
    }
    setDuplicateDialogOpen(false);
    setPendingPayload(null);
    setDuplicateRecord(null);
  };

  if (isLoading && isEditing) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ecommerce/suporte/extravios')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar' : 'Novo'} Extravio/Roubo</h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Atualize os dados do extravio' : 'Registre um novo extravio ou roubo'}
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
                        value={field.value}
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
                    <FormLabel>Nome do Cliente *</FormLabel>
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
                      <Input {...field} placeholder="Apenas para referência" />
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
                name="numero_rastreio"
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
              <CardTitle>Dados da Nota Fiscal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero_nf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número da NF</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="chave_nf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chave da NF</FormLabel>
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
              <CardTitle>Ressarcimento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="solicitado_ressarcimento"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Solicitado Ressarcimento</FormLabel>
                  </FormItem>
                )}
              />

              {solicitadoRessarcimento && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status_ressarcimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status do Ressarcimento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pendente">Pendente</SelectItem>
                            <SelectItem value="aprovado">Aprovado</SelectItem>
                            <SelectItem value="negado">Negado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {statusRessarcimento === 'aprovado' && (
                    <FormField
                      control={form.control}
                      name="valor_ressarcimento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor do Ressarcimento (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {statusRessarcimento === 'negado' && (
                    <FormField
                      control={form.control}
                      name="motivo_negacao"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Motivo da Negação</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
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
            <Button type="button" variant="outline" onClick={() => navigate('/ecommerce/suporte/extravios')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Salvar Alterações' : 'Registrar Extravio'}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Extravio já registrado</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um extravio registrado para este pedido ou rastreio.
              <br /><br />
              <strong>Pedido:</strong> {duplicateRecord?.numero_pedido}
              <br />
              <strong>Cliente:</strong> {duplicateRecord?.nome_cliente}
              <br />
              <strong>Rastreio:</strong> {duplicateRecord?.numero_rastreio || 'Não informado'}
              <br />
              <strong>Registrado em:</strong> {duplicateRecord?.created_at ? new Date(duplicateRecord.created_at).toLocaleDateString('pt-BR') : '-'}
              <br /><br />
              Deseja continuar e registrar mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDuplicateDialogOpen(false);
              setPendingPayload(null);
              setDuplicateRecord(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDuplicate}>
              Continuar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
