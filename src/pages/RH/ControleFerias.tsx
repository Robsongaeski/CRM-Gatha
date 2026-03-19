import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, CalendarClock, AlertTriangle, CheckCircle, Clock, ArrowLeft, Umbrella } from 'lucide-react';
import { useFerias, useFeriasVencendo } from '@/hooks/rh/useFerias';
import { useColaboradores } from '@/hooks/rh/useColaboradores';
import { format, parseISO, differenceInDays, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const statusConfig: Record<string, { label: string; color: string }> = {
  agendada: { label: 'Agendada', color: 'bg-primary/10 text-primary' },
  em_gozo: { label: 'Em Gozo', color: 'bg-green-500/10 text-green-700' },
  concluida: { label: 'Concluída', color: 'bg-muted text-muted-foreground' },
  cancelada: { label: 'Cancelada', color: 'bg-destructive/10 text-destructive' },
};

export default function ControleFerias() {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<'agendada' | 'cancelada' | 'concluida' | 'em_gozo' | ''>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { colaboradores } = useColaboradores({ ativo: true });
  const { ferias, isLoading, createFerias, isCreating } = useFerias(
    selectedStatus ? { status: selectedStatus } : undefined
  );
  const { data: feriasVencendo = [] } = useFeriasVencendo(90);

  const [form, setForm] = useState({
    colaborador_id: '',
    periodo_aquisitivo_inicio: '',
    periodo_aquisitivo_fim: '',
    data_inicio: '',
    data_fim: '',
    dias: 30,
    tipo: 'normal' as 'normal' | 'fracionada',
    abono_pecuniario: false,
    status: 'agendada' as 'agendada' | 'em_gozo' | 'concluida' | 'cancelada',
    observacao: '',
  });

  const handleColaboradorSelect = (id: string) => {
    const colab = colaboradores.find(c => c.id === id);
    if (colab) {
      const admissao = parseISO(colab.data_admissao);
      const anosEmpresa = Math.floor(differenceInDays(new Date(), admissao) / 365);
      const inicioPA = addYears(admissao, anosEmpresa);
      const fimPA = addYears(admissao, anosEmpresa + 1);
      
      setForm(prev => ({
        ...prev,
        colaborador_id: id,
        periodo_aquisitivo_inicio: format(inicioPA, 'yyyy-MM-dd'),
        periodo_aquisitivo_fim: format(fimPA, 'yyyy-MM-dd'),
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFerias(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({
          colaborador_id: '',
          periodo_aquisitivo_inicio: '',
          periodo_aquisitivo_fim: '',
          data_inicio: '',
          data_fim: '',
          dias: 30,
          tipo: 'normal',
          abono_pecuniario: false,
          status: 'agendada',
          observacao: '',
        });
      }
    });
  };

  const feriasVencidas = feriasVencendo.filter((f: any) => f.status === 'vencido');
  const feriasAVencer = feriasVencendo.filter((f: any) => f.status === 'a_vencer');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rh')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Controle de Férias</h1>
            <p className="text-muted-foreground">Gestão de períodos aquisitivos e férias</p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Férias
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Período de Férias</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Colaborador</Label>
                <Select value={form.colaborador_id} onValueChange={handleColaboradorSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} - {c.cargo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início Período Aquisitivo</Label>
                  <Input
                    type="date"
                    value={form.periodo_aquisitivo_inicio}
                    onChange={e => setForm({ ...form, periodo_aquisitivo_inicio: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Fim Período Aquisitivo</Label>
                  <Input
                    type="date"
                    value={form.periodo_aquisitivo_fim}
                    onChange={e => setForm({ ...form, periodo_aquisitivo_fim: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início das Férias</Label>
                  <Input
                    type="date"
                    value={form.data_inicio}
                    onChange={e => setForm({ ...form, data_inicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fim das Férias</Label>
                  <Input
                    type="date"
                    value={form.data_fim}
                    onChange={e => setForm({ ...form, data_fim: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dias</Label>
                  <Input
                    type="number"
                    min={5}
                    max={30}
                    value={form.dias}
                    onChange={e => setForm({ ...form, dias: parseInt(e.target.value) || 30 })}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v: 'normal' | 'fracionada') => setForm({ ...form, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal (30 dias)</SelectItem>
                      <SelectItem value="fracionada">Fracionada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="abono"
                  checked={form.abono_pecuniario}
                  onCheckedChange={(checked) => setForm({ ...form, abono_pecuniario: checked as boolean })}
                />
                <Label htmlFor="abono" className="cursor-pointer">
                  Vender 10 dias (Abono Pecuniário)
                </Label>
              </div>

              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: 'agendada' | 'em_gozo' | 'concluida' | 'cancelada') => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="em_gozo">Em Gozo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observação</Label>
                <Textarea
                  value={form.observacao}
                  onChange={e => setForm({ ...form, observacao: e.target.value })}
                  placeholder="Observações adicionais..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? 'Salvando...' : 'Registrar Férias'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alertas de Férias Vencendo */}
      {(feriasVencidas.length > 0 || feriasAVencer.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {feriasVencidas.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-destructive flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5" />
                  Férias Vencidas ({feriasVencidas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-destructive">
                  {feriasVencidas.slice(0, 5).map((f: any) => (
                    <li key={f.id} className="flex justify-between">
                      <span>{f.nome}</span>
                      <span className="font-medium">{Math.abs(f.diasParaVencer)} dias</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {feriasAVencer.length > 0 && (
            <Card className="border-yellow-500/30 bg-yellow-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-yellow-700 dark:text-yellow-400 flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5" />
                  A Vencer em 90 dias ({feriasAVencer.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-400">
                  {feriasAVencer.slice(0, 5).map((f: any) => (
                    <li key={f.id} className="flex justify-between">
                      <span>{f.nome}</span>
                      <span className="font-medium">{f.diasParaVencer} dias</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filtro */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="w-48">
              <Label>Filtrar por Status</Label>
              <Select value={selectedStatus || "all"} onValueChange={(v) => setSelectedStatus(v === "all" ? "" : v as 'agendada' | 'cancelada' | 'concluida' | 'em_gozo')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="agendada">Agendada</SelectItem>
                  <SelectItem value="em_gozo">Em Gozo</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {selectedStatus !== '' && (
              <Button variant="outline" onClick={() => setSelectedStatus('')}>
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Umbrella className="h-5 w-5" />
            Períodos de Férias
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : ferias.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum período de férias registrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Período Aquisitivo</TableHead>
                  <TableHead>Férias</TableHead>
                  <TableHead className="text-center">Dias</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ferias.map(f => {
                  const config = statusConfig[f.status];
                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{f.colaborador?.nome}</p>
                          <p className="text-sm text-muted-foreground">{f.colaborador?.cargo}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(parseISO(f.periodo_aquisitivo_inicio), 'dd/MM/yyyy')} a{' '}
                          {format(parseISO(f.periodo_aquisitivo_fim), 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {f.data_inicio && f.data_fim ? (
                          <div className="text-sm">
                            {format(parseISO(f.data_inicio), 'dd/MM/yyyy')} a{' '}
                            {format(parseISO(f.data_fim), 'dd/MM/yyyy')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Não agendada</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {f.dias}
                        {f.abono_pecuniario && (
                          <span className="text-xs text-muted-foreground block">+ abono</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="capitalize">
                          {f.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={config.color}>
                          {config.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
