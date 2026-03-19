import { useNavigate } from 'react-router-dom';
import { useDashboardRH } from '@/hooks/rh/useDashboardRH';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, UserCheck, UserX, Cake, Calendar, Building2, 
  TrendingUp, ArrowRight, AlertTriangle, DollarSign, Clock, Briefcase
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10B981', '#F59E0B', '#8B5CF6'];

export default function DashboardRH() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardRH();

  if (isLoading || !data) {
    return <div className="p-8 text-center">Carregando...</div>;
  }

  const { metricas, colaboradoresPorSetor, colaboradoresPorContrato, feriasAlertas, aniversariantesMes } = data;

  // Separar aniversariantes por tipo
  const aniversariosPessoais = aniversariantesMes.filter(a => a.tipo === 'pessoal');
  const aniversariosEmpresa = aniversariantesMes.filter(a => a.tipo === 'empresa');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Dashboard RH
          </h1>
          <p className="text-muted-foreground">Visão geral da gestão de colaboradores</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/rh/relatorios')}>
          Ver Relatórios
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow border-border" onClick={() => navigate('/rh/colaboradores')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totalColaboradores}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.colaboradoresAtivos} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{metricas.colaboradoresAtivos}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.totalColaboradores > 0 
                ? ((metricas.colaboradoresAtivos / metricas.totalColaboradores) * 100).toFixed(0)
                : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média Tempo Empresa</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.mediaTempoEmpresa.toFixed(1)} anos</div>
            <p className="text-xs text-muted-foreground">média geral</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Folha</CardTitle>
            <DollarSign className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              R$ {metricas.totalFolha.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Média: R$ {metricas.mediaSalarial.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de Férias */}
      {feriasAlertas.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Férias
              <Badge variant="destructive">{feriasAlertas.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {feriasAlertas.slice(0, 6).map(alerta => (
                <div 
                  key={alerta.colaboradorId} 
                  className="flex items-center justify-between p-3 bg-background rounded-lg border"
                >
                  <div>
                    <p className="font-medium text-sm">{alerta.colaboradorNome}</p>
                    <p className="text-xs text-muted-foreground">{alerta.cargo}</p>
                  </div>
                  <Badge variant={alerta.status === 'vencido' ? 'destructive' : 'default'}>
                    {alerta.status === 'vencido' 
                      ? `Vencido há ${Math.abs(alerta.diasParaVencer)} dias`
                      : `${alerta.diasParaVencer} dias`}
                  </Badge>
                </div>
              ))}
            </div>
            {feriasAlertas.length > 6 && (
              <Button variant="ghost" className="w-full mt-3" onClick={() => navigate('/rh/ferias')}>
                Ver todos ({feriasAlertas.length})
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico: Colaboradores por Setor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Por Setor
            </CardTitle>
          </CardHeader>
          <CardContent>
            {colaboradoresPorSetor.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum setor configurado
              </p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={colaboradoresPorSetor} layout="vertical">
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="setor" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Colaboradores']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                    <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico: Por Tipo de Contrato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Por Tipo de Contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            {colaboradoresPorContrato.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum colaborador cadastrado
              </p>
            ) : (
              <div className="h-[250px] flex items-center">
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={colaboradoresPorContrato}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="quantidade"
                      nameKey="tipo"
                    >
                      {colaboradoresPorContrato.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [value, name]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))' 
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {colaboradoresPorContrato.map((item, index) => (
                    <div key={item.tipo} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                        />
                        <span className="text-sm">{item.tipo}</span>
                      </div>
                      <span className="text-sm font-medium">{item.quantidade}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aniversariantes do Mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Cake className="h-5 w-5 text-destructive" />
              Aniversariantes do Mês
            </CardTitle>
            <Badge variant="secondary">{aniversariosPessoais.length}</Badge>
          </CardHeader>
          <CardContent>
            {aniversariosPessoais.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum aniversariante neste mês
              </p>
            ) : (
              <div className="space-y-3">
                {aniversariosPessoais.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium text-foreground">
                          {a.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{a.nome}</p>
                        <p className="text-xs text-muted-foreground">{a.cargo}</p>
                      </div>
                    </div>
                    <Badge variant={a.dia < new Date().getDate() ? 'secondary' : 'default'}>
                      Dia {a.dia}
                    </Badge>
                  </div>
                ))}
                {aniversariosPessoais.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate('/rh/calendario')}>
                    Ver todos ({aniversariosPessoais.length})
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aniversários de Empresa */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Aniversários de Empresa
            </CardTitle>
            <Badge variant="secondary">{aniversariosEmpresa.length}</Badge>
          </CardHeader>
          <CardContent>
            {aniversariosEmpresa.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum aniversário de empresa neste mês
              </p>
            ) : (
              <div className="space-y-3">
                {aniversariosEmpresa.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-medium text-foreground">
                          {a.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{a.nome}</p>
                        <p className="text-xs text-muted-foreground">{a.cargo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{a.anos} ano{a.anos && a.anos > 1 ? 's' : ''}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">Dia {a.dia}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Button variant="outline" className="justify-start" onClick={() => navigate('/rh/colaboradores/novo')}>
            <Users className="mr-2 h-4 w-4" />
            Novo Colaborador
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => navigate('/rh/calendario')}>
            <Calendar className="mr-2 h-4 w-4" />
            Calendário
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => navigate('/rh/ferias')}>
            <Calendar className="mr-2 h-4 w-4" />
            Férias
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => navigate('/rh/fechamento')}>
            <DollarSign className="mr-2 h-4 w-4" />
            Fechamento
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
