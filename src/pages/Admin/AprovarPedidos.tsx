import { useState } from 'react';
import { usePedidosAprovacaoPendentes, useAprovarRejeitarSolicitacao } from '@/hooks/usePedidosAprovacao';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, User, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AprovarPedidos() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const podeAprovarPedidos = can('aprovacoes.aprovar');
  const { data: solicitacoes = [], isLoading } = usePedidosAprovacaoPendentes();
  const aprovarRejeitar = useAprovarRejeitarSolicitacao();
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});

  // Bloquear se não tem permissão
  if (!podeAprovarPedidos && !isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Aprovar Pedidos</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para aprovar pedidos.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAprovar = async (solicitacaoId: string) => {
    if (!user) return;
    
    await aprovarRejeitar.mutateAsync({
      id: solicitacaoId,
      status: 'aprovado',
      observacao_admin: observacoes[solicitacaoId],
      analisado_por: user.id,
    });

    setObservacoes((prev) => {
      const { [solicitacaoId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleRejeitar = async (solicitacaoId: string) => {
    if (!user) return;
    
    if (!observacoes[solicitacaoId]) {
      alert('Por favor, adicione uma observação explicando o motivo da rejeição.');
      return;
    }

    await aprovarRejeitar.mutateAsync({
      id: solicitacaoId,
      status: 'rejeitado',
      observacao_admin: observacoes[solicitacaoId],
      analisado_por: user.id,
    });

    setObservacoes((prev) => {
      const { [solicitacaoId]: _, ...rest } = prev;
      return rest;
    });
  };

  if (isLoading) {
    return <div>Carregando solicitações...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Aprovar Pedidos</h1>
        <Badge variant="secondary" className="text-base">
          {solicitacoes.length} pendente{solicitacoes.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {solicitacoes.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Não há solicitações de aprovação pendentes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {solicitacoes.map((solicitacao) => (
            <Card key={solicitacao.id} className="border-l-4 border-l-warning">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Pedido #{solicitacao.pedido?.numero_pedido}
                    </CardTitle>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>Vendedor: {solicitacao.pedido?.vendedor?.nome}</span>
                      </div>
                      <div>Cliente: {solicitacao.pedido?.cliente?.nome_razao_social}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(solicitacao.data_solicitacao), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <p className="font-semibold text-sm mb-2">Motivo da Solicitação:</p>
                  <p className="text-sm">{solicitacao.motivo_solicitacao}</p>
                  {solicitacao.observacao_vendedor && (
                    <>
                      <p className="font-semibold text-sm mt-3 mb-2">Observação do Vendedor:</p>
                      <p className="text-sm">{solicitacao.observacao_vendedor}</p>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Observação da Análise (opcional)</label>
                  <Textarea
                    value={observacoes[solicitacao.id] || ''}
                    onChange={(e) =>
                      setObservacoes((prev) => ({
                        ...prev,
                        [solicitacao.id]: e.target.value,
                      }))
                    }
                    placeholder="Adicione uma observação sobre a aprovação ou rejeição..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleAprovar(solicitacao.id)}
                    disabled={aprovarRejeitar.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aprovar
                  </Button>
                  <Button
                    onClick={() => handleRejeitar(solicitacao.id)}
                    disabled={aprovarRejeitar.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
