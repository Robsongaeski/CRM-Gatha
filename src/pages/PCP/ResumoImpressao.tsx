import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { usePedidosResumo } from '@/hooks/pcp/usePedidosResumo';
import { Printer, Search, Calendar, CheckSquare, Square } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { ResumoImpressaoPrint } from '@/components/PCP/ResumoImpressaoPrint';
import { useReactToPrint } from 'react-to-print';
import { parseDateString } from '@/lib/formatters';

export default function ResumoImpressao() {
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [dataFim, setDataFim] = useState<Date>(new Date());
  const [busca, setBusca] = useState('');
  const [filtrosAtivos, setFiltrosAtivos] = useState({
    dataInicio: new Date(),
    dataFim: new Date(),
    busca: '',
  });
  const [pedidosSelecionados, setPedidosSelecionados] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const { pedidos, isLoading } = usePedidosResumo(filtrosAtivos);

  const handleBuscar = () => {
    setFiltrosAtivos({
      dataInicio,
      dataFim,
      busca,
    });
  };

  const handleTogglePedido = (pedidoId: string) => {
    setPedidosSelecionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pedidoId)) {
        newSet.delete(pedidoId);
      } else {
        newSet.add(pedidoId);
      }
      return newSet;
    });
  };

  const handleSelecionarTodos = () => {
    if (pedidosSelecionados.size === pedidos.length) {
      setPedidosSelecionados(new Set());
    } else {
      setPedidosSelecionados(new Set(pedidos.map(p => p.id)));
    }
  };

  const pedidosParaImprimir = pedidos.filter(p => pedidosSelecionados.has(p.id));
  const todosSelecionados = pedidos.length > 0 && pedidosSelecionados.size === pedidos.length;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Resumo_Producao_${format(new Date(), 'dd-MM-yyyy')}`,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resumo para Impressão</h1>
        <p className="text-muted-foreground">Selecione os pedidos e gere o resumo para impressão</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dataInicio">Data Início</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dataInicio"
                  type="date"
                  value={format(dataInicio, 'yyyy-MM-dd')}
                  onChange={(e) => setDataInicio(new Date(e.target.value))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dataFim">Data Fim</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="dataFim"
                  type="date"
                  value={format(dataFim, 'yyyy-MM-dd')}
                  onChange={(e) => setDataFim(new Date(e.target.value))}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="busca">Cliente / Nº Pedido</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="busca"
                  placeholder="Buscar..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
                />
              </div>
            </div>

            <div className="flex items-end">
              <Button onClick={handleBuscar} className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleSelecionarTodos}
            disabled={pedidos.length === 0}
          >
            {todosSelecionados ? (
              <CheckSquare className="h-4 w-4 mr-2" />
            ) : (
              <Square className="h-4 w-4 mr-2" />
            )}
            {todosSelecionados ? 'Desmarcar Todos' : 'Selecionar Todos'}
          </Button>
          
          <span className="text-sm text-muted-foreground">
            {pedidosSelecionados.size} de {pedidos.length} selecionado(s)
          </span>
        </div>

        <Button
          onClick={handlePrint}
          disabled={pedidosSelecionados.size === 0}
          size="lg"
        >
          <Printer className="h-4 w-4 mr-2" />
          Imprimir Resumo ({pedidosSelecionados.size})
        </Button>
      </div>

      {/* Lista de Pedidos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Nenhum pedido encontrado para os filtros selecionados
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pedidos.map((pedido) => {
            const quantidadeTotal = pedido.itens?.reduce((acc, item) => acc + item.quantidade, 0) || 0;
            const selecionado = pedidosSelecionados.has(pedido.id);

            return (
              <Card 
                key={pedido.id}
                className={`cursor-pointer transition-all ${selecionado ? 'ring-2 ring-primary' : ''}`}
                onClick={() => handleTogglePedido(pedido.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selecionado}
                      onCheckedChange={() => handleTogglePedido(pedido.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-lg">Pedido #{pedido.numero_pedido}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{pedido.cliente?.nome_razao_social}</p>
                        {pedido.cliente?.telefone && (
                          <p className="text-muted-foreground">{pedido.cliente.telefone}</p>
                        )}
                        <p className="text-muted-foreground">
                          Quantidade: {quantidadeTotal} unidade(s)
                        </p>
                        {pedido.data_entrega && (
                          <p className="text-muted-foreground">
                            Entrega: {format(parseDateString(pedido.data_entrega) || new Date(), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Componente oculto para impressão */}
      <div className="hidden">
        <ResumoImpressaoPrint ref={printRef} pedidos={pedidosParaImprimir} />
      </div>
    </div>
  );
}
