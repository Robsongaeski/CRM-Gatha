import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/formatters';
import { Plus } from 'lucide-react';

export default function ComposicoesLista() {
  const navigate = useNavigate();

  const { data: compositions = [], isLoading } = useQuery({
    queryKey: ['procurement-compositions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('material_compositions' as any)
        .select('id, name, final_unit, expected_final_quantity, actual_final_quantity, total_loss_percent, total_cost, average_final_cost, status, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Composição por etapas</h1>
          <p className="text-muted-foreground">Base para custo acumulado por transformação</p>
        </div>
        <Button onClick={() => navigate('/suprimentos/composicoes/nova')} disabled>
          <Plus className="mr-2 h-4 w-4" />
          Nova composição (em evolução)
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Composições cadastradas</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : compositions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma composição cadastrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Custo total</TableHead>
                  <TableHead>Custo médio final</TableHead>
                  <TableHead>Perda total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compositions.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{formatCurrency(row.total_cost || 0)}</TableCell>
                    <TableCell>{formatCurrency(row.average_final_cost || 0)}</TableCell>
                    <TableCell>{Number(row.total_loss_percent || 0).toFixed(2)}%</TableCell>
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
