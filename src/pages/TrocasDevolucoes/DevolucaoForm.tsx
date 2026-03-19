import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDevolucao, useCreateDevolucao, useUpdateDevolucao, uploadComprovante, checkDevolucaoDuplicada } from '@/hooks/useDevolucoes';
import { useMotivos } from '@/hooks/useMotivosTrocaDevolucao';
import { toast } from 'sonner';
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
  comprovante_url: z.string().optional(),
  observacao: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function DevolucaoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [uploading, setUploading] = useState(false);

  const { data: devolucao, isLoading: isLoadingDevolucao } = useDevolucao(id);
  const { data: motivos = [] } = useMotivos('devolucao');
  const createDevolucao = useCreateDevolucao();
  const updateDevolucao = useUpdateDevolucao();
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateRecord, setDuplicateRecord] = useState<any>(null);
  const [pendingData, setPendingData] = useState<any>(null);

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
      comprovante_url: '',
      observacao: '',
    },
  });

  const motivoSelecionado = form.watch('motivo_id');
  const motivoOutro = motivos.find(m => m.id === motivoSelecionado)?.nome === 'Outro';
  const comprovanteUrl = form.watch('comprovante_url');

  useEffect(() => {
    if (devolucao) {
      form.reset({
        numero_pedido: devolucao.numero_pedido,
        nome_cliente: devolucao.nome_cliente,
        email_cliente: devolucao.email_cliente || '',
        telefone_cliente: devolucao.telefone_cliente || '',
        valor_pedido: devolucao.valor_pedido,
        data_pedido_original: devolucao.data_pedido_original || '',
        motivo_id: devolucao.motivo_id || '',
        motivo_outro: devolucao.motivo_outro || '',
        transportadora: devolucao.transportadora || '',
        comprovante_url: devolucao.comprovante_url || '',
        observacao: devolucao.observacao || '',
      });
    }
  }, [devolucao, form]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadComprovante(file);
      form.setValue('comprovante_url', url);
      toast.success('Comprovante enviado com sucesso');
    } catch (error) {
      console.error('Erro ao enviar comprovante:', error);
      toast.error('Erro ao enviar comprovante');
    } finally {
      setUploading(false);
    }
  };

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
        comprovante_url: values.comprovante_url || null,
        observacao: values.observacao || null,
      };

      // Check for duplicates only when creating
      if (!isEditing) {
        const { exists, record } = await checkDevolucaoDuplicada(values.numero_pedido);
        if (exists && record) {
          setDuplicateRecord(record);
          setPendingData(data);
          setDuplicateDialogOpen(true);
          return;
        }
      }

      await saveRecord(data);
    } catch (error) {
      console.error('Erro ao salvar devolução:', error);
    }
  };

  const saveRecord = async (data: any) => {
    try {
      if (isEditing) {
        await updateDevolucao.mutateAsync({ id, ...data });
      } else {
        await createDevolucao.mutateAsync(data);
      }

      navigate('/ecommerce/suporte/devolucoes');
    } catch (error) {
      console.error('Erro ao salvar devolução:', error);
    }
  };

  const handleConfirmDuplicate = async () => {
    if (pendingData) {
      await saveRecord(pendingData);
    }
    setDuplicateDialogOpen(false);
    setPendingData(null);
    setDuplicateRecord(null);
  };

  if (isEditing && isLoadingDevolucao) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/ecommerce/suporte/devolucoes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? 'Editar Devolução' : 'Nova Devolução'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Atualize os dados da devolução' : 'Registre uma nova devolução de pedido'}
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
              <CardTitle>Motivo e Comprovante</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="motivo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo da Devolução</FormLabel>
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
              
              <div className="space-y-2">
                <FormLabel>Comprovante de Devolução</FormLabel>
                {comprovanteUrl ? (
                  <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                    <a 
                      href={comprovanteUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex-1 truncate"
                    >
                      {comprovanteUrl.split('/').pop()}
                    </a>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => form.setValue('comprovante_url', '')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="flex-1"
                    />
                    {uploading && <span className="text-sm text-muted-foreground">Enviando...</span>}
                  </div>
                )}
              </div>

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
            <Link to="/ecommerce/suporte/devolucoes">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </Link>
            <Button type="submit" disabled={createDevolucao.isPending || updateDevolucao.isPending || uploading}>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Atualizar' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Devolução já registrada</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe uma devolução registrada para o pedido <strong>{duplicateRecord?.numero_pedido}</strong>.
              <br /><br />
              <strong>Cliente:</strong> {duplicateRecord?.nome_cliente}
              <br />
              <strong>Registrada em:</strong> {duplicateRecord?.created_at ? new Date(duplicateRecord.created_at).toLocaleDateString('pt-BR') : '-'}
              <br /><br />
              Deseja continuar e registrar mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDuplicateDialogOpen(false);
              setPendingData(null);
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
