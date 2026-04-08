import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Search, Eye, Pencil, FileUp, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCurrency, formatDateSafe } from '@/lib/formatters';
import { PURCHASE_STATUS_LABELS } from './helpers';
import {
  importPurchaseFromNfeXml,
  previewNfeXmlFile,
  type NfeXmlPreviewData,
  type NfeXmlPreviewItem,
} from './nfeXmlImport';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

const CATEGORY_OPTIONS = [
  'malha',
  'tecido pronto',
  'fio',
  'ribana',
  'tinta',
  'aviamento',
  'etiqueta',
  'embalagem',
  'servico terceirizado',
  'frete',
  'instalacao',
  'manutencao',
  'outros',
];

interface PurchaseListRow {
  id: string;
  purchase_number: string;
  purchase_date: string;
  invoice_number?: string | null;
  status: string;
  final_total: number;
  supplier_id?: string | null;
  supplier?: { trade_name: string | null; corporate_name: string | null } | null;
  items_count: number;
  product_summary: string;
  category_summary: string;
  volume_quantity_summary: string;
  volume_price_summary: string;
  search_blob: string;
}

function parseNumberInput(value: string, fallback = 0): number {
  if (!value) return fallback;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveItemGrossTotal(item: NfeXmlPreviewItem): number {
  if (Number.isFinite(item.total) && item.total > 0) return Number(item.total);
  return Number((Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(6));
}

function formatCurrencyPrecise(value: number): string {
  if (!Number.isFinite(value)) return 'R$ 0,00';
  if (Math.abs(value) > 0 && Math.abs(value) < 0.01) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4, maximumFractionDigits: 6 });
  }
  return formatCurrency(value);
}

export default function ComprasLista() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [previewOriginal, setPreviewOriginal] = useState<NfeXmlPreviewData | null>(null);
  const [previewData, setPreviewData] = useState<NfeXmlPreviewData | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<{ id: string; purchaseNumber: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canCreate = can('procurement.purchases.create');
  const canEdit = can('procurement.purchases.edit');
  const canDelete = can('procurement.purchases.delete');

  const importXmlMutation = useMutation({
    mutationFn: async ({ file, preview }: { file: File; preview: NfeXmlPreviewData | null }) =>
      importPurchaseFromNfeXml(file, preview || undefined),
    onSuccess: (result) => {
      toast.success('Compra excluída com sucesso.');
      result.warnings?.forEach((warning) => toast.warning(warning));
      queryClient.invalidateQueries({ queryKey: ['procurement-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-price-history'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-products'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      setPreviewOpen(false);
      setPreviewData(null);
      setPreviewOriginal(null);
      setPreviewFile(null);
      navigate(`/suprimentos/compras/${result.purchaseId}`);
    },
    onError: (error: any) => {
      toast.error(error instanceof Error ? error.message : sanitizeError(error));
    },
  });

  const previewXmlMutation = useMutation({
    mutationFn: async (file: File) => previewNfeXmlFile(file),
    onSuccess: (data, file) => {
      const cloned = JSON.parse(JSON.stringify(data)) as NfeXmlPreviewData;
      setPreviewOriginal(cloned);
      setPreviewData(cloned);
      setPreviewFile(file);
      setPreviewOpen(true);
    },
    onError: (error: any) => {
      toast.error(error instanceof Error ? error.message : sanitizeError(error));
    },
  });

  const deletePurchaseMutation = useMutation({
    mutationFn: async (purchaseId: string) => {
      const { error } = await supabase
        .from('purchases' as any)
        .delete()
        .eq('id', purchaseId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Compra excluida com sucesso.');
      setPurchaseToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['procurement-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-price-history'] });
    },
    onError: (error: any) => {
      toast.error(error instanceof Error ? error.message : sanitizeError(error));
    },
  });

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    previewXmlMutation.mutate(file);
  };

  const handleConfirmImport = () => {
    if (!previewFile) return;
    importXmlMutation.mutate({ file: previewFile, preview: previewData });
  };

  const handleResetPreview = () => {
    if (!previewOriginal) return;
    const cloned = JSON.parse(JSON.stringify(previewOriginal)) as NfeXmlPreviewData;
    setPreviewData(cloned);
    toast.info('Prévia restaurada com os dados originais do XML.');
  };

  const updatePreviewItem = (index: number, updater: (item: NfeXmlPreviewItem) => NfeXmlPreviewItem) => {
    setPreviewData((prev) => {
      if (!prev) return prev;
      const nextItems = prev.items.map((item, idx) => (idx === index ? updater(item) : item));
      return { ...prev, items: nextItems };
    });
  };

  const previewTotals = useMemo(() => {
    if (!previewData) {
      return { gross: 0, discount: 0, net: 0, final: 0 };
    }
    const gross = previewData.items.reduce((sum, item) => sum + resolveItemGrossTotal(item), 0);
    const discount = previewData.items.reduce((sum, item) => sum + item.discount, 0);
    const net = gross - discount;
    const final =
      net +
      Number(previewData.totals.freight || 0) +
      Number(previewData.totals.insurance || 0) +
      Number(previewData.totals.taxes || 0) +
      Number(previewData.totals.otherCosts || 0);

    return { gross, discount, net, final };
  }, [previewData]);

  const { data: purchases = [], isLoading } = useQuery<PurchaseListRow[]>({
    queryKey: ['procurement-purchases', search, status],
    queryFn: async () => {
      let query = supabase
        .from('purchases' as any)
        .select('id, purchase_number, purchase_date, invoice_number, status, final_total, supplier_id')
        .order('purchase_date', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data ?? [];
      if (rows.length === 0) return [];

      const purchaseIds = rows.map((row: any) => row.id);
      const supplierIds = Array.from(new Set(rows.map((row: any) => row.supplier_id).filter(Boolean)));
      let suppliersById: Record<string, { trade_name: string | null; corporate_name: string | null }> = {};
      let itemsByPurchaseId: Record<string, any[]> = {};

      if (supplierIds.length > 0) {
        const { data: supplierRows, error: supplierError } = await supabase
          .from('suppliers' as any)
          .select('id, trade_name, corporate_name')
          .in('id', supplierIds as string[]);
        if (supplierError) throw supplierError;
        suppliersById = Object.fromEntries((supplierRows ?? []).map((item: any) => [item.id, item]));
      }

      if (purchaseIds.length > 0) {
        const { data: itemRows, error: itemsError } = await supabase
          .from('purchase_items' as any)
          .select('purchase_id, description, quantity, unit, unit_price, item_total, real_total_cost, purchase_quantity, purchase_unit, units_per_purchase, purchase_products(name, category)')
          .in('purchase_id', purchaseIds as string[])
          .order('line_order', { ascending: true });
        if (itemsError) throw itemsError;

        for (const item of itemRows ?? []) {
          if (!itemsByPurchaseId[item.purchase_id]) itemsByPurchaseId[item.purchase_id] = [];
          itemsByPurchaseId[item.purchase_id].push(item);
        }
      }

      const mappedRows = rows.map((row: any) => {
        const supplier = row.supplier_id ? suppliersById[row.supplier_id] : null;
        const supplierName = supplier?.trade_name || supplier?.corporate_name || '';
        const items = itemsByPurchaseId[row.id] || [];
        const firstItem = items[0] || null;

        const uniqueProducts = Array.from(
          new Set(
            items
              .map((item: any) => (item.purchase_products?.name || item.description || '').trim())
              .filter(Boolean),
          ),
        );
        const uniqueCategories = Array.from(
          new Set(
            items
              .map((item: any) => (item.purchase_products?.category || '').trim())
              .filter(Boolean),
          ),
        );

        const product_summary =
          uniqueProducts.length === 0
            ? '-'
            : uniqueProducts.length === 1
              ? uniqueProducts[0]
              : `${uniqueProducts[0]} (+${uniqueProducts.length - 1})`;

        const category_summary =
          uniqueCategories.length === 0
            ? '-'
            : uniqueCategories.length === 1
              ? uniqueCategories[0]
              : `${uniqueCategories[0]} +${uniqueCategories.length - 1}`;

        const totalGross = items.reduce((sum: number, item: any) => {
          const gross = Number(item.real_total_cost ?? item.item_total ?? Number(item.quantity || 0) * Number(item.unit_price || 0));
          return sum + (Number.isFinite(gross) ? gross : 0);
        }, 0);

        const totalPurchaseQty = items.reduce((sum: number, item: any) => {
          const qty = Number(item.purchase_quantity || item.quantity || 0);
          return sum + (Number.isFinite(qty) ? qty : 0);
        }, 0);

        const volume_quantity_summary = firstItem
          ? items.length === 1
            ? `${firstItem.purchase_quantity || firstItem.quantity || 0} ${firstItem.purchase_unit || 'vol'}${Number(firstItem.units_per_purchase || 1) > 1 ? ` x ${firstItem.units_per_purchase} ${firstItem.unit || 'un'}` : ''}`
            : `${Number(totalPurchaseQty.toFixed(2))} volumes (${items.length} itens)`
          : '-';

        const firstItemVolumePrice = firstItem
          ? Number(firstItem.unit_price || 0) * Number(firstItem.units_per_purchase || 1)
          : 0;
        const averageVolumePrice = totalPurchaseQty > 0 ? totalGross / totalPurchaseQty : 0;

        const volume_price_summary = firstItem
          ? items.length === 1
            ? formatCurrency(firstItemVolumePrice)
            : `médio ${formatCurrency(averageVolumePrice)}`
          : '-';

        const searchTokens = [
          row.purchase_number,
          row.invoice_number,
          supplierName,
          ...uniqueProducts,
          ...uniqueCategories,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return {
          ...row,
          supplier,
          items_count: items.length,
          product_summary,
          category_summary,
          volume_quantity_summary,
          volume_price_summary,
          search_blob: searchTokens,
        } as PurchaseListRow;
      });

      const searchTerm = search.trim().toLowerCase();
      if (!searchTerm) return mappedRows;
      return mappedRows.filter((row) => row.search_blob.includes(searchTerm));
    },
  });

  const isProcessingImport = previewXmlMutation.isPending || importXmlMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compras</h1>
          <p className="text-muted-foreground">Lançamento e acompanhamento de compras</p>
        </div>
        {canCreate && (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              className="hidden"
              onChange={handleFileSelected}
            />
            <Button variant="outline" onClick={handleImportClick} disabled={isProcessingImport}>
              {isProcessingImport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
              {isProcessingImport ? 'Processando XML...' : 'Importar XML NF-e'}
            </Button>
            <Button onClick={() => navigate('/suprimentos/compras/nova')}>
              <Plus className="mr-2 h-4 w-4" />
              Nova compra
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de compras</CardTitle>
          <div className="grid gap-3 md:grid-cols-[1fr_260px] mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por compra, NF, fornecedor, produto ou categoria"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="quote">Orçamento</SelectItem>
                <SelectItem value="issued">Pedido emitido</SelectItem>
                <SelectItem value="partially_received">Parcialmente recebido</SelectItem>
                <SelectItem value="received">Recebido</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : purchases.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma compra encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Produto / categoria</TableHead>
                  <TableHead>Qtd por volume</TableHead>
                  <TableHead>Valor por volume</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total final</TableHead>
                  <TableHead className="w-[320px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => {
                  const supplier = purchase.supplier;

                  return (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">{purchase.purchase_number}</TableCell>
                      <TableCell>{formatDateSafe(purchase.purchase_date)}</TableCell>
                      <TableCell>{supplier?.trade_name || supplier?.corporate_name || '-'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{purchase.product_summary}</span>
                          <span className="text-xs text-muted-foreground">{purchase.category_summary}</span>
                        </div>
                      </TableCell>
                      <TableCell>{purchase.volume_quantity_summary}</TableCell>
                      <TableCell>{purchase.volume_price_summary}</TableCell>
                      <TableCell>{PURCHASE_STATUS_LABELS[purchase.status] || purchase.status}</TableCell>
                      <TableCell>{formatCurrency(purchase.final_total || 0)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => navigate(`/suprimentos/compras/${purchase.id}`)}>
                            <Eye className="h-4 w-4 mr-1" /> Ver
                          </Button>
                          {canEdit && (
                            <Button size="sm" variant="outline" onClick={() => navigate(`/suprimentos/compras/editar/${purchase.id}`)}>
                              <Pencil className="h-4 w-4 mr-1" /> Editar
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setPurchaseToDelete({ id: purchase.id, purchaseNumber: purchase.purchase_number })}
                            >
                              <Trash2 className="h-4 w-4 mr-1" /> Excluir
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[1400px] max-h-[92vh] overflow-hidden grid-rows-[auto_minmax(0,1fr)_auto]">
          <DialogHeader>
            <DialogTitle>Pré-visualização do XML da NF-e</DialogTitle>
            <DialogDescription>
              Revise e ajuste os dados antes de gerar a compra automaticamente.
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4 min-w-0 min-h-0 overflow-y-auto pr-1">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{previewData.supplier.corporateName}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Número da NF</p>
                  <p className="font-medium">{previewData.invoiceNumber || '-'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Emissão</p>
                  <p className="font-medium">{formatDateSafe(previewData.issueDate)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Itens</p>
                  <p className="font-medium">{previewData.items.length}</p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Frete</p>
                  <p className="font-medium">{formatCurrency(previewData.totals.freight)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Seguro</p>
                  <p className="font-medium">{formatCurrency(previewData.totals.insurance)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Impostos adicionais</p>
                  <p className="font-medium">{formatCurrency(previewData.totals.taxes)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Outros custos</p>
                  <p className="font-medium">{formatCurrency(previewData.totals.otherCosts)}</p>
                </div>
              </div>

              <div className="max-h-[360px] min-w-0 overflow-x-auto overflow-y-auto rounded-md border">
                <div className="min-w-[1280px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[240px]">Item</TableHead>
                      <TableHead className="min-w-[95px]">Qtd vol.</TableHead>
                      <TableHead className="min-w-[95px]">Un vol.</TableHead>
                      <TableHead className="min-w-[120px]">Conteúdo/vol.</TableHead>
                      <TableHead className="min-w-[105px]">Qtd final</TableHead>
                      <TableHead className="min-w-[95px]">Un final</TableHead>
                      <TableHead className="min-w-[115px]">Vlr/vol.</TableHead>
                      <TableHead className="min-w-[115px]">Vlr final</TableHead>
                      <TableHead className="min-w-[110px]">Total</TableHead>
                      <TableHead className="min-w-[170px]">NCM/CFOP</TableHead>
                      <TableHead className="min-w-[160px]">Categoria</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.items.map((item, index) => {
                      const itemGross = resolveItemGrossTotal(item);
                      const itemTotal = itemGross - Number(item.discount || 0);
                      const effectiveQuantity = Number((item.quantity * (item.unitsPerPurchase || 1)).toFixed(4));
                      const effectiveUnitPrice =
                        item.unitsPerPurchase > 0
                          ? Number((item.unitPrice / item.unitsPerPurchase).toFixed(6))
                          : item.unitPrice;
                      return (
                        <TableRow key={`preview-item-${index}`}>
                          <TableCell>
                            <Input
                              value={item.name}
                              onChange={(e) =>
                                updatePreviewItem(index, (prev) => ({
                                  ...prev,
                                  name: e.target.value,
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.0001"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQty = parseNumberInput(e.target.value, 0);
                                if (newQty <= 0) return;
                                updatePreviewItem(index, (prev) => {
                                  const grossTarget = resolveItemGrossTotal(prev);
                                  return {
                                    ...prev,
                                    quantity: newQty,
                                    unitPrice: newQty > 0 ? Number((grossTarget / newQty).toFixed(6)) : prev.unitPrice,
                                    total: Number(grossTarget.toFixed(6)),
                                  };
                                });
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.purchaseUnit || item.unit}
                              onChange={(e) =>
                                updatePreviewItem(index, (prev) => ({
                                  ...prev,
                                  purchaseUnit: e.target.value.trim().toLowerCase(),
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.0001"
                              value={item.unitsPerPurchase}
                              onChange={(e) => {
                                const unitsPerPurchase = parseNumberInput(e.target.value, 1);
                                if (unitsPerPurchase <= 0) return;
                                updatePreviewItem(index, (prev) => ({
                                  ...prev,
                                  unitsPerPurchase,
                                }));
                              }}
                            />
                          </TableCell>
                          <TableCell>{effectiveQuantity}</TableCell>
                          <TableCell>
                            <Input
                              value={item.normalizedUnit}
                              onChange={(e) =>
                                updatePreviewItem(index, (prev) => ({
                                  ...prev,
                                  normalizedUnit: e.target.value.trim().toLowerCase(),
                                  unit: e.target.value.trim(),
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.000001"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const unitPrice = parseNumberInput(e.target.value, item.unitPrice);
                                updatePreviewItem(index, (prev) => ({
                                  ...prev,
                                  unitPrice,
                                  total: Number((Number(prev.quantity || 0) * unitPrice).toFixed(6)),
                                }));
                              }}
                            />
                          </TableCell>
                          <TableCell>{formatCurrencyPrecise(effectiveUnitPrice)}</TableCell>
                          <TableCell>{formatCurrency(itemTotal)}</TableCell>
                          <TableCell>{`${item.ncm || '-'} / ${item.cfop || '-'}`}</TableCell>
                          <TableCell>
                            <Select
                              value={item.categorySuggestion || 'outros'}
                              onValueChange={(value) =>
                                updatePreviewItem(index, (prev) => ({
                                  ...prev,
                                  categorySuggestion: value,
                                }))
                              }
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {CATEGORY_OPTIONS.map((category) => (
                                  <SelectItem key={`${index}-${category}`} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Valor bruto itens</p>
                  <p className="font-semibold">{formatCurrency(previewTotals.gross)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Desconto itens</p>
                  <p className="font-semibold">{formatCurrency(previewTotals.discount)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Subtotal itens</p>
                  <p className="font-semibold">{formatCurrency(previewTotals.net)}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Total estimado da compra</p>
                  <p className="font-semibold">{formatCurrency(previewTotals.final)}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-4 flex items-center justify-between sm:justify-between">
            <Button variant="outline" onClick={handleResetPreview} disabled={importXmlMutation.isPending || !previewOriginal}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar XML
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPreviewOpen(false)} disabled={importXmlMutation.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmImport} disabled={importXmlMutation.isPending || !previewData || !previewFile}>
                {importXmlMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Confirmar importação
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!purchaseToDelete} onOpenChange={(open) => !open && setPurchaseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir compra</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a compra <strong>{purchaseToDelete?.purchaseNumber}</strong> e seus itens/custos vinculados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePurchaseMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePurchaseMutation.isPending || !purchaseToDelete}
              onClick={() => {
                if (!purchaseToDelete) return;
                deletePurchaseMutation.mutate(purchaseToDelete.id);
              }}
            >
              {deletePurchaseMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

