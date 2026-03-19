import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLeadsDashboardVendedor, useLeadsPendentesVendedor } from '@/hooks/useLeadsDashboard';
import { useUserRole } from '@/hooks/useUserRole';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, 
  Phone, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LIMITE_INICIAL = 5;

export function LeadsDashboardSemanal() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { data: usuarios = [] } = useUsuarios();
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>('me');
  const [expandido, setExpandido] = useState(false);
  const navigate = useNavigate();

  // Se admin selecionou um vendedor específico, usar esse; senão usar o próprio usuário
  const vendedorId = isAdmin && vendedorSelecionado !== 'me' ? vendedorSelecionado : user?.id;

  const { data: resumo, isLoading: loadingResumo } = useLeadsDashboardVendedor(vendedorId);
  const { data: pendentes = [] } = useLeadsPendentesVendedor(vendedorId);

  // Filtrar apenas vendedores e admins para o select
  const vendedores = usuarios.filter(u => 
    u.profiles?.some((p) => ['vendedor', 'admin', 'administrador'].includes(p.codigo))
  );

  if (loadingResumo) {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-center text-muted-foreground text-sm">Carregando resumo...</p>
        </CardContent>
      </Card>
    );
  }

  if (!resumo) return null;
  
  const pendentesExibidos = expandido ? pendentes : pendentes.slice(0, LIMITE_INICIAL);
  const temMais = pendentes.length > LIMITE_INICIAL;

  const getTipoBadge = (tipo: string, diasSemContato?: number) => {
    switch (tipo) {
      case 'retorno_hoje':
        return <Badge className="bg-blue-500 text-white text-[10px] px-1.5">Hoje</Badge>;
      case 'retorno_atrasado':
        return <Badge variant="destructive" className="text-[10px] px-1.5">Atrasado</Badge>;
      case 'sem_contato':
        return <Badge variant="outline" className="border-orange-500 text-orange-600 text-[10px] px-1.5">{diasSemContato}d</Badge>;
      default:
        return null;
    }
  };

  const abrirWhatsApp = (numero?: string) => {
    if (!numero) return;
    const numeroLimpo = numero.replace(/\D/g, '');
    window.open(`https://wa.me/55${numeroLimpo}`, '_blank');
  };

  return (
    <div className="space-y-3">
      {/* Seletor de Vendedor para Admin */}
      {isAdmin && vendedores.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Visualizar como:</span>
          <Select value={vendedorSelecionado} onValueChange={setVendedorSelecionado}>
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder="Meus dados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="me">Meus dados</SelectItem>
              {vendedores.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Cards de Resumo - 4 colunas sem duplicação */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Meus Leads</p>
              <p className="text-xl font-bold">{resumo.totalLeads}</p>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex gap-2 mt-1">
            <span className="text-xs text-blue-600">{resumo.leadsNovos} novos</span>
            <span className="text-xs text-orange-600">{resumo.leadsEmContato} em contato</span>
          </div>
        </Card>

        <Card className={`p-3 ${resumo.retornosHoje > 0 ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Retornos Hoje</p>
              <p className="text-xl font-bold text-blue-600">{resumo.retornosHoje}</p>
            </div>
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
        </Card>

        <Card className={`p-3 ${resumo.leadsSemContato20Dias > 0 ? 'border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20' : ''}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Sem Contato 20+</p>
              <p className="text-xl font-bold text-orange-600">{resumo.leadsSemContato20Dias}</p>
            </div>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Convertidos / Interações</p>
              <p className="text-xl font-bold">
                <span className="text-green-600">{resumo.leadsConvertidos}</span>
                <span className="text-muted-foreground mx-1">/</span>
                <span>{resumo.interacoesRealizadas}</span>
              </p>
            </div>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">esta semana</p>
        </Card>
      </div>

      {/* Lista de Leads Pendentes - apenas leads atribuídos ao vendedor */}
      {pendentes.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-orange-600" />
              Precisam de Atenção ({pendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0 space-y-1">
            {pendentesExibidos.map(lead => (
              <LeadPendenteItem 
                key={lead.id} 
                lead={lead} 
                onNavigate={() => navigate(`/leads/${lead.id}`)}
                onWhatsApp={() => abrirWhatsApp(lead.whatsapp || lead.telefone)}
                getTipoBadge={getTipoBadge}
              />
            ))}
            
            {temMais && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-1 text-xs h-7"
                onClick={() => setExpandido(!expandido)}
              >
                {expandido ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver mais {pendentes.length - LIMITE_INICIAL} leads
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface LeadPendenteItemProps {
  lead: {
    id: string;
    nome: string;
    telefone?: string;
    whatsapp?: string;
    data_retorno?: string;
    tipo: string;
    dias_sem_contato?: number;
  };
  onNavigate: () => void;
  onWhatsApp: () => void;
  getTipoBadge: (tipo: string, diasSemContato?: number) => React.ReactNode;
}

function LeadPendenteItem({ lead, onNavigate, onWhatsApp, getTipoBadge }: LeadPendenteItemProps) {
  return (
    <div 
      className="flex items-center justify-between gap-2 rounded-md border bg-card px-2.5 py-1.5 hover:bg-accent/50 cursor-pointer transition-colors"
      onClick={onNavigate}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-medium text-sm truncate">{lead.nome}</p>
          {getTipoBadge(lead.tipo, lead.dias_sem_contato)}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Phone className="h-2.5 w-2.5 flex-shrink-0" />
          <span className="truncate">{lead.telefone || lead.whatsapp || 'Sem telefone'}</span>
          {lead.data_retorno && (
            <span className="flex-shrink-0">
              • {format(new Date(lead.data_retorno), "dd/MM", { locale: ptBR })}
            </span>
          )}
        </div>
      </div>
      {(lead.whatsapp || lead.telefone) && (
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-6 w-6 text-green-600"
          onClick={(e) => {
            e.stopPropagation();
            onWhatsApp();
          }}
        >
          <MessageSquare className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
