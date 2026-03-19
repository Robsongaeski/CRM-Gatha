import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, Plus, Search } from 'lucide-react';
import { useImpressoes } from '@/hooks/pcp/useImpressoes';
import { usePedidosProducao } from '@/hooks/pcp/usePedidosProducao';
import { useTiposEstampa } from '@/hooks/pcp/useTiposEstampa';
import { useMaquinasImpressao } from '@/hooks/pcp/useMaquinasImpressao';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { parseDateString } from '@/lib/formatters';

export default function Impressao() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const { impressoes, isLoading: loadingImpressoes, createImpressao } = useImpressoes();
  const { pedidos, isLoading: loadingPedidos } = usePedidosProducao();
  const { tipos: tiposEstampa, isLoading: loadingTipos } = useTiposEstampa();
  const { maquinas, isLoading: loadingMaquinas } = useMaquinasImpressao();

  const [tipoRegistro, setTipoRegistro] = useState<'com_pedido' | 'sem_pedido'>('com_pedido');
  const [pedidoId, setPedidoId] = useState('');
  const [itemPedidoId, setItemPedidoId] = useState('');
  const [tipoEstampaId, setTipoEstampaId] = useState('');
  const [maquinaId, setMaquinaId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [descricaoLivre, setDescricaoLivre] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataImpressao, setDataImpressao] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');

  // Pré-preencher pedido se vier da URL
  useEffect(() => {
    const pedidoParam = searchParams.get('pedido');
    if (pedidoParam && !pedidoId) {
      setPedidoId(pedidoParam);
      setTipoRegistro('com_pedido');
    }
  }, [searchParams, pedidoId]);

  const pedidoSelecionado = pedidos.find(p => p.id === pedidoId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id || !tipoEstampaId || !quantidade) {
      return;
    }

    await createImpressao({
      tipo_registro: tipoRegistro,
      pedido_id: tipoRegistro === 'com_pedido' ? pedidoId || null : null,
      item_pedido_id: tipoRegistro === 'com_pedido' ? itemPedidoId || null : null,
      tipo_estampa_id: tipoEstampaId,
      maquina_impressao_id: maquinaId || null,
      quantidade: parseInt(quantidade),
      descricao_livre: tipoRegistro === 'sem_pedido' ? descricaoLivre : null,
      observacoes: observacoes || null,
      data_impressao: dataImpressao,
      operador_id: user.id,
      marcado_como_impresso: tipoRegistro === 'com_pedido',
    });

    // Reset form
    setPedidoId('');
    setItemPedidoId('');
    setTipoEstampaId('');
    setMaquinaId('');
    setQuantidade('');
    setDescricaoLivre('');
    setObservacoes('');
    setDataImpressao(format(new Date(), 'yyyy-MM-dd'));
  };

  const impressoesFiltradas = impressoes.filter(imp => {
    const searchLower = searchTerm.toLowerCase();
    return (
      imp.pedido?.numero_pedido?.toString().includes(searchLower) ||
      imp.pedido?.cliente?.nome_razao_social?.toLowerCase().includes(searchLower) ||
      imp.tipo_estampa?.nome_tipo_estampa?.toLowerCase().includes(searchLower) ||
      imp.descricao_livre?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Registro de Impressão</h1>
        <p className="text-muted-foreground">
          Registrar impressões de pedidos e testes/amostras
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              <CardTitle>Nova Impressão</CardTitle>
            </div>
            <CardDescription>Registre uma nova impressão</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Registro</Label>
                <Tabs value={tipoRegistro} onValueChange={(v) => setTipoRegistro(v as any)}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="com_pedido">Com Pedido</TabsTrigger>
                    <TabsTrigger value="sem_pedido">Teste/Amostra</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {tipoRegistro === 'com_pedido' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pedido">Pedido *</Label>
                    {loadingPedidos ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select value={pedidoId} onValueChange={setPedidoId} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o pedido" />
                        </SelectTrigger>
                        <SelectContent>
                          {pedidos.map((pedido) => (
                            <SelectItem key={pedido.id} value={pedido.id}>
                              #{pedido.numero_pedido} - {pedido.cliente?.nome_razao_social}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {pedidoSelecionado && pedidoSelecionado.itens && pedidoSelecionado.itens.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="item">Item do Pedido (opcional)</Label>
                      <Select value={itemPedidoId} onValueChange={setItemPedidoId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o item" />
                        </SelectTrigger>
                        <SelectContent>
                          {pedidoSelecionado.itens.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.produto?.nome} (Qtd: {item.quantidade})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              ) : tipoRegistro === 'sem_pedido' ? (
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição *</Label>
                  <Textarea
                    id="descricao"
                    value={descricaoLivre}
                    onChange={(e) => setDescricaoLivre(e.target.value)}
                    placeholder="Descreva o teste ou amostra"
                    required
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="tipo-estampa">Tipo de Estampa *</Label>
                {loadingTipos ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={tipoEstampaId} onValueChange={setTipoEstampaId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposEstampa.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nome_tipo_estampa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maquina">Máquina (opcional)</Label>
                {loadingMaquinas ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select value={maquinaId} onValueChange={setMaquinaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a máquina" />
                    </SelectTrigger>
                    <SelectContent>
                      {maquinas.map((maquina) => (
                        <SelectItem key={maquina.id} value={maquina.id}>
                          {maquina.nome_maquina}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Quantidade impressa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data">Data da Impressão *</Label>
                <Input
                  id="data"
                  type="date"
                  value={dataImpressao}
                  onChange={(e) => setDataImpressao(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs">Observações</Label>
                <Textarea
                  id="obs"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações adicionais"
                />
              </div>

              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Registrar Impressão
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de Impressões</CardTitle>
            <CardDescription>Todas as impressões registradas</CardDescription>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pedido, cliente ou tipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loadingImpressoes ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : impressoesFiltradas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma impressão registrada
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Pedido/Descrição</TableHead>
                      <TableHead>Estampa</TableHead>
                      <TableHead>Máquina</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead>Operador</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {impressoesFiltradas.map((imp) => (
                      <TableRow key={imp.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(parseDateString(imp.data_impressao) || new Date(), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={imp.tipo_registro === 'com_pedido' ? 'default' : 'secondary'}>
                            {imp.tipo_registro === 'com_pedido' ? 'Pedido' : 'Teste/Amostra'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {imp.tipo_registro === 'com_pedido' ? (
                            <div>
                              <div className="font-medium">#{imp.pedido?.numero_pedido}</div>
                              <div className="text-sm text-muted-foreground">
                                {imp.pedido?.cliente?.nome_razao_social}
                              </div>
                              {imp.item?.produto && (
                                <div className="text-xs text-muted-foreground">
                                  {imp.item.produto.nome}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm">{imp.descricao_livre}</div>
                          )}
                        </TableCell>
                        <TableCell>{imp.tipo_estampa?.nome_tipo_estampa}</TableCell>
                        <TableCell>{imp.maquina?.nome_maquina || '-'}</TableCell>
                        <TableCell>{imp.quantidade}</TableCell>
                        <TableCell className="text-sm">{imp.operador?.nome}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
