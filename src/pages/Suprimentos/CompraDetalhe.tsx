import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download } from 'lucide-react';
import { formatCurrency, formatDateSafe } from '@/lib/formatters';
import { PURCHASE_STATUS_LABELS } from './helpers';
import { toast } from 'sonner';

const PROCUREMENT_ATTACHMENTS_BUCKET = 'procurement-attachments';

function resolveStoragePath(fileUrl: string): string {
  if (!fileUrl) return '';
  if (!fileUrl.startsWith('http')) return fileUrl;

  const marker = `/object/public/${PROCUREMENT_ATTACHMENTS_BUCKET}/`;
  const index = fileUrl.indexOf(marker);
  if (index >= 0) {
    return fileUrl.substring(index + marker.length);
  }

  return fileUrl;
}

export default function CompraDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['procurement-purchase-detail', id],
    queryFn: async () => {
      const [
        { data: purchase, error: purchaseError },
        { data: items, error: itemsError },
        { data: extraCosts, error: costsError },
        { data: suppliers, error: suppliersError },
        { data: attachments, error: attachmentsError },
      ] = await Promise.all([
        supabase.from('purchases' as any).select('*').eq('id', id).single(),
        supabase.from('purchase_items' as any).select('*, purchase_products(name)').eq('purchase_id', id).order('line_order'),
        supabase.from('purchase_extra_costs' as any).select('*').eq('purchase_id', id),
        supabase.from('suppliers' as any).select('id, corporate_name, trade_name'),
        supabase.from('purchase_attachments' as any).select('*').eq('purchase_id', id).order('uploaded_at', { ascending: false }),
      ]);

      if (purchaseError) throw purchaseError;
      if (itemsError) throw itemsError;
      if (costsError) throw costsError;
      if (suppliersError) throw suppliersError;
      if (attachmentsError) throw attachmentsError;

      return {
        purchase,
        items: items ?? [],
        extraCosts: extraCosts ?? [],
        attachments: attachments ?? [],
        supplier: (suppliers ?? []).find((item: any) => item.id === purchase.supplier_id) ?? null,
      };
    },
  });

  const totals = useMemo(() => {
    if (!data) return { items: 0, extras: 0 };
    return {
      items: data.items.reduce((sum: number, item: any) => sum + Number(item.real_total_cost || item.item_total || 0), 0),
      extras: data.extraCosts.reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0),
    };
  }, [data]);

  const handleDownloadAttachment = async (attachment: any) => {
    try {
      const path = resolveStoragePath(attachment.file_url || '');
      if (!path) {
        toast.error('Anexo sem caminho válido.');
        return;
      }

      const { data: signed, error } = await supabase.storage
        .from(PROCUREMENT_ATTACHMENTS_BUCKET)
        .createSignedUrl(path, 60 * 5);

      if (error) throw error;
      if (!signed?.signedUrl) throw new Error('Não foi possível gerar o link do anexo.');

      window.open(signed.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Erro ao baixar anexo da compra:', error);
      toast.error('Não foi possível baixar o anexo.');
    }
  };

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Carregando compra...</div>;
  }

  if (!data) {
    return <div className="py-10 text-center text-muted-foreground">Compra não encontrada.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compra {data.purchase.purchase_number}</h1>
          <p className="text-muted-foreground">Detalhes completos da compra</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/suprimentos/compras')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Fornecedor</CardTitle></CardHeader>
          <CardContent>{data.supplier?.trade_name || data.supplier?.corporate_name || '-'}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Data da compra</CardTitle></CardHeader>
          <CardContent>{formatDateSafe(data.purchase.purchase_date)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Status</CardTitle></CardHeader>
          <CardContent>{PURCHASE_STATUS_LABELS[data.purchase.status] || data.purchase.status}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Itens</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Volume</TableHead>
                <TableHead>Unitário</TableHead>
                <TableHead>Custo unit. real</TableHead>
                <TableHead>Total real</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.purchase_products?.name || item.description || '-'}</TableCell>
                  <TableCell>{item.quantity} {item.unit}</TableCell>
                  <TableCell>
                    {Number(item.units_per_purchase || 1) > 1
                      ? `${item.purchase_quantity || '-'} ${item.purchase_unit || 'vol'} x ${item.units_per_purchase} ${item.unit || 'un'}`
                      : '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(item.unit_price || 0)}</TableCell>
                  <TableCell>{formatCurrency(item.real_unit_cost || 0)}</TableCell>
                  <TableCell>{formatCurrency(item.real_total_cost || item.item_total || 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Custos extras</CardTitle></CardHeader>
        <CardContent>
          {data.extraCosts.length === 0 ? (
            <p className="text-muted-foreground">Sem custos extras.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Rateio</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.extraCosts.map((cost: any) => (
                  <TableRow key={cost.id}>
                    <TableCell>{cost.cost_type}</TableCell>
                    <TableCell>{cost.description || '-'}</TableCell>
                    <TableCell>{cost.allocation_method}</TableCell>
                    <TableCell>{formatCurrency(cost.amount || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Itens</p><p className="font-semibold">{formatCurrency(totals.items)}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Frete</p><p className="font-semibold">{formatCurrency(data.purchase.freight_total || 0)}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Extras</p><p className="font-semibold">{formatCurrency(totals.extras)}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Total final</p><p className="text-lg font-bold">{formatCurrency(data.purchase.final_total || 0)}</p></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Anexos da compra</CardTitle></CardHeader>
        <CardContent>
          {data.attachments.length === 0 ? (
            <p className="text-muted-foreground">Sem anexos nesta compra.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[130px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.attachments.map((attachment: any) => (
                  <TableRow key={attachment.id}>
                    <TableCell className="font-medium">{attachment.file_name || '-'}</TableCell>
                    <TableCell>{attachment.file_type || '-'}</TableCell>
                    <TableCell>{formatDateSafe(attachment.uploaded_at)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleDownloadAttachment(attachment)}>
                        <Download className="mr-1 h-4 w-4" />
                        Baixar
                      </Button>
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
