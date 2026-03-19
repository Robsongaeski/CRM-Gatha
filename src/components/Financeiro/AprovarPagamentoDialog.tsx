import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAprovarPagamento } from '@/hooks/usePagamentos';
import { formatCurrency } from '@/lib/formatters';
import { AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AprovarPagamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamento: any;
}

export function AprovarPagamentoDialog({ open, onOpenChange, pagamento }: AprovarPagamentoDialogProps) {
  const [observacao, setObservacao] = useState('');
  const aprovarPagamento = useAprovarPagamento();

  // Buscar dados adicionais do pedido para validação
  const { data: dadosPedido } = useQuery({
    queryKey: ['pedido-info-aprovacao', pagamento?.pedido_id],
    queryFn: async () => {
      if (!pagamento?.pedido_id) return null;

      // Buscar valor do pedido
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('valor_total, numero_pedido')
        .eq('id', pagamento.pedido_id)
        .single();

      // Buscar pagamentos aprovados
      const { data: pagamentosAprovados } = await supabase
        .from('pagamentos')
        .select('valor')
        .eq('pedido_id', pagamento.pedido_id)
        .eq('status', 'aprovado')
        .eq('estornado', false);
      
      return {
        valorPedido: Number(pedido?.valor_total || 0),
        numeroPedido: pedido?.numero_pedido || 0,
        totalAprovado: pagamentosAprovados?.reduce((s, p) => s + Number(p.valor), 0) || 0,
      };
    },
    enabled: !!pagamento?.pedido_id && open,
  });

  const valorPagamento = Number(pagamento?.valor || 0);
  const totalAposAprovacao = (dadosPedido?.totalAprovado || 0) + valorPagamento;
  const excederiaValor = dadosPedido ? totalAposAprovacao > dadosPedido.valorPedido + 0.01 : false;

  const handleAprovar = async () => {
    if (!pagamento) return;
    
    await aprovarPagamento.mutateAsync({
      id: pagamento.id,
      observacao: observacao || undefined,
    });
    
    setObservacao('');
    onOpenChange(false);
  };

  if (!pagamento) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Aprovar Pagamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alerta de excesso de valor */}
          {excederiaValor && dadosPedido && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>⚠️ Atenção! Pagamento Excede Valor do Pedido</AlertTitle>
              <AlertDescription>
                <div className="space-y-1 mt-2">
                  <p>Aprovar este pagamento fará com que o total pago exceda o valor do pedido.</p>
                  <div className="text-sm mt-2 space-y-1">
                    <p><strong>Valor do pedido:</strong> {formatCurrency(dadosPedido.valorPedido)}</p>
                    <p><strong>Já aprovado:</strong> {formatCurrency(dadosPedido.totalAprovado)}</p>
                    <p><strong>Este pagamento:</strong> {formatCurrency(valorPagamento)}</p>
                    <p className="text-destructive font-bold">
                      <strong>Total após aprovação:</strong> {formatCurrency(totalAposAprovacao)}
                    </p>
                    <p className="text-destructive font-bold">
                      <strong>Excederia em:</strong> {formatCurrency(totalAposAprovacao - dadosPedido.valorPedido)}
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Informações contextuais */}
          {dadosPedido && !excederiaValor && (
            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <p><strong>Pedido:</strong> #{dadosPedido.numeroPedido}</p>
              <p><strong>Valor do pedido:</strong> {formatCurrency(dadosPedido.valorPedido)}</p>
              <p><strong>Já aprovado:</strong> {formatCurrency(dadosPedido.totalAprovado)}</p>
              <p><strong>Este pagamento:</strong> {formatCurrency(valorPagamento)}</p>
              <p className="text-green-600 font-semibold">
                <strong>Total após aprovação:</strong> {formatCurrency(totalAposAprovacao)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p><strong>Valor:</strong> {formatCurrency(valorPagamento)}</p>
            <p><strong>Cliente:</strong> {pagamento.pedidos?.clientes?.nome_razao_social}</p>
            <p><strong>Forma:</strong> {pagamento.forma_pagamento.toUpperCase()}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observacao">Observação (opcional)</Label>
            <Textarea
              id="observacao"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Adicione uma observação sobre a aprovação..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleAprovar} 
            disabled={aprovarPagamento.isPending || excederiaValor}
          >
            {aprovarPagamento.isPending ? 'Aprovando...' : 'Confirmar Aprovação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
