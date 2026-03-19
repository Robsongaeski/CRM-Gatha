import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Play, Pause, Trash2, Edit, MoreHorizontal, Zap, Mail, MessageSquare, ShoppingCart, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAutomationWorkflows, useToggleWorkflow, useDeleteWorkflow, useWorkflowStats } from '@/hooks/useAutomationWorkflows';

const tipoIcons: Record<string, React.ReactNode> = {
  ecommerce: <ShoppingCart className="h-4 w-4" />,
  leads: <Users className="h-4 w-4" />,
  whatsapp: <MessageSquare className="h-4 w-4" />,
  comercial: <Activity className="h-4 w-4" />,
  geral: <Zap className="h-4 w-4" />,
};

const tipoLabels: Record<string, string> = {
  ecommerce: 'E-commerce',
  leads: 'Leads',
  whatsapp: 'WhatsApp',
  comercial: 'Comercial',
  geral: 'Geral',
};

const tipoColors: Record<string, string> = {
  ecommerce: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  leads: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  whatsapp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  comercial: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  geral: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function FluxosLista() {
  const navigate = useNavigate();
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: workflows = [], isLoading } = useAutomationWorkflows(
    tipoFilter ? { tipo: tipoFilter } : undefined
  );
  const { data: stats } = useWorkflowStats();
  const toggleWorkflow = useToggleWorkflow();
  const deleteWorkflow = useDeleteWorkflow();

  const handleToggle = (id: string, ativo: boolean) => {
    toggleWorkflow.mutate({ id, ativo: !ativo });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteWorkflow.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automação de Fluxos</h1>
          <p className="text-muted-foreground">
            Crie e gerencie fluxos automáticos para pedidos, leads e atendimentos
          </p>
        </div>
        <Button onClick={() => navigate('/automacao/novo')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Fluxo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fluxos Ativos</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflows.filter(w => w.ativo).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Execuções Hoje</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <Activity className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.failed || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="ecommerce">E-commerce</SelectItem>
            <SelectItem value="leads">Leads</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="comercial">Comercial</SelectItem>
            <SelectItem value="geral">Geral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Workflows Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum fluxo criado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie seu primeiro fluxo de automação para começar a automatizar processos
            </p>
            <Button onClick={() => navigate('/automacao/novo')}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Fluxo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map(workflow => (
            <Card 
              key={workflow.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                !workflow.ativo ? 'opacity-60' : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={tipoColors[workflow.tipo]}>
                      {tipoIcons[workflow.tipo]}
                      <span className="ml-1">{tipoLabels[workflow.tipo]}</span>
                    </Badge>
                    {workflow.ativo && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Ativo
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/automacao/${workflow.id}`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleToggle(workflow.id, workflow.ativo)}
                      >
                        {workflow.ativo ? (
                          <>
                            <Pause className="h-4 w-4 mr-2" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setDeleteId(workflow.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardTitle 
                  className="text-lg cursor-pointer hover:text-primary"
                  onClick={() => navigate(`/automacao/${workflow.id}`)}
                >
                  {workflow.nome}
                </CardTitle>
                {workflow.descricao && (
                  <CardDescription className="line-clamp-2">
                    {workflow.descricao}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={workflow.ativo}
                      onCheckedChange={() => handleToggle(workflow.id, workflow.ativo)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {workflow.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Criado em {new Date(workflow.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fluxo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O fluxo será permanentemente excluído
              junto com todo seu histórico de execuções.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
