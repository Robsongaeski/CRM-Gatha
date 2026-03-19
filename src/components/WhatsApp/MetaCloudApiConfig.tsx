import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Save, Cloud, Eye, EyeOff, Shield, AlertTriangle, Copy, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useSystemConfig } from '@/hooks/useSystemConfig';
import { Alert, AlertDescription } from '@/components/ui/alert';

const META_FIELDS = [
  { key: 'meta_app_id', label: 'App ID', placeholder: '917920924543512', description: 'ID do seu aplicativo no Facebook Developers (Settings → Basic)', isSecret: false },
  { key: 'meta_config_id', label: 'Configuration ID (Login for Business)', placeholder: '947231041130313', description: 'ID da configuração do Facebook Login for Business (Embedded Signup)', isSecret: false },
  { key: 'meta_access_token', label: 'Access Token', placeholder: 'EAAxxxxxxx...', description: 'System User Token permanente da Meta Business', isSecret: true },
  { key: 'meta_app_secret', label: 'App Secret', placeholder: 'abcdef123456...', description: 'App Secret do seu App na Meta (para validar webhooks)', isSecret: true },
  { key: 'meta_verify_token', label: 'Verify Token', placeholder: 'meu_token_verificacao', description: 'Token customizado para challenge do webhook (você escolhe)', isSecret: false },
] as const;

export default function MetaCloudApiConfig() {
  const { configs, isLoading, getConfig, getMaskedValue, updateConfig, isUpdating } = useSystemConfig();

  const [values, setValues] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const webhookUrl = `https://lyjzutjrmvgoeibaoizz.supabase.co/functions/v1/receive-whatsapp-cloud-webhook`;

  useEffect(() => {
    if (!isLoading && configs.length > 0) {
      setValues({});
      setEditing({});
    }
  }, [isLoading, configs]);

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setEditing(prev => ({ ...prev, [key]: true }));
    setHasChanges(true);
  };

  const handleCancel = (key: string) => {
    setValues(prev => ({ ...prev, [key]: '' }));
    setEditing(prev => ({ ...prev, [key]: false }));
    const stillEditing = Object.entries(editing).some(([k, v]) => k !== key && v);
    if (!stillEditing) setHasChanges(false);
  };

  const handleSave = () => {
    const fieldsToUpdate = META_FIELDS.filter(f => editing[f.key] && values[f.key]?.trim());
    if (fieldsToUpdate.length === 0) {
      toast.error('Nenhuma alteração para salvar');
      return;
    }

    fieldsToUpdate.forEach(f => {
      updateConfig({ key: f.key, value: values[f.key].trim() });
    });

    setHasChanges(false);
    setEditing({});
    setValues({});
    toast.success('Configurações da Meta Cloud API salvas!');
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    toast.success('URL do webhook copiada!');
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Configuração da WhatsApp Cloud API (Meta)
        </CardTitle>
        <CardDescription>
          Configure as credenciais da API Oficial do WhatsApp (Meta Business Platform)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            <p className="font-medium">API Oficial do WhatsApp</p>
            <p className="text-sm">
              Estas credenciais são obtidas no{' '}
              <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                Meta Business Manager
              </a>. 
              Tokens e secrets são armazenados de forma segura no banco de dados.
            </p>
          </AlertDescription>
        </Alert>

        {/* Webhook URL */}
        <div className="space-y-2">
          <Label>URL do Webhook (copie e cole no Meta Business)</Label>
          <div className="flex items-center gap-2">
            <Input
              value={webhookUrl}
              readOnly
              className="font-mono text-xs bg-muted"
            />
            <Button type="button" variant="outline" size="icon" onClick={copyWebhookUrl}>
              {copiedWebhook ? <CheckCheck className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure esta URL como Webhook URL no painel do seu App na Meta, campo "WhatsApp"
          </p>
        </div>

        {/* Meta Fields */}
        <div className="grid gap-4 md:grid-cols-1">
          {META_FIELDS.map(field => {
            const isEditing = editing[field.key];
            const hasValue = Boolean(getConfig(field.key));
            const maskedValue = getMaskedValue(field.key);

            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <div className="relative">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          id={field.key}
                          type={field.isSecret && !showValues[field.key] ? 'password' : 'text'}
                          placeholder={field.placeholder}
                          value={values[field.key] || ''}
                          onChange={e => handleChange(field.key, e.target.value)}
                          className={field.isSecret ? 'pr-10' : ''}
                        />
                        {field.isSecret && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowValues(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                          >
                            {showValues[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleCancel(field.key)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={hasValue ? maskedValue : '(não configurado)'}
                        disabled
                        className="font-mono bg-muted"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(prev => ({ ...prev, [field.key]: true }));
                          setValues(prev => ({ ...prev, [field.key]: '' }));
                        }}
                      >
                        Alterar
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{field.description}</p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          <Button onClick={handleSave} disabled={isUpdating || !hasChanges}>
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
      </CardContent>
    </Card>
  );
}
