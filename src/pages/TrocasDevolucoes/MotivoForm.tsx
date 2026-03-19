import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMotivo, useCreateMotivo, useUpdateMotivo } from '@/hooks/useMotivosTrocaDevolucao';

const TIPOS_DISPONIVEIS = [
  { id: 'troca', label: 'Troca' },
  { id: 'devolucao', label: 'Devolução' },
  { id: 'problema', label: 'Problema' },
] as const;

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  tipos: z.array(z.string()).min(1, 'Selecione pelo menos um tipo'),
  ordem: z.coerce.number().int().min(0),
  ativo: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

// Função para converter tipo único legado para array
const tipoToArray = (tipo: string): string[] => {
  if (tipo === 'ambos') return ['troca', 'devolucao'];
  return [tipo];
};

// Função para converter array para string armazenada
const arrayToTipo = (tipos: string[]): string => {
  if (tipos.length === 0) return 'troca';
  if (tipos.length === 1) return tipos[0];
  // Se tem troca e devolução (sem problema), mantém compatibilidade com "ambos"
  if (tipos.length === 2 && tipos.includes('troca') && tipos.includes('devolucao') && !tipos.includes('problema')) {
    return 'ambos';
  }
  // Para múltiplas seleções, armazena como JSON
  return JSON.stringify(tipos.sort());
};

// Função para parsear o tipo armazenado para array
const parseStoredTipo = (tipo: string): string[] => {
  if (tipo === 'ambos') return ['troca', 'devolucao'];
  if (tipo.startsWith('[')) {
    try {
      return JSON.parse(tipo);
    } catch {
      return [tipo];
    }
  }
  return [tipo];
};

export default function MotivoForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: motivo, isLoading } = useMotivo(id);
  const createMutation = useCreateMotivo();
  const updateMutation = useUpdateMotivo();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      tipos: [],
      ordem: 0,
      ativo: true,
    },
  });

  useEffect(() => {
    if (motivo) {
      form.reset({
        nome: motivo.nome,
        tipos: parseStoredTipo(motivo.tipo),
        ordem: motivo.ordem ?? 0,
        ativo: motivo.ativo ?? true,
      });
    }
  }, [motivo, form]);

  const onSubmit = async (data: FormData) => {
    const tipoValue = arrayToTipo(data.tipos);
    
    if (isEditing && id) {
      await updateMutation.mutateAsync({ 
        id, 
        nome: data.nome,
        tipo: tipoValue,
        ordem: data.ordem,
        ativo: data.ativo,
      });
    } else {
      await createMutation.mutateAsync({
        nome: data.nome,
        tipo: tipoValue,
        ordem: data.ordem,
        ativo: data.ativo,
      });
    }
    navigate('/ecommerce/suporte/motivos');
  };

  if (isLoading && isEditing) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/ecommerce/suporte/motivos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditing ? 'Editar' : 'Novo'} Motivo</h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Atualize os dados do motivo' : 'Cadastre um novo motivo'}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados do Motivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tipos"
                  render={() => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <div className="flex flex-wrap gap-4 pt-2">
                        {TIPOS_DISPONIVEIS.map((tipo) => (
                          <FormField
                            key={tipo.id}
                            control={form.control}
                            name="tipos"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(tipo.id)}
                                    onCheckedChange={(checked) => {
                                      const newValue = checked
                                        ? [...(field.value || []), tipo.id]
                                        : field.value?.filter((v) => v !== tipo.id) || [];
                                      field.onChange(newValue);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0 font-normal cursor-pointer">
                                  {tipo.label}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ordem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ordem</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Ativo</FormLabel>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/ecommerce/suporte/motivos')}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Motivo'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
