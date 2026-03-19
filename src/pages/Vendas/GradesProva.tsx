import { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Plus, Search, Printer, Eye, PackageCheck, AlertTriangle, 
  Clock, Calendar, Filter, RotateCcw, Trash2 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { 
  useEmprestimosGradeProva, 
  useEmprestimoGradeProva,
  useDeleteEmprestimo,
  calcularStatusPrazo, 
  calcularEstatisticasEmprestimos,
  FiltrosEmprestimo,
  StatusEmprestimo,
} from '@/hooks/useEmprestimosGradeProva';
import { EmprestimoForm } from '@/components/GradesProva/EmprestimoForm';
import { DevolucaoDialog } from '@/components/GradesProva/DevolucaoDialog';
import { FichaEmprestimoPrint } from '@/components/GradesProva/FichaEmprestimoPrint';

export default function GradesProva() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  
  const [filtros, setFiltros] = useState<FiltrosEmprestimo>({
    periodo: '30dias',
    apenasAtrasados: false,
  });
  const [busca, setBusca] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [devolucaoOpen, setDevolucaoOpen] = useState(false);
  const [emprestimoSelecionado, setEmprestimoSelecionado] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emprestimoParaDeletar, setEmprestimoParaDeletar] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);
  const [printEmprestimoId, setPrintEmprestimoId] = useState<string | null>(null);

  const { data: emprestimos = [], isLoading } = useEmprestimosGradeProva(filtros);
  const { data: emprestimoParaImprimir } = useEmprestimoGradeProva(printEmprestimoId || undefined);
  const { data: emprestimoParaDevolucao } = useEmprestimoGradeProva(emprestimoSelecionado || undefined);
  const deleteEmprestimo = useDeleteEmprestimo();

  const estatisticas = calcularEstatisticasEmprestimos(emprestimos);

  // Buscar clientes e vendedores para filtros
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-filtro-emprestimo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome_razao_social')
        .order('nome_razao_social');
      return data || [];
    },
  });

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-filtro-emprestimo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, nome')
        .order('nome');
      return data || [];
    },
  });

  // Filtrar por busca
  const emprestimosFiltrados = emprestimos.filter(e => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      e.cliente?.nome_razao_social?.toLowerCase().includes(termo) ||
      e.vendedor?.nome?.toLowerCase().includes(termo) ||
      e.numero_emprestimo.toString().includes(termo) ||
      e.itens?.some(i => i.descricao.toLowerCase().includes(termo))
    );
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Emprestimo-${emprestimoParaImprimir?.numero_emprestimo}`,
    onAfterPrint: () => setPrintEmprestimoId(null),
  });

  const handlePrintClick = (id: string) => {
    setPrintEmprestimoId(id);
    setTimeout(() => {
      handlePrint();
    }, 500);
  };

  const handleDevolucaoClick = (id: string) => {
    setEmprestimoSelecionado(id);
    setDevolucaoOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setEmprestimoParaDeletar(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (emprestimoParaDeletar) {
      await deleteEmprestimo.mutateAsync(emprestimoParaDeletar);
      setDeleteDialogOpen(false);
      setEmprestimoParaDeletar(null);
    }
  };

  const handleNovoSuccess = (emprestimoId: string) => {
    // Imprimir automaticamente após criar
    handlePrintClick(emprestimoId);
  };

  const getStatusBadge = (status: StatusEmprestimo) => {
    switch (status) {
      case 'emprestado':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Emprestado</Badge>;
      case 'devolvido':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Devolvido</Badge>;
      case 'devolvido_parcial':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Parcial</Badge>;
      case 'nao_devolvido':
        return <Badge variant="destructive">Não Devolvido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grades para Prova</h1>
          <p className="text-muted-foreground">
            Controle de empréstimo de peças para prova de tamanhos
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Empréstimo
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={estatisticas.atrasados > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${estatisticas.atrasados > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${estatisticas.atrasados > 0 ? 'text-destructive' : ''}`}>
              {estatisticas.atrasados}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vence Hoje</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{estatisticas.venceHoje}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
            <PackageCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estatisticas.emAberto}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Devolvidos</CardTitle>
            <RotateCcw className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{estatisticas.devolvidos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label className="text-sm">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cliente, vendedor, item..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="w-48">
              <Label className="text-sm">Cliente</Label>
              <Select
                value={filtros.cliente || 'todos'}
                onValueChange={(v) => setFiltros({ ...filtros, cliente: v === 'todos' ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os clientes</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <Label className="text-sm">Vendedor</Label>
              <Select
                value={filtros.vendedor || 'todos'}
                onValueChange={(v) => setFiltros({ ...filtros, vendedor: v === 'todos' ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os vendedores</SelectItem>
                  {vendedores.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label className="text-sm">Período</Label>
              <Select
                value={filtros.periodo || '30dias'}
                onValueChange={(v) => setFiltros({ ...filtros, periodo: v as FiltrosEmprestimo['periodo'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                  <SelectItem value="30dias">Últimos 30 dias</SelectItem>
                  <SelectItem value="90dias">Últimos 90 dias</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="atrasados"
                checked={filtros.apenasAtrasados}
                onCheckedChange={(checked) => setFiltros({ ...filtros, apenasAtrasados: checked === true })}
              />
              <Label htmlFor="atrasados" className="text-sm cursor-pointer">
                Apenas atrasados
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : emprestimosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum empréstimo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                emprestimosFiltrados.map((emprestimo) => {
                  const statusPrazo = calcularStatusPrazo(emprestimo.data_prevista_devolucao, emprestimo.status);
                  const totalItens = emprestimo.itens?.reduce((sum, i) => sum + i.quantidade, 0) || 0;

                  return (
                    <TableRow key={emprestimo.id} className={statusPrazo.status === 'atrasado' ? 'bg-destructive/5' : ''}>
                      <TableCell className="font-mono font-medium">
                        #{emprestimo.numero_emprestimo.toString().padStart(5, '0')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {emprestimo.cliente?.nome_razao_social}
                      </TableCell>
                      <TableCell>{emprestimo.vendedor?.nome}</TableCell>
                      <TableCell>
                        <span className="text-sm">{totalItens} peça(s)</span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(emprestimo.data_emprestimo), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm ${statusPrazo.cor}`}>
                          {format(new Date(emprestimo.data_prevista_devolucao), "dd/MM/yyyy", { locale: ptBR })}
                          <div className="text-xs">{statusPrazo.texto}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(emprestimo.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrintClick(emprestimo.id)}
                            title="Imprimir ficha"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          
                          {emprestimo.status === 'emprestado' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDevolucaoClick(emprestimo.id)}
                              title="Registrar devolução"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}

                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(emprestimo.id)}
                              title="Excluir"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EmprestimoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={handleNovoSuccess}
      />

      <DevolucaoDialog
        emprestimo={emprestimoParaDevolucao || null}
        open={devolucaoOpen}
        onOpenChange={setDevolucaoOpen}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empréstimo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O empréstimo e todos os seus itens serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Print Component (hidden) */}
      <div className="hidden">
        {emprestimoParaImprimir && (
          <FichaEmprestimoPrint ref={printRef} emprestimo={emprestimoParaImprimir} />
        )}
      </div>
    </div>
  );
}
