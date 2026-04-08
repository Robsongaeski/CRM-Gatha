import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PhoneInput } from '@/components/ui/phone-input';
import { CpfCnpjInput } from '@/components/ui/cpf-cnpj-input';
import { buscarClienteDuplicado, type ClienteDuplicadoEncontrado } from '@/lib/cliente-duplicidade';

const clienteQuickSchema = z.object({
  nome_razao_social: z.string().trim().min(1, 'Nome é obrigatório'),
  responsavel: z.string().trim().optional(),
  cpf_cnpj: z.string().trim().optional(),
  telefone: z
    .string()
    .trim()
    .min(1, 'Telefone é obrigatório')
    .refine((value) => value.replace(/\D/g, '').length >= 10, 'Informe um telefone válido com DDD'),
  email: z.string().trim().email('Email inválido').optional().or(z.literal('')),
});

type ClienteQuickFormData = z.infer<typeof clienteQuickSchema>;

interface ClienteQuickAddProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClienteCreated: (clienteId: string) => void;
}

export function ClienteQuickAdd({ open, onOpenChange, onClienteCreated }: ClienteQuickAddProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [clienteDuplicado, setClienteDuplicado] = useState<ClienteDuplicadoEncontrado | null>(null);
  const [dadosPendentes, setDadosPendentes] = useState<ClienteQuickFormData | null>(null);

  const form = useForm<ClienteQuickFormData>({
    resolver: zodResolver(clienteQuickSchema),
    defaultValues: {
      nome_razao_social: '',
      responsavel: '',
      cpf_cnpj: '',
      telefone: '',
      email: '',
    },
  });

  const createCliente = useMutation({
    mutationFn: async (data: ClienteQuickFormData) => {
      const { data: cliente, error } = await supabase
        .from('clientes')
        .insert({
          nome_razao_social: data.nome_razao_social,
          responsavel: data.responsavel || null,
          cpf_cnpj: data.cpf_cnpj || null,
          telefone: data.telefone || null,
          whatsapp: data.telefone || null, // Sincroniza com telefone
          email: data.email || null,
        })
        .select()
        .single();

      if (error) throw error;
      return cliente;
    },
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: 'Sucesso',
        description: 'Cliente cadastrado com sucesso',
      });
      onClienteCreated(cliente.id);
      form.reset();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const dbError = (error ?? {}) as { message?: string; code?: string };
      let errorMessage = dbError.message || 'Erro ao cadastrar cliente';
      
      if (dbError.code === '23505') {
        if (dbError.message?.includes('cpf_cnpj')) {
          errorMessage = 'Já existe um cliente cadastrado com este CPF/CNPJ';
        } else if (dbError.message?.includes('email')) {
          errorMessage = 'Já existe um cliente cadastrado com este email';
        } else {
          errorMessage = 'Já existe um cliente cadastrado com estas informações';
        }
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });

  const limparEstadoDuplicidade = () => {
    setClienteDuplicado(null);
    setDadosPendentes(null);
  };

  const executarCadastro = async (data: ClienteQuickFormData) => {
    setIsLoading(true);
    try {
      await createCliente.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ClienteQuickFormData) => {
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
      toast({
        title: 'Erro na verificacao',
        description: 'Nao foi possivel validar se o cliente ja existe. Tente novamente.',
        variant: 'destructive',
      });
      return;
    }

    await executarCadastro(data);
  };

  const handleSelecionarExistente = () => {
    if (!clienteDuplicado) return;

    onClienteCreated(clienteDuplicado.cliente.id);
    toast({
      title: 'Cliente existente selecionado',
      description: clienteDuplicado.cliente.nome_razao_social,
    });

    limparEstadoDuplicidade();
    form.reset();
    onOpenChange(false);
  };

  const handleContinuarNovoCadastro = async () => {
    if (!dadosPendentes) return;
    limparEstadoDuplicidade();
    await executarCadastro(dadosPendentes);
  };

  const motivoDuplicidade = clienteDuplicado?.motivo === 'cpf_cnpj'
    ? 'Já existe um cliente com este CPF/CNPJ.'
    : 'Já existe um cliente com este telefone/WhatsApp.';

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen);
          if (!nextOpen) {
            limparEstadoDuplicidade();
          }
        }}
      >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastro Rápido de Cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados essenciais do cliente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_razao_social"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome / Razão Social</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsável</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do responsável" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf_cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF / CNPJ</FormLabel>
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

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
      </Dialog>

      <Dialog open={!!clienteDuplicado} onOpenChange={(isOpen) => !isOpen && limparEstadoDuplicidade()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cliente ja cadastrado</DialogTitle>
            <DialogDescription>
              {motivoDuplicidade}
              {' '}
              Cliente encontrado: <strong>{clienteDuplicado?.cliente.nome_razao_social}</strong>.
              Deseja selecionar este cliente?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={limparEstadoDuplicidade}>
              Cancelar
            </Button>
            <Button type="button" variant="secondary" onClick={handleContinuarNovoCadastro} disabled={isLoading}>
              Continuar Novo
            </Button>
            <Button type="button" onClick={handleSelecionarExistente}>
              Selecionar Existente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

