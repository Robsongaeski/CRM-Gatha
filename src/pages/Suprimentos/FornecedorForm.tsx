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
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

const defaultForm = {
  corporate_name: '',
  trade_name: '',
  cnpj: '',
  state_registration: '',
  contact_name: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  address: '',
  city: '',
  state: '',
  zip_code: '',
  supplier_type: 'outros',
  lead_time_days: '',
  payment_terms: '',
  minimum_order: '',
  commercial_notes: '',
  internal_notes: '',
  status: 'active',
};

export default function FornecedorForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);

  const { data: supplierTypes = [] } = useQuery({
    queryKey: ['procurement-supplier-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_types' as any)
        .select('name')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []).map((item: any) => item.name);
    },
  });

  const { data: supplierData, isLoading } = useQuery({
    queryKey: ['procurement-supplier', id],
    enabled: isEdit,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers' as any)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (supplierData) {
      setForm({
        corporate_name: supplierData.corporate_name || '',
        trade_name: supplierData.trade_name || '',
        cnpj: supplierData.cnpj || '',
        state_registration: supplierData.state_registration || '',
        contact_name: supplierData.contact_name || '',
        phone: supplierData.phone || '',
        whatsapp: supplierData.whatsapp || '',
        email: supplierData.email || '',
        website: supplierData.website || '',
        address: supplierData.address || '',
        city: supplierData.city || '',
        state: supplierData.state || '',
        zip_code: supplierData.zip_code || '',
        supplier_type: supplierData.supplier_type || 'outros',
        lead_time_days: supplierData.lead_time_days?.toString() || '',
        payment_terms: supplierData.payment_terms || '',
        minimum_order: supplierData.minimum_order?.toString() || '',
        commercial_notes: supplierData.commercial_notes || '',
        internal_notes: supplierData.internal_notes || '',
        status: supplierData.status || 'active',
      });
    }
  }, [supplierData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.corporate_name.trim()) {
        throw new Error('Razão social é obrigatória.');
      }

      const payload = {
        corporate_name: form.corporate_name.trim(),
        trade_name: form.trade_name || null,
        cnpj: form.cnpj || null,
        state_registration: form.state_registration || null,
        contact_name: form.contact_name || null,
        phone: form.phone || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        website: form.website || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip_code: form.zip_code || null,
        supplier_type: form.supplier_type,
        lead_time_days: form.lead_time_days ? Number(form.lead_time_days) : null,
        payment_terms: form.payment_terms || null,
        minimum_order: form.minimum_order ? Number(form.minimum_order) : null,
        commercial_notes: form.commercial_notes || null,
        internal_notes: form.internal_notes || null,
        status: form.status,
      };

      if (isEdit) {
        const { error } = await supabase.from('suppliers' as any).update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('suppliers' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(`Fornecedor ${isEdit ? 'atualizado' : 'cadastrado'} com sucesso.`);
      queryClient.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['procurement-dashboard'] });
      navigate('/suprimentos/fornecedores');
    },
    onError: (error: any) => toast.error(sanitizeError(error)),
  });

  const typeOptions = useMemo(() => {
    if (supplierTypes.length > 0) return supplierTypes;
    return ['materia-prima', 'tecido pronto', 'fio', 'tecelagem', 'tinturaria', 'acabamento', 'aviamentos', 'embalagem', 'transporte', 'manutencao', 'servico tecnico', 'outros'];
  }, [supplierTypes]);

  if (isEdit && isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Carregando fornecedor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Editar fornecedor' : 'Novo fornecedor'}</h1>
          <p className="text-muted-foreground">Cadastro completo de fornecedores</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate('/suprimentos/fornecedores')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar fornecedor'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados principais</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2"><Label>Razão social *</Label><Input value={form.corporate_name} onChange={(e) => setForm((prev) => ({ ...prev, corporate_name: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Nome fantasia</Label><Input value={form.trade_name} onChange={(e) => setForm((prev) => ({ ...prev, trade_name: e.target.value }))} /></div>
          <div className="space-y-2"><Label>CNPJ</Label><Input value={form.cnpj} onChange={(e) => setForm((prev) => ({ ...prev, cnpj: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Inscrição estadual</Label><Input value={form.state_registration} onChange={(e) => setForm((prev) => ({ ...prev, state_registration: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Contato principal</Label><Input value={form.contact_name} onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
          <div className="space-y-2"><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))} /></div>
          <div className="space-y-2"><Label>E-mail</Label><Input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Site</Label><Input value={form.website} onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Estado</Label><Input value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} /></div>
          <div className="space-y-2"><Label>CEP</Label><Input value={form.zip_code} onChange={(e) => setForm((prev) => ({ ...prev, zip_code: e.target.value }))} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dados comerciais</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo de fornecedor</Label>
            <Select value={form.supplier_type} onValueChange={(value) => setForm((prev) => ({ ...prev, supplier_type: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {typeOptions.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Prazo médio (dias)</Label><Input type="number" value={form.lead_time_days} onChange={(e) => setForm((prev) => ({ ...prev, lead_time_days: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Condição de pagamento</Label><Input value={form.payment_terms} onChange={(e) => setForm((prev) => ({ ...prev, payment_terms: e.target.value }))} /></div>
          <div className="space-y-2"><Label>Pedido mínimo</Label><Input type="number" step="0.01" value={form.minimum_order} onChange={(e) => setForm((prev) => ({ ...prev, minimum_order: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Observações comerciais</Label><Textarea value={form.commercial_notes} onChange={(e) => setForm((prev) => ({ ...prev, commercial_notes: e.target.value }))} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Observações internas</Label><Textarea value={form.internal_notes} onChange={(e) => setForm((prev) => ({ ...prev, internal_notes: e.target.value }))} /></div>
          <div className="flex items-center gap-3">
            <Switch checked={form.status === 'active'} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, status: checked ? 'active' : 'inactive' }))} />
            <span>{form.status === 'active' ? 'Fornecedor ativo' : 'Fornecedor inativo'}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar fornecedor'}
        </Button>
      </div>
    </div>
  );
}
