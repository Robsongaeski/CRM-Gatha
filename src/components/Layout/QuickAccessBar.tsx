import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Settings } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useQuickAccessItems, getScreenByUrl } from '@/hooks/useQuickAccess';
import { ConfigurarAtalhosDialog } from './ConfigurarAtalhosDialog';
import { cn } from '@/lib/utils';

// Helper para obter ícone dinamicamente
function getIcon(iconName: string) {
  const Icon = (LucideIcons as any)[iconName];
  return Icon || LucideIcons.Link;
}

export function QuickAccessBar() {
  const [configOpen, setConfigOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: shortcuts = [], isLoading } = useQuickAccessItems();

  // Se não tem atalhos e ainda carregando, não mostrar nada
  if (isLoading && shortcuts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="flex flex-col h-full w-12 bg-sidebar border-r border-sidebar-border shrink-0">
        {/* Lista de atalhos */}
        <div className="flex-1 flex flex-col items-center py-2 gap-1 overflow-y-auto">
          {shortcuts.map((shortcut) => {
            const Icon = getIcon(shortcut.icon);
            const screenInfo = getScreenByUrl(shortcut.url);
            const isActive = location.pathname === shortcut.url;

            return (
              <Tooltip key={shortcut.id} delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 shrink-0",
                      isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                    onClick={() => navigate(shortcut.url)}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">{shortcut.title}</p>
                      {screenInfo?.description && (
                        <p className="text-xs text-muted-foreground">
                          {screenInfo.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}

          {/* Mensagem quando vazio */}
          {shortcuts.length === 0 && !isLoading && (
            <div className="flex-1 flex items-center justify-center">
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <div className="text-muted-foreground/50">
                    <LucideIcons.Star className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-sm">
                    Clique na engrenagem abaixo para adicionar atalhos rápidos
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Botão de configuração */}
        <div className="p-2 border-t border-sidebar-border">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 w-full"
                onClick={() => setConfigOpen(true)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Configurar atalhos rápidos</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ConfigurarAtalhosDialog 
        open={configOpen} 
        onOpenChange={setConfigOpen} 
      />
    </>
  );
}
