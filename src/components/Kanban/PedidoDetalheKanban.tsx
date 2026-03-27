import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { usePedido } from '@/hooks/usePedidos';
import { useMovimentoEtapa } from '@/hooks/pcp/useMovimentoEtapa';
import { useEtapasProducao } from '@/hooks/pcp/useEtapasProducao';
import { useUserRole } from '@/hooks/useUserRole';
import { TagSelector } from './TagSelector';
import { ImagemAprovacaoUpload } from './ImagemAprovacaoUpload';
import { ImagemItemAprovacaoUpload } from './ImagemItemAprovacaoUpload';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDateString } from '@/lib/formatters';
import { 
  Calendar, 
  User, 
  DollarSign, 
  Package, 
  FileText, 
  Printer, 
  AlertTriangle, 
  ExternalLink,
  History,
  FolderOpen,
  Pencil,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { sanitizeError } from '@/lib/errorHandling';

// IDs das etapas que permitem upload de imagem de aprovação
const ETAPAS_APROVACAO = [
  '4500bfe7-50f5-4fe2-b074-0be167b8e2e1', // Entrada
  'ed2eb534-5b55-4b29-929f-d4f1e2c9ad80', // Aguardando Aprovação
  'a4c5e551-8113-49bc-a47c-d32b242346c6', // Alteração
];

interface PedidoDetalheKanbanProps {
  pedidoId: string | null;
  onClose: () => void;
}

export function PedidoDetalheKanban({ pedidoId, onClose }: PedidoDetalheKanbanProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: pedido, isLoading } = usePedido(pedidoId || '');
  const { etapas } = useEtapasProducao();
  const { moverPedido, isMoving } = useMovimentoEtapa();
  const { isAdmin } = useUserRole();

  const [novaObservacao, setNovaObservacao] = useState('');
  const [observacoes, setObservacoes] = useState<Array<{ data: string; texto: string }>>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Buscar histórico de movimentações
  const [historico, setHistorico] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Carregar observações do pedido
  useEffect(() => {
    if (pedido?.observacao) {
      try {
        const parsed = JSON.parse(pedido.observacao);
        if (Array.isArray(parsed)) {
          setObservacoes(parsed);
        } else {
          // Se for string simples, converter para formato de array
          setObservacoes([{ data: new Date().toISOString(), texto: pedido.observacao }]);
        }
      } catch {
        // Se não for JSON, é uma observação antiga em formato de texto
        if (pedido.observacao.trim()) {
          setObservacoes([{ data: new Date().toISOString(), texto: pedido.observacao }]);
        }
      }
    } else {
      setObservacoes([]);
    }
  }, [pedido?.observacao]);

  // Carregar histórico automaticamente
  useEffect(() => {
    const carregarHistorico = async () => {
      if (!pedidoId) return;
      
      setLoadingHistorico(true);
      try {
        // Buscar movimentações
        const { data: movimentos, error: errorMov } = await supabase
          .from('movimento_etapa_producao')
          .select(`
            *,
            etapa_anterior:etapa_producao!movimento_etapa_producao_etapa_anterior_id_fkey(nome_etapa),
            etapa_nova:etapa_producao!movimento_etapa_producao_etapa_nova_id_fkey(nome_etapa)
          `)
          .eq('pedido_id', pedidoId)
          .order('data_hora_movimento', { ascending: false });

        if (errorMov) throw errorMov;

        if (!movimentos || movimentos.length === 0) {
          setHistorico([]);
          setLoadingHistorico(false);
          return;
        }

        // Buscar nomes dos usuários separadamente
        const usuarioIds = [...new Set(movimentos.map(m => m.usuario_id))];
        const { data: usuarios, error: errorUsers } = await supabase
          .from('profiles')
          .select('id, nome')
          .in('id', usuarioIds);

        if (errorUsers) throw errorUsers;

        // Mesclar os dados
        const historicoComUsuarios = movimentos.map(m => ({
          ...m,
          usuario: usuarios?.find(u => u.id === m.usuario_id)
        }));

        setHistorico(historicoComUsuarios);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        setHistorico([]);
      } finally {
        setLoadingHistorico(false);
      }
    };

    if (pedidoId) {
      carregarHistorico();
    } else {
      setHistorico([]);
    }
  }, [pedidoId]);

  const handleAdicionarObservacao = async () => {
    if (!pedidoId || !novaObservacao.trim()) return;

    try {
      const novasObservacoes = [
        ...observacoes,
        { 
          data: new Date().toISOString(), 
          texto: novaObservacao.trim() 
        }
      ];

      const { data: updatedPedido, error } = await supabase
        .from('pedidos')
        .update({ observacao: JSON.stringify(novasObservacoes) })
        .eq('id', pedidoId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!updatedPedido) throw new Error('Sem permissao para atualizar este pedido.');

      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      toast.success('Observação adicionada');
      setNovaObservacao('');
    } catch (error) {
      toast.error(sanitizeError(error));
      console.error(error);
    }
  };

  const handleEditObservacao = async (index: number) => {
    if (!pedidoId || !editingText.trim()) return;

    try {
      const novasObservacoes = [...observacoes];
      novasObservacoes[index] = {
        ...novasObservacoes[index],
        texto: editingText.trim()
      };

      const { data: updatedPedido, error } = await supabase
        .from('pedidos')
        .update({ observacao: JSON.stringify(novasObservacoes) })
        .eq('id', pedidoId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!updatedPedido) throw new Error('Sem permissao para atualizar este pedido.');

      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      toast.success('Observação editada');
      setEditingIndex(null);
      setEditingText('');
    } catch (error) {
      toast.error(sanitizeError(error));
      console.error(error);
    }
  };

  const handleDeleteObservacao = async (index: number) => {
    if (!pedidoId) return;

    try {
      const novasObservacoes = observacoes.filter((_, i) => i !== index);

      const { data: updatedPedido, error } = await supabase
        .from('pedidos')
        .update({ observacao: novasObservacoes.length > 0 ? JSON.stringify(novasObservacoes) : null })
        .eq('id', pedidoId)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (!updatedPedido) throw new Error('Sem permissao para atualizar este pedido.');

      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      toast.success('Observação excluída');
    } catch (error) {
      toast.error(sanitizeError(error));
      console.error(error);
    }
  };

  const startEditing = (index: number, texto: string) => {
    setEditingIndex(index);
    setEditingText(texto);
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  if (!pedidoId) return null;
  if (isLoading) {
    return (
      <Dialog open={!!pedidoId} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <div className="flex items-center justify-center p-8">
            Carregando...
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  if (!pedido) return null;

  const quantidadeTotal = pedido.itens?.reduce((acc, item) => acc + item.quantidade, 0) || 0;

  return (
    <Dialog open={!!pedidoId} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Pedido #{pedido.numero_pedido} - {pedido.cliente?.nome_razao_social}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)] pr-4">
          <div className="space-y-6">
            {/* Informações Gerais */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  INFORMAÇÕES
                </h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Vendedor:</span>
                    <span>{pedido.vendedor?.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-semibold">R$ {pedido.valor_total.toFixed(2)}</span>
                  </div>
                  {pedido.caminho_arquivos && (
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Arquivos:</span>
                      <span className="font-mono text-xs">{pedido.caminho_arquivos}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{pedido.status}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  DATAS
                </h3>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Pedido:</span>{' '}
                    {format(parseDateString(pedido.data_pedido) || new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                  {pedido.data_entrega && (
                    <div>
                      <span className="text-muted-foreground">Entrega:</span>{' '}
                      {format(parseDateString(pedido.data_entrega) || new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Imagem de Aprovação - Mostrar apenas nas etapas corretas */}
            {pedido.etapa_producao_id && ETAPAS_APROVACAO.includes(pedido.etapa_producao_id) && (
              <>
                <ImagemAprovacaoUpload
                  pedidoId={pedidoId}
                  imagemUrl={(pedido as any).imagem_aprovacao_url}
                  imagemAprovada={(pedido as any).imagem_aprovada}
                />
                <Separator />
              </>
            )}

            {/* Mostrar imagem aprovada se existir (em qualquer etapa) */}
            {(pedido as any).imagem_aprovacao_url && (pedido as any).imagem_aprovada && 
             (!pedido.etapa_producao_id || !ETAPAS_APROVACAO.includes(pedido.etapa_producao_id)) && (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    IMAGEM APROVADA
                  </h3>
                  <img
                    src={(pedido as any).imagem_aprovacao_url}
                    alt="Imagem aprovada"
                    className="max-w-full max-h-48 object-contain rounded-lg border-2 border-green-500 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open((pedido as any).imagem_aprovacao_url, '_blank')}
                  />
                </div>
                <Separator />
              </>
            )}

            {/* Tags */}
            <div>
              <h3 className="font-semibold text-sm mb-2">🏷️ TAGS</h3>
              <TagSelector pedidoId={pedidoId} />
            </div>

            <Separator />

            {/* Itens do Pedido */}
            <div>
              <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                ITENS DO PEDIDO ({quantidadeTotal} peças)
              </h3>
              
              {/* Aviso para upload por item quando tem múltiplos itens */}
              {pedido.itens && pedido.itens.length > 1 && pedido.etapa_producao_id && ETAPAS_APROVACAO.includes(pedido.etapa_producao_id) && (
                <p className="text-xs text-muted-foreground mb-2 bg-muted/50 p-2 rounded">
                  💡 Este pedido tem múltiplos produtos. Você pode adicionar uma imagem de aprovação para cada item.
                </p>
              )}
              
              <div className="space-y-3">
                {pedido.itens?.map((item) => {
                  // Permitir upload por item se: está em etapa de aprovação E tem mais de 1 item
                  const podeUploadPorItem = pedido.etapa_producao_id && 
                    ETAPAS_APROVACAO.includes(pedido.etapa_producao_id) && 
                    pedido.itens && pedido.itens.length > 1;
                  
                  return (
                    <div key={item.id} className="p-3 bg-secondary/50 rounded-md space-y-2">
                      <div className="flex items-start gap-3">
                        {/* Foto do modelo - upload ou visualização */}
                        {podeUploadPorItem ? (
                          <ImagemItemAprovacaoUpload
                            itemId={item.id}
                            pedidoId={pedidoId}
                            imagemUrl={item.foto_modelo_url}
                            produtoNome={item.produto?.nome}
                          />
                        ) : item.foto_modelo_url ? (
                          <div className="w-20 h-20 rounded border border-border overflow-hidden flex-shrink-0">
                            <img 
                              src={item.foto_modelo_url} 
                              alt="Foto modelo"
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(item.foto_modelo_url!, '_blank')}
                            />
                          </div>
                        ) : null}
                        
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.produto?.nome}</p>
                            {item.tipo_estampa && (
                              <Badge variant="outline" className="text-xs">
                                {item.tipo_estampa.nome_tipo_estampa}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {item.quantidade} un × R$ {item.valor_unitario.toFixed(2)} = R${' '}
                            {item.valor_total?.toFixed(2)}
                          </p>
                          
                          {/* Grades de tamanho */}
                          {item.grades && item.grades.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">Tamanhos:</p>
                              <div className="flex flex-wrap gap-1">
                                {item.grades.map((grade: any) => (
                                  <Badge key={grade.id} variant="secondary" className="text-xs">
                                    {grade.tamanho_nome}: {grade.quantidade}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Detalhes adicionais */}
                          {item.detalhes && item.detalhes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium mb-1">Detalhes:</p>
                              <div className="space-y-1">
                                {item.detalhes.map((detalhe: any) => (
                                  <p key={detalhe.id} className="text-xs text-muted-foreground">
                                    <span className="font-medium">{detalhe.tipo_detalhe}:</span> {detalhe.valor}
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {item.observacoes && (
                            <p className="text-xs text-muted-foreground italic mt-2">Obs: {item.observacoes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Observações do Pedido */}
            <div>
              <h3 className="font-semibold text-sm mb-2">📝 OBSERVAÇÕES DO PEDIDO</h3>
              
              {/* Histórico de observações */}
              {observacoes.length > 0 && (
                <div className="space-y-2 mb-3 max-h-[200px] overflow-y-auto">
                  {observacoes.map((obs, index) => (
                    <div key={index} className="text-sm p-3 bg-muted/50 rounded border border-border">
                      {editingIndex === index ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            rows={3}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleEditObservacao(index)}
                              disabled={!editingText.trim()}
                              className="gap-1"
                            >
                              <Check className="h-3 w-3" />
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditing}
                              className="gap-1"
                            >
                              <X className="h-3 w-3" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="text-foreground whitespace-pre-line">{obs.texto}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(obs.data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => startEditing(index, obs.texto)}
                                title="Editar observação"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteObservacao(index)}
                                title="Excluir observação"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Adicionar nova observação */}
              <div className="space-y-2">
                <Textarea
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Adicionar nova observação..."
                  rows={3}
                />
                <Button 
                  size="sm" 
                  onClick={handleAdicionarObservacao}
                  disabled={!novaObservacao.trim()}
                >
                  Adicionar Observação
                </Button>
              </div>
            </div>

            <Separator />

            {/* Ações Rápidas */}
            <div>
              <h3 className="font-semibold text-sm mb-2">⚡ AÇÕES RÁPIDAS</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/pcp/impressao?pedido=${pedidoId}`)}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Impressão
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/pcp/falhas?pedido=${pedidoId}`)}
                  className="gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Falha
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/pedidos/${pedidoId}`)}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Detalhes
                </Button>
              </div>
            </div>

            <Separator />

            {/* Histórico de Movimentações */}
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <History className="h-4 w-4" />
                HISTÓRICO DE MOVIMENTAÇÕES
              </h3>
              {loadingHistorico ? (
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              ) : historico.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {historico.map((mov) => (
                    <div key={mov.id} className="text-sm p-3 bg-muted/50 rounded border border-border">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium">
                          {format(new Date(mov.data_hora_movimento), 'dd/MMM HH:mm', { locale: ptBR })}
                        </span>
                        <span>•</span>
                        <span>
                          Movido de <strong>{mov.etapa_anterior?.nome_etapa || 'Sem etapa'}</strong> para{' '}
                          <strong>{mov.etapa_nova?.nome_etapa}</strong>
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Por: {mov.usuario?.nome}
                      </div>
                      {mov.observacao && (
                        <div className="text-xs text-muted-foreground italic mt-1">
                          "{mov.observacao}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded">
                  Nenhuma movimentação registrada ainda
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
