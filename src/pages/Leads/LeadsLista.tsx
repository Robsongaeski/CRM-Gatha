import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useLeads, Lead } from '@/hooks/useLeads';
import { useAtualizarStatusLead, useExcluirLeads } from '@/hooks/useLeadsBulkActions';
import { useSegmentos } from '@/hooks/useSegmentos';
import { useUsuarios } from '@/hooks/useUsuarios';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { ImportarLeadsDialog } from '@/components/Leads/ImportarLeadsDialog';
import { LeadStatusBadge } from '@/components/Leads/LeadStatusBadge';
import { SegmentoBadge } from '@/components/Leads/SegmentoBadge';
import { RetornosHoje } from '@/components/Leads/RetornosHoje';
import { LeadsDashboardSemanal } from '@/components/Leads/LeadsDashboardSemanal';
import { AtribuirVendedorDialog } from '@/components/Leads/AtribuirVendedorDialog';
import { ConverterLeadAvancadoDialog } from '@/components/Leads/ConverterLeadAvancadoDialog';
import { AcoesLoteBarra } from '@/components/Leads/AcoesLoteBarra';
import { RegistrarContatoDialog } from '@/components/Leads/RegistrarContatoDialog';
import { Upload, UserPlus, Search, TrendingUp, Users, CheckCircle, Phone, MessageSquare, Eye, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function LeadsLista() {
  const [status, setStatus] = useState('todos');
  const [segmentoId, setSegmentoId] = useState('todos');
  const [vendedorId, setVendedorId] = useState('todos');
  const [search, setSearch] = useState('');
  const [meusContatos, setMeusContatos] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [atribuirDialogOpen, setAtribuirDialogOpen] = useState(false);
  const [converterDialogOpen, setConverterDialogOpen] = useState(false);
  const [contatoDialogOpen, setContatoDialogOpen] = useState(false);
  const [excluirDialogOpen, setExcluirDialogOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [leadParaConverter, setLeadParaConverter] = useState<Lead | null>(null);
  const [leadParaContato, setLeadParaContato] = useState<Lead | null>(null);
  
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const ITENS_POR_PAGINA = 20;
  const { can } = usePermissions();
  const { user } = useAuth();
  
  const { data: leadsResponse, isLoading } = useLeads({
    status: status !== 'todos' ? status : undefined,
    segmento_id: segmentoId !== 'todos' ? segmentoId : undefined,
    vendedor_id: meusContatos ? user?.id : (vendedorId !== 'todos' ? vendedorId : undefined),
    search: search || undefined,
    page: currentPage - 1,
    pageSize: ITENS_POR_PAGINA,
  });

  const { data: leads = [], totalCount = 0 } = leadsResponse || {};

  const { data: segmentos = [] } = useSegmentos();
  const { data: usuarios = [] } = useUsuarios();
  const atualizarStatusMutation = useAtualizarStatusLead();
  const excluirMutation = useExcluirLeads();

  // Filtrar apenas leads ativos na visualização
  const leadsAtivos = useMemo(() => {
    return leads.filter(l => (l as any).ativo !== false);
  }, [leads]);

  const stats = {
    total: leadsAtivos.length,
    novos: leadsAtivos.filter(l => l.status === 'novo').length,
    qualificados: leadsAtivos.filter(l => l.status === 'qualificado').length,
    convertidos: leadsAtivos.filter(l => l.status === 'convertido').length,
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(leadsAtivos.map(l => l.id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (id: string, checked: boolean) => {
    const newSelection = new Set(selectedLeads);
    if (checked) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedLeads(newSelection);
  };

  const handleMarcarContato = (lead: Lead) => {
    if (lead.status !== 'contatando') {
      atualizarStatusMutation.mutate({ id: lead.id, status: 'contatando' });
    }
    setLeadParaContato(lead);
    setContatoDialogOpen(true);
  };

  const handleAbrirWhatsApp = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    const numero = lead.whatsapp || lead.telefone;
    if (numero) {
      const apenasDigitos = numero.replace(/\D/g, '');
      // Abrir no atendimento interno ao invés do WhatsApp Web externo
      navigate(`/whatsapp/atendimento?telefone=${apenasDigitos}&nome=${encodeURIComponent(lead.nome)}`);
    }
  };

  const handleConverter = (e: React.MouseEvent, lead: Lead) => {
    e.stopPropagation();
    setLeadParaConverter(lead);
    setConverterDialogOpen(true);
  };

  const handleExcluirSelecionados = async () => {
    await excluirMutation.mutateAsync(Array.from(selectedLeads));
    setSelectedLeads(new Set());
    setExcluirDialogOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITENS_POR_PAGINA));

  const selectedLeadsArray = Array.from(selectedLeads);
  const allSelected = leadsAtivos.length > 0 && selectedLeads.size === leadsAtivos.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prospecção de Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus leads e converta em clientes</p>
        </div>
        <div className="flex gap-2">
          {can('leads.importar') && (
            <Button onClick={() => setImportDialogOpen(true)} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importar CSV
            </Button>
          )}
          {can('leads.criar') && (
            <Button onClick={() => navigate('/leads/novo')}>
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Lead
            </Button>
          )}
        </div>
      </div>

      {/* Dashboard Semanal do Vendedor - Exibido para vendedores */}
      <LeadsDashboardSemanal />

      <RetornosHoje />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.novos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
            <Phone className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.qualificados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.convertidos}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button 
                variant={meusContatos ? "default" : "outline"} 
                onClick={() => setMeusContatos(!meusContatos)}
                className="whitespace-nowrap"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Meus Contatos
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="contatando">Contatando</SelectItem>
                  <SelectItem value="qualificado">Qualificado</SelectItem>
                  <SelectItem value="nao_qualificado">Não Qualificado</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="perdido">Perdido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={segmentoId} onValueChange={setSegmentoId}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos segmentos</SelectItem>
                  {segmentos.map(seg => (
                    <SelectItem key={seg.id} value={seg.id}>{seg.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {can('leads.visualizar_todos') && !meusContatos && (
                <Select value={vendedorId} onValueChange={setVendedorId}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos vendedores</SelectItem>
                    {usuarios.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <AcoesLoteBarra
            selectedCount={selectedLeads.size}
            onAtribuir={() => setAtribuirDialogOpen(true)}
            onExcluir={() => setExcluirDialogOpen(true)}
            onLimparSelecao={() => setSelectedLeads(new Set())}
            canAtribuir={can('leads.atribuir')}
            canExcluir={can('leads.excluir') || can('leads.excluir_lote')}
          />

          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  {(can('leads.atribuir') || can('leads.excluir_lote')) && (
                    <TableHead className="w-[40px]">
                      <Checkbox 
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Carregando...</TableCell>
                  </TableRow>
                ) : leadsAtivos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Nenhum lead encontrado</TableCell>
                  </TableRow>
                ) : (
                  leadsAtivos.map(lead => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-accent" 
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      {(can('leads.atribuir') || can('leads.excluir_lote')) && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedLeads.has(lead.id)}
                            onCheckedChange={(checked) => handleSelectLead(lead.id, checked as boolean)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {lead.nome}
                          {lead.status === 'contatando' && lead.vendedor_id === user?.id && (
                            <Badge variant="secondary" className="text-xs">Meu</Badge>
                          )}
                          {lead.cliente_id && (
                            <Badge variant="outline" className="text-xs border-primary text-primary">Cliente</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.telefone && <div>{lead.telefone}</div>}
                          {lead.email && <div className="text-muted-foreground">{lead.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.segmento && (
                          <SegmentoBadge nome={lead.segmento.nome} cor={lead.segmento.cor} icone={lead.segmento.icone} />
                        )}
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell>{lead.vendedor?.nome || '-'}</TableCell>
                      <TableCell>{format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {(lead.whatsapp || lead.telefone) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={(e) => handleAbrirWhatsApp(e, lead)}
                                >
                                  <MessageSquare className="h-4 w-4 text-primary" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Abrir WhatsApp</TooltipContent>
                            </Tooltip>
                          )}
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarcarContato(lead);
                                }}
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Registrar Contato</TooltipContent>
                          </Tooltip>

                          {lead.status !== 'convertido' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  size="icon" 
                                  variant="ghost"
                                  onClick={(e) => handleConverter(e, lead)}
                                >
                                  <UserCheck className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Converter em Cliente</TooltipContent>
                            </Tooltip>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="icon" 
                                variant="ghost"
                                onClick={() => navigate(`/leads/${lead.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver Detalhes</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TooltipProvider>

          {totalCount > ITENS_POR_PAGINA && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Mostrando {Math.min(leads.length, totalCount)} de {totalCount} leads
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="text-sm font-medium">
                  Página {currentPage} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ImportarLeadsDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      
      <AtribuirVendedorDialog 
        open={atribuirDialogOpen} 
        onOpenChange={setAtribuirDialogOpen}
        leadIds={selectedLeadsArray}
        onSuccess={() => setSelectedLeads(new Set())}
      />

      <ConverterLeadAvancadoDialog
        open={converterDialogOpen}
        onOpenChange={setConverterDialogOpen}
        lead={leadParaConverter}
      />

      {leadParaContato && (
        <RegistrarContatoDialog
          open={contatoDialogOpen}
          onOpenChange={setContatoDialogOpen}
          leadId={leadParaContato.id}
        />
      )}

      <AlertDialog open={excluirDialogOpen} onOpenChange={setExcluirDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Leads?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir {selectedLeads.size} lead(s) permanentemente. 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExcluirSelecionados}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
