import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { EmprestimoGradeProva, useRegistrarDevolucao } from '@/hooks/useEmprestimosGradeProva';

interface ItemDevolucao {
  id: string;
  descricao: string;
  quantidade: number;
  tamanhos?: string;
  quantidade_devolvida: number;
  tem_problema: boolean;
  problema_devolucao: string;
}

interface DevolucaoDialogProps {
  emprestimo: EmprestimoGradeProva | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DevolucaoDialog({ emprestimo, open, onOpenChange }: DevolucaoDialogProps) {
  const registrarDevolucao = useRegistrarDevolucao();
  const [itens, setItens] = useState<ItemDevolucao[]>([]);
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    if (emprestimo?.itens) {
      setItens(emprestimo.itens.map(item => ({
        id: item.id!,
        descricao: item.descricao,
        quantidade: item.quantidade,
        tamanhos: item.tamanhos,
        quantidade_devolvida: item.quantidade, // Padrão: devolver tudo
        tem_problema: false,
        problema_devolucao: '',
      })));
      setObservacao('');
    }
  }, [emprestimo]);

  const atualizarItem = (index: number, field: keyof ItemDevolucao, value: any) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [field]: value };
    
    // Limpar problema se desmarcado
    if (field === 'tem_problema' && !value) {
      novosItens[index].problema_devolucao = '';
    }
    
    setItens(novosItens);
  };

  const handleSubmit = async () => {
    if (!emprestimo) return;

    await registrarDevolucao.mutateAsync({
      emprestimo_id: emprestimo.id,
      observacao_devolucao: observacao || undefined,
      itens: itens.map(item => ({
        id: item.id,
        quantidade_devolvida: item.quantidade_devolvida,
        problema_devolucao: item.tem_problema ? item.problema_devolucao : undefined,
      })),
    });

    onOpenChange(false);
  };

  // Calcular status previsto
  const totalQuantidade = itens.reduce((sum, i) => sum + i.quantidade, 0);
  const totalDevolvido = itens.reduce((sum, i) => sum + i.quantidade_devolvida, 0);
  const temProblema = itens.some(i => i.tem_problema);

  let statusPrevisto = 'Devolvido';
  let statusVariant: 'default' | 'secondary' | 'destructive' = 'default';
  
  if (totalDevolvido === 0) {
    statusPrevisto = 'Não Devolvido';
    statusVariant = 'destructive';
  } else if (totalDevolvido < totalQuantidade) {
    statusPrevisto = 'Devolução Parcial';
    statusVariant = 'secondary';
  }

  if (!emprestimo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Devolução</DialogTitle>
          <DialogDescription>
            Empréstimo #{emprestimo.numero_emprestimo} - {emprestimo.cliente?.nome_razao_social}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo do empréstimo */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Data do empréstimo:</span>{' '}
                {format(new Date(emprestimo.data_emprestimo), "dd/MM/yyyy", { locale: ptBR })}
              </div>
              <div>
                <span className="text-muted-foreground">Prazo:</span>{' '}
                {format(new Date(emprestimo.data_prevista_devolucao), "dd/MM/yyyy", { locale: ptBR })}
              </div>
            </div>
          </div>

          {/* Lista de itens para devolução */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Itens</Label>
            
            {itens.map((item, index) => (
              <div key={item.id} className="p-3 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{item.descricao}</div>
                  <Badge variant="outline">Qtd: {item.quantidade}</Badge>
                </div>
                
                {item.tamanhos && (
                  <div className="text-sm text-muted-foreground">
                    Tamanhos: {item.tamanhos}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Quantidade devolvida:</Label>
                    <Input
                      type="number"
                      min={0}
                      max={item.quantidade}
                      className="w-20"
                      value={item.quantidade_devolvida}
                      onChange={(e) => atualizarItem(index, 'quantidade_devolvida', parseInt(e.target.value) || 0)}
                    />
                    <span className="text-sm text-muted-foreground">/ {item.quantidade}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`problema-${item.id}`}
                      checked={item.tem_problema}
                      onCheckedChange={(checked) => atualizarItem(index, 'tem_problema', checked)}
                    />
                    <Label htmlFor={`problema-${item.id}`} className="text-sm cursor-pointer">
                      Houve problema?
                    </Label>
                  </div>
                </div>

                {item.tem_problema && (
                  <div className="mt-2">
                    <Textarea
                      placeholder="Descreva o problema (danos, faltantes, etc.)"
                      value={item.problema_devolucao}
                      onChange={(e) => atualizarItem(index, 'problema_devolucao', e.target.value)}
                      className="resize-none"
                      rows={2}
                    />
                  </div>
                )}

                {/* Indicadores visuais */}
                <div className="flex items-center gap-2 text-sm">
                  {item.quantidade_devolvida === item.quantidade ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Check className="h-4 w-4" /> Completo
                    </span>
                  ) : item.quantidade_devolvida > 0 ? (
                    <span className="flex items-center gap-1 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" /> Parcial
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-destructive">
                      <X className="h-4 w-4" /> Não devolvido
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Observações da devolução */}
          <div className="space-y-2">
            <Label>Observações da Devolução</Label>
            <Textarea
              placeholder="Observações gerais sobre a devolução..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {/* Status previsto */}
          <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium">Status após registro:</span>
            <Badge variant={statusVariant} className="text-sm">
              {statusPrevisto}
              {temProblema && ' (com problemas)'}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={registrarDevolucao.isPending}>
            {registrarDevolucao.isPending ? 'Registrando...' : 'Confirmar Devolução'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
