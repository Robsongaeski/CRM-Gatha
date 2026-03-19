import { Button } from '@/components/ui/button';
import { UserCheck, Trash2, XCircle } from 'lucide-react';

interface AcoesLoteBarraProps {
  selectedCount: number;
  onAtribuir: () => void;
  onExcluir: () => void;
  onLimparSelecao: () => void;
  canAtribuir: boolean;
  canExcluir: boolean;
}

export function AcoesLoteBarra({
  selectedCount,
  onAtribuir,
  onExcluir,
  onLimparSelecao,
  canAtribuir,
  canExcluir,
}: AcoesLoteBarraProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4 animate-in slide-in-from-top-2">
      <span className="text-sm font-medium">
        {selectedCount} lead(s) selecionado(s)
      </span>
      <div className="flex-1" />
      
      {canAtribuir && (
        <Button size="sm" variant="outline" onClick={onAtribuir}>
          <UserCheck className="h-4 w-4 mr-1" />
          Atribuir Vendedor
        </Button>
      )}
      
      {canExcluir && (
        <Button size="sm" variant="destructive" onClick={onExcluir}>
          <Trash2 className="h-4 w-4 mr-1" />
          Excluir
        </Button>
      )}
      
      <Button size="sm" variant="ghost" onClick={onLimparSelecao}>
        <XCircle className="h-4 w-4 mr-1" />
        Limpar
      </Button>
    </div>
  );
}
