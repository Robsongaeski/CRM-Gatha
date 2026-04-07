import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PropostaTagSelector } from './PropostaTagSelector';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  User, 
  DollarSign, 
  FolderOpen,
  ExternalLink,
  History,
  Upload,
  Image,
  FileText,
  ArrowRight,
  CheckCircle,
  Clipboard,
  Trash2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '@/lib/imageCompression';

interface PropostaDetalheKanbanProps {
  propostaId: string | null;
  onClose: () => void;
}

export function PropostaDetalheKanban({ propostaId, onClose }: PropostaDetalheKanbanProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [novaObservacao, setNovaObservacao] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Estados para imagem na observação
  const [imagemObservacao, setImagemObservacao] = useState<File | Blob | null>(null);
  const [previewObservacao, setPreviewObservacao] = useState<string | null>(null);
  const [uploadingObservacao, setUploadingObservacao] = useState(false);

  // Limpar preview quando fechar
  useEffect(() => {
    return () => {
      if (previewObservacao) {
        URL.revokeObjectURL(previewObservacao);
      }
    };
  }, [previewObservacao]);

  // Buscar proposta
  const { data: proposta, isLoading } = useQuery({
    queryKey: ['proposta-kanban', propostaId],
    queryFn: async () => {
      if (!propostaId) return null;
      
      const { data, error } = await supabase
        .from('propostas')
        .select(`
          *,
          cliente:clientes(id, nome_razao_social, telefone, whatsapp),
          vendedor:profiles!vendedor_id(id, nome),
          proposta_itens(
            id,
            quantidade,
            valor_unitario,
            valor_total,
            observacoes,
            produto:produtos(id, nome)
          )
        `)
        .eq('id', propostaId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!propostaId,
  });

  // Buscar histórico de movimentações
  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ['proposta-historico', propostaId],
    queryFn: async () => {
      if (!propostaId) return [];
      
      const { data: movimentos, error: errorMov } = await supabase
        .from('movimento_etapa_proposta')
        .select(`
          *,
          etapa_anterior:etapa_producao!movimento_etapa_proposta_etapa_anterior_id_fkey(nome_etapa),
          etapa_nova:etapa_producao!movimento_etapa_proposta_etapa_nova_id_fkey(nome_etapa)
        `)
        .eq('proposta_id', propostaId)
        .order('data_hora_movimento', { ascending: false });

      if (errorMov) throw errorMov;
      if (!movimentos || movimentos.length === 0) return [];

      // Buscar nomes dos usuários
      const usuarioIds = [...new Set(movimentos.map(m => m.usuario_id))];
      const { data: usuarios } = await supabase
        .from('profiles')
        .select('id, nome')
        .in('id', usuarioIds);

      return movimentos.map(m => ({
        ...m,
        usuario: usuarios?.find(u => u.id === m.usuario_id)
      }));
    },
    enabled: !!propostaId,
  });

  // Buscar histórico da proposta (alterações)
  const { data: historicoAlteracoes = [] } = useQuery({
    queryKey: ['proposta-historico-alteracoes', propostaId],
    queryFn: async () => {
      if (!propostaId) return [];
      
      const { data, error } = await supabase
        .from('propostas_historico')
        .select('*')
        .eq('proposta_id', propostaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Buscar nomes dos usuários
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(h => h.usuario_id).filter(Boolean))];
        if (userIds.length > 0) {
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
      }
      return data || [];
    },
    enabled: !!propostaId,
  });

  // Função de upload reutilizável para File ou Blob (paste)
  const uploadImagemAprovacao = async (file: File | Blob) => {
    if (!propostaId) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const fileName = `${propostaId}-${Date.now()}.jpg`;
      const filePath = `propostas-aprovacao/${fileName}`;

      // Upload para storage
      const { error: uploadError } = await supabase.storage
        .from('pedidos-fotos-modelos')
        .upload(filePath, compressed);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: publicUrl } = supabase.storage
        .from('pedidos-fotos-modelos')
        .getPublicUrl(filePath);

      // Atualizar proposta
      const { error: updateError } = await supabase
        .from('propostas')
        .update({ imagem_aprovacao_url: publicUrl.publicUrl })
        .eq('id', propostaId);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['proposta-kanban', propostaId] });
      queryClient.invalidateQueries({ queryKey: ['propostas-kanban'] });
      toast.success('Imagem de aprovação enviada');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  // Handler para input de arquivo
  const handleUploadImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadImagemAprovacao(file);
  };

  // Handler para colar imagem (Ctrl+V)
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          await uploadImagemAprovacao(blob);
        }
        break;
      }
    }
  };

  // Remover imagem da proposta
  const handleRemoverImagem = async (tipo: 'aprovacao' | 'referencia') => {
    if (!propostaId) return;
    
    const campo = tipo === 'aprovacao' ? 'imagem_aprovacao_url' : 'imagem_referencia_url';
    
    try {
      const { error } = await supabase
        .from('propostas')
        .update({ [campo]: null })
        .eq('id', propostaId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['proposta-kanban', propostaId] });
      queryClient.invalidateQueries({ queryKey: ['propostas-kanban'] });
      toast.success('Imagem removida');
    } catch (error) {
      console.error('Erro ao remover imagem:', error);
      toast.error('Erro ao remover imagem');
    }
  };

  // Handler para paste na observação
  const handlePasteObservacao = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          setImagemObservacao(blob);
          setPreviewObservacao(URL.createObjectURL(blob));
        }
        break;
      }
    }
  };

  // Handler para selecionar imagem na observação
  const handleSelecionarImagemObservacao = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagemObservacao(file);
    setPreviewObservacao(URL.createObjectURL(file));
  };

  // Remover imagem da observação antes de enviar
  const handleRemoverImagemObservacao = () => {
    if (previewObservacao) {
      URL.revokeObjectURL(previewObservacao);
    }
    setImagemObservacao(null);
    setPreviewObservacao(null);
  };

  const handleAdicionarObservacao = async () => {
    if (!propostaId || (!novaObservacao.trim() && !imagemObservacao)) return;

    setUploadingObservacao(true);
    try {
      let imagemUrl = null;

      // Upload da imagem se existir
      if (imagemObservacao) {
        const compressed = await compressImage(imagemObservacao);
        const fileName = `observacao-${propostaId}-${Date.now()}.jpg`;
        const filePath = `propostas-observacoes/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pedidos-fotos-modelos')
          .upload(filePath, compressed);

        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage
          .from('pedidos-fotos-modelos')
          .getPublicUrl(filePath);

        imagemUrl = publicUrl.publicUrl;
      }

      // Registrar no histórico
      const { error } = await supabase
        .from('propostas_historico')
        .insert({
          proposta_id: propostaId,
          usuario_id: user?.id,
          tipo_alteracao: 'observacao',
          descricao: novaObservacao.trim() || 'Imagem adicionada',
          imagem_url: imagemUrl,
        });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['proposta-historico-alteracoes', propostaId] });
      toast.success('Observação adicionada');
      setNovaObservacao('');
      handleRemoverImagemObservacao();
    } catch (error) {
      toast.error('Erro ao adicionar observação');
      console.error(error);
    } finally {
      setUploadingObservacao(false);
    }
  };

  const handleConverterEmPedido = () => {
    if (!proposta) return;
    // Navegar para criar pedido com dados da proposta
    navigate(`/pedidos/novo?propostaId=${propostaId}`);
  };

  if (!propostaId) return null;
  if (isLoading) {
    return (
      <Dialog open={!!propostaId} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <div className="flex items-center justify-center p-8">
            Carregando...
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  if (!proposta) return null;
  const subtotalProposta = Number(proposta.valor_total || 0);
  const descontoPercentualProposta = Number((proposta as any).desconto_percentual || 0);
  const valorFinalProposta = subtotalProposta - (subtotalProposta * (descontoPercentualProposta / 100));

  return (
    <Dialog open={!!propostaId} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Badge variant="outline" className="bg-amber-500/20 text-amber-700 border-amber-500/30">
              PROPOSTA
            </Badge>
            {(proposta.cliente as any)?.nome_razao_social}
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
                    <span>{(proposta.vendedor as any)?.nome}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-semibold">R$ {valorFinalProposta.toFixed(2)}</span>
                  </div>
                  {descontoPercentualProposta > 0 && (
                    <div className="text-xs text-green-600">
                      Desconto à vista aplicado: {descontoPercentualProposta.toFixed(1)}%
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{proposta.status}</Badge>
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
                    <span className="text-muted-foreground">Criada em:</span>{' '}
                    {format(new Date(proposta.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Caminho dos Arquivos */}
            {proposta.caminho_arquivos && (
              <>
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <FolderOpen className="h-4 w-4" />
                    CAMINHO DOS ARQUIVOS
                  </h3>
                  <p className="text-sm font-mono bg-muted p-2 rounded">
                    {proposta.caminho_arquivos}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Descrição para Criação */}
            {proposta.descricao_criacao && (
              <>
                <div>
                  <h3 className="font-semibold text-sm mb-2">📝 DESCRIÇÃO PARA CRIAÇÃO</h3>
                  <p className="text-sm bg-muted/50 p-3 rounded whitespace-pre-wrap">
                    {proposta.descricao_criacao}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Imagem de Referência do Cliente */}
            {(proposta as any).imagem_referencia_url && (
              <>
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <Image className="h-4 w-4" />
                    IMAGEM DE REFERÊNCIA (CLIENTE)
                  </h3>
                  <div className="relative group">
                    <div className="w-full max-h-[200px] rounded overflow-hidden border border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/30">
                      <img 
                        src={(proposta as any).imagem_referencia_url} 
                        alt="Referência do cliente"
                        className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open((proposta as any).imagem_referencia_url!, '_blank')}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoverImagem('referencia')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Imagem enviada pelo cliente como referência para criação
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Imagem de Aprovação */}
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <Image className="h-4 w-4" />
                IMAGEM DE APROVAÇÃO
              </h3>
              {proposta.imagem_aprovacao_url ? (
                <div className="space-y-2">
                  <div className="relative group">
                    <div className="w-full max-h-[300px] rounded overflow-hidden border border-border">
                      <img 
                        src={proposta.imagem_aprovacao_url} 
                        alt="Layout de aprovação"
                        className="w-full h-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => window.open(proposta.imagem_aprovacao_url!, '_blank')}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoverImagem('aprovacao')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div 
                    className="flex items-center gap-4 mt-2"
                    onPaste={handlePaste}
                    tabIndex={0}
                  >
                    <Label htmlFor="upload-nova" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <Upload className="h-4 w-4" />
                        Substituir imagem
                      </div>
                      <Input 
                        id="upload-nova"
                        type="file" 
                        accept="image/*"
                        onChange={handleUploadImagem}
                        className="hidden"
                        disabled={uploading}
                      />
                    </Label>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clipboard className="h-3 w-3" />
                      ou cole (Ctrl+V)
                    </span>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                  onPaste={handlePaste}
                  tabIndex={0}
                >
                  <Label htmlFor="upload-imagem" className="cursor-pointer">
                    <div className="space-y-2">
                      <div className="flex justify-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <Clipboard className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {uploading ? 'Enviando...' : 'Clique para selecionar ou cole uma imagem (Ctrl+V)'}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Dica: Tire um print e cole diretamente aqui!
                      </p>
                    </div>
                    <Input 
                      id="upload-imagem"
                      type="file" 
                      accept="image/*"
                      onChange={handleUploadImagem}
                      className="hidden"
                      disabled={uploading}
                    />
                  </Label>
                </div>
              )}
            </div>

            <Separator />

            {/* Tags */}
            <div>
              <h3 className="font-semibold text-sm mb-2">🏷️ TAGS</h3>
              <PropostaTagSelector propostaId={propostaId} />
            </div>

            <Separator />

            {/* Itens da Proposta */}
            <div>
              <h3 className="font-semibold text-sm mb-2">📦 ITENS DA PROPOSTA</h3>
              <div className="space-y-2">
                {proposta.proposta_itens?.map((item: any) => (
                  <div key={item.id} className="p-2 bg-muted/50 rounded text-sm">
                    <p className="font-medium">{item.produto?.nome}</p>
                    <p className="text-muted-foreground">
                      {item.quantidade} un × R$ {item.valor_unitario?.toFixed(2)} = R$ {item.valor_total?.toFixed(2)}
                    </p>
                    {item.observacoes && (
                      <p className="text-xs italic mt-1">{item.observacoes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Adicionar Observação */}
            <div>
              <h3 className="font-semibold text-sm mb-2">💬 ADICIONAR OBSERVAÇÃO</h3>
              <div className="space-y-3">
                <Textarea
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  onPaste={handlePasteObservacao}
                  placeholder="Adicionar observação ou solicitação de revisão..."
                  rows={3}
                />
                
                {/* Área para imagem na observação */}
                {!previewObservacao ? (
                  <div 
                    className="border border-dashed border-muted-foreground/25 rounded-lg p-3 text-center cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                    onPaste={handlePasteObservacao}
                    tabIndex={0}
                  >
                    <Label htmlFor="upload-obs-imagem" className="cursor-pointer">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Image className="h-4 w-4" />
                        <span>Adicionar imagem (opcional)</span>
                        <Clipboard className="h-4 w-4" />
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Clique ou cole (Ctrl+V)
                      </p>
                      <Input 
                        id="upload-obs-imagem"
                        type="file" 
                        accept="image/*"
                        onChange={handleSelecionarImagemObservacao}
                        className="hidden"
                      />
                    </Label>
                  </div>
                ) : (
                  <div className="relative inline-block">
                    <img 
                      src={previewObservacao}
                      alt="Preview"
                      className="max-h-[120px] rounded border border-border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoverImagemObservacao}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <Button 
                  size="sm" 
                  onClick={handleAdicionarObservacao}
                  disabled={(!novaObservacao.trim() && !imagemObservacao) || uploadingObservacao}
                >
                  {uploadingObservacao ? 'Enviando...' : 'Adicionar Observação'}
                </Button>
              </div>
            </div>

            {/* Observações registradas */}
            {historicoAlteracoes.filter((h: any) => h.tipo_alteracao === 'observacao').length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    OBSERVAÇÕES
                  </h3>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {historicoAlteracoes.filter((h: any) => h.tipo_alteracao === 'observacao').map((obs: any) => (
                      <div key={obs.id} className="text-sm p-3 bg-amber-500/10 rounded border border-amber-500/30">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-3 w-3 text-amber-600" />
                          <span className="text-muted-foreground font-medium">
                            {format(new Date(obs.created_at), 'dd/MMM HH:mm', { locale: ptBR })}
                          </span>
                          <span className="text-xs text-amber-600">Observação</span>
                          {obs.usuario_nome && (
                            <span className="text-xs text-muted-foreground">por {obs.usuario_nome}</span>
                          )}
                        </div>
                        <p className="mt-1">{obs.descricao}</p>
                        {obs.imagem_url && (
                          <div className="mt-2">
                            <img 
                              src={obs.imagem_url}
                              alt="Imagem da observação"
                              className="max-h-[150px] rounded border border-border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(obs.imagem_url, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Ações */}
            <div>
              <h3 className="font-semibold text-sm mb-2">⚡ AÇÕES</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/propostas/${propostaId}`)}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ver Proposta
                </Button>
                <Button
                  size="sm"
                  onClick={handleConverterEmPedido}
                  className="gap-2"
                  disabled={!proposta.imagem_aprovacao_url}
                >
                  <CheckCircle className="h-4 w-4" />
                  Converter em Pedido
                </Button>
              </div>
              {!proposta.imagem_aprovacao_url && (
                <p className="text-xs text-muted-foreground mt-2">
                  * É necessário ter uma imagem de aprovação para converter em pedido
                </p>
              )}
            </div>

            <Separator />

            {/* Histórico de Movimentações */}
            <div>
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                <History className="h-4 w-4" />
                HISTÓRICO
              </h3>
              {loadingHistorico ? (
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {/* Movimentações */}
                  {historico.map((mov: any) => (
                    <div key={mov.id} className="text-sm p-3 bg-muted/50 rounded border border-border">
                      <div className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-primary" />
                        <span className="text-muted-foreground font-medium">
                          {format(new Date(mov.data_hora_movimento), 'dd/MMM HH:mm', { locale: ptBR })}
                        </span>
                        <span>
                          Movido de <strong>{mov.etapa_anterior?.nome_etapa || 'Início'}</strong> para{' '}
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
                  
                  {historico.length === 0 && (
                    <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded">
                      Nenhum registro no histórico ainda
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
