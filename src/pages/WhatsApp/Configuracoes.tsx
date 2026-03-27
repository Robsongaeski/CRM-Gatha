import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Settings } from 'lucide-react';
import Instancias from './Instancias';
import QuickRepliesTab from '@/components/WhatsApp/QuickRepliesTab';
import { usePermissions } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

export default function Configuracoes() {
  const { can, isAdmin, isLoading } = usePermissions();
  
  const canConfigureWhatsapp = can('whatsapp.configurar') || can('ecommerce.whatsapp.configurar');
  const canSeeInstances = isAdmin || canConfigureWhatsapp || can('whatsapp.instancias.gerenciar') || can('whatsapp.visualizar');
  const canManageReplies = isAdmin || canConfigureWhatsapp || can('whatsapp.respostas_rapidas.gerenciar');
  
  if (isLoading) {
    return <div className="p-6">Carregando permissões...</div>;
  }

  if (!canSeeInstances && !canManageReplies) {
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações do WhatsApp</h1>
        <p className="text-muted-foreground">Gerencie suas instâncias e respostas rápidas</p>
      </div>

      <Tabs defaultValue={canSeeInstances ? "instancias" : "respostas"} className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
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
      </Tabs>
    </div>
  );
}
