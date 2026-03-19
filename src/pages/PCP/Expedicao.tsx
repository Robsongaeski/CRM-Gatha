import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { PackageCheck, Calendar, PackageX, Plus, Check, ChevronsUpDown } from 'lucide-react';
import { useExpedicao } from '@/hooks/pcp/useExpedicao';
import { usePedidosProducao } from '@/hooks/pcp/usePedidosProducao';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Expedicao() {
  const { registros, isLoading, createExpedicao, isCreating } = useExpedicao();
  const { pedidos, isLoading: isLoadingPedidos } = usePedidosProducao();

  const [tipoLancamento, setTipoLancamento] = useState<'pedido' | 'avulso'>('pedido');
  const [openCombobox, setOpenCombobox] = useState(false);
  const [formData, setFormData] = useState({
    pedido_id: '',
    descricao: '',
    data_lancamento: new Date().toISOString().split('T')[0],
    data_pedidos_enviados: '',
    data_pedido_mais_atrasado: '',
    motivo_atraso: '',
    quantidade_pedidos_enviados: '',
    quantidade_pedidos_pendentes: '',
    descricao_motivo: '',
  });

  const pedidosProntos = pedidos.filter(p => p.status === 'pronto');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createExpedicao({
      tipo_lancamento: tipoLancamento,
      pedido_id: tipoLancamento === 'pedido' ? formData.pedido_id : null,
      descricao: formData.descricao || null,
      data_lancamento: formData.data_lancamento,
      data_pedidos_enviados: formData.data_pedidos_enviados || null,
      data_pedido_mais_atrasado: formData.data_pedido_mais_atrasado || null,
      motivo_atraso: formData.motivo_atraso || null,
      quantidade_pedidos_enviados: formData.quantidade_pedidos_enviados ? parseInt(formData.quantidade_pedidos_enviados) : 0,
      quantidade_pedidos_pendentes: formData.quantidade_pedidos_pendentes ? parseInt(formData.quantidade_pedidos_pendentes) : 0,
      descricao_motivo: formData.descricao_motivo || null,
      data_envio_real: new Date().toISOString().split('T')[0],
    });

    setFormData({
      pedido_id: '',
      descricao: '',
      data_lancamento: new Date().toISOString().split('T')[0],
      data_pedidos_enviados: '',
      data_pedido_mais_atrasado: '',
      motivo_atraso: '',
      quantidade_pedidos_enviados: '',
      quantidade_pedidos_pendentes: '',
      descricao_motivo: '',
    });
  };

  const pedidoSelecionado = pedidos.find(p => p.id === formData.pedido_id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expedição PCP</h1>
        <p className="text-muted-foreground">
          Controlar envios, rastreamento e status de entrega
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lançamentos Hoje</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {registros.filter(r => r.data_lancamento === new Date().toISOString().split('T')[0]).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Registrados hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Atrasados</CardTitle>
            <PackageX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {registros.filter(r => r.data_pedido_mais_atrasado).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Com atrasos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Disponíveis</CardTitle>
            <PackageCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pedidos.length}</div>
            <p className="text-xs text-muted-foreground">
              Sem expedição registrada
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo Lançamento de Expedição</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label>Tipo de Lançamento</Label>
              <RadioGroup
                value={tipoLancamento}
                onValueChange={(value: 'pedido' | 'avulso') => setTipoLancamento(value)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pedido" id="pedido" />
                  <Label htmlFor="pedido" className="font-normal cursor-pointer">
                    Vincular a Pedido
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="avulso" id="avulso" />
                  <Label htmlFor="avulso" className="font-normal cursor-pointer">
                    Lançamento Avulso
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {tipoLancamento === 'pedido' && (
              <div className="space-y-2">
                <Label htmlFor="pedido_select">Pedido *</Label>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className="w-full justify-between"
                    >
                      {formData.pedido_id
                        ? `#${pedidoSelecionado?.numero_pedido} - ${pedidoSelecionado?.cliente?.nome_razao_social}`
                        : "Selecione ou busque um pedido..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Digite o número ou nome do cliente..." />
                      <CommandList>
                        <CommandEmpty>
                          {isLoadingPedidos ? "Carregando pedidos..." : "Nenhum pedido encontrado."}
                        </CommandEmpty>
                        <CommandGroup>
                          {pedidos.map((pedido) => (
                            <CommandItem
                              key={pedido.id}
                              value={`${pedido.numero_pedido} ${pedido.cliente?.nome_razao_social}`}
                              onSelect={() => {
                                setFormData({ ...formData, pedido_id: pedido.id });
                                setOpenCombobox(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.pedido_id === pedido.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">#{pedido.numero_pedido}</span>
                                <span className="text-sm text-muted-foreground">
                                  {pedido.cliente?.nome_razao_social}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {pedidoSelecionado && (
                  <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                    <p><strong>Cliente:</strong> {pedidoSelecionado.cliente?.nome_razao_social}</p>
                    <p><strong>Status:</strong> {pedidoSelecionado.status}</p>
                    <p><strong>Itens:</strong> {pedidoSelecionado.itens?.length || 0}</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_lancamento">Data *</Label>
                <Input
                  id="data_lancamento"
                  type="date"
                  value={formData.data_lancamento}
                  onChange={(e) => setFormData({ ...formData, data_lancamento: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição de Expedição</Label>
                <Input
                  id="descricao"
                  placeholder="Ex: Envio lote A"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_enviados">Data dos Pedidos Enviados</Label>
                <Input
                  id="data_enviados"
                  type="date"
                  value={formData.data_pedidos_enviados}
                  onChange={(e) => setFormData({ ...formData, data_pedidos_enviados: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_atrasado">Data do Pedido Mais Atrasado</Label>
                <Input
                  id="data_atrasado"
                  type="date"
                  value={formData.data_pedido_mais_atrasado}
                  onChange={(e) => setFormData({ ...formData, data_pedido_mais_atrasado: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo_atraso">Motivo do Atraso</Label>
                <Input
                  id="motivo_atraso"
                  placeholder="Ex: Falta de material"
                  value={formData.motivo_atraso}
                  onChange={(e) => setFormData({ ...formData, motivo_atraso: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qtd_enviados">Quantidade de Pedidos Enviados</Label>
                <Input
                  id="qtd_enviados"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.quantidade_pedidos_enviados}
                  onChange={(e) => setFormData({ ...formData, quantidade_pedidos_enviados: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qtd_pendentes">Quantidade de Pedidos Pendentes</Label>
                <Input
                  id="qtd_pendentes"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.quantidade_pedidos_pendentes}
                  onChange={(e) => setFormData({ ...formData, quantidade_pedidos_pendentes: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao_motivo">Descrição do Motivo</Label>
              <Textarea
                id="descricao_motivo"
                placeholder="Descreva detalhadamente o motivo ou observações..."
                value={formData.descricao_motivo}
                onChange={(e) => setFormData({ ...formData, descricao_motivo: e.target.value })}
                rows={3}
              />
            </div>

            <Button 
              type="submit" 
              disabled={isCreating}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isCreating ? 'Adicionando...' : 'Adicionar Lançamento de Expedição'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lançamentos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando lançamentos...
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lançamento registrado
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {registros.map((registro) => (
                <Card key={registro.id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={registro.tipo_lancamento === 'pedido' ? 'default' : 'secondary'}>
                            {registro.tipo_lancamento === 'pedido' ? 'Pedido' : 'Avulso'}
                          </Badge>
                          {registro.pedido && (
                            <span className="text-sm font-medium">
                              #{registro.pedido.numero_pedido}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {registro.data_lancamento && format(parseISO(registro.data_lancamento), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {registro.descricao && (
                      <div>
                        <strong>Descrição:</strong> {registro.descricao}
                      </div>
                    )}
                    {registro.pedido && (
                      <div>
                        <strong>Cliente:</strong> {registro.pedido.cliente?.nome_razao_social}
                      </div>
                    )}
                    {registro.data_pedidos_enviados && (
                      <div>
                        <strong>Data Pedidos Enviados:</strong>{' '}
                        {format(parseISO(registro.data_pedidos_enviados), 'dd/MM/yyyy')}
                      </div>
                    )}
                    {registro.data_pedido_mais_atrasado && (
                      <div className="text-destructive">
                        <strong>Pedido Mais Atrasado:</strong>{' '}
                        {format(parseISO(registro.data_pedido_mais_atrasado), 'dd/MM/yyyy')}
                      </div>
                    )}
                    {registro.motivo_atraso && (
                      <div>
                        <strong>Motivo Atraso:</strong> {registro.motivo_atraso}
                      </div>
                    )}
                    <div className="flex gap-4 pt-2">
                      <div>
                        <strong>Enviados:</strong> {registro.quantidade_pedidos_enviados || 0}
                      </div>
                      <div>
                        <strong>Pendentes:</strong> {registro.quantidade_pedidos_pendentes || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
