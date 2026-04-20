import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Settings, Trash2, ShieldAlert } from 'lucide-react';
import Instancias from './Instancias';
import QuickRepliesTab from '@/components/WhatsApp/QuickRepliesTab';
import StorageMaintenance from '@/components/WhatsApp/StorageMaintenance';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export default function Configuracoes() {
  const { can, isAdmin, isLoading } = usePermissions();
  
  const canConfigureWhatsapp = can('whatsapp.configurar') || can('ecommerce.whatsapp.configurar');
  const canSeeInstances = isAdmin || canConfigureWhatsapp || can('whatsapp.instancias.gerenciar') || can('whatsapp.visualizar');
  const canManageReplies = isAdmin || canConfigureWhatsapp || can('whatsapp.respostas_rapidas.gerenciar');
  const canManageStorage = isAdmin; // Apenas admins podem apagar mídias do storage
  
  if (isLoading) {
    return <div className="p-6">Carregando permissões...</div>;
  }

  if (!canSeeInstances && !canManageReplies && !canManageStorage) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar as configurações do WhatsApp.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const tabCount = [canSeeInstances, canManageReplies, canManageStorage].filter(Boolean).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações do WhatsApp</h1>
        <p className="text-muted-foreground">Gerencie suas instâncias, respostas rápidas e manutenção do storage</p>
      </div>

      <Tabs defaultValue={canSeeInstances ? "instancias" : "respostas"} className="space-y-4">
        <TabsList className={cn(
          "grid w-full max-w-2xl",
          tabCount === 3 ? "grid-cols-3" : "grid-cols-2"
        )}>
          {canSeeInstances && (
            <TabsTrigger value="instancias" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Instâncias
            </TabsTrigger>
          )}
          {canManageReplies && (
            <TabsTrigger value="respostas" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Respostas Rápidas
            </TabsTrigger>
          )}
          {canManageStorage && (
            <TabsTrigger value="manutencao" className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Manutenção
            </TabsTrigger>
          )}
        </TabsList>

        {canSeeInstances && (
          <TabsContent value="instancias" className="space-y-6">
            <Instancias hideQuickRepliesButton />
          </TabsContent>
        )}

        {canManageReplies && (
          <TabsContent value="respostas" className="space-y-4">
            <QuickRepliesTab />
          </TabsContent>
        )}

        {canManageStorage && (
          <TabsContent value="manutencao" className="space-y-4">
            <StorageMaintenance />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

