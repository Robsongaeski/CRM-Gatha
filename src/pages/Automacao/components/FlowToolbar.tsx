import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Settings2, ChevronRight,
  ZoomIn, ZoomOut, Maximize2, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FlowToolbarProps {
  nome: string;
  setNome: (nome: string) => void;
  ativo: boolean;
  isNew: boolean;
  isSaving: boolean;
  onSave: () => void;
  onToggleActive: () => void;
  onOpenSettings: () => void;
  onOpenGallery?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
}

export function FlowToolbar({
  nome,
  setNome,
  ativo,
  isNew,
  isSaving,
  onSave,
  onToggleActive,
  onOpenSettings,
  onOpenGallery,
  onZoomIn,
  onZoomOut,
  onFitView,
}: FlowToolbarProps) {
  const navigate = useNavigate();

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 px-3 py-2 sm:px-4 shrink-0">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => navigate('/automacao')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Voltar para lista</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="hidden md:flex items-center text-sm text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer" onClick={() => navigate('/automacao')}>
              Automacao
            </span>
            <ChevronRight className="h-4 w-4 mx-1" />
            <span className="text-foreground font-medium">
              {isNew ? 'Novo Fluxo' : 'Editar'}
            </span>
          </div>

          <Separator orientation="vertical" className="h-6 hidden md:block" />

          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do fluxo..."
            className="h-8 min-w-[190px] max-w-sm bg-muted/60 border-muted-foreground/20 focus:border-primary font-medium"
          />

          {!isNew && (
            <Badge
              variant={ativo ? 'default' : 'secondary'}
              className={`cursor-pointer transition-colors whitespace-nowrap ${
                ativo
                  ? 'bg-green-500/15 text-green-600 hover:bg-green-500/25 border-green-500/30'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              onClick={onToggleActive}
            >
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${ativo ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1 border">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomOut}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Diminuir zoom</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomIn}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Aumentar zoom</p></TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-4 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onFitView}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Ajustar a tela</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <TooltipProvider>
            {onOpenGallery && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={onOpenGallery}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Exemplos
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Importar fluxo de exemplo</p></TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={onOpenSettings}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configuracoes
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Abrir configuracoes do fluxo</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="h-8 bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
