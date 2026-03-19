import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSaveSegmento } from '@/hooks/useSegmentos';

const quickSegmentoSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  icone: z.string().max(10).optional(),
  cor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida').optional(),
});

type QuickSegmentoFormData = z.infer<typeof quickSegmentoSchema>;

interface SegmentoQuickAddDialogProps {
  onSegmentoCreated?: (segmentoId: string) => void;
}

export function SegmentoQuickAddDialog({ onSegmentoCreated }: SegmentoQuickAddDialogProps) {
  const [open, setOpen] = useState(false);
  const saveSegmento = useSaveSegmento();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<QuickSegmentoFormData>({
    resolver: zodResolver(quickSegmentoSchema),
    defaultValues: {
      cor: '#6b7280',
    },
  });

  const onSubmit = async (data: QuickSegmentoFormData) => {
    const result = await saveSegmento.mutateAsync({
      ...data,
      ativo: true,
    } as any);
    
    if (result && onSegmentoCreated) {
      onSegmentoCreated(result.id);
    }
    
    setOpen(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Segmento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="quick-nome">Nome do Segmento *</Label>
            <Input
              id="quick-nome"
              {...register('nome')}
              placeholder="Ex: Varejo, Atacado"
              autoFocus
            />
            {errors.nome && (
              <p className="text-sm text-destructive mt-1">{errors.nome.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="quick-icone">Ícone (Emoji)</Label>
              <Input
                id="quick-icone"
                {...register('icone')}
                placeholder="🏢"
                maxLength={10}
              />
            </div>

            <div>
              <Label htmlFor="quick-cor">Cor</Label>
              <Input
                type="color"
                value={watch('cor') || '#6b7280'}
                onChange={(e) => setValue('cor', e.target.value)}
                className="w-full h-10 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveSegmento.isPending}>
              {saveSegmento.isPending ? 'Criando...' : 'Criar Segmento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
