import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClienteQuickAdd } from '@/components/Propostas/ClienteQuickAdd';

interface ClienteQuickAddButtonProps {
  onClienteAdded: (clienteId: string) => void;
}

export function ClienteQuickAddButton({ onClienteAdded }: ClienteQuickAddButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="outline" size="icon" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
      </Button>
      <ClienteQuickAdd 
        open={open} 
        onOpenChange={setOpen} 
        onClienteCreated={onClienteAdded}
      />
    </>
  );
}
