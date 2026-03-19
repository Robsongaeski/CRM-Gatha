import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUsuarios } from '@/hooks/useUsuarios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UserCheck } from 'lucide-react';

interface AtribuirVendedorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  onSuccess?: () => void;
}

export function AtribuirVendedorDialog({ 
  open, 
  onOpenChange, 
  leadIds,
  onSuccess 
}: AtribuirVendedorDialogProps) {
  const [vendedorId, setVendedorId] = useState<string>('');
  const { data: usuarios = [] } = useUsuarios();
  const queryClient = useQueryClient();

  const atribuirMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('leads' as any)
        .update({ vendedor_id: vendedorId, updated_at: new Date().toISOString() })
        .in('id', leadIds);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Sucesso',
        description: `${leadIds.length} lead(s) atribuído(s) ao vendedor.`,
      });
      onOpenChange(false);
      setVendedorId('');
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Atribuir Vendedor
          </DialogTitle>
          <DialogDescription>
            Atribuir {leadIds.length} lead(s) selecionado(s) a um vendedor.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Vendedor</Label>
            <Select value={vendedorId} onValueChange={setVendedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vendedor" />
              </SelectTrigger>
              <SelectContent>
                {usuarios.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => atribuirMutation.mutate()} 
            disabled={!vendedorId || atribuirMutation.isPending}
          >
            {atribuirMutation.isPending ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
