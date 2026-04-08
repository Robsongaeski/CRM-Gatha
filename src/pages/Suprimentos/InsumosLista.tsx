import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { usePermissions } from '@/hooks/usePermissions';

export default function InsumosLista() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const canCreate = can('procurement.products.create');
  const canEdit = can('procurement.products.edit');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['procurement-products', search, status],
    queryFn: async () => {
      let query = supabase
        .from('purchase_products' as any)
        .select('id, internal_code, name, category, unit, item_type, current_average_cost, status, created_at')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,internal_code.ilike.%${search}%,category.ilike.%${search}%`);
      }

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos e Insumos</h1>
          <p className="text-muted-foreground">Itens de compra e matérias-primas</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/suprimentos/insumos/novo')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo item
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de itens</CardTitle>
          <div className="grid gap-3 md:grid-cols-[1fr_220px] mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome, código ou categoria" className="pl-9" />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as any)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : products.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum item encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Custo médio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.internal_code || '-'}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>{product.item_type}</TableCell>
                    <TableCell>{formatCurrency(product.current_average_cost || 0)}</TableCell>
                    <TableCell>{product.status === 'active' ? 'Ativo' : 'Inativo'}</TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/suprimentos/insumos/editar/${product.id}`)}>
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
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
