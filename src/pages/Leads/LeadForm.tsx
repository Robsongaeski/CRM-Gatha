import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLead, useSaveLead } from '@/hooks/useLeads';
import { useSegmentos } from '@/hooks/useSegmentos';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { LeadStatusBadge } from '@/components/Leads/LeadStatusBadge';
import { SegmentoQuickAddDialog } from '@/components/Leads/SegmentoQuickAddDialog';
import { Checkbox } from '@/components/ui/checkbox';

const leadSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  cpf_cnpj: z.string().optional(),
  endereco: z.string().optional(),
  segmento_id: z.string().optional(),
  vendedor_id: z.string().min(1, 'Vendedor é obrigatório'),
  status: z.enum(['novo', 'contatando', 'qualificado', 'nao_qualificado', 'convertido', 'perdido']),
  observacao: z.string().optional(),
  origem: z.string().optional(),
  data_retorno: z.string().optional(),
  enviar_lembrete: z.boolean().optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

export default function LeadForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: lead, isLoading: loadingLead } = useLead(id);
  const { data: segmentos = [], refetch: refetchSegmentos } = useSegmentos();
  const { data: usuarios = [] } = useUsuarios();
  const saveLead = useSaveLead();
  const [novoSegmentoId, setNovoSegmentoId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      status: 'novo',
      vendedor_id: user?.id,
    },
  });

  const statusValue = watch('status');

  useEffect(() => {
    if (novoSegmentoId) {
      refetchSegmentos();
      setValue('segmento_id', novoSegmentoId);
      setNovoSegmentoId(null);
    }
  }, [novoSegmentoId, refetchSegmentos, setValue]);

  useEffect(() => {
    if (lead) {
      setValue('nome', lead.nome);
      setValue('telefone', lead.telefone || '');
      setValue('whatsapp', lead.whatsapp || '');
      setValue('email', lead.email || '');
      setValue('cpf_cnpj', lead.cpf_cnpj || '');
      setValue('endereco', lead.endereco || '');
      setValue('segmento_id', lead.segmento_id || '');
      setValue('vendedor_id', lead.vendedor_id || '');
      setValue('status', lead.status);
      setValue('observacao', lead.observacao || '');
      setValue('origem', lead.origem || '');
      // data_retorno é datetime-local, extrair componentes locais da string ISO
      if (lead.data_retorno) {
        // Extrair diretamente da string ISO para evitar shift de timezone
        const dt = lead.data_retorno;
        const datePart = dt.substring(0, 10); // yyyy-MM-dd
        // Para a hora, usar Date local pois datetime-local precisa de hora local
        const dateObj = new Date(dt);
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        setValue('data_retorno', `${datePart}T${hours}:${minutes}`);
      }
    }
  }, [lead, setValue]);

  const onSubmit = async (data: LeadFormData) => {
    try {
      const telefone = data.telefone?.trim();
      const whatsapp = data.whatsapp?.trim();

      if (!telefone && !whatsapp) {
        toast({
          title: 'Atenção',
          description: 'Recomendamos adicionar pelo menos um telefone ou WhatsApp para contato.',
          variant: 'default',
        });
      }

      const leadData = {
        ...data,
        email: data.email || null,
        telefone: telefone || null,
        whatsapp: whatsapp || null,
        cpf_cnpj: data.cpf_cnpj || null,
        endereco: data.endereco || null,
        segmento_id: data.segmento_id || null,
        observacao: data.observacao || null,
        origem: data.origem || null,
        data_retorno: data.data_retorno ? new Date(data.data_retorno).toISOString() : null,
      };

      if (id) {
        await saveLead.mutateAsync({ ...leadData, id });
      } else {
        await saveLead.mutateAsync(leadData);
      }

      navigate('/leads');
    } catch (error) {
      console.error('Erro ao salvar lead:', error);
    }
  };

  if (loadingLead) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/leads')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{id ? 'Editar Lead' : 'Novo Lead'}</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>📋 Dados do Lead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                {...register('nome')}
                placeholder="Nome completo do lead"
              />
              {errors.nome && (
                <p className="text-sm text-destructive mt-1">{errors.nome.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  {...register('telefone')}
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  {...register('whatsapp')}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@exemplo.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input
                id="cpf_cnpj"
                {...register('cpf_cnpj')}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            </div>

            <div>
              <Label htmlFor="endereco">Endereço Completo</Label>
              <Input
                id="endereco"
                {...register('endereco')}
                placeholder="Rua, número, bairro, cidade - UF"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="segmento_id">Segmento</Label>
                <div className="flex gap-2">
                  <Select
                    value={watch('segmento_id') || undefined}
                    onValueChange={(value) => setValue('segmento_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o segmento (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {segmentos.map((seg: any) => (
                        <SelectItem key={seg.id} value={seg.id}>
                          {seg.icone} {seg.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <SegmentoQuickAddDialog onSegmentoCreated={setNovoSegmentoId} />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={statusValue}
                  onValueChange={(value: any) => setValue('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">
                      <LeadStatusBadge status="novo" />
                    </SelectItem>
                    <SelectItem value="contatando">
                      <LeadStatusBadge status="contatando" />
                    </SelectItem>
                    <SelectItem value="qualificado">
                      <LeadStatusBadge status="qualificado" />
                    </SelectItem>
                    <SelectItem value="nao_qualificado">
                      <LeadStatusBadge status="nao_qualificado" />
                    </SelectItem>
                    <SelectItem value="perdido">
                      <LeadStatusBadge status="perdido" />
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="vendedor_id">Vendedor Responsável *</Label>
              <Select
                value={watch('vendedor_id') || ''}
                onValueChange={(value) => setValue('vendedor_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((usuario: any) => (
                    <SelectItem key={usuario.id} value={usuario.id}>
                      {usuario.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.vendedor_id && (
                <p className="text-sm text-destructive mt-1">{errors.vendedor_id.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="origem">Origem do Lead</Label>
              <Input
                id="origem"
                {...register('origem')}
                placeholder="Ex: Indicação, Site, Telefone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data_retorno">Data e Hora de Retorno</Label>
              <Input
                id="data_retorno"
                type="datetime-local"
                {...register('data_retorno')}
              />
              <div className="flex items-center gap-2 mt-2">
                <Checkbox
                  id="enviar_lembrete"
                  checked={watch('enviar_lembrete') || false}
                  onCheckedChange={(checked) => setValue('enviar_lembrete', checked as boolean)}
                />
                <Label htmlFor="enviar_lembrete" className="text-sm font-normal cursor-pointer">
                  Enviar lembrete por email no dia do retorno
                </Label>
              </div>
            </div>

            <div>
              <Label htmlFor="observacao">Observações</Label>
              <Textarea
                id="observacao"
                {...register('observacao')}
                placeholder="Anotações gerais sobre o lead"
                rows={4}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/leads')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveLead.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {saveLead.isPending ? 'Salvando...' : 'Salvar Lead'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
