import { useState, useCallback, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cloud, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: any;
  }
}

interface EmbeddedSignupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'intro' | 'signing-up' | 'processing' | 'success' | 'error';

interface SessionInfo {
  wabaId: string;
  phoneNumberId: string;
}

export default function EmbeddedSignupDialog({ open, onOpenChange }: EmbeddedSignupDialogProps) {
  const { getConfig } = useSystemConfig();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('intro');
  const [errorMessage, setErrorMessage] = useState('');
  const [resultData, setResultData] = useState<any>(null);
  const [customName, setCustomName] = useState('');
  
  // Ref to store session info from Meta's postMessage
  const sessionInfoRef = useRef<SessionInfo | null>(null);

  const appId = getConfig('meta_app_id') || '';
  const configId = getConfig('meta_config_id') || '';

  // Listen for Meta's postMessage with WA_EMBEDDED_SIGNUP data
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from Facebook
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return;
      }

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        console.log('[EmbeddedSignup] postMessage recebido:', JSON.stringify(data));

        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          const { phone_number_id, waba_id } = data.data || {};
          console.log('[EmbeddedSignup] WA_EMBEDDED_SIGNUP data:', { phone_number_id, waba_id });

          if (waba_id && phone_number_id) {
            sessionInfoRef.current = {
              wabaId: waba_id,
              phoneNumberId: phone_number_id,
            };
            console.log('[EmbeddedSignup] Session info capturado via postMessage:', sessionInfoRef.current);
          } else {
            console.warn('[EmbeddedSignup] WA_EMBEDDED_SIGNUP recebido mas sem waba_id ou phone_number_id:', data.data);
          }
        }
      } catch (e) {
        // Not a JSON message, ignore
      }
    };

    if (open) {
      window.addEventListener('message', handleMessage);
      console.log('[EmbeddedSignup] Message listener registrado');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [open]);

  const loadFBSDK = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (window.FB) {
        resolve();
        return;
      }

      window.fbAsyncInit = function () {
        window.FB.init({
          appId,
          autoLogAppEvents: true,
          xfbml: true,
          version: 'v21.0'
        });
        console.log('[EmbeddedSignup] FB SDK inicializado com appId:', appId);
        resolve();
      };

      if (!document.getElementById('facebook-jssdk')) {
        const js = document.createElement('script');
        js.id = 'facebook-jssdk';
        js.src = 'https://connect.facebook.net/en_US/sdk.js';
        js.async = true;
        js.defer = true;
        document.head.appendChild(js);
      }
    });
  }, [appId]);

  const handleStartSignup = async () => {
    setStep('signing-up');
    setErrorMessage('');
    sessionInfoRef.current = null;

    try {
      await loadFBSDK();

      console.log('[EmbeddedSignup] Iniciando FB.login com config_id:', configId);

      window.FB.login(
        (response: any) => {
          console.log('[EmbeddedSignup] FB.login response completa:', JSON.stringify(response));

          if (response.authResponse) {
            const { accessToken, code } = response.authResponse;
            console.log('[EmbeddedSignup] authResponse recebido:', {
              hasAccessToken: !!accessToken,
              hasCode: !!code,
              code: code ? code.substring(0, 20) + '...' : null,
            });
            handleSignupComplete(accessToken, code);
          } else {
            console.warn('[EmbeddedSignup] FB.login cancelado ou sem authResponse:', response);
            setStep('error');
            setErrorMessage('O fluxo de login foi cancelado pelo usuário.');
          }
        },
        {
          config_id: configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            setup: {},
            feature: 'whatsapp_embedded_signup',
            sessionInfoVersion: '3',
          }
        }
      );
    } catch (err: any) {
      console.error('[EmbeddedSignup] Erro ao carregar FB SDK:', err);
      setStep('error');
      setErrorMessage('Erro ao carregar o SDK do Facebook: ' + err.message);
    }
  };

  const handleSignupComplete = async (accessToken: string, code?: string) => {
    setStep('processing');

    try {
      // 1. Exchange token
      console.log('[EmbeddedSignup] Trocando token...', { hasCode: !!code, hasAccessToken: !!accessToken });
      const { data: tokenResult, error: tokenError } = await supabase.functions.invoke('meta-embedded-signup', {
        body: { action: 'exchange-token', accessToken, code }
      });

      console.log('[EmbeddedSignup] Resultado exchange-token:', JSON.stringify(tokenResult), 'Erro:', tokenError);

      if (tokenError || !tokenResult?.success) {
        throw new Error(tokenResult?.error || tokenError?.message || 'Erro ao processar token');
      }

      // 2. Wait a moment for the postMessage to arrive (it may come after FB.login callback)
      let sessionInfo = sessionInfoRef.current;
      if (!sessionInfo) {
        console.log('[EmbeddedSignup] Session info não disponível ainda, aguardando 3s...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        sessionInfo = sessionInfoRef.current;
      }

      console.log('[EmbeddedSignup] Session info final:', sessionInfo);

      if (!sessionInfo || !sessionInfo.wabaId || !sessionInfo.phoneNumberId) {
        // Fallback: try to get from debug_token
        console.log('[EmbeddedSignup] Tentando fallback via debug_token...');
        sessionInfo = await getSessionInfoFallback(accessToken);
        console.log('[EmbeddedSignup] Fallback result:', sessionInfo);
      }

      if (!sessionInfo || !sessionInfo.wabaId || !sessionInfo.phoneNumberId) {
        throw new Error(
          'Não foi possível obter os dados do WhatsApp Business (WABA ID e Phone Number ID). ' +
          'O postMessage do Meta não foi recebido. Verifique se o fluxo foi completado corretamente.'
        );
      }

      // 3. Register the phone number
      console.log('[EmbeddedSignup] Registrando número:', sessionInfo);
      const { data: registerResult, error: registerError } = await supabase.functions.invoke('meta-embedded-signup', {
        body: {
          action: 'register-phone',
          wabaId: sessionInfo.wabaId,
          phoneNumberId: sessionInfo.phoneNumberId,
          instanceNome: customName || undefined,
        }
      });

      console.log('[EmbeddedSignup] Resultado register-phone:', JSON.stringify(registerResult), 'Erro:', registerError);

      if (registerError || !registerResult?.success) {
        throw new Error(registerResult?.error || registerError?.message || 'Erro ao registrar número');
      }

      setResultData(registerResult);
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-user-instances'] });
      toast.success('WhatsApp Cloud API conectado com sucesso!');

    } catch (err: any) {
      console.error('[EmbeddedSignup] Erro no processo:', err);
      setStep('error');
      setErrorMessage(err.message || 'Erro desconhecido ao processar o Embedded Signup');
    }
  };

  // Fallback: try to extract WABA/phone from debug_token granular_scopes
  const getSessionInfoFallback = async (accessToken: string): Promise<SessionInfo | null> => {
    return new Promise((resolve) => {
      try {
        window.FB.api(
          '/debug_token',
          { input_token: accessToken, access_token: accessToken },
          (debugResponse: any) => {
            console.log('[EmbeddedSignup] debug_token response:', JSON.stringify(debugResponse));

            const granularScopes = debugResponse?.data?.granular_scopes || [];
            let wabaId = '';
            let phoneNumberId = '';

            for (const scope of granularScopes) {
              if (scope.scope === 'whatsapp_business_management' && scope.target_ids?.length > 0) {
                wabaId = scope.target_ids[0];
              }
              if (scope.scope === 'whatsapp_business_messaging' && scope.target_ids?.length > 0) {
                phoneNumberId = scope.target_ids[0];
              }
            }

            console.log('[EmbeddedSignup] debug_token extracted:', { wabaId, phoneNumberId });

            if (wabaId && phoneNumberId) {
              resolve({ wabaId, phoneNumberId });
            } else if (wabaId) {
              // Fetch phone numbers for this WABA
              window.FB.api(
                `/${wabaId}/phone_numbers`,
                { access_token: accessToken },
                (phonesResp: any) => {
                  console.log('[EmbeddedSignup] WABA phones:', JSON.stringify(phonesResp));
                  if (phonesResp?.data?.length > 0) {
                    resolve({ wabaId, phoneNumberId: phonesResp.data[0].id });
                  } else {
                    resolve(null);
                  }
                }
              );
            } else {
              resolve(null);
            }
          }
        );
      } catch (e) {
        console.error('[EmbeddedSignup] Erro no fallback:', e);
        resolve(null);
      }

      // Timeout after 10 seconds
      setTimeout(() => resolve(null), 10000);
    });
  };

  const handleClose = () => {
    setStep('intro');
    setErrorMessage('');
    setResultData(null);
    setCustomName('');
    sessionInfoRef.current = null;
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-green-600" />
            Conectar WhatsApp Cloud API
          </DialogTitle>
          <DialogDescription>
            Conecte seu número WhatsApp Business usando a API Oficial da Meta
          </DialogDescription>
        </DialogHeader>

        {step === 'intro' && (
          <div className="space-y-4">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
              <Cloud className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <p className="font-medium mb-1">Meta Embedded Signup</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Conecte números já existentes do WhatsApp Business</li>
                  <li>Suporta coexistência com o WhatsApp Business App</li>
                  <li>Mensagens ilimitadas via API Oficial</li>
                  <li>Sem necessidade de QR Code</li>
                </ul>
              </AlertDescription>
            </Alert>

            {(!appId || !configId) && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Configure o App ID e Configuration ID nas configurações do WhatsApp antes de continuar.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Nome da conexão (opcional)</Label>
              <Input
                placeholder="Ex: Atendimento SAC, Vendas..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se não informado, usará o nome da conta WhatsApp Business
              </p>
            </div>
          </div>
        )}

        {step === 'signing-up' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-center text-muted-foreground">
              Complete o processo de login no popup do Facebook...
            </p>
            <p className="text-xs text-center text-muted-foreground">
              Siga as instruções na janela que foi aberta para conectar seu número
            </p>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-center font-medium">Processando dados do WhatsApp Business...</p>
            <p className="text-xs text-center text-muted-foreground">
              Registrando número e configurando webhooks
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <p className="text-center font-medium text-green-700 dark:text-green-400">
              Conectado com sucesso!
            </p>
            {resultData && (
              <div className="text-center space-y-1 text-sm text-muted-foreground">
                {resultData.displayPhoneNumber && (
                  <p>Número: <span className="font-medium text-foreground">{resultData.displayPhoneNumber}</span></p>
                )}
                {resultData.wabaName && (
                  <p>Conta: <span className="font-medium text-foreground">{resultData.wabaName}</span></p>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'error' && (
          <div className="flex flex-col items-center py-8 gap-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <p className="text-center font-medium text-destructive">
              Erro no processo
            </p>
            <p className="text-sm text-center text-muted-foreground">
              {errorMessage}
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'intro' && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button 
                onClick={handleStartSignup} 
                className="bg-green-600 hover:bg-green-700"
                disabled={!appId || !configId}
              >
                <Cloud className="h-4 w-4 mr-2" />
                Iniciar Conexão
              </Button>
            </>
          )}
          {step === 'success' && (
            <Button onClick={handleClose}>Fechar</Button>
          )}
          {step === 'error' && (
            <>
              <Button variant="outline" onClick={handleClose}>Fechar</Button>
              <Button onClick={() => setStep('intro')}>Tentar Novamente</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
