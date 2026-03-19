import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useConverterLead } from '@/hooks/useLeads';
import { CheckCircle2 } from 'lucide-react';

interface ConverterLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadNome: string;
}

export function ConverterLeadDialog({ open, onOpenChange, leadId, leadNome }: ConverterLeadDialogProps) {
  const converterMutation = useConverterLead();

  const handleConverter = async () => {
    await converterMutation.mutateAsync(leadId);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Converter Lead em Cliente
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você está prestes a converter o lead <strong>"{leadNome}"</strong> em um cliente cadastrado.
            </p>
            <p>
              Todos os dados do lead serão transferidos para o cadastro de cliente e o lead será marcado como convertido.
            </p>
            <p className="text-sm font-medium mt-4">
              Deseja continuar?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConverter}
            disabled={converterMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {converterMutation.isPending ? 'Convertendo...' : 'Sim, Converter'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
