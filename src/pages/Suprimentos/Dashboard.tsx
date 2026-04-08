import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/formatters';

export default function SuprimentosDashboard() {
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-dashboard', startDate, endDate],
    queryFn: async () => {
      const [{ data: purchases, error: purchasesError }, { count: suppliersCount, error: suppliersError }, { count: productsCount, error: productsError }] = await Promise.all([
        supabase
          .from('purchases' as any)
          .select('id, purchase_date, final_total, freight_total, extra_cost_total, status, supplier_id', { count: 'exact' })
          .gte('purchase_date', startDate)
          .lte('purchase_date', endDate),
        supabase.from('suppliers' as any).select('id', { count: 'exact', head: true }),
        supabase.from('purchase_products' as any).select('id', { count: 'exact', head: true }),
      ]);

      if (purchasesError) throw purchasesError;
      if (suppliersError) throw suppliersError;
      if (productsError) throw productsError;

      return {
        purchases: purchases ?? [],
        suppliersCount: suppliersCount ?? 0,
        productsCount: productsCount ?? 0,
      };
    },
  });

  const metrics = useMemo(() => {
    const purchases = data?.purchases ?? [];
    const total = purchases.reduce((sum: number, item: any) => sum + Number(item.final_total || 0), 0);
    const freight = purchases.reduce((sum: number, item: any) => sum + Number(item.freight_total || 0), 0);
    const extras = purchases.reduce((sum: number, item: any) => sum + Number(item.extra_cost_total || 0), 0);
    const pending = purchases.filter((item: any) => item.status !== 'received' && item.status !== 'cancelled').length;

    return {
      total,
      freight,
      extras,
      pending,
      purchasesCount: purchases.length,
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Suprimentos</h1>
        <p className="text-muted-foreground">Visão geral de fornecedores e compras</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="startDate">Início</Label>
            <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">Fim</Label>
            <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Carregando indicadores...</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Total comprado no período</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(metrics.total)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Frete no período</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(metrics.freight)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Custos extras no período</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{formatCurrency(metrics.extras)}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Compras pendentes</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{metrics.pending}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Compras lançadas</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{metrics.purchasesCount}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Fornecedores ativos</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{data?.suppliersCount ?? 0}</CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Produtos/Insumos</CardTitle></CardHeader>
            <CardContent className="text-2xl font-semibold">{data?.productsCount ?? 0}</CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
