import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Package, TrendingUp, Settings, ShoppingCart, DollarSign, Target, 
  Percent, FileText, History, CheckCircle, Truck, Shield, UserPlus, Upload, Tag, Receipt, 
  FileSpreadsheet, BookOpen, Ruler, Factory, Printer, AlertTriangle, KanbanSquare, RefreshCcw,
  CalendarClock, PackageCheck, Wrench, ChevronRight, FileBadge, Send, BarChart3, HelpCircle, PackageX,
  MessageSquare, Shirt, Workflow, Store, ListTodo, UserCog, Calendar, Gift, Briefcase, Cog, Building2, Bot
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions } from '@/hooks/usePermissions';
import { usePedidosAprovacaoPendentes } from '@/hooks/usePedidosAprovacao';
import { usePedidosAlteracoesPendentes } from '@/hooks/usePedidosAlteracoes';
import { usePagamentosPendentes } from '@/hooks/usePagamentos';
import { useRetornosCount } from '@/hooks/useRetornosPendentes';
import { useTarefasCount } from '@/hooks/useTarefas';
import { Badge } from '@/components/ui/badge';

// Definição dos módulos e seus itens
const vendasItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Meus Leads', url: '/leads', icon: UserPlus, showBadge: true },
  { title: 'Propostas', url: '/propostas', icon: FileText },
  { title: 'Pedidos', url: '/pedidos', icon: ShoppingCart },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Grades para Prova', url: '/vendas/grades-prova', icon: Shirt },
];

// Itens de cadastro comercial (movidos de Admin para Vendas)
const vendasCadastrosItems = [
  { title: 'Produtos', url: '/produtos', icon: Package, permission: 'produtos.visualizar' },
  { title: 'Segmentos', url: '/admin/segmentos', icon: Tag, permission: 'segmentos.visualizar' },
  { title: 'Grades de Tamanho', url: '/admin/grades-tamanho', icon: Ruler, permission: 'grades_tamanho.visualizar' },
];

const vendasComissoesItem = { title: 'Minhas Comissões', url: '/comissoes', icon: Target };

const pcpItems = [
  { title: 'Dashboard PCP', url: '/pcp', icon: Factory },
  { title: 'Kanban de Produção', url: '/pcp/kanban', icon: KanbanSquare },
  { title: 'Quantidades', url: '/pcp/quantidades', icon: BarChart3 },
  { title: 'Resumo para Impressão', url: '/pcp/resumo-impressao', icon: FileBadge },
  { title: 'Impressão', url: '/pcp/impressao', icon: Printer },
  { title: 'Lançamento de Falhas', url: '/pcp/falhas', icon: AlertTriangle },
  { title: 'Expedição PCP', url: '/pcp/expedicao', icon: PackageCheck },
  { title: 'Calendário de Entregas', url: '/pcp/calendario', icon: CalendarClock },
  { title: 'Cadastros PCP', url: '/pcp/cadastros', icon: Wrench },
];

const financeiroItems = [
  { title: 'Pagamentos Pendentes', url: '/financeiro/pagamentos-pendentes', icon: DollarSign, showBadge: true },
  { title: 'Controle de Recebimentos', url: '/financeiro/controle-recebimentos', icon: Receipt },
  { title: 'Histórico Financeiro', url: '/financeiro/historico', icon: History },
];

const suprimentosItems = [
  { title: 'Dashboard', url: '/suprimentos', icon: LayoutDashboard, permission: 'procurement.module.view' },
  { title: 'Fornecedores', url: '/suprimentos/fornecedores', icon: Building2, permission: 'procurement.suppliers.view' },
  { title: 'Produtos / Insumos', url: '/suprimentos/insumos', icon: Package, permission: 'procurement.products.view' },
  { title: 'Compras', url: '/suprimentos/compras', icon: ShoppingCart, permission: 'procurement.purchases.view' },
  { title: 'Histórico de Preços', url: '/suprimentos/historico-precos', icon: TrendingUp, permission: 'procurement.prices.view' },
  { title: 'Composições', url: '/suprimentos/composicoes', icon: Workflow, permission: 'procurement.compositions.manage' },
  { title: 'Relatórios', url: '/suprimentos/relatorios', icon: FileSpreadsheet, permission: 'procurement.reports.view' },
];

const atendimentoItems = [
  { title: 'Entrega de Pedidos', url: '/entrega-pedidos', icon: Truck },
];

const tarefasMainItem = { title: 'Minhas Tarefas', url: '/tarefas', icon: ListTodo, showBadge: true };

// Ecommerce items com submenus
const ecommerceMainItems = [
  { title: 'Dashboard', url: '/ecommerce', icon: LayoutDashboard },
  { title: 'Pedidos', url: '/ecommerce/pedidos', icon: ShoppingCart },
  { title: 'Carrinhos Abandonados', url: '/ecommerce/carrinhos-abandonados', icon: ShoppingCart },
  { title: 'Relatórios', url: '/ecommerce/relatorios', icon: FileSpreadsheet },
];

const ecommerceEnviosItems = [
  { title: 'Dashboard Envios', url: '/ecommerce/envios', icon: Truck },
  { title: 'Despacho', url: '/ecommerce/envios/despacho', icon: Send },
  { title: 'Atrasados', url: '/ecommerce/envios/atrasados', icon: AlertTriangle },
  { title: 'Relatórios', url: '/ecommerce/envios/relatorios', icon: BarChart3 },
];

const ecommerceSuporteItems = [
  { title: 'Dashboard Suporte', url: '/ecommerce/suporte', icon: RefreshCcw },
  { title: 'Chamados', url: '/ecommerce/suporte/chamados', icon: HelpCircle },
  { title: 'Trocas', url: '/ecommerce/suporte/trocas', icon: RefreshCcw },
  { title: 'Devoluções', url: '/ecommerce/suporte/devolucoes', icon: PackageX },
  { title: 'Extravios/Roubos', url: '/ecommerce/suporte/extravios', icon: AlertTriangle },
  { title: 'Relatórios', url: '/ecommerce/suporte/relatorios', icon: BarChart3 },
  { title: 'Motivos', url: '/ecommerce/suporte/motivos', icon: Tag },
];

// WhatsApp - Módulo independente
const whatsappItems = [
  { title: 'Atendimento', url: '/whatsapp/atendimento', icon: MessageSquare },
  { title: 'Dashboard', url: '/whatsapp/dashboard', icon: BarChart3 },
  { title: 'Configurações', url: '/whatsapp/configuracoes', icon: Settings },
];

const automacaoItems = [
  { title: 'Fluxos de Automação', url: '/automacao', icon: Workflow },
  { title: 'Agentes IA', url: '/automacao/agentes-ia', icon: Bot },
];

// RH - Gestão de Colaboradores
const rhItems = [
  { title: 'Dashboard RH', url: '/rh', icon: LayoutDashboard },
  { title: 'Colaboradores', url: '/rh/colaboradores', icon: Users },
  { title: 'Calendário', url: '/rh/calendario', icon: Calendar },
  { title: 'Histórico Salarial', url: '/rh/salarios', icon: DollarSign },
  { title: 'Férias', url: '/rh/ferias', icon: CalendarClock },
  { title: 'Fechamento Mensal', url: '/rh/fechamento', icon: FileSpreadsheet },
  { title: 'Bonificações', url: '/rh/bonificacoes', icon: Percent },
  { title: 'Mimos/Presentes', url: '/rh/mimos', icon: Gift },
  { title: 'Relatórios', url: '/rh/relatorios', icon: BarChart3 },
];

const adminItems = [
  { title: 'Usuários', url: '/admin/usuarios', icon: Settings },
  { title: 'Perfis de Acesso', url: '/admin/perfis', icon: Shield },
  { title: 'Aprovar Pedidos', url: '/admin/aprovar-pedidos', icon: CheckCircle, showBadge: true },
  { title: 'Lojas E-commerce', url: '/admin/ecommerce-lojas', icon: Store },
  { title: 'WhatsApp API', url: '/admin/whatsapp-api', icon: MessageSquare },
  { title: 'Regras de Comissão', url: '/admin/regras-comissao', icon: Percent },
  { title: 'Relatório Comissões', url: '/admin/relatorio-comissoes', icon: FileSpreadsheet },
  { title: 'Relatório Atendimentos', url: '/admin/relatorio-atendimentos', icon: BarChart3 },
  { title: 'Guia do Sistema', url: '/docs', icon: BookOpen },
];

// Constante para localStorage
const STORAGE_KEY = 'sidebar-modules-state';

// Hook para gerenciar estado dos módulos colapsáveis
function useModuleState() {
  const location = useLocation();
  const [openModules, setOpenModules] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  // Salvar no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(openModules));
  }, [openModules]);

  // Auto-expandir módulo com rota ativa
  useEffect(() => {
    const path = location.pathname;
    
    if (path.startsWith('/pcp')) {
      setOpenModules(prev => ({ ...prev, pcp: true }));
    } else if (path.startsWith('/financeiro')) {
      setOpenModules(prev => ({ ...prev, financeiro: true }));
    } else if (path.startsWith('/suprimentos')) {
      setOpenModules(prev => ({ ...prev, suprimentos: true }));
    } else if (path.startsWith('/admin')) {
      setOpenModules(prev => ({ ...prev, admin: true }));
    } else if (path === '/produtos' || path.startsWith('/admin/segmentos') || path.startsWith('/admin/grades-tamanho')) {
      setOpenModules(prev => ({ ...prev, vendas: true }));
    } else if (path === '/entrega-pedidos') {
      setOpenModules(prev => ({ ...prev, atendimento: true }));
    } else if (path.startsWith('/ecommerce')) {
      setOpenModules(prev => ({ ...prev, ecommerce: true }));
      if (path.includes('/envios')) {
        setOpenModules(prev => ({ ...prev, ecommerceEnvios: true }));
      }
      if (path.includes('/suporte')) {
        setOpenModules(prev => ({ ...prev, ecommerceSuporte: true }));
      }
    } else if (path.startsWith('/whatsapp')) {
      setOpenModules(prev => ({ ...prev, whatsapp: true }));
    } else if (['/leads', '/propostas', '/pedidos', '/clientes', '/comissoes', '/dashboard', '/vendas/grades-prova'].includes(path)) {
      setOpenModules(prev => ({ ...prev, vendas: true }));
    } else if (path.startsWith('/automacao')) {
      setOpenModules(prev => ({ ...prev, automacao: true }));
    } else if (path.startsWith('/rh')) {
      setOpenModules(prev => ({ ...prev, rh: true }));
    } else if (path.startsWith('/tarefas')) {
      setOpenModules(prev => ({ ...prev, tarefas: true }));
    }
  }, [location.pathname]);

  const toggleModule = (module: string) => {
    setOpenModules(prev => ({ ...prev, [module]: !prev[module] }));
  };

  return { openModules, toggleModule };
}

export function AppSidebar() {
  const { open } = useSidebar();
  const { isAdmin, isVendedor, isAtendente, isFinanceiro, isRH } = useUserRole();
  const { can } = usePermissions();
  const { data: pedidosPendentes = [] } = usePedidosAprovacaoPendentes();
  const { data: alteracoesPendentes = [] } = usePedidosAlteracoesPendentes();
  const { data: pagamentosPendentes = [] } = usePagamentosPendentes();
  const retornosCount = useRetornosCount();
  const { data: tarefasCount } = useTarefasCount();
  const { openModules, toggleModule } = useModuleState();
  
  const hasPcpAccess = isAdmin || 
    can('pcp.dashboard') || 
    can('pcp.kanban.visualizar') || 
    can('pcp.calendario.visualizar') ||
    can('pcp.impressao.visualizar') ||
    can('pcp.impressao.registrar') ||
    can('pcp.falhas.visualizar') ||
    can('pcp.falhas.registrar') ||
    can('pcp.expedicao.visualizar') ||
    can('pcp.expedicao.gerenciar') ||
    can('pcp.cadastros.visualizar') ||
    can('pcp.cadastros.gerenciar');

  const hasEcommerceAccess = can('trocas_devolucoes.visualizar') || can('trocas_devolucoes.criar') || can('trocas_devolucoes.editar') || isAdmin;
  const hasVendasCreateAccess = can('pedidos.criar') || can('propostas.criar') || can('leads.criar');
  const hasWhatsAppAccess = can('whatsapp.visualizar') || can('whatsapp.atender') || can('whatsapp.dashboard') || can('whatsapp.configurar') || isAdmin || isAtendente;
  const hasProcurementAccess =
    isAdmin ||
    can('procurement.module.view') ||
    can('procurement.suppliers.view') ||
    can('procurement.products.view') ||
    can('procurement.purchases.view') ||
    can('procurement.prices.view') ||
    can('procurement.reports.view') ||
    can('procurement.compositions.manage');

  const showVendas = isAdmin || isVendedor || hasVendasCreateAccess;
  const showFinanceiro = isFinanceiro || isAdmin;
  const showAtendimento = isAtendente || isFinanceiro || isAdmin || isVendedor || can('atendimento.entrega_pedidos');
  const showEcommerce = hasEcommerceAccess;
  const showWhatsApp = hasWhatsAppAccess;
  const showTarefas = can('tarefas.visualizar') || can('tarefas.criar') || isAdmin;
  const showAutomacao = isAdmin || can('automacao.visualizar');
  const showRH = isAdmin || isRH || can('rh.colaboradores.visualizar');
  const showAdmin = isAdmin || can('aprovacoes.aprovar') || can('pedidos.alteracoes.aprovar');
  const filteredSuprimentosItems = suprimentosItems.filter((item) => isAdmin || can(item.permission));
  const filteredAdminItems = adminItems.filter((item) => {
    if (isAdmin) return true;
    if (item.url === '/admin/aprovar-pedidos') {
      return can('aprovacoes.aprovar') || can('pedidos.alteracoes.aprovar');
    }
    return false;
  });

  const filteredPcpItems = pcpItems.filter(item => {
    if (isAdmin) return true;
    switch (item.url) {
      case '/pcp': return can('pcp.dashboard');
      case '/pcp/kanban': return can('pcp.kanban.visualizar');
      case '/pcp/resumo-impressao': return can('pcp.impressao.visualizar');
      case '/pcp/impressao': return can('pcp.impressao.visualizar') || can('pcp.impressao.registrar');
      case '/pcp/falhas': return can('pcp.falhas.visualizar') || can('pcp.falhas.registrar');
      case '/pcp/expedicao': return can('pcp.expedicao.visualizar') || can('pcp.expedicao.gerenciar');
      case '/pcp/calendario': return can('pcp.calendario.visualizar');
      case '/pcp/cadastros': return can('pcp.cadastros.visualizar') || can('pcp.cadastros.gerenciar');
      default: return false;
    }
  });

  const renderMenuItem = (item: any, badgeCount?: number, badgeVariant?: 'default' | 'destructive' | 'secondary') => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={item.url === '/'}
          className={({ isActive }) => `${isActive ? 'bg-sidebar-accent font-medium' : ''} ${item.subItem ? 'pl-6' : ''}`}
        >
          <item.icon className="h-4 w-4 flex-shrink-0" />
          {open && (
            <div className="flex items-center justify-between w-full">
              <span className="text-[13px]">{item.title}</span>
              {item.showBadge && badgeCount && badgeCount > 0 && (
                <Badge variant={badgeVariant || 'secondary'} className="ml-2 h-5 min-w-5 px-1 text-xs">
                  {badgeCount}
                </Badge>
              )}
            </div>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  // Renderiza o header/label do módulo com estilo destacado
  const renderModuleHeader = (title: string, isOpen: boolean, Icon: React.ElementType) => (
    <CollapsibleTrigger className="flex items-center justify-between w-full hover:bg-sidebar-accent/60 rounded-lg transition-colors py-1">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <span className="text-[15px] font-bold tracking-tight text-sidebar-foreground">{title}</span>
      </div>
      {open && <ChevronRight className={`h-4 w-4 transition-transform text-muted-foreground ${isOpen ? 'rotate-90' : ''}`} />}
    </CollapsibleTrigger>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Módulo Vendas */}
        {showVendas && (
          <Collapsible open={openModules.vendas} onOpenChange={() => toggleModule('vendas')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('Vendas', openModules.vendas, Briefcase)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {vendasItems.map((item) => renderMenuItem(item, item.showBadge ? retornosCount : undefined, 'secondary'))}
                    {(isVendedor || isAdmin) && renderMenuItem(vendasComissoesItem)}
                    {/* Cadastros Comerciais - com controle de permissão */}
                    {vendasCadastrosItems
                      .filter(item => isAdmin || can(item.permission))
                      .map((item) => renderMenuItem(item))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Módulo PCP */}
        {hasPcpAccess && (
          <Collapsible open={openModules.pcp} onOpenChange={() => toggleModule('pcp')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('PCP - Produção', openModules.pcp, Factory)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>{filteredPcpItems.map((item) => renderMenuItem(item))}</SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Módulo Financeiro */}
        {showFinanceiro && (
          <Collapsible open={openModules.financeiro} onOpenChange={() => toggleModule('financeiro')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('Financeiro', openModules.financeiro, DollarSign)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {financeiroItems.map((item) => renderMenuItem(item, item.showBadge ? pagamentosPendentes.length : undefined, 'destructive'))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Módulo Suprimentos */}
        {hasProcurementAccess && (
          <Collapsible open={openModules.suprimentos} onOpenChange={() => toggleModule('suprimentos')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('Suprimentos', openModules.suprimentos, Building2)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>{filteredSuprimentosItems.map((item) => renderMenuItem(item))}</SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Módulo Atendimento */}
        {showAtendimento && (
          <Collapsible open={openModules.atendimento} onOpenChange={() => toggleModule('atendimento')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('Atendimento', openModules.atendimento, Users)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>{atendimentoItems.map((item) => renderMenuItem(item))}</SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Módulo WhatsApp (Independente) */}
        {showWhatsApp && (
          <Collapsible open={openModules.whatsapp} onOpenChange={() => toggleModule('whatsapp')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('WhatsApp', openModules.whatsapp, MessageSquare)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>{whatsappItems.map((item) => renderMenuItem(item))}</SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Módulo E-commerce */}
        {showEcommerce && (
          <Collapsible open={openModules.ecommerce} onOpenChange={() => toggleModule('ecommerce')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('E-commerce', openModules.ecommerce, Store)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {ecommerceMainItems.map((item) => renderMenuItem(item))}
                    
                    {/* Submenu Envios */}
                    <SidebarMenuItem>
                      <Collapsible open={openModules.ecommerceEnvios} onOpenChange={() => toggleModule('ecommerceEnvios')}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm hover:bg-sidebar-accent rounded-md">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            <span>Envios</span>
                          </div>
                          <ChevronRight className={`h-3 w-3 transition-transform ${openModules.ecommerceEnvios ? 'rotate-90' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenu className="ml-4 mt-1">
                            {ecommerceEnviosItems.map((item) => renderMenuItem({ ...item, subItem: true }))}
                          </SidebarMenu>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>

                    {/* Submenu Trocas e Devoluções */}
                    <SidebarMenuItem>
                      <Collapsible open={openModules.ecommerceSuporte} onOpenChange={() => toggleModule('ecommerceSuporte')}>
                        <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 text-sm hover:bg-sidebar-accent rounded-md">
                          <div className="flex items-center gap-2">
                            <RefreshCcw className="h-4 w-4" />
                            <span>Trocas e Devoluções</span>
                          </div>
                          <ChevronRight className={`h-3 w-3 transition-transform ${openModules.ecommerceSuporte ? 'rotate-90' : ''}`} />
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenu className="ml-4 mt-1">
                            {ecommerceSuporteItems.map((item) => renderMenuItem({ ...item, subItem: true }))}
                          </SidebarMenu>
                        </CollapsibleContent>
                      </Collapsible>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Módulo Automação */}
        {showAutomacao && (
          <Collapsible open={openModules.automacao} onOpenChange={() => toggleModule('automacao')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('Automação', openModules.automacao, Workflow)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>{automacaoItems.map((item) => renderMenuItem(item))}</SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Módulo RH - Gestão de Colaboradores */}
        {showRH && (
          <Collapsible open={openModules.rh} onOpenChange={() => toggleModule('rh')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('RH - Gestão de Pessoas', openModules.rh, Building2)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>{rhItems.map((item) => renderMenuItem(item))}</SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Módulo Administração */}
        {showAdmin && (
          <Collapsible open={openModules.admin} onOpenChange={() => toggleModule('admin')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('Administração', openModules.admin, Cog)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredAdminItems.map((item) =>
                      renderMenuItem(
                        item,
                        item.showBadge ? (pedidosPendentes.length + alteracoesPendentes.length) : undefined,
                        'destructive'
                      )
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}

        {/* Módulo Tarefas */}
        {showTarefas && (
          <Collapsible open={openModules.tarefas} onOpenChange={() => toggleModule('tarefas')}>
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                {renderModuleHeader('Tarefas', openModules.tarefas, ListTodo)}
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {renderMenuItem(tarefasMainItem, tarefasCount?.total || 0, 'destructive')}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        )}
      </SidebarContent>
    </Sidebar>
  );
}


