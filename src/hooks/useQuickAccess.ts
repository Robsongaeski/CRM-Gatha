import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePermissions } from './usePermissions';
import { toast } from 'sonner';

export interface QuickAccessItem {
  id: string;
  user_id: string;
  title: string;
  url: string;
  icon: string;
  position: number;
  created_at: string;
}

export interface AvailableScreen {
  module: string;
  title: string;
  url: string;
  icon: string;
  description: string;
  permission: string | null;
}

// Lista completa de telas disponíveis no sistema
const ALL_SCREENS: AvailableScreen[] = [
  // VENDAS
  { module: 'Vendas', title: 'Dashboard', url: '/', icon: 'LayoutDashboard', description: 'Painel principal de vendas', permission: null },
  { module: 'Vendas', title: 'Meus Leads', url: '/leads', icon: 'UserPlus', description: 'Gerenciar leads de prospecção', permission: 'leads.visualizar' },
  { module: 'Vendas', title: 'Propostas', url: '/propostas', icon: 'FileText', description: 'Listar e gerenciar propostas', permission: 'propostas.visualizar' },
  { module: 'Vendas', title: 'Pedidos', url: '/pedidos', icon: 'ShoppingCart', description: 'Listar e gerenciar pedidos', permission: 'pedidos.visualizar' },
  { module: 'Vendas', title: 'Clientes', url: '/clientes', icon: 'Users', description: 'Cadastro de clientes', permission: 'clientes.visualizar' },
  { module: 'Vendas', title: 'Grades para Prova', url: '/vendas/grades-prova', icon: 'Shirt', description: 'Gerenciar empréstimos de grades', permission: 'grades_prova.visualizar' },
  { module: 'Vendas', title: 'Minhas Comissões', url: '/comissoes', icon: 'Target', description: 'Visualizar suas comissões', permission: 'comissoes.visualizar_proprias' },
  { module: 'Vendas', title: 'Produtos', url: '/produtos', icon: 'Package', description: 'Catálogo de produtos', permission: 'produtos.visualizar' },
  
  // PCP
  { module: 'PCP', title: 'Dashboard PCP', url: '/pcp', icon: 'Factory', description: 'Painel de produção', permission: 'pcp.dashboard' },
  { module: 'PCP', title: 'Kanban de Produção', url: '/pcp/kanban', icon: 'KanbanSquare', description: 'Gerenciar etapas de produção', permission: 'pcp.kanban.visualizar' },
  { module: 'PCP', title: 'Quantidades Dashboard', url: '/pcp/quantidades', icon: 'BarChart3', description: 'Dashboard de quantidades', permission: 'pcp.dashboard' },
  { module: 'PCP', title: 'Relatório de Quantidades', url: '/pcp/quantidades/relatorio', icon: 'FileSpreadsheet', description: 'Relatório detalhado de quantidades', permission: 'pcp.dashboard' },
  { module: 'PCP', title: 'Impressão', url: '/pcp/impressao', icon: 'Printer', description: 'Fila de impressão', permission: 'pcp.impressao.visualizar' },
  { module: 'PCP', title: 'Resumo Impressão', url: '/pcp/resumo-impressao', icon: 'ClipboardList', description: 'Resumo de impressão por período', permission: 'pcp.impressao.visualizar' },
  { module: 'PCP', title: 'Falhas', url: '/pcp/falhas', icon: 'AlertTriangle', description: 'Lançar falhas de produção', permission: 'pcp.falhas.visualizar' },
  { module: 'PCP', title: 'Expedição', url: '/pcp/expedicao', icon: 'PackageCheck', description: 'Controle de expedição', permission: 'pcp.expedicao.visualizar' },
  { module: 'PCP', title: 'Calendário', url: '/pcp/calendario', icon: 'CalendarClock', description: 'Calendário de entregas', permission: 'pcp.calendario.visualizar' },
  { module: 'PCP', title: 'Cadastros PCP', url: '/pcp/cadastros', icon: 'Settings', description: 'Configurações do PCP', permission: 'pcp.cadastros' },
  
  // FINANCEIRO
  { module: 'Financeiro', title: 'Pagamentos Pendentes', url: '/financeiro/pagamentos-pendentes', icon: 'DollarSign', description: 'Aprovar pagamentos', permission: 'pagamentos.visualizar' },
  { module: 'Financeiro', title: 'Controle de Recebimentos', url: '/financeiro/controle-recebimentos', icon: 'Receipt', description: 'Acompanhar recebimentos', permission: 'pagamentos.visualizar' },
  { module: 'Financeiro', title: 'Histórico Financeiro', url: '/financeiro/historico', icon: 'History', description: 'Histórico de pagamentos', permission: 'pagamentos.visualizar_historico' },
  
  // ATENDIMENTO
  { module: 'Atendimento', title: 'Entrega de Pedidos', url: '/entrega-pedidos', icon: 'Truck', description: 'Registrar entregas', permission: 'atendimento.entrega_pedidos' },
  
  // E-COMMERCE - Dashboard e Pedidos
  { module: 'E-commerce', title: 'Dashboard E-commerce', url: '/ecommerce', icon: 'LayoutDashboard', description: 'Painel do e-commerce', permission: 'ecommerce.dashboard.visualizar' },
  { module: 'E-commerce', title: 'Pedidos E-commerce', url: '/ecommerce/pedidos', icon: 'ShoppingCart', description: 'Pedidos da loja virtual', permission: 'ecommerce.pedidos.visualizar' },
  { module: 'E-commerce', title: 'Carrinhos Abandonados', url: '/ecommerce/carrinhos-abandonados', icon: 'ShoppingCart', description: 'Recuperar carrinhos', permission: 'ecommerce.carrinhos.visualizar' },
  
  // E-COMMERCE - Envios
  { module: 'E-commerce', title: 'Dashboard Envios', url: '/ecommerce/envios', icon: 'Truck', description: 'Acompanhar envios', permission: 'ecommerce.envios.visualizar' },
  { module: 'E-commerce', title: 'Despacho', url: '/envios/despacho', icon: 'PackageCheck', description: 'Despachar pedidos', permission: 'ecommerce.envios.visualizar' },
  { module: 'E-commerce', title: 'Envios Atrasados', url: '/ecommerce/envios/atrasados', icon: 'AlertTriangle', description: 'Pedidos com entrega atrasada', permission: 'ecommerce.envios.visualizar' },
  { module: 'E-commerce', title: 'Relatórios de Envios', url: '/ecommerce/envios/relatorios', icon: 'BarChart3', description: 'Relatórios de expedição', permission: 'ecommerce.envios.visualizar' },
  
  // E-COMMERCE - Suporte
  { module: 'E-commerce', title: 'Dashboard Suporte', url: '/ecommerce/suporte', icon: 'RefreshCcw', description: 'Trocas e devoluções', permission: 'ecommerce.suporte.visualizar' },
  { module: 'E-commerce', title: 'Chamados', url: '/ecommerce/suporte/chamados', icon: 'HelpCircle', description: 'Problemas e reclamações de clientes', permission: 'ecommerce.suporte.visualizar' },
  { module: 'E-commerce', title: 'Trocas', url: '/ecommerce/suporte/trocas', icon: 'RefreshCcw', description: 'Solicitações de troca', permission: 'ecommerce.suporte.trocas' },
  { module: 'E-commerce', title: 'Devoluções', url: '/ecommerce/suporte/devolucoes', icon: 'PackageX', description: 'Solicitações de devolução', permission: 'ecommerce.suporte.devolucoes' },
  { module: 'E-commerce', title: 'Extravios/Roubos', url: '/ecommerce/suporte/extravios', icon: 'AlertTriangle', description: 'Pedidos extraviados ou roubados', permission: 'ecommerce.suporte.extravios' },
  { module: 'E-commerce', title: 'Relatórios Suporte', url: '/ecommerce/suporte/relatorios', icon: 'BarChart3', description: 'Relatórios de atendimento', permission: 'ecommerce.suporte.relatorios' },
  { module: 'E-commerce', title: 'Motivos de Troca/Devolução', url: '/ecommerce/suporte/motivos', icon: 'Tag', description: 'Configurar motivos de troca e devolução', permission: 'ecommerce.suporte.motivos' },
  
  // WHATSAPP (Módulo Independente)
  { module: 'WhatsApp', title: 'Atendimento', url: '/whatsapp/atendimento', icon: 'MessageCircle', description: 'Atendimento via WhatsApp', permission: 'whatsapp.atender' },
  { module: 'WhatsApp', title: 'Dashboard', url: '/whatsapp/dashboard', icon: 'BarChart3', description: 'Métricas do WhatsApp', permission: 'whatsapp.dashboard' },
  { module: 'WhatsApp', title: 'Configurações', url: '/whatsapp/configuracoes', icon: 'Settings', description: 'Configurar instâncias do WhatsApp', permission: 'whatsapp.configurar' },
  
  // AUTOMAÇÃO
  { module: 'Automação', title: 'Fluxos de Automação', url: '/automacao', icon: 'Workflow', description: 'Gerenciar automações', permission: 'automacao.visualizar' },
  
  // TAREFAS
  { module: 'Tarefas', title: 'Minhas Tarefas', url: '/tarefas', icon: 'ListTodo', description: 'Gerenciar tarefas internas', permission: 'tarefas.visualizar' },
  
  // ADMINISTRAÇÃO
  { module: 'Admin', title: 'Usuários', url: '/admin/usuarios', icon: 'Users', description: 'Gerenciar usuários', permission: 'usuarios.visualizar' },
  { module: 'Admin', title: 'Perfis de Acesso', url: '/admin/perfis', icon: 'Shield', description: 'Configurar permissões', permission: 'perfis.visualizar' },
  { module: 'Admin', title: 'Aprovar Pedidos', url: '/admin/aprovar-pedidos', icon: 'CheckCircle', description: 'Aprovar preços especiais', permission: 'aprovacoes.visualizar' },
  { module: 'Admin', title: 'Segmentos', url: '/admin/segmentos', icon: 'Tags', description: 'Segmentos de clientes', permission: 'segmentos.visualizar' },
  { module: 'Admin', title: 'Grades de Tamanho', url: '/admin/grades-tamanho', icon: 'Grid3X3', description: 'Configurar grades', permission: 'grades.visualizar' },
  { module: 'Admin', title: 'Lojas E-commerce', url: '/admin/ecommerce-lojas', icon: 'Store', description: 'Configurar lojas virtuais', permission: 'ecommerce.lojas.visualizar' },
  { module: 'Admin', title: 'Regras de Comissão', url: '/admin/regras-comissao', icon: 'Percent', description: 'Configurar comissões', permission: 'comissoes.regras' },
  { module: 'Admin', title: 'Relatório de Comissões', url: '/admin/relatorio-comissoes', icon: 'FileSpreadsheet', description: 'Relatório geral', permission: 'comissoes.relatorio_geral' },
  { module: 'Admin', title: 'Guia do Sistema', url: '/docs', icon: 'BookOpen', description: 'Documentação', permission: null },
];

// Hook para buscar atalhos do usuário
export function useQuickAccessItems() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['quick-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_quick_access')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as QuickAccessItem[];
    },
    enabled: !!user?.id,
  });
}

// Hook para telas disponíveis filtradas por permissão
export function useAvailableScreens() {
  const { can, isAdmin } = usePermissions();
  
  // Se admin, retorna todas as telas
  if (isAdmin) {
    return ALL_SCREENS;
  }
  
  // Filtra por permissão
  return ALL_SCREENS.filter(screen => {
    if (!screen.permission) return true;
    return can(screen.permission);
  });
}

// Hook para adicionar atalho
export function useAddQuickAccess() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({ title, url, icon }: { title: string; url: string; icon: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      // Buscar última posição
      const { data: existing } = await supabase
        .from('user_quick_access')
        .select('position')
        .eq('user_id', user.id)
        .order('position', { ascending: false })
        .limit(1);
      
      const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;
      
      const { data, error } = await supabase
        .from('user_quick_access')
        .insert({
          user_id: user.id,
          title,
          url,
          icon,
          position: nextPosition,
        })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error('Este atalho já existe');
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-access'] });
      toast.success('Atalho adicionado');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Hook para remover atalho
export function useRemoveQuickAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('user_quick_access')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-access'] });
      toast.success('Atalho removido');
    },
    onError: () => {
      toast.error('Erro ao remover atalho');
    },
  });
}

// Hook para reordenar atalhos
export function useReorderQuickAccess() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (items: { id: string; position: number }[]) => {
      // Atualizar cada item com sua nova posição
      const updates = items.map(item => 
        supabase
          .from('user_quick_access')
          .update({ position: item.position })
          .eq('id', item.id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-access'] });
    },
    onError: () => {
      toast.error('Erro ao reordenar atalhos');
    },
  });
}

// Função auxiliar para obter informações de uma tela por URL
export function getScreenByUrl(url: string): AvailableScreen | undefined {
  return ALL_SCREENS.find(screen => screen.url === url);
}
