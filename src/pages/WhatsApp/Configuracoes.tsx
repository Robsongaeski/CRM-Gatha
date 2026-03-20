import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Server, MessageSquare, Settings, Eye, EyeOff, Shield, AlertTriangle, Cloud, Zap } from 'lucide-react';
import { toast } from 'sonner';
import Instancias from './Instancias';
import QuickRepliesTab from '@/components/WhatsApp/QuickRepliesTab';
import MetaCloudApiConfig from '@/components/WhatsApp/MetaCloudApiConfig';
import StorageMaintenance from '@/components/WhatsApp/StorageMaintenance';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Configuracoes() {
  const { configs, isLoading, getConfig, getMaskedValue, isSecret, updateConfig, isUpdating } = useSystemConfig();
  
  // Evolution API
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // UAZAPI
  const [uazapiUrl, setUazapiUrl] = useState('');
  const [uazapiToken, setUazapiToken] = useState('');
  const [showUazapiToken, setShowUazapiToken] = useState(false);
  const [uazapiHasChanges, setUazapiHasChanges] = useState(false);
  const [uazapiIsEditing, setUazapiIsEditing] = useState(false);

  // Load config from database
  useEffect(() => {
    if (!isLoading && configs.length > 0) {
      // Evolution API
      const url = getConfig('evolution_api_url') || '';
      setApiUrl(url);
      setApiKey('');
      // UAZAPI
      const uUrl = getConfig('uazapi_api_url') || '';
      setUazapiUrl(uUrl);
      setUazapiToken('');
    }
  }, [isLoading, configs]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiUrl(e.target.value);
    setHasChanges(true);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setHasChanges(true);
    setIsEditing(true);
  };

  const handleSaveConfig = async () => {
    if (!apiUrl.trim()) {
      toast.error('URL da API é obrigatória');
      return;
    }

    try {
      updateConfig({ key: 'evolution_api_url', value: apiUrl.trim() });
      if (apiKey.trim() && isEditing) {
        updateConfig({ key: 'evolution_api_key', value: apiKey.trim() });
      }
      setHasChanges(false);
      setIsEditing(false);
      setApiKey('');
      toast.success('Configurações da Evolution API salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleSaveUazapiConfig = async () => {
    if (!uazapiUrl.trim()) {
      toast.error('URL da UAZAPI é obrigatória');
      return;
    }
    try {
      updateConfig({ key: 'uazapi_api_url', value: uazapiUrl.trim() });
      if (uazapiToken.trim() && uazapiIsEditing) {
        updateConfig({ key: 'uazapi_admin_token', value: uazapiToken.trim() });
      }
      setUazapiHasChanges(false);
      setUazapiIsEditing(false);
      setUazapiToken('');
      toast.success('Configurações da UAZAPI salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações UAZAPI');
    }
  };

  const maskedApiKey = getMaskedValue('evolution_api_key');
  const hasApiKeyConfigured = Boolean(getConfig('evolution_api_key'));
  const maskedUazapiToken = getMaskedValue('uazapi_admin_token');
  const hasUazapiTokenConfigured = Boolean(getConfig('uazapi_admin_token'));
  const hasUazapiUrlConfigured = Boolean(getConfig('uazapi_api_url'));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações do WhatsApp</h1>
        <p className="text-muted-foreground">Gerencie suas instâncias, respostas rápidas e conexões</p>
      </div>

      <Tabs defaultValue="respostas" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="respostas" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Respostas Rápidas
          </TabsTrigger>
          <TabsTrigger value="instancias" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Instâncias & API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="respostas" className="space-y-4">
          <QuickRepliesTab />
        </TabsContent>

        <TabsContent value="instancias" className="space-y-6">
          {/* Evolution API Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Configuração da Evolution API
              </CardTitle>
              <CardDescription>
                Configure a URL e chave de acesso da sua Evolution API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <Shield className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <p className="font-medium">Armazenamento Seguro</p>
                  <p className="text-sm">As configurações são armazenadas de forma segura no banco de dados com controle de acesso. Apenas administradores podem visualizar e modificar.</p>
                </AlertDescription>
              </Alert>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="api-url">URL da API</Label>
                      <Input
                        id="api-url"
                        placeholder="http://seu-servidor:8088"
                        value={apiUrl}
                        onChange={handleUrlChange}
                      />
                      <p className="text-xs text-muted-foreground">Apenas a URL base, sem /manager ou /api</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="api-key">API Key</Label>
                      <div className="relative">
                        {isEditing ? (
                          <Input
                            id="api-key"
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="Digite a nova chave de API"
                            value={apiKey}
                            onChange={handleApiKeyChange}
                            className="pr-10"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              id="api-key-display"
                              type="text"
                              value={hasApiKeyConfigured ? maskedApiKey : '(não configurada)'}
                              disabled
                              className="font-mono bg-muted"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsEditing(true);
                                setApiKey('');
                              }}
                            >
                              Alterar
                            </Button>
                          </div>
                        )}
                        {isEditing && (
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
                      {isEditing && (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">Digite a nova chave para atualizar</p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs h-6"
                            onClick={() => {
                              setIsEditing(false);
                              setApiKey('');
                              setHasChanges(false);
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button 
                      onClick={handleSaveConfig} 
                      disabled={isUpdating || !hasChanges}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isUpdating ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                    
                    {hasChanges && (
                      <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Alterações não salvas
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* UAZAPI Config */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-600" />
                Configuração da UAZAPI
              </CardTitle>
              <CardDescription>
                Configure a URL e Admin Token da sua conta <a href="https://uazapi.dev" target="_blank" rel="noopener noreferrer" className="underline">UAZAPI</a> para usar como provedor alternativo de WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="uazapi-url">URL da API</Label>
                      <Input
                        id="uazapi-url"
                        placeholder="https://api.uazapi.dev"
                        value={uazapiUrl}
                        onChange={(e) => { setUazapiUrl(e.target.value); setUazapiHasChanges(true); }}
                      />
                      <p className="text-xs text-muted-foreground">URL base da sua instância UAZAPI</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="uazapi-token">Admin Token</Label>
                      <div className="relative">
                        {uazapiIsEditing ? (
                          <Input
                            id="uazapi-token"
                            type={showUazapiToken ? 'text' : 'password'}
                            placeholder="Digite o novo Admin Token"
                            value={uazapiToken}
                            onChange={(e) => { setUazapiToken(e.target.value); setUazapiHasChanges(true); setUazapiIsEditing(true); }}
                            className="pr-10"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              id="uazapi-token-display"
                              type="text"
                              value={hasUazapiTokenConfigured ? maskedUazapiToken : '(não configurado)'}
                              disabled
                              className="font-mono bg-muted"
                            />
                            <Button type="button" variant="outline" size="sm" onClick={() => { setUazapiIsEditing(true); setUazapiToken(''); }}>
                              Alterar
                            </Button>
                          </div>
                        )}
                        {uazapiIsEditing && (
                          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowUazapiToken(!showUazapiToken)}>
                            {showUazapiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                      {uazapiIsEditing && (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">Digite o novo token para atualizar</p>
                          <Button type="button" variant="ghost" size="sm" className="text-xs h-6" onClick={() => { setUazapiIsEditing(false); setUazapiToken(''); setUazapiHasChanges(false); }}>
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button onClick={handleSaveUazapiConfig} disabled={isUpdating || !uazapiHasChanges}>
                      <Save className="h-4 w-4 mr-2" />
                      {isUpdating ? 'Salvando...' : 'Salvar Configurações UAZAPI'}
                    </Button>
                    {uazapiHasChanges && (
                      <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Alterações não salvas
                      </span>
                    )}
                    {hasUazapiUrlConfigured && hasUazapiTokenConfigured && (
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <Zap className="h-4 w-4" />
                        UAZAPI configurada
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Meta Cloud API Config */}
          <MetaCloudApiConfig />


          <Separator />

          {/* Storage Maintenance */}
          <StorageMaintenance />
          
          <Separator />

          {/* Instances Management */}
          <Instancias hideQuickRepliesButton />
        </TabsContent>
      </Tabs>
    </div>
  );
}
