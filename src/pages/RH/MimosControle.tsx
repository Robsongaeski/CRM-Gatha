import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Gift, Plus, Check, Calendar, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  useOcasioesMimo, 
  useMimosColaborador, 
  useRegistrarMimo,
  useCreateOcasiaoMimo,
  useResumoMimosAno 
} from '@/hooks/rh/useMimos';
import { useColaboradores } from '@/hooks/rh/useColaboradores';

export default function MimosControle() {
  const navigate = useNavigate();
  const [anoReferencia, setAnoReferencia] = useState(new Date().getFullYear());
  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [novaOcasiaoOpen, setNovaOcasiaoOpen] = useState(false);

  // Form states
  const [colaboradorId, setColaboradorId] = useState('');
  const [ocasiaoId, setOcasiaoId] = useState('');
  const [dataEntrega, setDataEntrega] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [descricao, setDescricao] = useState('');
  const [valorEstimado, setValorEstimado] = useState('');
  const [observacao, setObservacao] = useState('');

  const [novaOcasiao, setNovaOcasiao] = useState('');
  const [tipoOcasiao, setTipoOcasiao] = useState<'fixa' | 'personalizada'>('fixa');

  const { data: ocasioes } = useOcasioesMimo();
  const { data: mimos, isLoading } = useMimosColaborador(anoReferencia);
  const { data: resumo } = useResumoMimosAno(anoReferencia);
  const { colaboradores } = useColaboradores();
  const registrarMimo = useRegistrarMimo();
  const createOcasiao = useCreateOcasiaoMimo();

  const handleRegistrar = () => {
    registrarMimo.mutate({
      colaborador_id: colaboradorId,
      ocasiao_id: ocasiaoId || undefined,
      data_entrega: dataEntrega,
      descricao: descricao || undefined,
      valor_estimado: valorEstimado ? parseFloat(valorEstimado) : undefined,
      ano_referencia: anoReferencia,
      observacao: observacao || undefined,
    }, {
      onSuccess: () => {
        setRegistrarOpen(false);
        setColaboradorId('');
        setOcasiaoId('');
        setDescricao('');
        setValorEstimado('');
        setObservacao('');
      }
    });
  };

  const handleNovaOcasiao = () => {
    createOcasiao.mutate({
      nome: novaOcasiao,
      tipo: tipoOcasiao,
    }, {
      onSuccess: () => {
        setNovaOcasiaoOpen(false);
        setNovaOcasiao('');
      }
    });
  };

  const totalGasto = mimos?.reduce((acc, m) => acc + (m.valor_estimado || 0), 0) || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Gift className="h-8 w-8 text-primary" />
            Mimos e Presentes
          </h1>
          <p className="text-muted-foreground">Controle de entregas de mimos aos colaboradores</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/rh')}>
          Voltar ao Dashboard
        </Button>
      </div>

      <Tabs defaultValue="entregas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entregas">Entregas</TabsTrigger>
          <TabsTrigger value="resumo">Resumo por Colaborador</TabsTrigger>
          <TabsTrigger value="ocasioes">Ocasiões</TabsTrigger>
        </TabsList>

        <TabsContent value="entregas" className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Entregas no Ano</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mimos?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Ocasiões Ativas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ocasioes?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtro e ações */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Label>Ano:</Label>
              <Select value={anoReferencia.toString()} onValueChange={(v) => setAnoReferencia(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((ano) => (
                    <SelectItem key={ano} value={ano.toString()}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Dialog open={registrarOpen} onOpenChange={setRegistrarOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Entrega
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Entrega de Mimo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Colaborador</Label>
                    <Select value={colaboradorId} onValueChange={setColaboradorId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o colaborador" />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradores?.filter(c => c.ativo).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ocasião</Label>
                    <Select value={ocasiaoId} onValueChange={setOcasiaoId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a ocasião" />
                      </SelectTrigger>
                      <SelectContent>
                        {ocasioes?.map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Data de Entrega</Label>
                    <Input
                      type="date"
                      value={dataEntrega}
                      onChange={(e) => setDataEntrega(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Descrição do Mimo</Label>
                    <Input
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Ex: Cesta de chocolates"
                    />
                  </div>
                  <div>
                    <Label>Valor Estimado (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={valorEstimado}
                      onChange={(e) => setValorEstimado(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Observação</Label>
                    <Textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleRegistrar} disabled={!colaboradorId} className="w-full">
                    Registrar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabela */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Ocasião</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">Carregando...</TableCell>
                    </TableRow>
                  ) : mimos?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum mimo registrado neste ano
                      </TableCell>
                    </TableRow>
                  ) : mimos?.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{format(new Date(m.data_entrega), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium">{m.colaborador?.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{m.ocasiao?.nome || 'Outro'}</Badge>
                      </TableCell>
                      <TableCell>{m.descricao || '-'}</TableCell>
                      <TableCell className="text-right">
                        {m.valor_estimado ? `R$ ${m.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumo" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Controle de Entregas por Colaborador
              </CardTitle>
              <CardDescription>Veja quem recebeu e quem ainda falta receber</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-center">Mimos Recebidos</TableHead>
                    <TableHead>Falta Receber</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumo?.colaboradores.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{c.mimosRecebidos}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.ocasioesFaltantes.length === 0 ? (
                            <Badge className="bg-green-100 text-green-700">
                              <Check className="h-3 w-3 mr-1" /> Completo
                            </Badge>
                          ) : c.ocasioesFaltantes.map((o) => (
                            <Badge key={o.id} variant="outline" className="text-orange-600 border-orange-300">
                              {o.nome}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ocasioes" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={novaOcasiaoOpen} onOpenChange={setNovaOcasiaoOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Ocasião
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Ocasião de Mimo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome da Ocasião</Label>
                    <Input
                      value={novaOcasiao}
                      onChange={(e) => setNovaOcasiao(e.target.value)}
                      placeholder="Ex: Aniversário, Natal, Dia das Mães..."
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={tipoOcasiao} onValueChange={(v: any) => setTipoOcasiao(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixa">Fixa (todo ano)</SelectItem>
                        <SelectItem value="personalizada">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleNovaOcasiao} disabled={!novaOcasiao} className="w-full">
                    Criar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ocasioes?.map((o) => (
              <Card key={o.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      {o.nome}
                    </CardTitle>
                    <Badge variant={o.tipo === 'fixa' ? 'default' : 'secondary'}>
                      {o.tipo === 'fixa' ? 'Fixa' : 'Personalizada'}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
