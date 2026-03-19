import { useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSaveSegmento } from '@/hooks/useSegmentos';

const segmentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um código hexadecimal válido (#RRGGBB)').optional(),
  icone: z.string().max(50, 'Nome do ícone deve ter no máximo 50 caracteres').optional(),
  ativo: z.boolean().default(true),
});

type SegmentoFormData = z.infer<typeof segmentoSchema>;

export default function SegmentoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const saveSegmento = useSaveSegmento();

  const { data: segmento, isLoading } = useQuery({
    queryKey: ['segmento', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('segmentos')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SegmentoFormData>({
    resolver: zodResolver(segmentoSchema),
    defaultValues: {
      ativo: true,
    },
  });

  const ativoValue = watch('ativo');

  useEffect(() => {
    if (segmento) {
      setValue('nome', segmento.nome);
      setValue('descricao', segmento.descricao || '');
      setValue('cor', segmento.cor || '#6b7280');
      setValue('icone', segmento.icone || '');
      setValue('ativo', segmento.ativo);
    }
  }, [segmento, setValue]);

  const onSubmit = async (data: SegmentoFormData) => {
    console.log('📋 Tentando salvar segmento:', data);
    try {
      const segmentoData = {
        ...data,
        id: id || undefined,
      };

      console.log('📤 Enviando para o servidor:', segmentoData);
      await saveSegmento.mutateAsync(segmentoData as any);
      console.log('✅ Segmento salvo com sucesso!');
      navigate('/admin/segmentos');
    } catch (error) {
      console.error('❌ Erro ao salvar segmento:', error);
    }
  };

  if (isLoading) {
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/segmentos')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {id ? 'Editar Segmento' : 'Novo Segmento'}
        </h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Dados do Segmento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome">Nome do Segmento *</Label>
              <Input
                id="nome"
                {...register('nome')}
                placeholder="Ex: Varejo, Atacado, Corporativo"
              />
              {errors.nome && (
                <p className="text-sm text-destructive mt-1">{errors.nome.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                {...register('descricao')}
                placeholder="Descreva o perfil de clientes deste segmento..."
                rows={3}
              />
              {errors.descricao && (
                <p className="text-sm text-destructive mt-1">{errors.descricao.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="icone">Ícone (Lucide React)</Label>
                <Input
                  id="icone"
                  {...register('icone')}
                  placeholder="Ex: Building2, Store, ShoppingCart"
                  maxLength={50}
                />
                {errors.icone && (
                  <p className="text-sm text-destructive mt-1">{errors.icone.message}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Nome do ícone do Lucide React (ex: Building2, Dumbbell, Stethoscope)
                </p>
              </div>

              <div>
                <Label htmlFor="cor">Cor (Hexadecimal)</Label>
                <div className="flex gap-2">
                  <Input
                    id="cor"
                    {...register('cor')}
                    placeholder="#6b7280"
                    maxLength={7}
                  />
                  <Input
                    type="color"
                    value={watch('cor') || '#6b7280'}
                    onChange={(e) => setValue('cor', e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                  />
                </div>
                {errors.cor && (
                  <p className="text-sm text-destructive mt-1">{errors.cor.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="ativo"
                checked={ativoValue}
                onCheckedChange={(checked) => setValue('ativo', checked)}
              />
              <Label htmlFor="ativo" className="cursor-pointer">
                Segmento ativo
              </Label>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/segmentos')}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saveSegmento.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {saveSegmento.isPending ? 'Salvando...' : 'Salvar Segmento'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
