import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

interface SupplierLinkRow {
  supplier_id: string;
  supplier_product_code: string;
  standard_price: string;
  standard_lead_time: string;
  minimum_quantity: string;
  is_preferred: boolean;
  notes: string;
}

const defaultForm = {
  internal_code: '',
  alternate_code: '',
  name: '',
  category: 'outros',
  subcategory: '',
  unit: 'un',
  description: '',
  composition: '',
  weight: '',
  width: '',
  color: '',
  finish: '',
  conversion_factor: '1',
  item_type: 'materia_prima',
  status: 'active',
  notes: '',
};

const defaultSupplierLink = (): SupplierLinkRow => ({
  supplier_id: '',
  supplier_product_code: '',
  standard_price: '',
  standard_lead_time: '',
  minimum_quantity: '',
  is_preferred: false,
  notes: '',
});

export default function InsumoForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(defaultForm);
  const [supplierLinks, setSupplierLinks] = useState<SupplierLinkRow[]>([defaultSupplierLink()]);
  const [conversion, setConversion] = useState({ purchase_unit: '', usage_unit: '', conversion_factor: '' });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['procurement-suppliers-options'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers' as any).select('id, corporate_name, trade_name').eq('status', 'active').order('corporate_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['procurement-product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_categories' as any).select('name').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return (data ?? []).map((item: any) => item.name);
    },
  });

  const { data: productData, isLoading } = useQuery({
    queryKey: ['procurement-product', id],
    enabled: isEdit,
    queryFn: async () => {
      const [{ data: product, error: productError }, { data: links, error: linksError }, { data: conversions, error: conversionError }] = await Promise.all([
        supabase.from('purchase_products' as any).select('*').eq('id', id).single(),
        supabase.from('supplier_products' as any).select('*').eq('product_id', id).order('is_preferred', { ascending: false }),
        supabase.from('product_unit_conversions' as any).select('*').eq('product_id', id).limit(1),
      ]);

      if (productError) throw productError;
      if (linksError) throw linksError;
      if (conversionError) throw conversionError;

      return { product, links: links ?? [], conversion: conversions?.[0] ?? null };
    },
  });

  useEffect(() => {
    if (!productData) return;

    const product = productData.product;
    setForm({
      internal_code: product.internal_code || '',
      alternate_code: product.alternate_code || '',
      name: product.name || '',
      category: product.category || 'outros',
      subcategory: product.subcategory || '',
      unit: product.unit || 'un',
      description: product.description || '',
      composition: product.composition || '',
      weight: product.weight?.toString() || '',
      width: product.width?.toString() || '',
      color: product.color || '',
      finish: product.finish || '',
      conversion_factor: product.conversion_factor?.toString() || '1',
      item_type: product.item_type || 'materia_prima',
      status: product.status || 'active',
      notes: product.notes || '',
    });

    const rows = productData.links.map((link: any) => ({
      supplier_id: link.supplier_id,
      supplier_product_code: link.supplier_product_code || '',
      standard_price: link.standard_price?.toString() || '',
      standard_lead_time: link.standard_lead_time?.toString() || '',
      minimum_quantity: link.minimum_quantity?.toString() || '',
      is_preferred: !!link.is_preferred,
      notes: link.notes || '',
    }));
    setSupplierLinks(rows.length ? rows : [defaultSupplierLink()]);

    if (productData.conversion) {
      setConversion({
        purchase_unit: productData.conversion.purchase_unit || '',
        usage_unit: productData.conversion.usage_unit || '',
        conversion_factor: productData.conversion.conversion_factor?.toString() || '',
      });
    }
  }, [productData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) {
        throw new Error('Nome do item é obrigatório.');
      }

      const payload = {
        internal_code: form.internal_code || null,
        alternate_code: form.alternate_code || null,
        name: form.name.trim(),
        category: form.category,
        subcategory: form.subcategory || null,
        unit: form.unit || 'un',
        description: form.description || null,
        composition: form.composition || null,
        weight: form.weight ? Number(form.weight) : null,
        width: form.width ? Number(form.width) : null,
        color: form.color || null,
        finish: form.finish || null,
        conversion_factor: form.conversion_factor ? Number(form.conversion_factor) : 1,
        item_type: form.item_type,
        status: form.status,
        notes: form.notes || null,
      };

      let productId = id;

      if (isEdit) {
        const { error } = await supabase.from('purchase_products' as any).update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('purchase_products' as any).insert(payload).select('id').single();
        if (error) throw error;
        productId = data.id;
      }

      const linksToSave = supplierLinks
        .filter((link) => link.supplier_id)
        .map((link) => ({
          supplier_id: link.supplier_id,
          product_id: productId,
          supplier_product_code: link.supplier_product_code || null,
          standard_price: link.standard_price ? Number(link.standard_price) : null,
          standard_lead_time: link.standard_lead_time ? Number(link.standard_lead_time) : null,
          minimum_quantity: link.minimum_quantity ? Number(link.minimum_quantity) : null,
          is_preferred: link.is_preferred,
          notes: link.notes || null,
        }));

      const { error: deleteLinksError } = await supabase.from('supplier_products' as any).delete().eq('product_id', productId);
      if (deleteLinksError) throw deleteLinksError;

      if (linksToSave.length > 0) {
        const { error: insertLinksError } = await supabase.from('supplier_products' as any).insert(linksToSave);
        if (insertLinksError) throw insertLinksError;
      }

      const { error: deleteConvError } = await supabase.from('product_unit_conversions' as any).delete().eq('product_id', productId);
      if (deleteConvError) throw deleteConvError;

      if (conversion.purchase_unit && conversion.usage_unit && conversion.conversion_factor) {
        const { error: insertConvError } = await supabase.from('product_unit_conversions' as any).insert({
          product_id: productId,
          purchase_unit: conversion.purchase_unit,
          usage_unit: conversion.usage_unit,
          conversion_factor: Number(conversion.conversion_factor),
        });
        if (insertConvError) throw insertConvError;
      }
    },
    onSuccess: () => {
      toast.success(`Item ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ['procurement-products'] });
      navigate('/suprimentos/insumos');
    },
    onError: (error: any) => toast.error(sanitizeError(error)),
  });

  const categoryOptions = useMemo(() => {
    if (categories.length > 0) return categories;
    return ['malha', 'tecido pronto', 'fio', 'ribana', 'tinta', 'aviamento', 'etiqueta', 'embalagem', 'servico terceirizado', 'frete', 'instalacao', 'manutencao', 'outros'];
  }, [categories]);

  if (isEdit && isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Carregando item...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Editar produto/insumo' : 'Novo produto/insumo'}</h1>
          <p className="text-muted-foreground">Cadastro para compras com múltiplos fornecedores</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/suprimentos/insumos')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar item'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados do item</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Código interno</Label><Input value={form.internal_code} onChange={(e) => setForm((prev) => ({ ...prev, internal_code: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Código alternativo</Label><Input value={form.alternate_code} onChange={(e) => setForm((prev) => ({ ...prev, alternate_code: e.target.value }))} /></div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categoryOptions.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Subcategoria</Label><Input value={form.subcategory} onChange={(e) => setForm((prev) => ({ ...prev, subcategory: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))} /></div>
          <div className="space-y-2">
            <Label>Tipo de item</Label>
            <Select value={form.item_type} onValueChange={(value) => setForm((prev) => ({ ...prev, item_type: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="materia_prima">Matéria-prima</SelectItem>
                <SelectItem value="produto_pronto">Produto pronto</SelectItem>
                <SelectItem value="servico">Serviço</SelectItem>
                <SelectItem value="custo_indireto">Custo indireto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Gramatura/Peso</Label><Input type="number" step="0.01" value={form.weight} onChange={(e) => setForm((prev) => ({ ...prev, weight: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Largura</Label><Input type="number" step="0.01" value={form.width} onChange={(e) => setForm((prev) => ({ ...prev, width: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Cor</Label><Input value={form.color} onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Acabamento</Label><Input value={form.finish} onChange={(e) => setForm((prev) => ({ ...prev, finish: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Fator conversão padrão</Label><Input type="number" step="0.0001" value={form.conversion_factor} onChange={(e) => setForm((prev) => ({ ...prev, conversion_factor: e.target.value }))} /></div>
          <div className="flex items-center gap-3 mt-8">
            <Switch checked={form.status === 'active'} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, status: checked ? 'active' : 'inactive' }))} />
            <span>{form.status === 'active' ? 'Item ativo' : 'Item inativo'}</span>
          </div>
          <div className="space-y-2 md:col-span-3"><Label>Descrição técnica</Label><Textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-3"><Label>Composição</Label><Textarea value={form.composition} onChange={(e) => setForm((prev) => ({ ...prev, composition: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-3"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Conversão de unidade (opcional)</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2"><Label>Unidade de compra</Label><Input value={conversion.purchase_unit} onChange={(e) => setConversion((prev) => ({ ...prev, purchase_unit: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Unidade de uso</Label><Input value={conversion.usage_unit} onChange={(e) => setConversion((prev) => ({ ...prev, usage_unit: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Fator</Label><Input type="number" step="0.0001" value={conversion.conversion_factor} onChange={(e) => setConversion((prev) => ({ ...prev, conversion_factor: e.target.value }))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fornecedores vinculados</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setSupplierLinks((prev) => [...prev, defaultSupplierLink()])}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar fornecedor
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Código fornecedor</TableHead>
                <TableHead>Preço padrão</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Qtd mínima</TableHead>
                <TableHead>Preferencial</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierLinks.map((row, index) => (
                <TableRow key={`supplier-link-${index}`}>
                  <TableCell>
                    <Select
                      value={row.supplier_id || '__none__'}
                      onValueChange={(value) =>
                        setSupplierLinks((prev) => prev.map((item, i) => (i === index ? { ...item, supplier_id: value === '__none__' ? '' : value } : item)))
                      }
                    >
                      <SelectTrigger className="w-[230px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Selecione</SelectItem>
                        {suppliers.map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id}>{supplier.trade_name || supplier.corporate_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input value={row.supplier_product_code} onChange={(e) => setSupplierLinks((prev) => prev.map((item, i) => (i === index ? { ...item, supplier_product_code: e.target.value } : item)))} /></TableCell>
                  <TableCell><Input type="number" step="0.01" value={row.standard_price} onChange={(e) => setSupplierLinks((prev) => prev.map((item, i) => (i === index ? { ...item, standard_price: e.target.value } : item)))} /></TableCell>
                  <TableCell><Input type="number" value={row.standard_lead_time} onChange={(e) => setSupplierLinks((prev) => prev.map((item, i) => (i === index ? { ...item, standard_lead_time: e.target.value } : item)))} /></TableCell>
                  <TableCell><Input type="number" step="0.01" value={row.minimum_quantity} onChange={(e) => setSupplierLinks((prev) => prev.map((item, i) => (i === index ? { ...item, minimum_quantity: e.target.value } : item)))} /></TableCell>
                  <TableCell className="text-center">
                    <Switch checked={row.is_preferred} onCheckedChange={(checked) => setSupplierLinks((prev) => prev.map((item, i) => (i === index ? { ...item, is_preferred: checked } : { ...item, is_preferred: checked ? false : item.is_preferred })))} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => setSupplierLinks((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar item'}
        </Button>
      </div>
    </div>
  );
}
