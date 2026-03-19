import { useState } from 'react';
import { useColaboradores } from '@/hooks/rh/useColaboradores';
import { useSetores } from '@/hooks/rh/useSetores';
import { useDashboardRH } from '@/hooks/rh/useDashboardRH';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileSpreadsheet, Download, Users, TrendingUp, 
  Calendar, DollarSign, Building2, Clock
} from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TipoRelatorio = 'colaboradores' | 'salarios' | 'ferias' | 'setores' | 'turnover';

export default function RelatoriosRH() {
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('colaboradores');
  const [filtroSetor, setFiltroSetor] = useState<string>('todos');
  
  const { colaboradores, isLoading } = useColaboradores();
  const { setores } = useSetores();
  const { data: dashboardData } = useDashboardRH();

  const colaboradoresAtivos = colaboradores.filter(c => c.ativo);
  const colaboradoresFiltrados = filtroSetor === 'todos' 
    ? colaboradoresAtivos 
    : colaboradoresAtivos.filter(c => c.setor_id === filtroSetor);

  const exportarCSV = (dados: any[], nomeArquivo: string, colunas: { key: string; label: string }[]) => {
    const headers = colunas.map(c => c.label).join(',');
    const rows = dados.map(row => 
      colunas.map(col => {
        const valor = row[col.key];
        if (valor === null || valor === undefined) return '';
        if (typeof valor === 'string' && valor.includes(',')) return `"${valor}"`;
        return valor;
      }).join(',')
    );
    
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nomeArquivo}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportar = () => {
    switch (tipoRelatorio) {
      case 'colaboradores':
        exportarCSV(
          colaboradoresFiltrados.map(c => ({
            nome: c.nome,
            cargo: c.cargo,
            setor: c.setor?.nome || '-',
            tipo_contrato: c.tipo_contrato,
            data_admissao: format(parseISO(c.data_admissao), 'dd/MM/yyyy'),
            tempo_empresa: `${differenceInYears(new Date(), parseISO(c.data_admissao))} anos`,
            email: c.email || '-',
            telefone: c.telefone || '-',
          })),
          'relatorio_colaboradores',
          [
            { key: 'nome', label: 'Nome' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'setor', label: 'Setor' },
            { key: 'tipo_contrato', label: 'Tipo Contrato' },
            { key: 'data_admissao', label: 'Data Admissão' },
            { key: 'tempo_empresa', label: 'Tempo de Empresa' },
            { key: 'email', label: 'E-mail' },
            { key: 'telefone', label: 'Telefone' },
          ]
        );
        break;
        
      case 'salarios':
        exportarCSV(
          colaboradoresFiltrados
            .filter(c => c.salario_atual)
            .map(c => ({
              nome: c.nome,
              cargo: c.cargo,
              setor: c.setor?.nome || '-',
              tipo_contrato: c.tipo_contrato,
              salario: c.salario_atual?.toFixed(2) || '0.00',
            })),
          'relatorio_salarios',
          [
            { key: 'nome', label: 'Nome' },
            { key: 'cargo', label: 'Cargo' },
            { key: 'setor', label: 'Setor' },
            { key: 'tipo_contrato', label: 'Tipo Contrato' },
            { key: 'salario', label: 'Salário Atual (R$)' },
          ]
        );
        break;
        
      case 'ferias':
        if (dashboardData?.feriasAlertas) {
          exportarCSV(
            dashboardData.feriasAlertas.map(f => ({
              nome: f.colaboradorNome,
              cargo: f.cargo,
              status: f.status === 'vencido' ? 'VENCIDO' : 'A VENCER',
              dias: f.diasParaVencer,
              data_vencimento: format(parseISO(f.dataVencimento), 'dd/MM/yyyy'),
            })),
            'relatorio_ferias_alertas',
            [
              { key: 'nome', label: 'Nome' },
              { key: 'cargo', label: 'Cargo' },
              { key: 'status', label: 'Status' },
              { key: 'dias', label: 'Dias para Vencer' },
              { key: 'data_vencimento', label: 'Data Vencimento' },
            ]
          );
        }
        break;
        
      case 'setores':
        if (dashboardData?.colaboradoresPorSetor) {
          exportarCSV(
            dashboardData.colaboradoresPorSetor.map(s => ({
              setor: s.setor,
              quantidade: s.quantidade,
              percentual: s.percentual.toFixed(1) + '%',
            })),
            'relatorio_por_setor',
            [
              { key: 'setor', label: 'Setor' },
              { key: 'quantidade', label: 'Quantidade' },
              { key: 'percentual', label: 'Percentual' },
            ]
          );
        }
        break;
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-8 w-8 text-primary" />
            Relatórios RH
          </h1>
          <p className="text-muted-foreground">Relatórios gerenciais e exportação de dados</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Relatório</label>
              <Select value={tipoRelatorio} onValueChange={(v) => setTipoRelatorio(v as TipoRelatorio)}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colaboradores">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Colaboradores
                    </div>
                  </SelectItem>
                  <SelectItem value="salarios">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Salários
                    </div>
                  </SelectItem>
                  <SelectItem value="ferias">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Férias (Alertas)
                    </div>
                  </SelectItem>
                  <SelectItem value="setores">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Por Setor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(tipoRelatorio === 'colaboradores' || tipoRelatorio === 'salarios') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Filtrar por Setor</label>
                <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Todos os setores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os setores</SelectItem>
                    {setores.map(setor => (
                      <SelectItem key={setor.id} value={setor.id}>
                        {setor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button onClick={handleExportar} className="ml-auto">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Prévia do Relatório */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Prévia do Relatório</span>
            <Badge variant="secondary">
              {tipoRelatorio === 'colaboradores' && `${colaboradoresFiltrados.length} registros`}
              {tipoRelatorio === 'salarios' && `${colaboradoresFiltrados.filter(c => c.salario_atual).length} registros`}
              {tipoRelatorio === 'ferias' && `${dashboardData?.feriasAlertas?.length || 0} alertas`}
              {tipoRelatorio === 'setores' && `${dashboardData?.colaboradoresPorSetor?.length || 0} setores`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tipoRelatorio === 'colaboradores' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Admissão</TableHead>
                    <TableHead>Tempo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colaboradoresFiltrados.slice(0, 10).map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{c.cargo}</TableCell>
                      <TableCell>{c.setor?.nome || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{c.tipo_contrato.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell>{format(parseISO(c.data_admissao), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{differenceInYears(new Date(), parseISO(c.data_admissao))} anos</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {colaboradoresFiltrados.length > 10 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Mostrando 10 de {colaboradoresFiltrados.length} registros. Exporte para ver todos.
                </p>
              )}
            </div>
          )}

          {tipoRelatorio === 'salarios' && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colaboradoresFiltrados
                    .filter(c => c.salario_atual)
                    .slice(0, 10)
                    .map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nome}</TableCell>
                        <TableCell>{c.cargo}</TableCell>
                        <TableCell>{c.setor?.nome || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{c.tipo_contrato.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          R$ {c.salario_atual?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}

          {tipoRelatorio === 'ferias' && dashboardData?.feriasAlertas && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.feriasAlertas.slice(0, 10).map(f => (
                    <TableRow key={f.colaboradorId}>
                      <TableCell className="font-medium">{f.colaboradorNome}</TableCell>
                      <TableCell>{f.cargo}</TableCell>
                      <TableCell>
                        <Badge variant={f.status === 'vencido' ? 'destructive' : 'default'}>
                          {f.status === 'vencido' ? 'VENCIDO' : 'A VENCER'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {f.diasParaVencer < 0 
                          ? `${Math.abs(f.diasParaVencer)} dias atrás` 
                          : `${f.diasParaVencer} dias`}
                      </TableCell>
                      <TableCell>{format(parseISO(f.dataVencimento), 'dd/MM/yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {dashboardData.feriasAlertas.length === 0 && (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum alerta de férias no momento.
                </p>
              )}
            </div>
          )}

          {tipoRelatorio === 'setores' && dashboardData?.colaboradoresPorSetor && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setor</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Percentual</TableHead>
                    <TableHead>Distribuição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboardData.colaboradoresPorSetor.map(s => (
                    <TableRow key={s.setor}>
                      <TableCell className="font-medium">{s.setor}</TableCell>
                      <TableCell className="text-right">{s.quantidade}</TableCell>
                      <TableCell className="text-right">{s.percentual.toFixed(1)}%</TableCell>
                      <TableCell>
                        <div className="w-full max-w-[200px] h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${s.percentual}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      {dashboardData?.metricas && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.metricas.colaboradoresAtivos}</div>
              <p className="text-xs text-muted-foreground">ativos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Média Tempo Empresa</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.metricas.mediaTempoEmpresa.toFixed(1)} anos
              </div>
              <p className="text-xs text-muted-foreground">média geral</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Média Salarial</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {dashboardData.metricas.mediaSalarial.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-muted-foreground">média geral</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Turnover Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.metricas.turnoverMes.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardData.metricas.demissoesMes} desligamentos
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
