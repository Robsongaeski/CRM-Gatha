import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDateSafe } from '@/lib/formatters';

export default function HistoricoPrecos() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-price-history', search],
    queryFn: async () => {
      let historyQuery = supabase
        .from('v_purchase_price_history' as any)
        .select('*')
        .order('purchase_date', { ascending: false })
        .limit(300);

      if (search) {
        historyQuery = historyQuery.or(`product_name.ilike.%${search}%,supplier_name.ilike.%${search}%`);
      }

      const [{ data: history, error: historyError }, { data: indicators, error: indicatorsError }] = await Promise.all([
        historyQuery,
        supabase.from('v_purchase_price_indicators' as any).select('*'),
      ]);

      if (historyError) throw historyError;
      if (indicatorsError) throw indicatorsError;

      return { history: history ?? [], indicators: indicators ?? [] };
    },
  });

  const indicatorMap = useMemo(() => {
    return new Map((data?.indicators ?? []).map((item: any) => [item.product_id, item]));
  }, [data?.indicators]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Histórico de preços</h1>
        <p className="text-muted-foreground">Comparativo e evolução de preços por item e fornecedor</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consulta</CardTitle>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por produto ou fornecedor" className="mt-2" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando histórico...</p>
          ) : (data?.history?.length ?? 0) === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhum registro encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Preço real</TableHead>
                  <TableHead>Preço por volume</TableHead>
                  <TableHead>Último preço</TableHead>
                  <TableHead>Média 90d</TableHead>
                  <TableHead>Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.history.map((row: any) => {
                  const indicator = indicatorMap.get(row.product_id);
                  const variation = Number(indicator?.variation_vs_previous_pct || 0);
                  const variationClass = variation > 0 ? 'text-red-600' : variation < 0 ? 'text-green-600' : 'text-amber-600';

                  return (
                    <TableRow key={`${row.purchase_id}-${row.product_id}-${row.purchase_date}`}>
                      <TableCell>{formatDateSafe(row.purchase_date)}</TableCell>
                      <TableCell className="font-medium">{row.product_name || '-'}</TableCell>
                      <TableCell>{row.supplier_name || '-'}</TableCell>
                      <TableCell>{formatCurrency(row.real_unit_cost || 0)}</TableCell>
                      <TableCell>
                        {row.real_purchase_unit_cost
                          ? `${formatCurrency(row.real_purchase_unit_cost)} / ${row.purchase_unit || 'vol'}`
                          : '-'}
                      </TableCell>
                      <TableCell>{formatCurrency(indicator?.last_price || 0)}</TableCell>
                      <TableCell>{formatCurrency(indicator?.avg_90d || 0)}</TableCell>
                      <TableCell className={variationClass}>{variation.toFixed(2)}%</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
