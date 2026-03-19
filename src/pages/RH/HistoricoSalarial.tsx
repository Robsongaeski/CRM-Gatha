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
import { Plus, TrendingUp, TrendingDown, Minus, DollarSign, ArrowLeft, History } from 'lucide-react';
import { useSalarios } from '@/hooks/rh/useSalarios';
import { useColaboradores } from '@/hooks/rh/useColaboradores';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function HistoricoSalarial() {
  const navigate = useNavigate();
  const [selectedColaborador, setSelectedColaborador] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const { colaboradores } = useColaboradores({ ativo: true });
  const { salarios, isLoading, createSalario, isCreating } = useSalarios(selectedColaborador || undefined);

  const [form, setForm] = useState({
    colaborador_id: '',
    data_reajuste: new Date().toISOString().split('T')[0],
    valor_anterior: 0,
    valor_novo: 0,
    motivo: '',
    observacao: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSalario(form, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({
          colaborador_id: '',
          data_reajuste: new Date().toISOString().split('T')[0],
          valor_anterior: 0,
          valor_novo: 0,
          motivo: '',
          observacao: '',
        });
      }
    });
  };

  const handleColaboradorSelect = (id: string) => {
    const colab = colaboradores.find(c => c.id === id);
    if (colab) {
      setForm(prev => ({
        ...prev,
        colaborador_id: id,
        valor_anterior: colab.salario_atual || 0,
      }));
    }
  };

  const calcularVariacao = (anterior: number, novo: number) => {
    if (anterior === 0) return 0;
    return ((novo - anterior) / anterior) * 100;
  };

  // Dados para o gráfico
  const dadosGrafico = salarios
    .slice()
    .reverse()
    .map(s => ({
      data: format(parseISO(s.data_reajuste), 'MMM/yy', { locale: ptBR }),
      valor: s.valor_novo,
    }));

  const colaboradorSelecionado = colaboradores.find(c => c.id === selectedColaborador);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rh')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Histórico Salarial</h1>
            <p className="text-muted-foreground">Evolução salarial dos colaboradores</p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Reajuste
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Reajuste Salarial</DialogTitle>
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

              <div>
                <Label>Data do Reajuste</Label>
                <Input
                  type="date"
                  value={form.data_reajuste}
                  onChange={e => setForm({ ...form, data_reajuste: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor Anterior</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valor_anterior}
                    onChange={e => setForm({ ...form, valor_anterior: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label>Novo Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valor_novo}
                    onChange={e => setForm({ ...form, valor_novo: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              {form.valor_anterior > 0 && form.valor_novo > 0 && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  {form.valor_novo > form.valor_anterior ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : form.valor_novo < form.valor_anterior ? (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  ) : (
                    <Minus className="h-5 w-5 text-muted-foreground" />
                  )}
                  <span className="font-medium">
                    {calcularVariacao(form.valor_anterior, form.valor_novo).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">de variação</span>
                </div>
              )}

              <div>
                <Label>Motivo</Label>
                <Select value={form.motivo} onValueChange={v => setForm({ ...form, motivo: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dissidio">Dissídio Coletivo</SelectItem>
                    <SelectItem value="promocao">Promoção</SelectItem>
                    <SelectItem value="merito">Mérito</SelectItem>
                    <SelectItem value="equiparacao">Equiparação Salarial</SelectItem>
                    <SelectItem value="reajuste_anual">Reajuste Anual</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
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
                {isCreating ? 'Salvando...' : 'Registrar Reajuste'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro por colaborador */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Filtrar por Colaborador</Label>
              <Select value={selectedColaborador || "all"} onValueChange={(v) => setSelectedColaborador(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os colaboradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {colaboradores.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} - {c.cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedColaborador && (
              <Button variant="outline" onClick={() => setSelectedColaborador('')}>
                Limpar Filtro
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução */}
      {selectedColaborador && dadosGrafico.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Salarial - {colaboradorSelecionado?.nome}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Salário']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="valor" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Reajustes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : salarios.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhum reajuste registrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Valor Anterior</TableHead>
                  <TableHead className="text-right">Novo Valor</TableHead>
                  <TableHead className="text-center">Variação</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salarios.map(salario => {
                  const variacao = calcularVariacao(salario.valor_anterior, salario.valor_novo);
                  return (
                    <TableRow key={salario.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{salario.colaborador?.nome}</p>
                          <p className="text-sm text-muted-foreground">{salario.colaborador?.cargo}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(parseISO(salario.data_reajuste), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        R$ {salario.valor_anterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        R$ {salario.valor_novo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={variacao > 0 ? 'default' : variacao < 0 ? 'destructive' : 'secondary'}>
                          {variacao > 0 && '+'}
                          {variacao.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{salario.motivo?.replace('_', ' ') || '-'}</span>
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
