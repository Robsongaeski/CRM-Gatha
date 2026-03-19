import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRetornosPendentes } from '@/hooks/useRetornosPendentes';
import { Bell, Phone, AlertCircle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { SegmentoBadge } from './SegmentoBadge';

export function RetornosHoje() {
  const { data: retornos = [], isLoading } = useRetornosPendentes();
  const navigate = useNavigate();

  if (isLoading || retornos.length === 0) return null;

  const getUrgencyBadge = (dataRetorno: string) => {
    const data = new Date(dataRetorno);
    if (isPast(data) && !isToday(data)) {
      return <Badge variant="destructive" className="text-xs">Atrasado</Badge>;
    }
    if (isToday(data)) {
      return <Badge variant="default" className="text-xs">Hoje</Badge>;
    }
    return null;
  };

  return (
    <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
          <Bell className="h-5 w-5" />
          Retornos Agendados para Hoje ({retornos.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {retornos.map((lead: any) => (
          <div 
            key={lead.id} 
            className="flex items-center justify-between gap-4 rounded-lg border bg-card p-3 hover:bg-accent/50 cursor-pointer transition-colors"
            onClick={() => navigate(`/leads/${lead.id}`)}
          >
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium">{lead.nome}</p>
                {lead.segmento && (
                  <SegmentoBadge 
                    nome={lead.segmento.nome} 
                    cor={lead.segmento.cor}
                    icone={lead.segmento.icone}
                  />
                )}
                {lead.data_retorno && getUrgencyBadge(lead.data_retorno)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {lead.telefone || lead.whatsapp || 'Sem telefone'}
              </div>
              {isPast(new Date(lead.data_retorno)) && !isToday(new Date(lead.data_retorno)) && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>Este retorno está atrasado</span>
                </div>
              )}
            </div>
            <Button size="sm" variant="outline">
              Ver detalhes
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
