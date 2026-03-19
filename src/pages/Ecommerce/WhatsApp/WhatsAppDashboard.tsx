import { useWhatsappInstances } from '@/hooks/whatsapp/useWhatsappInstances';
import { useUserInstances } from '@/hooks/whatsapp/useWhatsappInstanceUsers';
import { useWhatsappConversations } from '@/hooks/whatsapp/useWhatsappConversations';
import { useWhatsappDashboard } from '@/hooks/whatsapp/useWhatsappDashboard';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle, 
  Wifi, 
  WifiOff, 
  Trophy, 
  TrendingUp,
  Send,
  AlertCircle,
  Calendar
} from 'lucide-react';

export default function WhatsAppDashboard() {
  const { isAdmin } = usePermissions();
  
  // Usar instâncias do usuário (filtradas por permissão)
  const { data: userInstances = [] } = useUserInstances();
  const { data: allInstances = [] } = useWhatsappInstances();
  
  // Determinar quais instâncias usar
  const instances = isAdmin ? allInstances : userInstances;
  const instanceIds = instances.map(i => i.id);
  
  const { data: allConversations = [] } = useWhatsappConversations({ 
    assignment: 'all', 
    status: 'all', 
    search: '' 
  });
  const { data: unreadConversations = [] } = useWhatsappConversations({ 
    assignment: 'all', 
    status: 'unread', 
    search: '' 
  });
  const { data: finishedConversations = [] } = useWhatsappConversations({ 
    assignment: 'all', 
    status: 'finished', 
    search: '' 
  });
  
  // Dashboard filtrado por instâncias do usuário
  const { data: dashboardMetrics, isLoading: isLoadingMetrics } = useWhatsappDashboard(
    isAdmin ? undefined : instanceIds
  );

  const connectedInstances = instances.filter(i => i.status === 'connected').length;
  const totalUnread = unreadConversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);
  const pendingConversations = allConversations.filter(c => c.status === 'pending').length;
  const inProgressConversations = allConversations.filter(c => c.status === 'in_progress').length;

  const stats = [
    {
      title: 'Instâncias Conectadas',
      value: `${connectedInstances}/${instances.length}`,
      icon: connectedInstances > 0 ? Wifi : WifiOff,
      color: connectedInstances > 0 ? 'text-green-500' : 'text-muted-foreground',
    },
    {
      title: 'Mensagens Não Lidas',
      value: totalUnread,
      icon: MessageSquare,
      color: totalUnread > 0 ? 'text-orange-500' : 'text-muted-foreground',
    },
    {
      title: 'Aguardando Atendimento',
      value: pendingConversations,
      icon: Clock,
      color: pendingConversations > 0 ? 'text-yellow-500' : 'text-muted-foreground',
    },
    {
      title: 'Em Atendimento',
      value: inProgressConversations,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Finalizados (Hoje)',
      value: dashboardMetrics?.finalizadasHoje || finishedConversations.length,
      icon: CheckCircle,
      color: 'text-green-500',
    },
  ];

  const getRankingBadge = (position: number) => {
    if (position === 0) return <Badge className="bg-yellow-500 text-white">🥇 1º</Badge>;
    if (position === 1) return <Badge className="bg-gray-400 text-white">🥈 2º</Badge>;
    if (position === 2) return <Badge className="bg-amber-600 text-white">🥉 3º</Badge>;
    return <Badge variant="outline">{position + 1}º</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard WhatsApp</h1>
        <p className="text-muted-foreground">
          Visão geral do atendimento via WhatsApp
        </p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Métricas Gerais */}
      {dashboardMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Conversas</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardMetrics.totalConversas}</div>
              <p className="text-xs text-muted-foreground">
                +{dashboardMetrics.conversasHoje} hoje
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardMetrics.conversasSemana}</div>
              <p className="text-xs text-muted-foreground">novas conversas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finalizadas Semana</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardMetrics.finalizadasSemana}</div>
              <p className="text-xs text-muted-foreground">atendimentos concluídos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa Conclusão</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardMetrics.totalConversas > 0 
                  ? Math.round((dashboardMetrics.finalizadasSemana / dashboardMetrics.conversasSemana) * 100) || 0
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">desta semana</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ranking de Atendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranking de Atendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : dashboardMetrics?.atendenteRanking.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum atendente com conversas</p>
            ) : (
              <div className="space-y-3">
                {dashboardMetrics?.atendenteRanking.map((atendente, index) => (
                  <div
                    key={atendente.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getRankingBadge(index)}
                      <div>
                        <p className="font-medium">{atendente.nome}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {atendente.finalizadas_total} finalizadas
                          </span>
                          <span className="flex items-center gap-1">
                            <Send className="h-3 w-3 text-blue-500" />
                            {atendente.total_mensagens_enviadas} msgs
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{atendente.total_conversas}</div>
                      <div className="text-xs text-muted-foreground">conversas</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Desempenho dos Atendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Desempenho Individual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMetrics ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : dashboardMetrics?.atendenteRanking.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum dado disponível</p>
            ) : (
              <div className="space-y-3">
                {dashboardMetrics?.atendenteRanking.map((atendente) => (
                  <div
                    key={atendente.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{atendente.nome}</p>
                      {atendente.total_nao_lidas > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {atendente.total_nao_lidas} não lidas
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-2 rounded bg-yellow-500/10">
                        <div className="text-lg font-bold text-yellow-600">{atendente.pendentes}</div>
                        <div className="text-xs text-muted-foreground">Pendentes</div>
                      </div>
                      <div className="p-2 rounded bg-blue-500/10">
                        <div className="text-lg font-bold text-blue-600">{atendente.em_andamento}</div>
                        <div className="text-xs text-muted-foreground">Em Andamento</div>
                      </div>
                      <div className="p-2 rounded bg-green-500/10">
                        <div className="text-lg font-bold text-green-600">{atendente.finalizadas_hoje}</div>
                        <div className="text-xs text-muted-foreground">Hoje</div>
                      </div>
                      <div className="p-2 rounded bg-purple-500/10">
                        <div className="text-lg font-bold text-purple-600">{atendente.finalizadas_semana}</div>
                        <div className="text-xs text-muted-foreground">Semana</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lista de instâncias */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status das Instâncias</CardTitle>
        </CardHeader>
        <CardContent>
          {instances.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma instância configurada</p>
          ) : (
            <div className="space-y-2">
              {instances.map((instance) => (
                <div
                  key={instance.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{instance.nome}</p>
                    {instance.numero_whatsapp && (
                      <p className="text-sm text-muted-foreground">{instance.numero_whatsapp}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {instance.status === 'connected' ? (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <Wifi className="h-4 w-4" />
                        Conectado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <WifiOff className="h-4 w-4" />
                        Desconectado
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
