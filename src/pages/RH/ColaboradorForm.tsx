import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useColaborador, useColaboradores, ColaboradorInput } from '@/hooks/rh/useColaboradores';
import { useSetores } from '@/hooks/rh/useSetores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, User, Briefcase, Building, MapPin } from 'lucide-react';
import { CpfCnpjInput } from '@/components/ui/cpf-cnpj-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { CurrencyInput } from '@/components/ui/currency-input';

const formSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  data_nascimento: z.string().optional(),
  data_admissao: z.string().min(1, 'Data de admissão é obrigatória'),
  data_demissao: z.string().optional(),
  cargo: z.string().min(1, 'Cargo é obrigatório'),
  setor_id: z.string().optional(),
  salario_atual: z.number().min(0).default(0),
  tipo_contrato: z.enum(['clt', 'pj', 'estagio', 'temporario', 'aprendiz']),
  carga_horaria: z.number().min(1).max(60).default(44),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  tipo_conta: z.enum(['corrente', 'poupanca', 'salario']).optional().nullable(),
  chave_pix: z.string().optional(),
  endereco_cep: z.string().optional(),
  endereco_logradouro: z.string().optional(),
  endereco_numero: z.string().optional(),
  endereco_complemento: z.string().optional(),
  endereco_bairro: z.string().optional(),
  endereco_cidade: z.string().optional(),
  endereco_estado: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

export default function ColaboradorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: colaborador, isLoading: loadingColaborador } = useColaborador(id);
  const { createColaborador, updateColaborador, isCreating, isUpdating } = useColaboradores();
  const { setores } = useSetores();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      email: '',
      telefone: '',
      whatsapp: '',
      cpf: '',
      rg: '',
      data_nascimento: '',
      data_admissao: new Date().toISOString().split('T')[0],
      data_demissao: '',
      cargo: '',
      setor_id: '',
      salario_atual: 0,
      tipo_contrato: 'clt',
      carga_horaria: 44,
      banco: '',
      agencia: '',
      conta: '',
      tipo_conta: null,
      chave_pix: '',
      endereco_cep: '',
      endereco_logradouro: '',
      endereco_numero: '',
      endereco_complemento: '',
      endereco_bairro: '',
      endereco_cidade: '',
      endereco_estado: '',
      observacoes: '',
      ativo: true,
    },
  });

  useEffect(() => {
    if (colaborador) {
      form.reset({
        nome: colaborador.nome,
        email: colaborador.email || '',
        telefone: colaborador.telefone || '',
        whatsapp: colaborador.whatsapp || '',
        cpf: colaborador.cpf || '',
        rg: colaborador.rg || '',
        data_nascimento: colaborador.data_nascimento || '',
        data_admissao: colaborador.data_admissao,
        data_demissao: colaborador.data_demissao || '',
        cargo: colaborador.cargo,
        setor_id: colaborador.setor_id || '',
        salario_atual: colaborador.salario_atual || 0,
        tipo_contrato: colaborador.tipo_contrato,
        carga_horaria: colaborador.carga_horaria || 44,
        banco: colaborador.banco || '',
        agencia: colaborador.agencia || '',
        conta: colaborador.conta || '',
        tipo_conta: colaborador.tipo_conta,
        chave_pix: colaborador.chave_pix || '',
        endereco_cep: colaborador.endereco_cep || '',
        endereco_logradouro: colaborador.endereco_logradouro || '',
        endereco_numero: colaborador.endereco_numero || '',
        endereco_complemento: colaborador.endereco_complemento || '',
        endereco_bairro: colaborador.endereco_bairro || '',
        endereco_cidade: colaborador.endereco_cidade || '',
        endereco_estado: colaborador.endereco_estado || '',
        observacoes: colaborador.observacoes || '',
        ativo: colaborador.ativo,
      });
    }
  }, [colaborador, form]);

  const onSubmit = (data: FormData) => {
    const input: ColaboradorInput = {
      nome: data.nome,
      data_admissao: data.data_admissao,
      cargo: data.cargo,
      tipo_contrato: data.tipo_contrato,
      salario_atual: data.salario_atual,
      carga_horaria: data.carga_horaria,
      ativo: data.ativo,
      email: data.email || null,
      telefone: data.telefone || null,
      whatsapp: data.whatsapp || null,
      cpf: data.cpf || null,
      rg: data.rg || null,
      data_nascimento: data.data_nascimento || null,
      data_demissao: data.data_demissao || null,
      setor_id: data.setor_id || null,
      banco: data.banco || null,
      agencia: data.agencia || null,
      conta: data.conta || null,
      tipo_conta: data.tipo_conta || null,
      chave_pix: data.chave_pix || null,
      endereco_cep: data.endereco_cep || null,
      endereco_logradouro: data.endereco_logradouro || null,
      endereco_numero: data.endereco_numero || null,
      endereco_complemento: data.endereco_complemento || null,
      endereco_bairro: data.endereco_bairro || null,
      endereco_cidade: data.endereco_cidade || null,
      endereco_estado: data.endereco_estado || null,
      observacoes: data.observacoes || null,
    };

    if (isEditing && id) {
      updateColaborador({ id, ...input }, {
        onSuccess: () => navigate('/rh/colaboradores'),
      });
    } else {
      createColaborador(input, {
        onSuccess: () => navigate('/rh/colaboradores'),
      });
    }
  };

  if (isEditing && loadingColaborador) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate('/rh/colaboradores')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="pessoal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pessoal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados Pessoais
              </TabsTrigger>
              <TabsTrigger value="profissional" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Profissional
              </TabsTrigger>
              <TabsTrigger value="bancario" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Dados Bancários
              </TabsTrigger>
              <TabsTrigger value="endereco" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pessoal">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Pessoais</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Nome Completo *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome completo do colaborador" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <CpfCnpjInput {...field} placeholder="000.000.000-00" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RG</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="RG com órgão emissor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="data_nascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
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
                          <Input type="email" {...field} placeholder="email@exemplo.com" />
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
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <PhoneInput {...field} placeholder="(00) 00000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="whatsapp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp</FormLabel>
                        <FormControl>
                          <PhoneInput {...field} placeholder="(00) 00000-0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profissional">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Profissionais</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="cargo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Analista de RH" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="setor_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o setor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {setores.map(setor => (
                              <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="data_admissao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Admissão *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tipo_contrato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Contrato *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="clt">CLT</SelectItem>
                            <SelectItem value="pj">PJ</SelectItem>
                            <SelectItem value="estagio">Estágio</SelectItem>
                            <SelectItem value="temporario">Temporário</SelectItem>
                            <SelectItem value="aprendiz">Aprendiz</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="salario_atual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Salário Atual</FormLabel>
                        <FormControl>
                          <CurrencyInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="R$ 0,00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="carga_horaria"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carga Horária Semanal</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value) || 44)}
                            placeholder="44"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {isEditing && (
                    <>
                      <FormField
                        control={form.control}
                        name="data_demissao"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de Demissão</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ativo"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                              <FormLabel>Colaborador Ativo</FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Desativar mantém os dados mas oculta da lista padrão
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  <FormField
                    control={form.control}
                    name="observacoes"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Observações internas sobre o colaborador"
                            rows={4}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bancario">
              <Card>
                <CardHeader>
                  <CardTitle>Dados Bancários</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="banco"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Banco</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do banco" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tipo_conta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Conta</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="corrente">Corrente</SelectItem>
                            <SelectItem value="poupanca">Poupança</SelectItem>
                            <SelectItem value="salario">Salário</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agencia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Agência</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="0000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="conta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Conta</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00000-0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="chave_pix"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Chave PIX</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="CPF, Email, Telefone ou Chave Aleatória" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="endereco">
              <Card>
                <CardHeader>
                  <CardTitle>Endereço</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="endereco_cep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="00000-000" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endereco_logradouro"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Logradouro</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Rua, Avenida, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endereco_numero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="123" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endereco_complemento"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Apto, Bloco, etc." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endereco_bairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Bairro" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endereco_cidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Cidade" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endereco_estado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado (UF)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="UF" maxLength={2} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate('/rh/colaboradores')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating || isUpdating}>
              <Save className="mr-2 h-4 w-4" />
              {isCreating || isUpdating ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
