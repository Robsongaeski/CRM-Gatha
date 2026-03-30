import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, Package, RefreshCw, User, XCircle } from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { usePedidosAprovacaoPendentes, useAprovarRejeitarSolicitacao } from '@/hooks/usePedidosAprovacao';
import {
  usePedidosAlteracoesPendentes,
  useProcessarSolicitacaoAlteracaoPedido,
} from '@/hooks/usePedidosAlteracoes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return format(new Date(value), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR });
};

const formatValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
};

export default function AprovarPedidos() {
  const { user } = useAuth();
  const { can, isAdmin } = usePermissions();

  const podeAprovarPrecos = isAdmin || can('aprovacoes.aprovar');
  const podeAprovarAlteracoes = isAdmin || can('pedidos.alteracoes.aprovar') || can('aprovacoes.aprovar');
  const podeAcessarTela = podeAprovarPrecos || podeAprovarAlteracoes;

  const { data: solicitacoesPreco = [], isLoading: loadingPreco } = usePedidosAprovacaoPendentes();
  const { data: solicitacoesAlteracao = [], isLoading: loadingAlteracoes } = usePedidosAlteracoesPendentes();

  const aprovarRejeitarPreco = useAprovarRejeitarSolicitacao();
  const aprovarRejeitarAlteracao = useProcessarSolicitacaoAlteracaoPedido();

  const [observacoesPreco, setObservacoesPreco] = useState<Record<string, string>>({});
  const [observacoesAlteracao, setObservacoesAlteracao] = useState<Record<string, string>>({});

  if (!podeAcessarTela && !loadingPreco && !loadingAlteracoes) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Aprovar Pedidos</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Voce nao tem permissao para aprovar pedidos.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAprovarPreco = async (solicitacaoId: string) => {
    if (!user) return;

    await aprovarRejeitarPreco.mutateAsync({
      id: solicitacaoId,
      status: 'aprovado',
      observacao_admin: observacoesPreco[solicitacaoId],
      analisado_por: user.id,
    });

    setObservacoesPreco((prev) => {
      const { [solicitacaoId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleRejeitarPreco = async (solicitacaoId: string) => {
    if (!user) return;

    if (!observacoesPreco[solicitacaoId]) {
      alert('Por favor, adicione uma observacao explicando o motivo da rejeicao.');
      return;
    }

    await aprovarRejeitarPreco.mutateAsync({
      id: solicitacaoId,
      status: 'rejeitado',
      observacao_admin: observacoesPreco[solicitacaoId],
      analisado_por: user.id,
    });

    setObservacoesPreco((prev) => {
      const { [solicitacaoId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleAprovarAlteracao = async (solicitacaoId: string) => {
    await aprovarRejeitarAlteracao.mutateAsync({
      solicitacao_id: solicitacaoId,
      aprovar: true,
      observacao: observacoesAlteracao[solicitacaoId],
    });

    setObservacoesAlteracao((prev) => {
      const { [solicitacaoId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleRejeitarAlteracao = async (solicitacaoId: string) => {
    if (!observacoesAlteracao[solicitacaoId]) {
      alert('Por favor, adicione uma observacao explicando o motivo da rejeicao.');
      return;
    }

    await aprovarRejeitarAlteracao.mutateAsync({
      solicitacao_id: solicitacaoId,
      aprovar: false,
      observacao: observacoesAlteracao[solicitacaoId],
    });

    setObservacoesAlteracao((prev) => {
      const { [solicitacaoId]: _, ...rest } = prev;
      return rest;
    });
  };

  const totalPendencias = solicitacoesPreco.length + solicitacoesAlteracao.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Aprovar Pedidos</h1>
        <Badge variant="secondary" className="text-base">
          {totalPendencias} pendente{totalPendencias !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Tabs defaultValue={podeAprovarPrecos ? 'precos' : 'alteracoes'} className="space-y-4">
        <TabsList>
          {podeAprovarPrecos && (
            <TabsTrigger value="precos">Aprovacao de Preco ({solicitacoesPreco.length})</TabsTrigger>
          )}
          {podeAprovarAlteracoes && (
            <TabsTrigger value="alteracoes">Alteracoes de Pedido Fechado ({solicitacoesAlteracao.length})</TabsTrigger>
          )}
        </TabsList>

        {podeAprovarPrecos && (
          <TabsContent value="precos" className="space-y-4">
            {loadingPreco ? (
              <Card>
                <CardContent className="pt-6">Carregando solicitacoes...</CardContent>
              </Card>
            ) : solicitacoesPreco.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">Nao ha solicitacoes de aprovacao de preco pendentes.</p>
                </CardContent>
              </Card>
            ) : (
              solicitacoesPreco.map((solicitacao) => (
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
                        {formatDateTime(solicitacao.data_solicitacao)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted p-4">
                      <p className="font-semibold text-sm mb-2">Motivo da Solicitacao:</p>
                      <p className="text-sm">{solicitacao.motivo_solicitacao}</p>
                      {solicitacao.observacao_vendedor && (
                        <>
                          <p className="font-semibold text-sm mt-3 mb-2">Observacao do Vendedor:</p>
                          <p className="text-sm">{solicitacao.observacao_vendedor}</p>
                        </>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Observacao da Analise (opcional)</label>
                      <Textarea
                        value={observacoesPreco[solicitacao.id] || ''}
                        onChange={(e) =>
                          setObservacoesPreco((prev) => ({
                            ...prev,
                            [solicitacao.id]: e.target.value,
                          }))
                        }
                        placeholder="Adicione uma observacao sobre a aprovacao ou rejeicao..."
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleAprovarPreco(solicitacao.id)}
                        disabled={aprovarRejeitarPreco.isPending}
                        className="flex-1"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Aprovar
                      </Button>
                      <Button
                        onClick={() => handleRejeitarPreco(solicitacao.id)}
                        disabled={aprovarRejeitarPreco.isPending}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Rejeitar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {podeAprovarAlteracoes && (
          <TabsContent value="alteracoes" className="space-y-4">
            {loadingAlteracoes ? (
              <Card>
                <CardContent className="pt-6">Carregando solicitacoes...</CardContent>
              </Card>
            ) : solicitacoesAlteracao.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">Nao ha solicitacoes de alteracao de pedido fechado pendentes.</p>
                </CardContent>
              </Card>
            ) : (
              solicitacoesAlteracao.map((solicitacao) => {
                const dadosAnteriores = (solicitacao as any).dados_anteriores || {};
                const dadosPropostos = (solicitacao as any).dados_propostos || {};
                const itensAntes = Array.isArray(dadosAnteriores.itens) ? dadosAnteriores.itens.length : 0;
                const itensDepois = Array.isArray(dadosPropostos.itens) ? dadosPropostos.itens.length : 0;

                return (
                  <Card key={solicitacao.id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <CardTitle className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5" />
                            Pedido #{solicitacao.pedido?.numero_pedido}
                          </CardTitle>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div>Cliente: {solicitacao.pedido?.cliente?.nome_razao_social || '-'}</div>
                            <div>Vendedor: {solicitacao.pedido?.vendedor?.nome || '-'}</div>
                            <div>Solicitado por: {solicitacao.solicitante?.nome || '-'}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(solicitacao.data_solicitacao)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg bg-muted p-4 space-y-2">
                        <p className="font-semibold text-sm">Motivo da Solicitacao:</p>
                        <p className="text-sm">{solicitacao.motivo_solicitacao || 'Alteracao solicitada.'}</p>
                        {solicitacao.observacao_solicitante && (
                          <>
                            <p className="font-semibold text-sm mt-2">Observacao do Solicitante:</p>
                            <p className="text-sm whitespace-pre-line">{solicitacao.observacao_solicitante}</p>
                          </>
                        )}
                      </div>

                      <div className="rounded-lg border p-4 space-y-2 text-sm">
                        <p className="font-semibold">Resumo da alteracao</p>
                        <div>Status: {formatValue(dadosAnteriores.status)} {'->'} {formatValue(dadosPropostos.status)}</div>
                        <div>Entrega: {formatValue(dadosAnteriores.data_entrega)} {'->'} {formatValue(dadosPropostos.data_entrega)}</div>
                        <div>Itens: {itensAntes} {'->'} {itensDepois}</div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Observacao da Analise</label>
                        <Textarea
                          value={observacoesAlteracao[solicitacao.id] || ''}
                          onChange={(e) =>
                            setObservacoesAlteracao((prev) => ({
                              ...prev,
                              [solicitacao.id]: e.target.value,
                            }))
                          }
                          placeholder="Informe o motivo da aprovacao/rejeicao..."
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          onClick={() => handleAprovarAlteracao(solicitacao.id)}
                          disabled={aprovarRejeitarAlteracao.isPending}
                          className="flex-1"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Aprovar Alteracao
                        </Button>
                        <Button
                          onClick={() => handleRejeitarAlteracao(solicitacao.id)}
                          disabled={aprovarRejeitarAlteracao.isPending}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Rejeitar Alteracao
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
