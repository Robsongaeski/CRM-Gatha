import { useNavigate, useParams } from 'react-router-dom';
import { useColaborador } from '@/hooks/rh/useColaboradores';
import { useDependentes } from '@/hooks/rh/useDependentes';
import { useSalarios } from '@/hooks/rh/useSalarios';
import { useFerias } from '@/hooks/rh/useFerias';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, Edit, User, Phone, Mail, MapPin, Briefcase, 
  Calendar, DollarSign, CreditCard, Users, Palmtree, History
} from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ColaboradorDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: colaborador, isLoading } = useColaborador(id);
  const { dependentes } = useDependentes(id);
  const { salarios } = useSalarios(id);
  const { ferias } = useFerias({ colaborador_id: id });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!colaborador) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Colaborador não encontrado</p>
          <Button onClick={() => navigate('/rh/colaboradores')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const formatTipoContrato = (tipo: string) => {
    const tipos: Record<string, string> = {
      clt: 'CLT',
      pj: 'PJ',
      estagio: 'Estágio',
      temporario: 'Temporário',
      aprendiz: 'Aprendiz',
    };
    return tipos[tipo] || tipo;
  };

  const idade = colaborador.data_nascimento 
    ? differenceInYears(new Date(), parseISO(colaborador.data_nascimento))
    : null;

  const tempoEmpresa = differenceInYears(new Date(), parseISO(colaborador.data_admissao));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rh/colaboradores')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              {colaborador.foto_url ? (
                <img 
                  src={colaborador.foto_url} 
                  alt={colaborador.nome}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-xl font-medium text-primary">
                  {colaborador.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{colaborador.nome}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{colaborador.cargo}</span>
                {colaborador.setor && (
                  <>
                    <span>•</span>
                    <span>{colaborador.setor.nome}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={colaborador.ativo ? 'default' : 'secondary'}>
            {colaborador.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
          <Button onClick={() => navigate(`/rh/colaboradores/editar/${id}`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dados" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dados">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="profissional">Profissional</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="dependentes">Dependentes ({dependentes.length})</TabsTrigger>
          <TabsTrigger value="ferias">Férias ({ferias.length})</TabsTrigger>
          <TabsTrigger value="salarios">Histórico Salarial ({salarios.length})</TabsTrigger>
        </TabsList>

        {/* Dados Pessoais */}
        <TabsContent value="dados">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">CPF</p>
                    <p className="font-medium">{colaborador.cpf || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">RG</p>
                    <p className="font-medium">{colaborador.rg || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                    <p className="font-medium">
                      {colaborador.data_nascimento 
                        ? format(parseISO(colaborador.data_nascimento), 'dd/MM/yyyy')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Idade</p>
                    <p className="font-medium">{idade ? `${idade} anos` : '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Phone className="h-5 w-5" />
                  Contato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {colaborador.email || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {colaborador.telefone || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <p className="font-medium">{colaborador.whatsapp || '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent>
                {colaborador.endereco_logradouro ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Logradouro</p>
                      <p className="font-medium">{colaborador.endereco_logradouro}, {colaborador.endereco_numero}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Bairro</p>
                      <p className="font-medium">{colaborador.endereco_bairro || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">CEP</p>
                      <p className="font-medium">{colaborador.endereco_cep || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cidade</p>
                      <p className="font-medium">{colaborador.endereco_cidade || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estado</p>
                      <p className="font-medium">{colaborador.endereco_estado || '-'}</p>
                    </div>
                    {colaborador.endereco_complemento && (
                      <div className="col-span-2">
                        <p className="text-sm text-muted-foreground">Complemento</p>
                        <p className="font-medium">{colaborador.endereco_complemento}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Endereço não informado</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profissional */}
        <TabsContent value="profissional">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5" />
                Dados Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Cargo</p>
                  <p className="font-medium">{colaborador.cargo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Setor</p>
                  <p className="font-medium">{colaborador.setor?.nome || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo de Contrato</p>
                  <Badge variant="outline">{formatTipoContrato(colaborador.tipo_contrato)}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Carga Horária</p>
                  <p className="font-medium">{colaborador.carga_horaria || 44}h/semana</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Admissão</p>
                  <p className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {format(parseISO(colaborador.data_admissao), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tempo de Empresa</p>
                  <p className="font-medium">{tempoEmpresa} ano{tempoEmpresa !== 1 ? 's' : ''}</p>
                </div>
                {!colaborador.ativo && colaborador.data_demissao && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Demissão</p>
                    <p className="font-medium text-destructive">
                      {format(parseISO(colaborador.data_demissao), 'dd/MM/yyyy')}
                    </p>
                  </div>
                )}
              </div>
              {colaborador.observacoes && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm text-muted-foreground mb-2">Observações</p>
                  <p className="text-sm">{colaborador.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financeiro">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5" />
                  Salário
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  R$ {colaborador.salario_atual?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Salário atual</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5" />
                  Dados Bancários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Banco</p>
                    <p className="font-medium">{colaborador.banco || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Conta</p>
                    <p className="font-medium capitalize">{colaborador.tipo_conta || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Agência</p>
                    <p className="font-medium">{colaborador.agencia || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conta</p>
                    <p className="font-medium">{colaborador.conta || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chave PIX</p>
                  <p className="font-medium">{colaborador.chave_pix || '-'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dependentes */}
        <TabsContent value="dependentes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Dependentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dependentes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum dependente cadastrado
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Parentesco</TableHead>
                      <TableHead>Data de Nascimento</TableHead>
                      <TableHead>CPF</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dependentes.map(dep => (
                      <TableRow key={dep.id}>
                        <TableCell className="font-medium">{dep.nome}</TableCell>
                        <TableCell className="capitalize">{dep.parentesco}</TableCell>
                        <TableCell>
                          {dep.data_nascimento 
                            ? format(parseISO(dep.data_nascimento), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>{dep.cpf || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Férias */}
        <TabsContent value="ferias">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palmtree className="h-5 w-5" />
                Histórico de Férias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ferias.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum período de férias registrado
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período Aquisitivo</TableHead>
                      <TableHead>Férias</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ferias.map(f => (
                      <TableRow key={f.id}>
                        <TableCell>
                          {format(parseISO(f.periodo_aquisitivo_inicio), 'dd/MM/yyyy')} -{' '}
                          {format(parseISO(f.periodo_aquisitivo_fim), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          {f.data_inicio && f.data_fim ? (
                            <>
                              {format(parseISO(f.data_inicio), 'dd/MM/yyyy')} -{' '}
                              {format(parseISO(f.data_fim), 'dd/MM/yyyy')}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Não agendada</span>
                          )}
                        </TableCell>
                        <TableCell>{f.dias}</TableCell>
                        <TableCell>
                          <Badge variant={
                            f.status === 'concluida' ? 'secondary' :
                            f.status === 'em_gozo' ? 'default' :
                            f.status === 'cancelada' ? 'destructive' : 'outline'
                          }>
                            {f.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Histórico Salarial */}
        <TabsContent value="salarios">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5" />
                Histórico de Reajustes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salarios.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum reajuste salarial registrado
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor Anterior</TableHead>
                      <TableHead className="text-right">Novo Valor</TableHead>
                      <TableHead className="text-center">Variação</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salarios.map(s => {
                      const variacao = s.valor_anterior > 0 
                        ? ((s.valor_novo - s.valor_anterior) / s.valor_anterior) * 100 
                        : 0;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            {format(parseISO(s.data_reajuste), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            R$ {s.valor_anterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            R$ {s.valor_novo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={variacao > 0 ? 'default' : variacao < 0 ? 'destructive' : 'secondary'}>
                              {variacao > 0 && '+'}
                              {variacao.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {s.motivo?.replace('_', ' ') || '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
