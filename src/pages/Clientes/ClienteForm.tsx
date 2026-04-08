import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useSegmentos } from '@/hooks/useSegmentos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneInput } from '@/components/ui/phone-input';
import { CpfCnpjInput } from '@/components/ui/cpf-cnpj-input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { sanitizeError } from '@/lib/errorHandling';
import { buscarClienteDuplicado, type ClienteDuplicadoEncontrado } from '@/lib/cliente-duplicidade';

const clienteSchema = z.object({
  responsavel: z.string().max(200).optional(),
  nome_razao_social: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(200),
  cpf_cnpj: z.string().max(18).optional(),
  telefone: z
    .string()
    .trim()
    .min(1, 'Telefone é obrigatório')
    .max(20) // Campo unificado telefone/WhatsApp
    .refine((value) => value.replace(/\D/g, '').length >= 10, 'Informe um telefone válido com DDD'),
  email: z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  endereco: z.string().max(500).optional(),
  observacao: z.string().max(1000).optional(),
  segmento_id: z.string().optional(),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

export default function ClienteForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const { can } = usePermissions();
  const { data: segmentos = [] } = useSegmentos();
  
  // TODOS OS HOOKS DEVEM VIR ANTES DE QUALQUER RETURN CONDICIONAL
  const { data: cliente } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  const form = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      responsavel: '',
      nome_razao_social: '',
      cpf_cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      observacao: '',
      segmento_id: '',
    },
    values: cliente ? {
      responsavel: (cliente as { responsavel?: string | null }).responsavel || '',
      nome_razao_social: cliente.nome_razao_social,
      cpf_cnpj: cliente.cpf_cnpj || '',
      telefone: cliente.telefone || cliente.whatsapp || '', // Usa telefone ou whatsapp existente
      email: cliente.email || '',
      endereco: cliente.endereco || '',
      observacao: cliente.observacao || '',
      segmento_id: (cliente as { segmento_id?: string | null }).segmento_id || '',
    } : undefined,
  });

  const [clienteDuplicado, setClienteDuplicado] = useState<ClienteDuplicadoEncontrado | null>(null);
  const [dadosPendentes, setDadosPendentes] = useState<ClienteFormData | null>(null);

  const mutation = useMutation({
    mutationFn: async (data: ClienteFormData) => {
      const submitData = {
        responsavel: data.responsavel || null,
        nome_razao_social: data.nome_razao_social,
        cpf_cnpj: data.cpf_cnpj || null,
        telefone: data.telefone || null,
        email: data.email || null,
        whatsapp: data.telefone || null, // Sincroniza telefone com whatsapp
        endereco: data.endereco || null,
        observacao: data.observacao || null,
        segmento_id: data.segmento_id || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from('clientes')
          .update(submitData)
          .eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([submitData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success(isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!');
      navigate('/clientes');
    },
    onError: (error: unknown) => {
      const dbError = (error ?? {}) as { message?: string; code?: string };
      if (dbError.code === '23505') {
        if (dbError.message?.includes('cpf_cnpj')) {
          toast.error('Já existe um cliente cadastrado com este CPF/CNPJ');
        } else if (dbError.message?.includes('email')) {
          toast.error('Já existe um cliente cadastrado com este email');
        } else {
          toast.error('Já existe um cliente cadastrado com estas informações');
        }
      } else {
        toast.error(sanitizeError(error));
      }
    },
  });

  const onSubmit = async (data: ClienteFormData) => {
    if (!isEditing) {
      try {
        const duplicado = await buscarClienteDuplicado({
          cpfCnpj: data.cpf_cnpj,
          telefone: data.telefone,
        });

        if (duplicado) {
          setClienteDuplicado(duplicado);
          setDadosPendentes(data);
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar cliente duplicado:', error);
        toast.error('Nao foi possivel validar se o cliente ja existe. Tente novamente.');
        return;
      }
    }

    mutation.mutate(data);
  };

  const limparDuplicidade = () => {
    setClienteDuplicado(null);
    setDadosPendentes(null);
  };

  const selecionarClienteExistente = () => {
    if (!clienteDuplicado) return;
    limparDuplicidade();
    navigate(`/clientes/${clienteDuplicado.cliente.id}`);
  };

  const continuarNovoCadastro = () => {
    if (!dadosPendentes) return;
    mutation.mutate(dadosPendentes);
    limparDuplicidade();
  };

  // VERIFICAÇÕES DE PERMISSÃO APÓS TODOS OS HOOKS
  const podeEditarCliente = can('clientes.editar');
  const podeCriarCliente = can('clientes.criar');

  // Renderizar mensagem de permissão negada se necessário
  if (isEditing && !podeEditarCliente) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para editar clientes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!isEditing && !podeCriarCliente) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para criar clientes.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate('/clientes')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="responsavel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome do responsável (opcional)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome_razao_social"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome/Razão Social *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nome da empresa ou pessoa física" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="segmento_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o segmento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {segmentos.map((seg) => (
                          <SelectItem key={seg.id} value={seg.id}>
                            {seg.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cpf_cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF/CNPJ</FormLabel>
                      <FormControl>
                        <CpfCnpjInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone / WhatsApp *</FormLabel>
                      <FormControl>
                        <PhoneInput {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
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
                name="endereco"
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

              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/clientes')}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={!!clienteDuplicado} onOpenChange={(open) => !open && limparDuplicidade()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cliente ja cadastrado</DialogTitle>
            <DialogDescription>
              {clienteDuplicado?.motivo === 'cpf_cnpj'
                ? 'Ja existe um cliente com este CPF/CNPJ.'
                : 'Ja existe um cliente com este telefone/WhatsApp.'}
              {' '}
              Cliente encontrado: <strong>{clienteDuplicado?.cliente.nome_razao_social}</strong>.
              Deseja selecionar este cliente?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={limparDuplicidade}>
              Cancelar
            </Button>
            <Button type="button" variant="secondary" onClick={continuarNovoCadastro} disabled={mutation.isPending}>
              Continuar Novo
            </Button>
            <Button type="button" onClick={selecionarClienteExistente}>
              Selecionar Existente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

