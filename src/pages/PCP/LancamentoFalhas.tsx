import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock, Filter } from 'lucide-react';
import { useFalhasProducao } from '@/hooks/pcp/useFalhasProducao';
import { useCategoriasFalha } from '@/hooks/pcp/useCategoriasFalha';
import { useTiposFalha } from '@/hooks/pcp/useTiposFalha';
import { usePedidosProducao } from '@/hooks/pcp/usePedidosProducao';
import { format } from 'date-fns';
import { parseDateString } from '@/lib/formatters';
import { toast } from 'sonner';

export default function LancamentoFalhas() {
  const [searchParams] = useSearchParams();
  const { falhas, isLoading, createFalha, resolverFalha, isCreating } = useFalhasProducao();
  const { categorias } = useCategoriasFalha();
  const { tipos } = useTiposFalha();
  const { pedidos } = usePedidosProducao();

  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendentes' | 'resolvidas'>('todos');
  const [formData, setFormData] = useState({
    pedido_id: '',
    categoria_falha_id: '',
    tipo_falha_id: '',
    quantidade: '',
    origem: '',
    precisa_reimpressao: false,
    observacoes: '',
  });

  // Pré-preencher pedido se vier da URL
  useEffect(() => {
    const pedidoParam = searchParams.get('pedido');
    if (pedidoParam && !formData.pedido_id) {
      setFormData(prev => ({ ...prev, pedido_id: pedidoParam }));
    }
  }, [searchParams, formData.pedido_id]);

  const tiposFiltrados = tipos.filter(t => 
    !formData.categoria_falha_id || t.categoria_falha_id === formData.categoria_falha_id
  );

  const falhasFiltradas = falhas.filter(f => {
    if (filtroStatus === 'pendentes') return !f.resolvido;
    if (filtroStatus === 'resolvidas') return f.resolvido;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.categoria_falha_id || !formData.tipo_falha_id || !formData.quantidade) {
      toast.error('Preencha todos os campos obrigatórios: Categoria, Tipo e Quantidade');
      return;
    }

    await createFalha({
      pedido_id: formData.pedido_id || null,
      categoria_falha_id: formData.categoria_falha_id,
      tipo_falha_id: formData.tipo_falha_id,
      quantidade: parseInt(formData.quantidade),
      origem: formData.origem || null,
      precisa_reimpressao: formData.precisa_reimpressao,
      observacoes: formData.observacoes || null,
    });

    setFormData({
      pedido_id: '',
      categoria_falha_id: '',
      tipo_falha_id: '',
      quantidade: '',
      origem: '',
      precisa_reimpressao: false,
      observacoes: '',
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lançamento de Falhas</h1>
        <p className="text-muted-foreground">
          Registrar e acompanhar falhas de produção
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Nova Falha</CardTitle>
          <CardDescription>
            Preencha os detalhes da falha identificada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pedido">Pedido (opcional)</Label>
                <Select
                  value={formData.pedido_id}
                  onValueChange={(value) => setFormData({ ...formData, pedido_id: value })}
                >
                  <SelectTrigger id="pedido">
                    <SelectValue placeholder="Selecione o pedido (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {pedidos.map((pedido) => (
                      <SelectItem key={pedido.id} value={pedido.id}>
                        #{pedido.numero_pedido} - {pedido.cliente?.nome_razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria da Falha *</Label>
                <Select
                  value={formData.categoria_falha_id}
                  onValueChange={(value) => setFormData({ ...formData, categoria_falha_id: value, tipo_falha_id: '' })}
                  required
                >
                  <SelectTrigger id="categoria">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nome_categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Falha *</Label>
                <Select
                  value={formData.tipo_falha_id}
                  onValueChange={(value) => setFormData({ ...formData, tipo_falha_id: value })}
                  required
                  disabled={!formData.categoria_falha_id}
                >
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposFiltrados.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nome_falha}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantidade">Quantidade Afetada *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="origem">Origem/Etapa</Label>
                <Input
                  id="origem"
                  placeholder="Ex: Impressão, Corte, Estampa..."
                  value={formData.origem}
                  onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Checkbox
                  id="reimpressao"
                  checked={formData.precisa_reimpressao}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, precisa_reimpressao: checked as boolean })
                  }
                />
                <Label htmlFor="reimpressao" className="cursor-pointer">
                  Precisa reimpressão
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Detalhes adicionais sobre a falha..."
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isCreating}>
              <AlertTriangle className="h-4 w-4" />
              {isCreating ? 'Registrando...' : 'Registrar Falha'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Histórico de Falhas</CardTitle>
              <CardDescription>
                Falhas registradas no sistema
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filtroStatus} onValueChange={(v: any) => setFiltroStatus(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="resolvidas">Resolvidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando falhas...
            </div>
          ) : falhasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma falha registrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {falhasFiltradas.map((falha) => (
                  <TableRow key={falha.id}>
                    <TableCell>
                      {format(parseDateString(falha.data_falha) || new Date(), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      {falha.pedido ? `#${falha.pedido.numero_pedido}` : '-'}
                    </TableCell>
                    <TableCell>{falha.categoria?.nome_categoria}</TableCell>
                    <TableCell>{falha.tipo?.nome_falha}</TableCell>
                    <TableCell>{falha.quantidade}</TableCell>
                    <TableCell>
                      {falha.resolvido ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3" />
                          Resolvida
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <Clock className="h-3 w-3" />
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!falha.resolvido && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolverFalha(falha.id)}
                        >
                          Marcar Resolvida
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
