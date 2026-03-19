import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Award, Plus, Check, X, DollarSign, Users } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { 
  useRegrasBonificacao, 
  useCreateRegraBonificacao, 
  useBonificacoesColaborador,
  useRegistrarBonificacao 
} from '@/hooks/rh/useBonificacoes';
import { useColaboradores } from '@/hooks/rh/useColaboradores';
import { useSetores } from '@/hooks/rh/useSetores';

export default function BonificacoesLista() {
  const navigate = useNavigate();
  const [mesReferencia, setMesReferencia] = useState(format(new Date(), 'yyyy-MM'));
  const [novaRegraOpen, setNovaRegraOpen] = useState(false);
  const [registrarOpen, setRegistrarOpen] = useState(false);

  // Form states
  const [nomeRegra, setNomeRegra] = useState('');
  const [descricaoRegra, setDescricaoRegra] = useState('');
  const [valorRegra, setValorRegra] = useState('');
  const [tipoRegra, setTipoRegra] = useState<'fixo' | 'percentual'>('fixo');
  const [aplicavelA, setAplicavelA] = useState<'todos' | 'setor' | 'cargo'>('todos');
  const [setorSelecionado, setSetorSelecionado] = useState<string>('');
  const [cargoSelecionado, setCargoSelecionado] = useState('');

  const [colaboradorId, setColaboradorId] = useState('');
  const [regraId, setRegraId] = useState('');
  const [valorBonificacao, setValorBonificacao] = useState('');
  const [recebeu, setRecebeu] = useState(true);
  const [justificativa, setJustificativa] = useState('');

  const { data: regras, isLoading: loadingRegras } = useRegrasBonificacao();
  const { data: bonificacoes, isLoading: loadingBonificacoes } = useBonificacoesColaborador(mesReferencia + '-01');
  const { colaboradores } = useColaboradores();
  const { setores } = useSetores();
  const createRegra = useCreateRegraBonificacao();
  const registrarBonificacao = useRegistrarBonificacao();

  const handleNovaRegra = () => {
    createRegra.mutate({
      nome: nomeRegra,
      descricao: descricaoRegra || null,
      valor: parseFloat(valorRegra),
      tipo: tipoRegra,
      aplicavel_a: aplicavelA,
      setor_id: aplicavelA === 'setor' ? setorSelecionado : null,
      cargo: aplicavelA === 'cargo' ? cargoSelecionado : null,
      ativo: true,
    }, {
      onSuccess: () => {
        setNovaRegraOpen(false);
        setNomeRegra('');
        setDescricaoRegra('');
        setValorRegra('');
      }
    });
  };

  const handleRegistrar = () => {
    registrarBonificacao.mutate({
      colaborador_id: colaboradorId,
      regra_id: regraId || undefined,
      mes_referencia: mesReferencia + '-01',
      valor: parseFloat(valorBonificacao),
      recebeu,
      justificativa: justificativa || undefined,
    }, {
      onSuccess: () => {
        setRegistrarOpen(false);
        setColaboradorId('');
        setRegraId('');
        setValorBonificacao('');
        setJustificativa('');
      }
    });
  };

  const totalRecebido = bonificacoes?.filter(b => b.recebeu).reduce((acc, b) => acc + b.valor, 0) || 0;
  const totalPerdido = bonificacoes?.filter(b => !b.recebeu).reduce((acc, b) => acc + b.valor, 0) || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="h-8 w-8 text-primary" />
            Bonificações
          </h1>
          <p className="text-muted-foreground">Regras e controle de bonificações mensais</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/rh')}>
          Voltar ao Dashboard
        </Button>
      </div>

      <Tabs defaultValue="registros" className="space-y-4">
        <TabsList>
          <TabsTrigger value="registros">Registros Mensais</TabsTrigger>
          <TabsTrigger value="regras">Regras de Bonificação</TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Recebido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Perdido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  R$ {totalPerdido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Registros no Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bonificacoes?.length || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filtro e ações */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Label>Mês:</Label>
              <Input
                type="month"
                value={mesReferencia}
                onChange={(e) => setMesReferencia(e.target.value)}
                className="w-48"
              />
            </div>
            <Dialog open={registrarOpen} onOpenChange={setRegistrarOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Registrar Bonificação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Bonificação</DialogTitle>
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
                    <Label>Regra (opcional)</Label>
                    <Select value={regraId} onValueChange={(v) => {
                      setRegraId(v);
                      const regra = regras?.find(r => r.id === v);
                      if (regra) setValorBonificacao(regra.valor.toString());
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma regra" />
                      </SelectTrigger>
                      <SelectContent>
                        {regras?.filter(r => r.ativo).map((r) => (
                          <SelectItem key={r.id} value={r.id}>{r.nome} - R$ {r.valor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Valor (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={valorBonificacao}
                      onChange={(e) => setValorBonificacao(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Recebeu?</Label>
                    <Switch checked={recebeu} onCheckedChange={setRecebeu} />
                  </div>
                  {!recebeu && (
                    <div>
                      <Label>Justificativa</Label>
                      <Textarea
                        value={justificativa}
                        onChange={(e) => setJustificativa(e.target.value)}
                        placeholder="Motivo da não concessão..."
                      />
                    </div>
                  )}
                  <Button onClick={handleRegistrar} disabled={!colaboradorId || !valorBonificacao} className="w-full">
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
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Regra</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Justificativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingBonificacoes ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">Carregando...</TableCell>
                    </TableRow>
                  ) : bonificacoes?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhuma bonificação registrada neste mês
                      </TableCell>
                    </TableRow>
                  ) : bonificacoes?.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.colaborador?.nome}</TableCell>
                      <TableCell>{b.regra?.nome || '-'}</TableCell>
                      <TableCell className="text-right">
                        R$ {b.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        {b.recebeu ? (
                          <Badge className="bg-green-100 text-green-700">
                            <Check className="h-3 w-3 mr-1" /> Recebeu
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <X className="h-3 w-3 mr-1" /> Perdeu
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{b.justificativa || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="regras" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={novaRegraOpen} onOpenChange={setNovaRegraOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Regra de Bonificação</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome da Regra</Label>
                    <Input value={nomeRegra} onChange={(e) => setNomeRegra(e.target.value)} />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea value={descricaoRegra} onChange={(e) => setDescricaoRegra(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valor</Label>
                      <Input type="number" step="0.01" value={valorRegra} onChange={(e) => setValorRegra(e.target.value)} />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={tipoRegra} onValueChange={(v: any) => setTipoRegra(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixo">Valor Fixo</SelectItem>
                          <SelectItem value="percentual">Percentual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Aplicável a</Label>
                    <Select value={aplicavelA} onValueChange={(v: any) => setAplicavelA(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="setor">Por Setor</SelectItem>
                        <SelectItem value="cargo">Por Cargo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {aplicavelA === 'setor' && (
                    <div>
                      <Label>Setor</Label>
                      <Select value={setorSelecionado} onValueChange={setSetorSelecionado}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                        <SelectContent>
                          {setores?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {aplicavelA === 'cargo' && (
                    <div>
                      <Label>Cargo</Label>
                      <Input value={cargoSelecionado} onChange={(e) => setCargoSelecionado(e.target.value)} />
                    </div>
                  )}
                  <Button onClick={handleNovaRegra} disabled={!nomeRegra || !valorRegra} className="w-full">
                    Criar Regra
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingRegras ? (
              <p>Carregando...</p>
            ) : regras?.map((regra) => (
              <Card key={regra.id} className={!regra.ativo ? 'opacity-50' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{regra.nome}</CardTitle>
                    <Badge variant={regra.ativo ? 'default' : 'secondary'}>
                      {regra.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <CardDescription>{regra.descricao}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="font-semibold">
                        {regra.tipo === 'percentual' ? `${regra.valor}%` : `R$ ${regra.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aplicável a:</span>
                      <span className="capitalize">{regra.aplicavel_a}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
