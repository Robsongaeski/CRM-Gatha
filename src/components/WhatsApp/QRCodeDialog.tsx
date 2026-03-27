import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCheckInstanceStatus, useSetWebhook, useConnectInstance } from '@/hooks/whatsapp/useWhatsappInstances';
import { Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { sanitizeError } from '@/lib/errorHandling';

interface QRCodeDialogProps {
  instanceId: string;
  instanceName: string;
  apiType?: 'evolution' | 'cloud_api' | 'uazapi';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QRCodeDialog({ instanceId, instanceName, apiType, open, onOpenChange }: QRCodeDialogProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const autoCloseTriggeredRef = useRef(false);
  const connectInstance = useConnectInstance();
  const checkStatus = useCheckInstanceStatus();
  const setWebhook = useSetWebhook();

  const fetchQR = async () => {
    if (!instanceName) return;
    setConnectionError(null);
    try {
      // Usa action 'connect' que recria a instância na Evolution API
      const result = await connectInstance.mutateAsync({ instanceId, instanceName, apiType });
      if (result.qrcode) {
        const qrData = typeof result.qrcode === 'string' && result.qrcode.startsWith('data:') 
          ? result.qrcode 
          : `data:image/png;base64,${result.qrcode}`;
        setQrCode(qrData);
        setIsConnected(false);
        setConnectionError(null);
      }
    } catch (error) {
      console.error('Error fetching QR:', error);
      setConnectionError(sanitizeError(error));
    }
  };

  // Configure webhook automatically when connected
  const configureWebhook = async () => {
    if (webhookConfigured) return;
    try {
      await setWebhook.mutateAsync({ instanceId, instanceName, apiType });
      setWebhookConfigured(true);
    } catch (error) {
      console.error('Error configuring webhook:', error);
    }
  };

  // Fetch QR code when dialog opens
  useEffect(() => {
    if (open && instanceName) {
      autoCloseTriggeredRef.current = false;
      setQrCode(null);
      setIsConnected(false);
      setConnectionError(null);
      setWebhookConfigured(false);
      fetchQR();
    }
  }, [open, instanceName]);

  // Poll for connection status
  useEffect(() => {
    if (!open || isConnected || !instanceName || !!connectionError) return;

    const interval = setInterval(async () => {
      try {
        const result = await checkStatus.mutateAsync({ instanceId, instanceName, apiType });
        if (result?.status === 'connected') {
          setIsConnected(true);
          setQrCode(null);
          // Auto-configure webhook when connected.
          await configureWebhook();

          // Fechar automaticamente o modal apos conectar.
          if (!autoCloseTriggeredRef.current) {
            autoCloseTriggeredRef.current = true;
            setTimeout(() => onOpenChange(false), 1200);
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
        setConnectionError(sanitizeError(error));
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [open, instanceId, instanceName, apiType, isConnected, onOpenChange, connectionError]);

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
          ) : connectionError ? (
            <div className="text-center">
              <p className="text-sm text-red-600 mb-4">{connectionError}</p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
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
