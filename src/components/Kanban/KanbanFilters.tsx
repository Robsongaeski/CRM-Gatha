import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, Settings, Filter, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FiltrosKanban } from '@/hooks/pcp/usePedidosKanban';

interface KanbanFiltersProps {
  filtros: FiltrosKanban;
  onFiltrosChange: (filtros: FiltrosKanban) => void;
  onGerenciarColunas: () => void;
}

export function KanbanFilters({ filtros, onFiltrosChange, onGerenciarColunas }: KanbanFiltersProps) {
  const [searchLocal, setSearchLocal] = useState(filtros.busca || '');
  
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome_razao_social')
        .order('nome_razao_social');
      if (error) throw error;
      return data;
    },
  });

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltrosChange({ ...filtros, busca: searchLocal });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchLocal]);

  const hasFilters = filtros.clienteId || filtros.urgentesOnly || filtros.dataEntregaInicio || filtros.dataEntregaFim || filtros.mostrarEntregues;

  const limparFiltros = () => {
    onFiltrosChange({});
  };

  return (
    <div className="space-y-3 mb-4">
      {/* Busca */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº do pedido ou cliente..."
            value={searchLocal}
            onChange={(e) => setSearchLocal(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={onGerenciarColunas}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-3 w-3" />
              Filtros
              {hasFilters && <span className="text-primary">(ativos)</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div>
                <Label>Cliente</Label>
                <Select
                  value={filtros.clienteId || 'todos'}
                  onValueChange={(value) =>
                    onFiltrosChange({
                      ...filtros,
                      clienteId: value === 'todos' ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os clientes</SelectItem>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome_razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="urgentes"
                  checked={filtros.urgentesOnly || false}
                  onCheckedChange={(checked) =>
                    onFiltrosChange({
                      ...filtros,
                      urgentesOnly: checked === true,
                    })
                  }
                />
                <Label htmlFor="urgentes" className="cursor-pointer">
                  Somente pedidos urgentes (≤ 3 dias)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="entregues"
                  checked={filtros.mostrarEntregues || false}
                  onCheckedChange={(checked) =>
                    onFiltrosChange({
                      ...filtros,
                      mostrarEntregues: checked === true,
                    })
                  }
                />
                <Label htmlFor="entregues" className="cursor-pointer">
                  Mostrar pedidos entregues
                </Label>
              </div>

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={limparFiltros} className="w-full">
                  <X className="h-3 w-3 mr-2" />
                  Limpar filtros
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Indicadores de filtros ativos */}
        {filtros.urgentesOnly && (
          <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-500 font-medium">
            Urgentes
          </span>
        )}
        {filtros.clienteId && (
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
            Cliente filtrado
          </span>
        )}
        {filtros.mostrarEntregues && (
          <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 font-medium">
            + Entregues
          </span>
        )}
      </div>
    </div>
  );
}
