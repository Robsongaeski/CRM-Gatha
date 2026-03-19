import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Smartphone } from 'lucide-react';
import WhatsAppInstancias from './WhatsAppInstancias';
import QuickRepliesTab from '@/components/WhatsApp/QuickRepliesTab';

export default function WhatsAppConfiguracoes() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações do WhatsApp</h1>
        <p className="text-muted-foreground">Gerencie suas respostas rápidas e instâncias</p>
      </div>

      <Tabs defaultValue="respostas" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="respostas" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Respostas Rápidas
          </TabsTrigger>
          <TabsTrigger value="instancias" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Minhas Instâncias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="respostas" className="space-y-4">
          <QuickRepliesTab />
        </TabsContent>

        <TabsContent value="instancias" className="space-y-6">
          <WhatsAppInstancias hideQuickRepliesButton />
        </TabsContent>
      </Tabs>
    </div>
  );
}
