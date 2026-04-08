import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';
import { formatCurrency } from '@/lib/formatters';
import { calculatePurchasePreview, PURCHASE_ALLOCATION_LABELS, PURCHASE_STATUS_LABELS, safeNumber } from './helpers';
import { PurchaseExtraCostInput, PurchaseItemInput } from './types';

const defaultItem = (): PurchaseItemInput => ({
  product_id: '',
  description: '',
  quantity: 1,
  unit: 'un',
  unit_price: 0,
  item_discount: 0,
  notes: '',
});

const defaultExtra = (): PurchaseExtraCostInput => ({
  cost_type: 'outros',
  description: '',
  amount: 0,
  allocation_method: 'proportional_value',
  specific_product_id: null,
});

const defaultForm = {
  supplier_id: '',
  purchase_type: 'simple',
  purchase_date: new Date().toISOString().slice(0, 10),
  invoice_date: '',
  expected_delivery_date: '',
  actual_delivery_date: '',
  invoice_number: '',
  payment_terms: '',
  cost_center: '',
  status: 'quote',
  allocation_method: 'proportional_value',
  freight_total: '0',
  insurance_total: '0',
  impostos_adicionais: '0',
  other_cost_total: '0',
  notes: '',
};

export default function CompraForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(defaultForm);
  const [items, setItems] = useState<PurchaseItemInput[]>([defaultItem()]);
  const [extraCosts, setExtraCosts] = useState<PurchaseExtraCostInput[]>([]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['procurement-suppliers-options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers' as any).select('id, corporate_name, trade_name').eq('status', 'active').order('corporate_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ['procurement-products-options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('purchase_products' as any).select('id, name, unit').eq('status', 'active').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: extraCostTypes = [] } = useQuery({
    queryKey: ['procurement-extra-cost-types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('purchase_extra_cost_types' as any).select('name').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return (data ?? []).map((item: any) => item.name);
    },
  });

  const { data: purchaseData, isLoading } = useQuery({
    queryKey: ['procurement-purchase-form', id],
    enabled: isEdit,
    queryFn: async () => {
      const [{ data: purchase, error: purchaseError }, { data: purchaseItems, error: itemsError }, { data: costs, error: costsError }] = await Promise.all([
        supabase.from('purchases' as any).select('*').eq('id', id).single(),
        supabase.from('purchase_items' as any).select('*').eq('purchase_id', id).order('line_order'),
        supabase.from('purchase_extra_costs' as any).select('*').eq('purchase_id', id),
      ]);

      if (purchaseError) throw purchaseError;
      if (itemsError) throw itemsError;
      if (costsError) throw costsError;

      return { purchase, purchaseItems: purchaseItems ?? [], costs: costs ?? [] };
    },
  });

  useEffect(() => {
    if (!purchaseData) return;

    const p = purchaseData.purchase;
    setForm({
      supplier_id: p.supplier_id || '',
      purchase_type: p.purchase_type || 'simple',
      purchase_date: p.purchase_date || new Date().toISOString().slice(0, 10),
      invoice_date: p.invoice_date || '',
      expected_delivery_date: p.expected_delivery_date || '',
      actual_delivery_date: p.actual_delivery_date || '',
      invoice_number: p.invoice_number || '',
      payment_terms: p.payment_terms || '',
      cost_center: p.cost_center || '',
      status: p.status || 'quote',
      allocation_method: p.allocation_method || 'proportional_value',
      freight_total: String(p.freight_total || 0),
      insurance_total: String(p.insurance_total || 0),
      impostos_adicionais: String(p.impostos_adicionais || 0),
      other_cost_total: String(p.other_cost_total || 0),
      notes: p.notes || '',
    });

    setItems(
      purchaseData.purchaseItems.length
        ? purchaseData.purchaseItems.map((item: any) => ({
            id: item.id,
            product_id: item.product_id || '',
            description: item.description || '',
            quantity: Number(item.quantity || 0),
            unit: item.unit || 'un',
            unit_price: Number(item.unit_price || 0),
            item_discount: Number(item.item_discount || 0),
            notes: item.notes || '',
          }))
        : [defaultItem()]
    );

    setExtraCosts(
      purchaseData.costs.map((item: any) => ({
        id: item.id,
        cost_type: item.cost_type || 'outros',
        description: item.description || '',
        amount: Number(item.amount || 0),
        allocation_method: item.allocation_method || 'proportional_value',
        specific_product_id: item.specific_product_id || null,
      }))
    );
  }, [purchaseData]);

  const preview = useMemo(
    () =>
      calculatePurchasePreview(
        items,
        extraCosts,
        safeNumber(form.freight_total),
        safeNumber(form.insurance_total),
        safeNumber(form.impostos_adicionais),
        safeNumber(form.other_cost_total)
      ),
    [items, extraCosts, form.freight_total, form.insurance_total, form.impostos_adicionais, form.other_cost_total]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.supplier_id) throw new Error('Selecione um fornecedor.');
      if (items.filter((item) => item.product_id).length === 0) throw new Error('Adicione ao menos um item com produto.');

      const purchasePayload = {
        supplier_id: form.supplier_id,
        purchase_type: form.purchase_type,
        purchase_date: form.purchase_date,
        invoice_date: form.invoice_date || null,
        expected_delivery_date: form.expected_delivery_date || null,
        actual_delivery_date: form.actual_delivery_date || null,
        invoice_number: form.invoice_number || null,
        payment_terms: form.payment_terms || null,
        cost_center: form.cost_center || null,
        status: form.status,
        allocation_method: form.allocation_method,
        gross_total: preview.grossTotal,
        discount_total: preview.discountTotal,
        freight_total: safeNumber(form.freight_total),
        insurance_total: safeNumber(form.insurance_total),
        impostos_adicionais: safeNumber(form.impostos_adicionais),
        other_cost_total: safeNumber(form.other_cost_total),
        extra_cost_total: preview.extras,
        final_total: preview.finalTotal,
        notes: form.notes || null,
      };

      let purchaseId = id;

      if (isEdit) {
        const { error } = await supabase.from('purchases' as any).update(purchasePayload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('purchases' as any).insert(purchasePayload).select('id').single();
        if (error) throw error;
        purchaseId = data.id;
      }

      const itemsPayload = items
        .filter((item) => item.product_id)
        .map((item, index) => ({
          purchase_id: purchaseId,
          product_id: item.product_id,
          description: item.description || null,
          quantity: safeNumber(item.quantity),
          unit: item.unit || 'un',
          unit_price: safeNumber(item.unit_price),
          item_discount: safeNumber(item.item_discount),
          notes: item.notes || null,
          line_order: index + 1,
        }));

      const costsPayload = extraCosts
        .filter((cost) => safeNumber(cost.amount) > 0)
        .map((cost) => ({
          purchase_id: purchaseId,
          cost_type: cost.cost_type,
          description: cost.description || null,
          amount: safeNumber(cost.amount),
          allocation_method: cost.allocation_method,
          specific_product_id: cost.specific_product_id || null,
        }));

      const { error: deleteItemsError } = await supabase.from('purchase_items' as any).delete().eq('purchase_id', purchaseId);
      if (deleteItemsError) throw deleteItemsError;

      const { error: deleteCostsError } = await supabase.from('purchase_extra_costs' as any).delete().eq('purchase_id', purchaseId);
      if (deleteCostsError) throw deleteCostsError;

      if (itemsPayload.length > 0) {
        const { error: insertItemsError } = await supabase.from('purchase_items' as any).insert(itemsPayload);
        if (insertItemsError) throw insertItemsError;
      }

      if (costsPayload.length > 0) {
        const { error: insertCostsError } = await supabase.from('purchase_extra_costs' as any).insert(costsPayload);
        if (insertCostsError) throw insertCostsError;
      }

      const { error: recalcError } = await supabase.rpc('procurement_recalculate_purchase' as any, { p_purchase_id: purchaseId });
      if (recalcError) throw recalcError;
    },
    onSuccess: () => {
      toast.success(`Compra ${isEdit ? 'atualizada' : 'cadastrada'} com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ['procurement-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-price-history'] });
      navigate('/suprimentos/compras');
    },
    onError: (error: any) => toast.error(sanitizeError(error)),
  });

  if (isEdit && isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Carregando compra...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Editar compra' : 'Nova compra'}</h1>
          <p className="text-muted-foreground">Lançamento completo de compra com rateio e custos extras</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/suprimentos/compras')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar compra'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Cabeçalho da compra</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Fornecedor *</Label>
            <Select value={form.supplier_id || '__none__'} onValueChange={(value) => setForm((prev) => ({ ...prev, supplier_id: value === '__none__' ? '' : value }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecione</SelectItem>
                {suppliers.map((supplier: any) => (
                  <SelectItem key={supplier.id} value={supplier.id}>{supplier.trade_name || supplier.corporate_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Tipo de compra</Label><Input value={form.purchase_type} onChange={(e) => setForm((prev) => ({ ...prev, purchase_type: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Data da compra</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm((prev) => ({ ...prev, purchase_date: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Data emissão NF</Label><Input type="date" value={form.invoice_date} onChange={(e) => setForm((prev) => ({ ...prev, invoice_date: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Entrega prevista</Label><Input type="date" value={form.expected_delivery_date} onChange={(e) => setForm((prev) => ({ ...prev, expected_delivery_date: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Entrega real</Label><Input type="date" value={form.actual_delivery_date} onChange={(e) => setForm((prev) => ({ ...prev, actual_delivery_date: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Número NF</Label><Input value={form.invoice_number} onChange={(e) => setForm((prev) => ({ ...prev, invoice_number: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Condição de pagamento</Label><Input value={form.payment_terms} onChange={(e) => setForm((prev) => ({ ...prev, payment_terms: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Centro de custo</Label><Input value={form.cost_center} onChange={(e) => setForm((prev) => ({ ...prev, cost_center: e.target.value }))} /></div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PURCHASE_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Método de rateio padrão</Label>
            <Select value={form.allocation_method} onValueChange={(value) => setForm((prev) => ({ ...prev, allocation_method: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PURCHASE_ALLOCATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-3"><Label>Observações gerais</Label><Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Itens da compra</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setItems((prev) => [...prev, defaultItem()])}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar item
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto/Insumo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Valor unitário</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={`item-${index}`}>
                  <TableCell>
                    <Select
                      value={item.product_id || '__none__'}
                      onValueChange={(value) => {
                        const productId = value === '__none__' ? '' : value;
                        const selected = products.find((product: any) => product.id === productId);
                        setItems((prev) =>
                          prev.map((row, idx) =>
                            idx === index
                              ? {
                                  ...row,
                                  product_id: productId,
                                  description: row.description || selected?.name || '',
                                  unit: selected?.unit || row.unit,
                                }
                              : row
                          )
                        );
                      }}
                    >
                      <SelectTrigger className="w-[240px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Selecione</SelectItem>
                        {products.map((product: any) => (
                          <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input value={item.description} onChange={(e) => setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, description: e.target.value } : row)))} /></TableCell>
                  <TableCell><Input type="number" step="0.0001" value={item.quantity} onChange={(e) => setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, quantity: Number(e.target.value) } : row)))} /></TableCell>
                  <TableCell><Input value={item.unit} onChange={(e) => setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, unit: e.target.value } : row)))} /></TableCell>
                  <TableCell><Input type="number" step="0.0001" value={item.unit_price} onChange={(e) => setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, unit_price: Number(e.target.value) } : row)))} /></TableCell>
                  <TableCell><Input type="number" step="0.01" value={item.item_discount} onChange={(e) => setItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, item_discount: Number(e.target.value) } : row)))} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setItems((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Custos extras</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setExtraCosts((prev) => [...prev, defaultExtra()])}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar custo
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Rateio</TableHead>
                <TableHead>Item específico</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extraCosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Nenhum custo extra adicionado.</TableCell>
                </TableRow>
              ) : (
                extraCosts.map((cost, index) => (
                  <TableRow key={`cost-${index}`}>
                    <TableCell>
                      <Select value={cost.cost_type} onValueChange={(value) => setExtraCosts((prev) => prev.map((row, idx) => (idx === index ? { ...row, cost_type: value } : row)))}>
                        <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {(extraCostTypes.length ? extraCostTypes : ['instalacao', 'descarga', 'beneficiamento', 'frete adicional', 'taxa', 'armazenamento', 'conferencia', 'embalagem extra', 'outros']).map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input value={cost.description} onChange={(e) => setExtraCosts((prev) => prev.map((row, idx) => (idx === index ? { ...row, description: e.target.value } : row)))} /></TableCell>
                    <TableCell><Input type="number" step="0.01" value={cost.amount} onChange={(e) => setExtraCosts((prev) => prev.map((row, idx) => (idx === index ? { ...row, amount: Number(e.target.value) } : row)))} /></TableCell>
                    <TableCell>
                      <Select value={cost.allocation_method} onValueChange={(value: any) => setExtraCosts((prev) => prev.map((row, idx) => (idx === index ? { ...row, allocation_method: value } : row)))}>
                        <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(PURCHASE_ALLOCATION_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={cost.specific_product_id || '__none__'}
                        onValueChange={(value) => setExtraCosts((prev) => prev.map((row, idx) => (idx === index ? { ...row, specific_product_id: value === '__none__' ? null : value } : row)))}
                      >
                        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Opcional" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhum</SelectItem>
                          {Array.from(new Set(items.filter((item) => item.product_id).map((item) => item.product_id))).map((productId: string) => {
                            const product = products.find((p: any) => p.id === productId);
                            return (
                              <SelectItem key={productId} value={productId}>
                                {product?.name || productId}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setExtraCosts((prev) => prev.filter((_, idx) => idx !== index))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Totais da compra (prévia)</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label>Frete</Label><Input type="number" step="0.01" value={form.freight_total} onChange={(e) => setForm((prev) => ({ ...prev, freight_total: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Seguro</Label><Input type="number" step="0.01" value={form.insurance_total} onChange={(e) => setForm((prev) => ({ ...prev, insurance_total: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Impostos adicionais</Label><Input type="number" step="0.01" value={form.impostos_adicionais} onChange={(e) => setForm((prev) => ({ ...prev, impostos_adicionais: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Outros custos</Label><Input type="number" step="0.01" value={form.other_cost_total} onChange={(e) => setForm((prev) => ({ ...prev, other_cost_total: e.target.value }))} /></div>
          <div className="md:col-span-2" />
          <div className="rounded-md border p-4 space-y-1">
            <p className="text-sm text-muted-foreground">Valor bruto</p>
            <p className="text-lg font-semibold">{formatCurrency(preview.grossTotal)}</p>
          </div>
          <div className="rounded-md border p-4 space-y-1">
            <p className="text-sm text-muted-foreground">Desconto</p>
            <p className="text-lg font-semibold">{formatCurrency(preview.discountTotal)}</p>
          </div>
          <div className="rounded-md border p-4 space-y-1">
            <p className="text-sm text-muted-foreground">Custos extras</p>
            <p className="text-lg font-semibold">{formatCurrency(preview.extras)}</p>
          </div>
          <div className="rounded-md border p-4 space-y-1 md:col-span-3">
            <p className="text-sm text-muted-foreground">Total final estimado</p>
            <p className="text-2xl font-bold">{formatCurrency(preview.finalTotal)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar compra'}
        </Button>
      </div>
    </div>
  );
}
