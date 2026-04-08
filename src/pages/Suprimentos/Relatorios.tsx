import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

function toCsv(rows: any[]) {
  const headers = ['numero_compra', 'data_compra', 'status', 'fornecedor_id', 'valor_final'];
  const lines = [headers.join(';')];

  for (const row of rows) {
    lines.push([
      row.purchase_number,
      row.purchase_date,
      row.status,
      row.supplier_id,
      Number(row.final_total || 0).toFixed(2).replace('.', ','),
    ].join(';'));
  }

  return lines.join('\n');
}

export default function RelatoriosSuprimentos() {
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['procurement-reports-purchases', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchases' as any)
        .select('id, purchase_number, purchase_date, status, supplier_id, final_total')
        .gte('purchase_date', startDate)
        .lte('purchase_date', endDate)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  const totalPeriod = useMemo(() => purchases.reduce((sum: number, item: any) => sum + Number(item.final_total || 0), 0), [purchases]);

  const handleExportCsv = () => {
    const csv = toCsv(purchases);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `compras-${startDate}-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios de compras</h1>
        <p className="text-muted-foreground">Exportação inicial (CSV) para análise operacional</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Filtro do período</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <Button onClick={handleExportCsv} disabled={isLoading || purchases.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Resumo do período</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <p>Total de compras: <strong>{purchases.length}</strong></p>
          <p>Valor total: <strong>{formatCurrency(totalPeriod)}</strong></p>
          <p className="text-sm text-muted-foreground">PDF e relatórios avançados entram na próxima iteração.</p>
        </CardContent>
      </Card>
    </div>
  );
}
