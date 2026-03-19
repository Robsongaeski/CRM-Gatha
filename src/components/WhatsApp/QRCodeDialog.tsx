import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCheckInstanceStatus, useSetWebhook, useConnectInstance } from '@/hooks/whatsapp/useWhatsappInstances';
import { Loader2, RefreshCw, CheckCircle } from 'lucide-react';

interface QRCodeDialogProps {
  instanceId: string;
  instanceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QRCodeDialog({ instanceId, instanceName, open, onOpenChange }: QRCodeDialogProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const connectInstance = useConnectInstance();
  const checkStatus = useCheckInstanceStatus();
  const setWebhook = useSetWebhook();

  const fetchQR = async () => {
    if (!instanceName) return;
    try {
      // Usa action 'connect' que recria a instância na Evolution API
      const result = await connectInstance.mutateAsync({ instanceId, instanceName });
      if (result.qrcode) {
        const qrData = typeof result.qrcode === 'string' && result.qrcode.startsWith('data:') 
          ? result.qrcode 
          : `data:image/png;base64,${result.qrcode}`;
        setQrCode(qrData);
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error fetching QR:', error);
    }
  };

  // Configure webhook automatically when connected
  const configureWebhook = async () => {
    if (webhookConfigured) return;
    try {
      await setWebhook.mutateAsync({ instanceId, instanceName });
      setWebhookConfigured(true);
    } catch (error) {
      console.error('Error configuring webhook:', error);
    }
  };

  // Fetch QR code when dialog opens
  useEffect(() => {
    if (open && instanceName) {
      setQrCode(null);
      setIsConnected(false);
      setWebhookConfigured(false);
      fetchQR();
    }
  }, [open, instanceName]);

  // Poll for connection status
  useEffect(() => {
    if (!open || isConnected || !instanceName) return;

    const interval = setInterval(async () => {
      try {
        const result = await checkStatus.mutateAsync({ instanceId, instanceName });
        if (result?.status === 'connected') {
          setIsConnected(true);
          setQrCode(null);
          // Auto-configure webhook when connected
          configureWebhook();
        }
      } catch (error) {
        console.error('Error checking status:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [open, instanceName, isConnected]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar WhatsApp</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6">
          {isConnected ? (
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-green-600">Conectado com sucesso!</p>
              <p className="text-sm text-muted-foreground mt-2">
                {webhookConfigured ? 'Webhook configurado automaticamente' : 'Configurando webhook...'}
              </p>
              <Button onClick={() => onOpenChange(false)} className="mt-4">
                Fechar
              </Button>
            </div>
          ) : qrCode ? (
            <div className="text-center">
              <img
                src={qrCode}
                alt="QR Code"
                className="w-64 h-64 mx-auto border rounded-lg"
              />
              <p className="text-sm text-muted-foreground mt-4">
                Escaneie o QR Code com seu WhatsApp
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchQR}
                className="mt-4"
                disabled={connectInstance.isPending}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar QR Code
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground mt-4">
                {connectInstance.isPending ? 'Recriando instância e gerando QR Code...' : 'Conectando à instância...'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
