import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useProposta } from '@/hooks/usePropostas';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Pencil, CheckCircle, Bell, FolderOpen, Image, Palette, Clock, MessageSquare, ArrowRight } from 'lucide-react';
import { PriceDisplay } from '@/components/ui/price-display';
import { format, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

const statusConfig = {
  pendente: { label: 'Pendente', variant: 'secondary' as const },
  enviada: { label: 'Enviada', variant: 'default' as const },
  follow_up: { label: 'Follow-up', variant: 'default' as const },
  ganha: { label: 'Ganha', variant: 'default' as const },
  perdida: { label: 'Perdida', variant: 'destructive' as const },
};

export default function PropostaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/propostas';
  const { data: proposta, isLoading } = useProposta(id);
  const { isAdmin, isVendedor } = useUserRole();
  const { can } = usePermissions();
  
  // Permissão para editar proposta
  const podeEditar = isAdmin || isVendedor || can('propostas.editar') || can('propostas.editar_todos') || can('propostas.editar_todas');

  // Buscar histórico de alterações
  const { data: historico } = useQuery({
    queryKey: ['proposta-historico', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('propostas_historico')
        .select('*')
        .eq('proposta_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      
      // Buscar nomes dos usuários separadamente
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(h => h.usuario_id))];
        const { data: users } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);
        
        const userMap = new Map(users?.map(u => [u.id, u.nome]) || []);
        return data.map(h => ({
          ...h,
          usuario_nome: userMap.get(h.usuario_id) || 'Sistema',
        }));
      }
      return data || [];
    },
    enabled: !!id,
  });

  // Buscar movimentações de etapa
  const { data: movimentacoes } = useQuery({
    queryKey: ['proposta-movimentacoes', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('movimento_etapa_proposta')
        .select(`
          *,
          etapa_anterior:etapa_producao!movimento_etapa_proposta_etapa_anterior_id_fkey(nome_etapa, cor_hex),
          etapa_nova:etapa_producao!movimento_etapa_proposta_etapa_nova_id_fkey(nome_etapa, cor_hex)
        `)
        .eq('proposta_id', id)
        .order('data_hora_movimento', { ascending: false });
      if (error) throw error;
      
      // Buscar nomes dos usuários separadamente
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(m => m.usuario_id))];
        const { data: users } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', userIds);
        
        const userMap = new Map(users?.map(u => [u.id, u.nome]) || []);
        return data.map(m => ({
          ...m,
          usuario_nome: userMap.get(m.usuario_id) || 'Sistema',
        }));
      }
      return data || [];
    },
    enabled: !!id,
  });

  const formatCurrency = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const getFollowUpAlert = () => {
    if (!proposta?.data_follow_up) return null;
    const date = new Date(proposta.data_follow_up);
    
    if (isBefore(date, new Date()) && !isToday(date)) {
      return (
        <Alert variant="destructive">
          <Bell className="h-4 w-4" />
          <AlertDescription>
            Follow-up atrasado: {format(date, 'dd/MM/yyyy')}
          </AlertDescription>
        </Alert>
      );
    }
    
    if (isToday(date)) {
      return (
        <Alert className="border-warning bg-warning/10">
          <Bell className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning">
            Follow-up para hoje: {format(date, 'dd/MM/yyyy')}
          </AlertDescription>
        </Alert>
      );
    }
    
    return null;
  };

  // Combinar e ordenar histórico + movimentações cronologicamente
  const historicoCompleto = [
    ...(historico || []).map(h => ({
      tipo: 'historico' as const,
      data: new Date(h.created_at),
      dados: h,
    })),
    ...(movimentacoes || []).map(m => ({
      tipo: 'movimentacao' as const,
      data: new Date(m.data_hora_movimento),
      dados: m,
    })),
  ].sort((a, b) => b.data.getTime() - a.data.getTime());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!proposta) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Proposta não encontrada</p>
      </div>
    );
  }

  const config = statusConfig[proposta.status as keyof typeof statusConfig];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(returnTo)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Detalhes da Proposta</h1>
            <p className="text-muted-foreground">
              Criada em {format(new Date(proposta.created_at), 'dd/MM/yyyy')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/propostas/${id}/orcamento`)}>
            Visualizar Orçamento
          </Button>
          {podeEditar && (
            <Button
              variant="outline"
              onClick={() =>
                navigate(`/propostas/editar/${id}?returnTo=${encodeURIComponent(returnTo)}`)
              }
            >
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          )}
          {proposta.status === 'ganha' && podeEditar && (
            <Button onClick={() => navigate(`/pedidos/novo?propostaId=${id}`)}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Converter em Pedido
            </Button>
          )}
        </div>
      </div>

      {getFollowUpAlert()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações da Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={config.variant} className="mt-1">
                {config.label}
              </Badge>
            </div>

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold">{formatCurrency(proposta.valor_total)}</p>
            </div>

            {proposta.data_follow_up && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Data de Follow-up</p>
                  <p className="font-medium">
                    {format(new Date(proposta.data_follow_up), 'dd/MM/yyyy')}
                  </p>
                </div>
              </>
            )}

            {proposta.motivo_perda && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Motivo da Perda</p>
                  <p className="font-medium">{proposta.motivo_perda}</p>
                </div>
              </>
            )}

            {proposta.observacoes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="font-medium whitespace-pre-wrap">{proposta.observacoes}</p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground mb-3">Condições de Pagamento</p>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold">💳 Pix</p>
                  <p className="text-muted-foreground ml-6">Entrada de 40% do valor total, restante na retirada</p>
                </div>
                <div>
                  <p className="font-semibold">💳 Cartão de Crédito</p>
                  <p className="text-muted-foreground ml-6">Parcelamento em até 3x sem juros</p>
                </div>
                <div>
                  <p className="font-semibold">📄 Boleto</p>
                  <p className="text-muted-foreground ml-6">À vista para 30 dias ou parcelado em até 2x (primeira parcela na aprovação do pedido, segunda em 30 dias)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações do Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome / Razão Social</p>
              <p className="font-medium">{proposta.cliente?.nome_razao_social}</p>
            </div>

            {proposta.cliente?.telefone && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-medium">{proposta.cliente.telefone}</p>
                </div>
              </>
            )}

            {proposta.cliente?.email && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{proposta.cliente.email}</p>
                </div>
              </>
            )}

            <Separator />

            <div>
              <p className="text-sm text-muted-foreground">Vendedor Responsável</p>
              <p className="font-medium">{proposta.vendedor?.nome}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seção de Criação de Arte */}
      {proposta.criar_previa && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Criação de Arte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposta.caminho_arquivos && (
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <FolderOpen className="h-4 w-4" />
                    Caminho dos Arquivos
                  </p>
                  <p className="font-medium mt-1 break-all">{proposta.caminho_arquivos}</p>
                </div>
              )}
              
              {proposta.descricao_criacao && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Descrição da Criação</p>
                  <p className="font-medium mt-1 whitespace-pre-wrap bg-muted/30 p-3 rounded-md">
                    {proposta.descricao_criacao}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seção de Imagens */}
      {(proposta.imagem_referencia_url || proposta.imagem_aprovacao_url) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Imagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {proposta.imagem_referencia_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Imagem de Referência (enviada pelo cliente)</p>
                  <a 
                    href={proposta.imagem_referencia_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img 
                      src={proposta.imagem_referencia_url} 
                      alt="Referência do cliente"
                      className="max-h-64 rounded-lg border object-contain hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  </a>
                </div>
              )}
              
              {proposta.imagem_aprovacao_url && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Imagem de Aprovação (criada pelo designer)</p>
                  <a 
                    href={proposta.imagem_aprovacao_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img 
                      src={proposta.imagem_aprovacao_url} 
                      alt="Arte para aprovação"
                      className="max-h-64 rounded-lg border object-contain hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Itens da Proposta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Preço Normal</TableHead>
                  <TableHead className="text-right">Valor Unitário</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposta.itens?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.produto?.codigo || '-'}</TableCell>
                    <TableCell className="font-medium">{item.produto?.nome}</TableCell>
                    <TableCell className="text-right">{item.quantidade}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {(() => {
                        const valorBase = item.produto?.valor_base ? parseFloat(item.produto.valor_base) : null;
                        const valorUnit = parseFloat(item.valor_unitario);
                        // Se unitário > base (adicionais), mostrar unitário como preço normal
                        const precoNormal = valorBase && valorUnit > valorBase ? valorUnit : (valorBase || valorUnit);
                        return formatCurrency(precoNormal);
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const valorBase = item.produto?.valor_base ? parseFloat(item.produto.valor_base) : null;
                        const valorUnit = parseFloat(item.valor_unitario);
                        // Se unitário > base (adicionais), ajustar base para igualar
                        const baseAjustado = valorBase && valorUnit > valorBase ? valorUnit : valorBase;
                        return baseAjustado ? (
                          <PriceDisplay 
                            valorBase={baseAjustado} 
                            valorUnitario={valorUnit} 
                          />
                        ) : (
                          formatCurrency(item.valor_unitario)
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.valor_total)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.observacoes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor Total da Proposta</p>
              <p className="text-2xl font-bold">{formatCurrency(proposta.valor_total)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção de Histórico */}
      {historicoCompleto.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Histórico da Proposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historicoCompleto.map((item, index) => (
                <div key={index} className="flex gap-3 pb-4 border-b last:border-0 last:pb-0">
                  <div className={cn(
                    "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    item.tipo === 'movimentacao' ? "bg-primary/10" : "bg-muted"
                  )}>
                    {item.tipo === 'movimentacao' ? (
                      <ArrowRight className="h-4 w-4 text-primary" />
                    ) : item.dados.campo_alterado === 'imagem_aprovacao_url' ? (
                      <Image className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {(item.dados as any).usuario_nome || 'Sistema'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(item.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    
                    {item.tipo === 'movimentacao' ? (
                      <div className="mt-1">
                        <div className="flex items-center gap-2 text-sm">
                          {item.dados.etapa_anterior ? (
                            <>
                              <Badge 
                                variant="outline" 
                                style={{ borderColor: item.dados.etapa_anterior.cor_hex, color: item.dados.etapa_anterior.cor_hex }}
                              >
                                {item.dados.etapa_anterior.nome_etapa}
                              </Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            </>
                          ) : (
                            <span className="text-muted-foreground">Entrada →</span>
                          )}
                          <Badge 
                            style={{ backgroundColor: item.dados.etapa_nova?.cor_hex, color: 'white' }}
                          >
                            {item.dados.etapa_nova?.nome_etapa}
                          </Badge>
                        </div>
                        {item.dados.observacao && (
                          <p className="text-sm text-muted-foreground mt-1 bg-muted/30 p-2 rounded">
                            {item.dados.observacao}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1">
                        <p className="text-sm">{item.dados.descricao}</p>
                        
                        {/* Se for upload de imagem, mostrar miniatura */}
                        {item.dados.campo_alterado === 'imagem_aprovacao_url' && item.dados.valor_novo && (
                          <a 
                            href={item.dados.valor_novo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-block mt-2"
                          >
                            <img 
                              src={item.dados.valor_novo} 
                              alt="Imagem de aprovação"
                              className="max-h-32 rounded border object-contain hover:opacity-80 transition-opacity"
                            />
                          </a>
                        )}
                        
                        {/* Se for observação, mostrar o texto */}
                        {item.dados.tipo_alteracao === 'observacao' && item.dados.valor_novo && (
                          <p className="text-sm text-muted-foreground mt-1 bg-muted/30 p-2 rounded">
                            {item.dados.valor_novo}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
