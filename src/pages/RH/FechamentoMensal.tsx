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
import { Plus, FileSpreadsheet, Lock, ArrowLeft, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useFechamentos, useResumoFechamento } from '@/hooks/rh/useFechamento';
import { useColaboradores } from '@/hooks/rh/useColaboradores';
import { format, parseISO, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

export default function FechamentoMensal() {
  const navigate = useNavigate();
  const mesAtual = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const [selectedMes, setSelectedMes] = useState(mesAtual);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const { colaboradores } = useColaboradores({ ativo: true });
  const { fechamentos, isLoading, createFechamento, updateFechamento, fecharFechamento, isCreating, isUpdating, isFechando } = useFechamentos({ mes_referencia: selectedMes });
  const { data: resumo } = useResumoFechamento(selectedMes);

  const [form, setForm] = useState({
    colaborador_id: '',
    mes_referencia: selectedMes,
    faltas: 0,
    horas_extras: 0,
    valor_horas_extras: 0,
    bonificacoes: 0,
    descontos: 0,
    observacoes: '',
  });

  // Gerar opções de meses (últimos 12 meses)
  const mesesOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(startOfMonth(date), 'yyyy-MM-dd'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      updateFechamento({ id: editingId, ...form }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingId(null);
          resetForm();
        }
      });
    } else {
      createFechamento(form, {
        onSuccess: () => {
          setDialogOpen(false);
          resetForm();
        }
      });
    }
  };

  const resetForm = () => {
    setForm({
      colaborador_id: '',
      mes_referencia: selectedMes,
      faltas: 0,
      horas_extras: 0,
      valor_horas_extras: 0,
      bonificacoes: 0,
      descontos: 0,
      observacoes: '',
    });
  };

  const handleEdit = (f: any) => {
    setForm({
      colaborador_id: f.colaborador_id,
      mes_referencia: f.mes_referencia,
      faltas: f.faltas || 0,
      horas_extras: f.horas_extras || 0,
      valor_horas_extras: f.valor_horas_extras || 0,
      bonificacoes: f.bonificacoes || 0,
      descontos: f.descontos || 0,
      observacoes: f.observacoes || '',
    });
    setEditingId(f.id);
    setDialogOpen(true);
  };

  const handleFechar = (id: string) => {
    if (confirm('Tem certeza que deseja fechar este registro? Após fechado, não poderá ser editado.')) {
      fecharFechamento(id);
    }
  };

  // Colaboradores sem fechamento no mês
  const colaboradoresSemFechamento = colaboradores.filter(
    c => !fechamentos.some(f => f.colaborador_id === c.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rh')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Fechamento Mensal</h1>
            <p className="text-muted-foreground">Gestão de faltas, horas extras e bonificações</p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingId(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Lançamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Novo'} Fechamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Colaborador</Label>
                <Select 
                  value={form.colaborador_id} 
                  onValueChange={v => setForm({ ...form, colaborador_id: v })}
                  disabled={!!editingId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(editingId ? colaboradores : colaboradoresSemFechamento).map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} - {c.cargo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Faltas (dias)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.faltas}
                    onChange={e => setForm({ ...form, faltas: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Horas Extras</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.5"
                    value={form.horas_extras}
                    onChange={e => setForm({ ...form, horas_extras: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Valor Horas Extras (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.valor_horas_extras}
                  onChange={e => setForm({ ...form, valor_horas_extras: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bonificações (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.bonificacoes}
                    onChange={e => setForm({ ...form, bonificacoes: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>Descontos (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.descontos}
                    onChange={e => setForm({ ...form, descontos: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={e => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Observações sobre o fechamento..."
                />
              </div>

              <Button type="submit" className="w-full" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Fechamento'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Seletor de Mês + Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Label>Mês de Referência</Label>
            <Select value={selectedMes} onValueChange={v => {
              setSelectedMes(v);
              setForm(prev => ({ ...prev, mes_referencia: v }));
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {mesesOptions.map(m => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{resumo?.fechados || 0}</p>
                <p className="text-sm text-muted-foreground">Fechados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{resumo?.rascunhos || 0}</p>
                <p className="text-sm text-muted-foreground">Rascunhos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{colaboradoresSemFechamento.length}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Fechamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Fechamentos - {format(parseISO(selectedMes), 'MMMM yyyy', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : fechamentos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum fechamento para este mês</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                Criar Primeiro Lançamento
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead className="text-center">Faltas</TableHead>
                  <TableHead className="text-center">Horas Extras</TableHead>
                  <TableHead className="text-right">Bonificações</TableHead>
                  <TableHead className="text-right">Descontos</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fechamentos.map(f => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{f.colaborador?.nome}</p>
                        <p className="text-sm text-muted-foreground">{f.colaborador?.cargo}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={f.faltas && f.faltas > 0 ? 'destructive' : 'secondary'}>
                        {f.faltas || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {f.horas_extras || 0}h
                      {f.valor_horas_extras && f.valor_horas_extras > 0 && (
                        <span className="text-xs text-muted-foreground block">
                          R$ {f.valor_horas_extras.toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {f.bonificacoes && f.bonificacoes > 0 ? `+ R$ ${f.bonificacoes.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {f.descontos && f.descontos > 0 ? `- R$ ${f.descontos.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={f.status === 'fechado' ? 'default' : 'secondary'}>
                        {f.status === 'fechado' ? (
                          <><Lock className="h-3 w-3 mr-1" /> Fechado</>
                        ) : 'Rascunho'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {f.status === 'rascunho' ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(f)}>
                            Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleFechar(f.id)}
                            disabled={isFechando}
                          >
                            Fechar
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {f.data_fechamento && format(parseISO(f.data_fechamento), 'dd/MM/yy')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Lista de Colaboradores Pendentes */}
      {colaboradoresSemFechamento.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Colaboradores sem Fechamento ({colaboradoresSemFechamento.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {colaboradoresSemFechamento.map(c => (
                <Badge key={c.id} variant="outline" className="cursor-pointer" onClick={() => {
                  setForm(prev => ({ ...prev, colaborador_id: c.id }));
                  setDialogOpen(true);
                }}>
                  {c.nome}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
