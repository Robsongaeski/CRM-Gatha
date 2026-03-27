import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Server, Eye, EyeOff, Shield, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function WhatsAppApiConfig() {
  const { configs, isLoading, getConfig, getMaskedValue, updateConfig, isUpdating } = useSystemConfig();

  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEditingApiKey, setIsEditingApiKey] = useState(false);

  const [uazapiUrl, setUazapiUrl] = useState('');
  const [uazapiAdminToken, setUazapiAdminToken] = useState('');
  const [showUazapiAdminToken, setShowUazapiAdminToken] = useState(false);
  const [isEditingUazapiAdminToken, setIsEditingUazapiAdminToken] = useState(false);

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!isLoading && configs.length > 0) {
      setApiUrl(getConfig('evolution_api_url') || '');
      setApiKey('');
      setUazapiUrl(getConfig('uazapi_api_url') || '');
      setUazapiAdminToken('');
    }
  }, [isLoading, configs]);

  const handleSaveConfig = async () => {
    if (!apiUrl.trim() && !uazapiUrl.trim()) {
      toast.error('Informe pelo menos uma URL de API (Evolution ou UAZAPI)');
      return;
    }

    try {
      if (apiUrl.trim()) {
        updateConfig({ key: 'evolution_api_url', value: apiUrl.trim() });
      }
      if (apiKey.trim() && isEditingApiKey) {
        updateConfig({ key: 'evolution_api_key', value: apiKey.trim() });
      }

      if (uazapiUrl.trim()) {
        updateConfig({ key: 'uazapi_api_url', value: uazapiUrl.trim() });
      }
      if (uazapiAdminToken.trim() && isEditingUazapiAdminToken) {
        updateConfig({ key: 'uazapi_admin_token', value: uazapiAdminToken.trim() });
      }

      setHasChanges(false);
      setIsEditingApiKey(false);
      setIsEditingUazapiAdminToken(false);
      setApiKey('');
      setUazapiAdminToken('');
      toast.success('Configuracoes salvas com sucesso');
    } catch {
      toast.error('Erro ao salvar configuracoes');
    }
  };

  const maskedApiKey = getMaskedValue('evolution_api_key');
  const hasApiKeyConfigured = Boolean(getConfig('evolution_api_key'));
  const maskedUazapiAdminToken = getMaskedValue('uazapi_admin_token');
  const hasUazapiAdminTokenConfigured = Boolean(getConfig('uazapi_admin_token'));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuracao das APIs WhatsApp</h1>
        <p className="text-muted-foreground">
          Configure Evolution API e UAZAPI sem impactar o funcionamento atual
        </p>
      </div>

      <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800 dark:text-green-200">
          <p className="font-medium">Armazenamento seguro</p>
          <p className="text-sm">
            As credenciais sao salvas em `system_config` com controle de acesso por perfil.
          </p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Credenciais da Evolution API
          </CardTitle>
          <CardDescription>
            URL base e API Key da Evolution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="evolution-url">URL da API</Label>
              <Input
                id="evolution-url"
                placeholder="http://seu-servidor:8088"
                value={apiUrl}
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  setHasChanges(true);
                }}
              />
              <p className="text-xs text-muted-foreground">Use apenas a URL base, sem /manager</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evolution-api-key">API Key</Label>
              <div className="relative">
                {isEditingApiKey ? (
                  <Input
                    id="evolution-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Digite a nova API Key"
                    value={apiKey}
                    onChange={(e) => {
                      setApiKey(e.target.value);
                      setHasChanges(true);
                    }}
                    className="pr-10"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      id="evolution-api-key-display"
                      type="text"
                      value={hasApiKeyConfigured ? maskedApiKey : '(nao configurada)'}
                      disabled
                      className="font-mono bg-muted"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingApiKey(true);
                        setApiKey('');
                      }}
                    >
                      Alterar
                    </Button>
                  </div>
                )}
                {isEditingApiKey && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-600" />
            Credenciais da UAZAPI
          </CardTitle>
          <CardDescription>
            URL base e Admin Token da UAZAPI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="uazapi-url">URL da UAZAPI</Label>
              <Input
                id="uazapi-url"
                placeholder="https://api.uazapi.com"
                value={uazapiUrl}
                onChange={(e) => {
                  setUazapiUrl(e.target.value);
                  setHasChanges(true);
                }}
              />
              <p className="text-xs text-muted-foreground">Formato recomendado: https://subdominio.uazapi.com</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uazapi-admin-token">Admin Token</Label>
              <div className="relative">
                {isEditingUazapiAdminToken ? (
                  <Input
                    id="uazapi-admin-token"
                    type={showUazapiAdminToken ? 'text' : 'password'}
                    placeholder="Digite o novo Admin Token"
                    value={uazapiAdminToken}
                    onChange={(e) => {
                      setUazapiAdminToken(e.target.value);
                      setHasChanges(true);
                    }}
                    className="pr-10"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      id="uazapi-admin-token-display"
                      type="text"
                      value={hasUazapiAdminTokenConfigured ? maskedUazapiAdminToken : '(nao configurado)'}
                      disabled
                      className="font-mono bg-muted"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditingUazapiAdminToken(true);
                        setUazapiAdminToken('');
                      }}
                    >
                      Alterar
                    </Button>
                  </div>
                )}
                {isEditingUazapiAdminToken && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowUazapiAdminToken(!showUazapiAdminToken)}
                  >
                    {showUazapiAdminToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSaveConfig} disabled={isUpdating || !hasChanges}>
          <Save className="h-4 w-4 mr-2" />
          {isUpdating ? 'Salvando...' : 'Salvar configuracoes'}
        </Button>
        {hasChanges && (
          <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Alteracoes nao salvas
          </span>
        )}
      </div>
    </div>
  );
}

