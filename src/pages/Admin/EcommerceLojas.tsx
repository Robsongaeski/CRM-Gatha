import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Store, Copy, Check, Plus, Edit2, Power, Package, ShoppingCart, Key, Eye, EyeOff, Loader2, Wifi, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useEcommerceStores, getWebhookUrl } from '@/hooks/useEcommerceStores';
import { getAbandonedCartWebhookUrl } from '@/hooks/useAbandonedCarts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function EcommerceLojas() {
  const { stores, isLoading, orderCounts, createStore, updateStore, toggleStore, isCreating, isUpdating } = useEcommerceStores();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStore, setNewStore] = useState({ codigo: '', nome: '', cor: '#3B82F6' });
  const [editForm, setEditForm] = useState({ nome: '', cor: '', wbuy_api_user: '', wbuy_api_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [syncingStore, setSyncingStore] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  const handleCopyUrl = async (url: string, identifier: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(identifier);
    toast.success('URL copiada!');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleAddStore = () => {
    if (!newStore.codigo || !newStore.nome) {
      toast.error('Preencha o código e nome da loja');
      return;
    }
    createStore(newStore, {
      onSuccess: () => {
        setIsAddDialogOpen(false);
        setNewStore({ codigo: '', nome: '', cor: '#3B82F6' });
      }
    });
  };

  const handleEditStore = () => {
    if (!editingStore) return;
    updateStore({ 
      id: editingStore.id, 
      nome: editForm.nome, 
      cor: editForm.cor,
      wbuy_api_user: editForm.wbuy_api_user || undefined,
      wbuy_api_password: editForm.wbuy_api_password || undefined,
    }, {
      onSuccess: () => setEditingStore(null)
    });
  };

  const openEditDialog = (store: any) => {
    setEditingStore(store);
    setEditForm({ nome: store.nome, cor: store.cor, wbuy_api_user: store.wbuy_api_user || '', wbuy_api_password: store.wbuy_api_password || '' });
    setShowPassword(false);
  };

  const handleTestConnection = async () => {
    if (!editingStore) return;
    setTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke('wbuy-api-proxy', {
        body: { store_code: editingStore.codigo, action: 'test' },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success('Conexão com a API WBuy bem-sucedida!');
      } else {
        toast.error(data?.error || 'Falha ao conectar com a API WBuy');
      }
    } catch (err: any) {
      toast.error('Erro ao testar conexão: ' + err.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncOrders = async (storeCode: string, mode: 'full_import' | 'enrich') => {
    setSyncingStore(storeCode);
    setSyncResult(null);
    const toastId = toast.loading(
      mode === 'full_import' 
        ? 'Importando pedidos da API WBuy... Isso pode levar alguns minutos.'
        : 'Enriquecendo pedidos existentes...'
    );
    try {
      const { data, error } = await supabase.functions.invoke('wbuy-sync-orders', {
        body: { store_code: storeCode, mode },
      });
      if (error) throw error;
      
      toast.dismiss(toastId);
      setSyncResult({ storeCode, ...data });
      
      if (data?.success) {
        const parts: string[] = [];
        if (data.imported > 0) parts.push(`${data.imported} importados`);
        if (data.enriched > 0) parts.push(`${data.enriched} enriquecidos`);
        if (data.skipped > 0) parts.push(`${data.skipped} já existentes`);
        if (data.errors > 0) parts.push(`${data.errors} erros`);
        
        toast.success(`Sincronização concluída: ${parts.join(', ') || 'nenhuma alteração'}`);
      } else {
        toast.error(data?.error || 'Erro na sincronização');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error('Erro ao sincronizar: ' + err.message);
    } finally {
      setSyncingStore(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/usuarios">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Lojas E-commerce</h1>
            <p className="text-muted-foreground">Gerencie suas lojas WBuy e obtenha URLs dos webhooks</p>
          </div>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova Loja</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Loja</DialogTitle>
              <DialogDescription>Cadastre uma nova loja para receber pedidos via webhook.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" placeholder="Ex: minha-loja" value={newStore.codigo} onChange={(e) => setNewStore(s => ({ ...s, codigo: e.target.value }))} />
                <p className="text-xs text-muted-foreground">Usado na URL do webhook. Apenas letras minúsculas, números e hífens.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" placeholder="Ex: Minha Loja" value={newStore.nome} onChange={(e) => setNewStore(s => ({ ...s, nome: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cor">Cor de Identificação</Label>
                <div className="flex gap-2">
                  <Input id="cor" type="color" value={newStore.cor} onChange={(e) => setNewStore(s => ({ ...s, cor: e.target.value }))} className="w-16 h-10 p-1 cursor-pointer" />
                  <Input value={newStore.cor} onChange={(e) => setNewStore(s => ({ ...s, cor: e.target.value }))} className="flex-1" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddStore} disabled={isCreating}>{isCreating ? 'Criando...' : 'Criar Loja'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" />Lojas Cadastradas</CardTitle>
          <CardDescription>Copie as URLs dos webhooks para configurar no WBuy de cada loja</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : stores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma loja cadastrada</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Webhooks</TableHead>
                  <TableHead className="text-center">Pedidos</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => {
                  const ordersUrl = getWebhookUrl(store.codigo);
                  const cartsUrl = getAbandonedCartWebhookUrl(store.codigo);
                  const pedidosCount = orderCounts[store.codigo] || 0;
                  const hasApiCredentials = !!(store.wbuy_api_user && store.wbuy_api_password);
                  const isSyncing = syncingStore === store.codigo;
                  
                  return (
                    <TableRow key={store.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: store.cor }} />
                          <div>
                            <span className="font-medium">{store.nome}</span>
                            <p className="text-xs text-muted-foreground">{store.codigo}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <code className="bg-muted px-2 py-0.5 rounded text-xs max-w-[250px] truncate">{ordersUrl}</code>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleCopyUrl(ordersUrl, `orders-${store.codigo}`)}>
                              {copiedUrl === `orders-${store.codigo}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                          <div className="flex items-center gap-2">
                            <ShoppingCart className="h-3 w-3 text-muted-foreground" />
                            <code className="bg-muted px-2 py-0.5 rounded text-xs max-w-[250px] truncate">{cartsUrl}</code>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleCopyUrl(cartsUrl, `carts-${store.codigo}`)}>
                              {copiedUrl === `carts-${store.codigo}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{pedidosCount}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant={store.ativo ? 'default' : 'secondary'}>{store.ativo ? 'Ativa' : 'Inativa'}</Badge>
                          {hasApiCredentials && (
                            <Badge variant="outline" className="text-xs">API ✓</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {hasApiCredentials && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleSyncOrders(store.codigo, 'full_import')}
                                disabled={isSyncing}
                                title="Importar todos os pedidos da API WBuy"
                              >
                                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleSyncOrders(store.codigo, 'enrich')}
                                disabled={isSyncing}
                                title="Enriquecer pedidos existentes"
                              >
                                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(store)}><Edit2 className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm"><Power className={`h-4 w-4 ${store.ativo ? 'text-destructive' : 'text-emerald-600'}`} /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{store.ativo ? 'Desativar' : 'Ativar'} loja?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {store.ativo ? 'A loja não receberá mais pedidos via webhook enquanto estiver desativada.' : 'A loja voltará a receber pedidos via webhook.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => toggleStore({ id: store.id, ativo: !store.ativo })}>{store.ativo ? 'Desativar' : 'Ativar'}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sync Result Card */}
      {syncResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Resultado da Sincronização — {syncResult.storeCode}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {syncResult.imported !== undefined && (
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{syncResult.imported}</div>
                  <div className="text-xs text-muted-foreground">Importados</div>
                </div>
              )}
              {syncResult.enriched !== undefined && (
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-primary">{syncResult.enriched}</div>
                  <div className="text-xs text-muted-foreground">Enriquecidos</div>
                </div>
              )}
              {syncResult.skipped !== undefined && (
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{syncResult.skipped}</div>
                  <div className="text-xs text-muted-foreground">Já existentes</div>
                </div>
              )}
              {syncResult.errors !== undefined && (
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className={`text-2xl font-bold ${syncResult.errors > 0 ? 'text-destructive' : ''}`}>{syncResult.errors}</div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </div>
              )}
            </div>
            {syncResult.details && syncResult.details.length > 0 && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-xs font-medium mb-1">Detalhes:</p>
                {syncResult.details.slice(0, 10).map((d: string, i: number) => (
                  <p key={i} className="text-xs text-muted-foreground">{d}</p>
                ))}
                {syncResult.details.length > 10 && (
                  <p className="text-xs text-muted-foreground mt-1">... e mais {syncResult.details.length - 10} mensagens</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editingStore} onOpenChange={(open) => !open && setEditingStore(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Loja</DialogTitle>
            <DialogDescription>Altere as informações da loja "{editingStore?.nome}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome</Label>
              <Input id="edit-nome" value={editForm.nome} onChange={(e) => setEditForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cor">Cor de Identificação</Label>
              <div className="flex gap-2">
                <Input id="edit-cor" type="color" value={editForm.cor} onChange={(e) => setEditForm(f => ({ ...f, cor: e.target.value }))} className="w-16 h-10 p-1 cursor-pointer" />
                <Input value={editForm.cor} onChange={(e) => setEditForm(f => ({ ...f, cor: e.target.value }))} className="flex-1" />
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                <Key className="h-4 w-4" />
                Configuração da API WBuy
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Configure as credenciais para buscar dados complementares dos pedidos (forma de pagamento, frete, descontos).
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="edit-api-user">Usuário API</Label>
                  <Input id="edit-api-user" placeholder="Usuário fornecido pela WBuy" value={editForm.wbuy_api_user} onChange={(e) => setEditForm(f => ({ ...f, wbuy_api_user: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-api-password">Senha API</Label>
                  <div className="flex gap-2">
                    <Input id="edit-api-password" type={showPassword ? 'text' : 'password'} placeholder="Senha fornecida pela WBuy" value={editForm.wbuy_api_password} onChange={(e) => setEditForm(f => ({ ...f, wbuy_api_password: e.target.value }))} className="flex-1" />
                    <Button variant="outline" size="icon" onClick={() => setShowPassword(!showPassword)} type="button">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {editForm.wbuy_api_user && editForm.wbuy_api_password && (
                  <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testingConnection} className="w-full">
                    {testingConnection ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wifi className="h-4 w-4 mr-2" />}
                    {testingConnection ? 'Testando...' : 'Testar Conexão'}
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStore(null)}>Cancelar</Button>
            <Button onClick={handleEditStore} disabled={isUpdating}>{isUpdating ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
