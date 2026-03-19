import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ShoppingCart, Users, MessageSquare, Briefcase, Sparkles,
  ArrowRight, Package, Clock, Mail, Bell
} from 'lucide-react';
import { fluxosExemplo, FluxoExemplo } from '../data/fluxosExemplo';
import { cn } from '@/lib/utils';

interface GaleriaFluxosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFluxo: (fluxo: FluxoExemplo) => void;
}

const tipoIcons: Record<string, React.ReactNode> = {
  ecommerce: <ShoppingCart className="h-4 w-4" />,
  leads: <Users className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  comercial: <Briefcase className="h-4 w-4" />,
  geral: <Sparkles className="h-4 w-4" />,
};

const tipoColors: Record<string, string> = {
  ecommerce: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  leads: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  whatsapp: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  comercial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  geral: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
};

const tipoLabels: Record<string, string> = {
  ecommerce: 'E-commerce',
  leads: 'Leads',
  whatsapp: 'WhatsApp',
  comercial: 'Comercial',
  geral: 'Geral',
};

function FluxoCard({ 
  fluxo, 
  onSelect 
}: { 
  fluxo: FluxoExemplo; 
  onSelect: () => void;
}) {
  const nodeCount = fluxo.nodes.length;
  const hasConditions = fluxo.nodes.some(n => n.type === 'condition');
  const hasDelays = fluxo.nodes.some(n => n.data.subtype === 'delay');
  const hasEmail = fluxo.nodes.some(n => n.data.subtype === 'send_email');
  const hasWhatsapp = fluxo.nodes.some(n => n.data.subtype === 'send_whatsapp');
  const hasNotifications = fluxo.nodes.some(n => n.data.subtype === 'create_notification');

  return (
    <div 
      className={cn(
        'group relative p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer',
        'bg-card hover:bg-accent/50',
        'border-border hover:border-primary/50 hover:shadow-lg'
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {fluxo.nome}
          </h3>
          <Badge 
            variant="secondary" 
            className={cn('mt-1', tipoColors[fluxo.tipo])}
          >
            {tipoIcons[fluxo.tipo]}
            <span className="ml-1">{tipoLabels[fluxo.tipo]}</span>
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          {nodeCount} nós
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {fluxo.descricao}
      </p>

      {/* Features */}
      <div className="flex flex-wrap gap-1.5">
        {hasConditions && (
          <Badge variant="outline" className="text-xs">
            <ArrowRight className="h-3 w-3 mr-1" />
            Condições
          </Badge>
        )}
        {hasDelays && (
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Delays
          </Badge>
        )}
        {hasWhatsapp && (
          <Badge variant="outline" className="text-xs">
            <MessageSquare className="h-3 w-3 mr-1" />
            WhatsApp
          </Badge>
        )}
        {hasEmail && (
          <Badge variant="outline" className="text-xs">
            <Mail className="h-3 w-3 mr-1" />
            Email
          </Badge>
        )}
        {hasNotifications && (
          <Badge variant="outline" className="text-xs">
            <Bell className="h-3 w-3 mr-1" />
            Notificações
          </Badge>
        )}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

export function GaleriaFluxosDialog({ 
  open, 
  onOpenChange, 
  onSelectFluxo 
}: GaleriaFluxosDialogProps) {
  const [filtroTipo, setFiltroTipo] = useState<string>('all');

  const fluxosFiltrados = filtroTipo === 'all' 
    ? fluxosExemplo 
    : fluxosExemplo.filter(f => f.tipo === filtroTipo);

  const handleSelect = (fluxo: FluxoExemplo) => {
    onSelectFluxo(fluxo);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Galeria de Fluxos de Exemplo
          </DialogTitle>
          <DialogDescription>
            Selecione um fluxo pronto para importar e personalizar. Cada fluxo demonstra cenários reais de automação.
          </DialogDescription>
        </DialogHeader>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 pb-2 border-b">
          <Button
            size="sm"
            variant={filtroTipo === 'all' ? 'default' : 'outline'}
            onClick={() => setFiltroTipo('all')}
          >
            Todos
          </Button>
          {Object.entries(tipoLabels).map(([tipo, label]) => (
            <Button
              key={tipo}
              size="sm"
              variant={filtroTipo === tipo ? 'default' : 'outline'}
              onClick={() => setFiltroTipo(tipo)}
              className="gap-1"
            >
              {tipoIcons[tipo]}
              {label}
            </Button>
          ))}
        </div>

        {/* Lista de fluxos */}
        <ScrollArea className="h-[50vh] pr-4">
          <div className="grid gap-4 md:grid-cols-2">
            {fluxosFiltrados.map((fluxo) => (
              <FluxoCard
                key={fluxo.id}
                fluxo={fluxo}
                onSelect={() => handleSelect(fluxo)}
              />
            ))}
          </div>

          {fluxosFiltrados.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum fluxo encontrado para este tipo.
            </div>
          )}
        </ScrollArea>

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          💡 <strong>Dica:</strong> Estes fluxos são modelos completos que você pode personalizar. 
          Todos incluem lógica de saída automática quando o contexto muda (ex: cliente paga, pedido é cancelado).
        </div>
      </DialogContent>
    </Dialog>
  );
}
