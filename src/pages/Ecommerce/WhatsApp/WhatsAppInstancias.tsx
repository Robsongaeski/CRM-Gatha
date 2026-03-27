import { useState } from 'react';
import { useWhatsappInstances, useCreateWhatsappInstance, useCreateUazapiInstance, useDeleteWhatsappInstance, useDisconnectInstance, useCheckInstanceStatus, useRestartInstance, WhatsappInstance } from '@/hooks/whatsapp/useWhatsappInstances';
import { useUserInstances, useInstanceUsers } from '@/hooks/whatsapp/useWhatsappInstanceUsers';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Smartphone, Wifi, WifiOff, Trash2, QrCode, Settings2, Users, RefreshCw, Pencil, Phone, Info, RotateCcw, Cloud, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';
import { Skeleton } from '@/components/ui/skeleton';
import QRCodeDialog from '@/components/WhatsApp/QRCodeDialog';
import QuickRepliesManager from '@/components/WhatsApp/QuickRepliesManager';
import GerenciarUsuariosDialog from '@/components/WhatsApp/GerenciarUsuariosDialog';
import { EditarAliasDialog } from '@/components/WhatsApp/EditarAliasDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EmbeddedSignupDialog from '@/components/WhatsApp/EmbeddedSignupDialog';

interface WhatsAppInstanciasProps {
  hideQuickRepliesButton?: boolean;
}

export default function WhatsAppInstancias({ hideQuickRepliesButton = false }: WhatsAppInstanciasProps) {
  const { isAdmin, can } = usePermissions();
  const canManageInstances = isAdmin || can('whatsapp.instancias.gerenciar');
  
  // Usar instâncias do usuário (já filtradas por permissão)
  const { data: instances = [], isLoading, refetch } = useUserInstances();
  const createInstance = useCreateWhatsappInstance();
  const createUazapiInstance = useCreateUazapiInstance();
  const deleteInstance = useDeleteWhatsappInstance();
  const disconnectInstance = useDisconnectInstance();
  const checkStatus = useCheckInstanceStatus();
  const restartInstance = useRestartInstance();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<WhatsappInstance | null>(null);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [showAddUazapiDialog, setShowAddUazapiDialog] = useState(false);
  const [newUazapiInstanceName, setNewUazapiInstanceName] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showUsersDialog, setShowUsersDialog] = useState(false);
  const [usersInstance, setUsersInstance] = useState<WhatsappInstance | null>(null);
  const [showEditAliasDialog, setShowEditAliasDialog] = useState(false);
  const [editingInstance, setEditingInstance] = useState<WhatsappInstance | null>(null);
  const [showEmbeddedSignup, setShowEmbeddedSignup] = useState(false);

  const handleCreate = async () => {
    if (!newInstanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }
    const instanceName = newInstanceName.trim().toLowerCase().replace(/\s+/g, '-');
    try {
      await createInstance.mutateAsync({ nome: newInstanceName.trim(), instance_name: instanceName });
      toast.success('Instância criada com sucesso!');
      setShowAddDialog(false);
      setNewInstanceName('');
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleCreateUazapi = async () => {
    if (!newUazapiInstanceName.trim()) {
      toast.error('Digite um nome para a instância UAZAPI');
      return;
    }
    const instanceName = newUazapiInstanceName.trim().toLowerCase().replace(/\s+/g, '-');
    try {
      await createUazapiInstance.mutateAsync({ nome: newUazapiInstanceName.trim(), instance_name: instanceName });
      setShowAddUazapiDialog(false);
      setNewUazapiInstanceName('');
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleConnect = (instance: WhatsappInstance) => {
    setSelectedInstance(instance);
    setShowQRDialog(true);
  };

  const handleDisconnect = async (instance: WhatsappInstance) => {
    try {
      await disconnectInstance.mutateAsync({
        instanceId: instance.id,
        instanceName: instance.instance_name,
        apiType: instance.api_type,
      });
      toast.success('Instância desconectada');
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleDelete = async (instance: WhatsappInstance) => {
    try {
      await deleteInstance.mutateAsync({
        id: instance.id,
        instance_name: instance.instance_name,
        api_type: instance.api_type,
      });
      toast.success('Instância excluída');
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleCheckStatus = async (instance: WhatsappInstance) => {
    try {
      const result = await checkStatus.mutateAsync({
        instanceId: instance.id,
        instanceName: instance.instance_name,
        apiType: instance.api_type,
      });
      await refetch();
      if (result.sessionCorrupted) {
        toast.error('Sessão corrompida! A instância precisa ser reiniciada.');
      } else {
        toast.success(`Status: ${result.status === 'connected' ? 'Conectado' : 'Desconectado'}`);
      }
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  const handleRestart = async (instance: WhatsappInstance) => {
    try {
      const result = await restartInstance.mutateAsync({
        instanceId: instance.id,
        instanceName: instance.instance_name,
        apiType: instance.api_type,
      });
      // Abrir QR dialog se retornou QR code
      if (result.qrcode) {
        setSelectedInstance(instance);
        setShowQRDialog(true);
      }
      await refetch();
    } catch (error: any) {
      toast.error(sanitizeError(error));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Instâncias WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            {canManageInstances 
              ? 'Gerencie suas conexões com WhatsApp Business' 
              : 'Instâncias de WhatsApp atribuídas a você'}
          </p>
        </div>
        <div className="flex gap-2">
          {!hideQuickRepliesButton && (
            <Button variant="outline" onClick={() => setShowQuickReplies(true)}>
              <Settings2 className="h-4 w-4 mr-2" />
              Respostas Rápidas
            </Button>
          )}
          {canManageInstances && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowEmbeddedSignup(true)}
                className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950"
              >
                <Cloud className="h-4 w-4 mr-2" />
                Cloud API (Oficial)
              </Button>
              {/* UAZAPI */}
              <Dialog open={showAddUazapiDialog} onOpenChange={setShowAddUazapiDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950">
                    <Zap className="h-4 w-4 mr-2" />
                    UAZAPI
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-600" /> Nova Instância UAZAPI
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome da Instância</Label>
                      <Input
                        placeholder="Ex: Suporte UAZAPI"
                        value={newUazapiInstanceName}
                        onChange={(e) => setNewUazapiInstanceName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateUazapi()}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddUazapiDialog(false)}>Cancelar</Button>
                    <Button onClick={handleCreateUazapi} disabled={createUazapiInstance.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                      {createUazapiInstance.isPending ? 'Criando...' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              {/* Evolution API */}
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Evolution API
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nova Instância Evolution API</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nome da Instância</Label>
                      <Input
                        placeholder="Ex: Atendimento Principal"
                        value={newInstanceName}
                        onChange={(e) => setNewInstanceName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreate} disabled={createInstance.isPending}>
                      {createInstance.isPending ? 'Criando...' : 'Criar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      {!canManageInstances && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Você está visualizando apenas as instâncias atribuídas a você. 
            Para gerenciar todas as instâncias, entre em contato com um administrador.
          </AlertDescription>
        </Alert>
      )}

      {instances.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma instância configurada</p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeira instância
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onDelete={handleDelete}
              onCheckStatus={handleCheckStatus}
              onRestart={handleRestart}
              onManageUsers={(inst) => {
                setUsersInstance(inst);
                setShowUsersDialog(true);
              }}
              onEditAlias={(inst) => {
                setEditingInstance(inst);
                setShowEditAliasDialog(true);
              }}
              disconnecting={disconnectInstance.isPending}
              checkingStatus={checkStatus.isPending}
              restarting={restartInstance.isPending}
            />
          ))}
        </div>
      )}

      {selectedInstance && (
        <QRCodeDialog
          instanceId={selectedInstance.id}
          instanceName={selectedInstance.instance_name}
          apiType={selectedInstance.api_type}
          open={showQRDialog}
          onOpenChange={(open) => {
            setShowQRDialog(open);
            if (!open) {
              setSelectedInstance(null);
              refetch();
            }
          }}
        />
      )}

      <QuickRepliesManager
        open={showQuickReplies}
        onOpenChange={setShowQuickReplies}
      />

      {usersInstance && (
        <GerenciarUsuariosDialog
          open={showUsersDialog}
          onOpenChange={setShowUsersDialog}
          instanceId={usersInstance.id}
          instanceName={usersInstance.nome}
        />
      )}

      {editingInstance && (
        <EditarAliasDialog
          open={showEditAliasDialog}
          onOpenChange={setShowEditAliasDialog}
          instanceId={editingInstance.id}
          currentNome={editingInstance.nome}
          numeroWhatsapp={editingInstance.numero_whatsapp}
          instanceName={editingInstance.instance_name}
        />
      )}

      <EmbeddedSignupDialog
        open={showEmbeddedSignup}
        onOpenChange={setShowEmbeddedSignup}
      />
    </div>
  );
}

// Componente de card separado para melhor organização
interface InstanceCardProps {
  instance: WhatsappInstance;
  onConnect: (instance: WhatsappInstance) => void;
  onDisconnect: (instance: WhatsappInstance) => void;
  onDelete: (instance: WhatsappInstance) => void;
  onCheckStatus: (instance: WhatsappInstance) => void;
  onRestart: (instance: WhatsappInstance) => void;
  onManageUsers: (instance: WhatsappInstance) => void;
  onEditAlias: (instance: WhatsappInstance) => void;
  disconnecting: boolean;
  checkingStatus: boolean;
  restarting: boolean;
}

function InstanceCard({ instance, onConnect, onDisconnect, onDelete, onCheckStatus, onRestart, onManageUsers, onEditAlias, disconnecting, checkingStatus, restarting }: InstanceCardProps) {
  const { data: users = [] } = useInstanceUsers(instance.id);
  const isCloudApi = instance.api_type === 'cloud_api';
  const isUazapi = instance.api_type === 'uazapi';
  
  return (
    <Card className={cn(isCloudApi && 'border-green-200 dark:border-green-800', isUazapi && 'border-emerald-200 dark:border-emerald-800')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base truncate">{instance.nome}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => onEditAlias(instance)}
                title="Editar nome"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {instance.numero_whatsapp && (
                <CardDescription className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {instance.meta_display_phone_number || instance.numero_whatsapp}
                </CardDescription>
              )}
              {isCloudApi ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                  <Cloud className="h-2.5 w-2.5 mr-0.5" />
                  Cloud API
                </Badge>
              ) : isUazapi ? (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400">
                  <Zap className="h-2.5 w-2.5 mr-0.5" />
                  UAZAPI
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  Evolution
                </Badge>
              )}
            </div>
          </div>
          <Badge
            variant={instance.status === 'connected' ? 'default' : 'destructive'}
            className={cn("shrink-0", instance.status === 'connected' ? 'bg-green-500' : instance.status === 'error' ? 'bg-orange-500' : '')}
          >
            {instance.status === 'connected' ? (
              <><Wifi className="h-3 w-3 mr-1" /> Conectado</>
            ) : instance.status === 'error' ? (
              <><WifiOff className="h-3 w-3 mr-1" /> Sessão Inválida</>
            ) : (
              <><WifiOff className="h-3 w-3 mr-1" /> Desconectado</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Usuários vinculados */}
        <div 
          className="flex items-center gap-1 text-xs text-muted-foreground mb-3 cursor-pointer hover:text-foreground transition-colors"
          onClick={() => onManageUsers(instance)}
        >
          <Users className="h-3 w-3" />
          <span>
            {users.length === 0 
              ? 'Nenhum usuário vinculado (todos têm acesso)' 
              : `${users.length} usuário(s) com acesso`}
          </span>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onManageUsers(instance)}
          >
            <Users className="h-4 w-4 mr-1" />
            Usuários
          </Button>

          {!isCloudApi && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCheckStatus(instance)}
              disabled={checkingStatus}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", checkingStatus && "animate-spin")} />
              Verificar
            </Button>
          )}
          
          {isCloudApi ? (
            <Badge variant="secondary" className="h-8 flex items-center gap-1 text-xs">
              <Wifi className="h-3 w-3" />
              API Oficial Ativa
            </Badge>
          ) : instance.status === 'connected' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDisconnect(instance)}
                disabled={disconnecting}
              >
                <WifiOff className="h-4 w-4 mr-1" />
                Desconectar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRestart(instance)}
                disabled={restarting}
                title="Reiniciar sessão (resolve problemas de envio)"
              >
                <RotateCcw className={cn("h-4 w-4 mr-1", restarting && "animate-spin")} />
                Reiniciar
              </Button>
            </>
          ) : instance.status === 'error' ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => onRestart(instance)}
              disabled={restarting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <RotateCcw className={cn("h-4 w-4 mr-1", restarting && "animate-spin")} />
              Reiniciar Sessão
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConnect(instance)}
            >
              <QrCode className="h-4 w-4 mr-1" />
              Conectar
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir instância?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A instância será removida permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(instance)}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
