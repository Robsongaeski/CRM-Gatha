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
import { usePermissions } from '@/hooks/usePermissions';

export default function SuppliersList() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const canCreate = can('procurement.suppliers.create');
  const canEdit = can('procurement.suppliers.edit');

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['procurement-suppliers', search, status],
    queryFn: async () => {
      let query = supabase
        .from('suppliers' as any)
        .select('id, corporate_name, trade_name, cnpj, contact_name, phone, city, state, supplier_type, status, created_at')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`corporate_name.ilike.%${search}%,trade_name.ilike.%${search}%,cnpj.ilike.%${search}%`);
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
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">Cadastro e gestão de fornecedores</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/suprimentos/fornecedores/novo')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo fornecedor
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de fornecedores</CardTitle>
          <div className="grid gap-3 md:grid-cols-[1fr_220px] mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por razão social, fantasia ou CNPJ" className="pl-9" />
            </div>
            <Select value={status} onValueChange={(value) => setStatus(value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
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
          ) : suppliers.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum fornecedor encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Razão social</TableHead>
                  <TableHead>Fantasia</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier: any) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.corporate_name}</TableCell>
                    <TableCell>{supplier.trade_name || '-'}</TableCell>
                    <TableCell>{supplier.supplier_type || '-'}</TableCell>
                    <TableCell>{supplier.city ? `${supplier.city}/${supplier.state || ''}` : '-'}</TableCell>
                    <TableCell>{supplier.contact_name || supplier.phone || '-'}</TableCell>
                    <TableCell>{supplier.status === 'active' ? 'Ativo' : 'Inativo'}</TableCell>
                    <TableCell>
                      {canEdit && (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/suprimentos/fornecedores/editar/${supplier.id}`)}>
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
