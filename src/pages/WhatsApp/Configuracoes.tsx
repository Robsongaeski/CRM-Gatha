import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Server, MessageSquare, Settings, Eye, EyeOff, Shield, AlertTriangle, Cloud } from 'lucide-react';
import { toast } from 'sonner';
import Instancias from './Instancias';
import QuickRepliesTab from '@/components/WhatsApp/QuickRepliesTab';
import MetaCloudApiConfig from '@/components/WhatsApp/MetaCloudApiConfig';
import StorageMaintenance from '@/components/WhatsApp/StorageMaintenance';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Configuracoes() {
  const { configs, isLoading, getConfig, getMaskedValue, isSecret, updateConfig, isUpdating } = useSystemConfig();
  
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Load config from database
  useEffect(() => {
    if (!isLoading && configs.length > 0) {
      const url = getConfig('evolution_api_url') || '';
      setApiUrl(url);
      // API Key é carregada como masked por padrão
      setApiKey('');
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
      // Atualizar URL
      updateConfig({ key: 'evolution_api_url', value: apiUrl.trim() });
      
      // Atualizar API Key apenas se foi modificada (não está vazia e está em modo edição)
      if (apiKey.trim() && isEditing) {
        updateConfig({ key: 'evolution_api_key', value: apiKey.trim() });
      }
      
      setHasChanges(false);
      setIsEditing(false);
      setApiKey('');
      
      toast.info('Nota: As Edge Functions usarão as configurações armazenadas no banco de dados.');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações');
    }
  };

  const maskedApiKey = getMaskedValue('evolution_api_key');
  const hasApiKeyConfigured = Boolean(getConfig('evolution_api_key'));

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
