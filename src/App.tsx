import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { AppLayout } from "@/components/Layout/AppLayout";

// Lazy Loading de páginas para melhor performance
const ClientesLista = lazy(() => import("./pages/Clientes/ClientesLista"));
const ClienteForm = lazy(() => import("./pages/Clientes/ClienteForm"));
const ClienteDetalhes = lazy(() => import("./pages/Clientes/ClienteDetalhes"));
const ProdutosLista = lazy(() => import("./pages/Produtos/ProdutosLista"));
const ProdutoForm = lazy(() => import("./pages/Produtos/ProdutoForm"));
const PropostasLista = lazy(() => import("./pages/Propostas/PropostasLista"));
const PropostaForm = lazy(() => import("./pages/Propostas/PropostaForm"));
const PropostaDetalhes = lazy(() => import("./pages/Propostas/PropostaDetalhes"));
const PropostaOrcamento = lazy(() => import("./pages/Propostas/PropostaOrcamento"));
const PedidosLista = lazy(() => import("./pages/Pedidos/PedidosLista"));
const PedidoForm = lazy(() => import("./pages/Pedidos/PedidoForm"));
const PedidoDetalhes = lazy(() => import("./pages/Pedidos/PedidoDetalhes"));
const PagamentosPendentes = lazy(() => import("./pages/Financeiro/PagamentosPendentes"));
const HistoricoFinanceiro = lazy(() => import("./pages/Financeiro/HistoricoFinanceiro"));
const ControleRecebimentos = lazy(() => import("./pages/Financeiro/ControleRecebimentos"));

const UsuariosLista = lazy(() => import("./pages/Admin/UsuariosLista"));
const UsuarioForm = lazy(() => import("./pages/Admin/UsuarioForm"));
const PerfisLista = lazy(() => import("./pages/Admin/PerfisLista"));
const PerfilForm = lazy(() => import("./pages/Admin/PerfilForm"));
const RegrasComissao = lazy(() => import('./pages/Admin/RegrasComissao'));
const MinhasComissoes = lazy(() => import('./pages/Comissoes/MinhasComissoes'));
const AprovarPedidos = lazy(() => import('./pages/Admin/AprovarPedidos'));
const RelatorioComissoes = lazy(() => import('./pages/Admin/RelatorioComissoes'));
const RelatorioAtendimentos = lazy(() => import('./pages/Admin/RelatorioAtendimentos'));
const LeadsLista = lazy(() => import('./pages/Leads/LeadsLista'));
const LeadDetalhes = lazy(() => import('./pages/Leads/LeadDetalhes'));
const LeadForm = lazy(() => import('./pages/Leads/LeadForm'));
const SegmentosLista = lazy(() => import('./pages/Admin/SegmentosLista'));
const SegmentoForm = lazy(() => import('./pages/Admin/SegmentoForm'));
const GradesTamanhoLista = lazy(() => import('./pages/Admin/GradesTamanhoLista'));
const GradeTamanhoForm = lazy(() => import('./pages/Admin/GradeTamanhoForm'));
const NotFound = lazy(() => import("./pages/NotFound"));
const GuiaSistema = lazy(() => import("./pages/Docs/GuiaSistema"));
const EntregaPedidos = lazy(() => import("./pages/Pedidos/EntregaPedidos"));
const GradesProva = lazy(() => import("./pages/Vendas/GradesProva"));

// PCP - Módulo de Produção
const DashboardPCP = lazy(() => import('./pages/PCP/Dashboard'));
const CadastrosHub = lazy(() => import('./pages/PCP/CadastrosHub'));
const MaquinasEstampasLista = lazy(() => import('./pages/PCP/Cadastros/MaquinasEstampasLista'));
const FalhasLista = lazy(() => import('./pages/PCP/Cadastros/FalhasLista'));
const EtapasLista = lazy(() => import('./pages/PCP/Cadastros/EtapasLista'));
const CategoriasEcommerceLista = lazy(() => import('./pages/PCP/Cadastros/CategoriasEcommerceLista'));
const Impressao = lazy(() => import('./pages/PCP/Impressao'));
const LancamentoFalhas = lazy(() => import('./pages/PCP/LancamentoFalhas'));
const Kanban = lazy(() => import('./pages/PCP/Kanban'));
const Expedicao = lazy(() => import('./pages/PCP/Expedicao'));
const Calendario = lazy(() => import('./pages/PCP/Calendario'));
const ResumoImpressao = lazy(() => import('./pages/PCP/ResumoImpressao'));
const QuantidadesDashboard = lazy(() => import('./pages/PCP/QuantidadesDashboard'));
const QuantidadesRelatorio = lazy(() => import('./pages/PCP/QuantidadesRelatorio'));

// Trocas e Devoluções (componentes usados nas rotas de suporte E-commerce)
const TrocasLista = lazy(() => import('./pages/TrocasDevolucoes').then(m => ({ default: m.TrocasLista })));
const TrocaForm = lazy(() => import('./pages/TrocasDevolucoes').then(m => ({ default: m.TrocaForm })));
const DevolucoesLista = lazy(() => import('./pages/TrocasDevolucoes').then(m => ({ default: m.DevolucoesLista })));
const DevolucaoForm = lazy(() => import('./pages/TrocasDevolucoes').then(m => ({ default: m.DevolucaoForm })));
const ExtraviosLista = lazy(() => import('./pages/TrocasDevolucoes').then(m => ({ default: m.ExtraviosLista })));
const ExtravioForm = lazy(() => import('./pages/TrocasDevolucoes').then(m => ({ default: m.ExtravioForm })));
const ProblemasLista = lazy(() => import('./pages/TrocasDevolucoes').then(m => ({ default: m.ProblemasLista })));
const ProblemaForm = lazy(() => import('./pages/TrocasDevolucoes').then(m => ({ default: m.ProblemaForm })));
const MotivosLista = lazy(() => import('./pages/TrocasDevolucoes').then(m => ({ default: m.MotivosLista })));
const MotivoForm = lazy(() => import('./pages/TrocasDevolucoes').then(m => ({ default: m.MotivoForm })));

// Envios
const Despacho = lazy(() => import('./pages/Envios').then(m => ({ default: m.Despacho })));
const EnviosRelatorios = lazy(() => import('./pages/Envios').then(m => ({ default: m.Relatorios })));

// Ecommerce
const EcommerceDashboard = lazy(() => import('./pages/Ecommerce').then(m => ({ default: m.EcommerceDashboard })));
const EnviosDashboard = lazy(() => import('./pages/Ecommerce').then(m => ({ default: m.EnviosDashboard })));
const EnviosAtrasados = lazy(() => import('./pages/Ecommerce').then(m => ({ default: m.EnviosAtrasados })));
const SuporteDashboard = lazy(() => import('./pages/Ecommerce').then(m => ({ default: m.SuporteDashboard })));
const SuporteRelatorios = lazy(() => import('./pages/Ecommerce').then(m => ({ default: m.SuporteRelatorios })));
const EcommercePedidosLista = lazy(() => import('./pages/Ecommerce').then(m => ({ default: m.PedidosLista })));
const RelatoriosEcommerce = lazy(() => import('./pages/Ecommerce').then(m => ({ default: m.RelatoriosEcommerce })));
const CarrinhosAbandonados = lazy(() => import('./pages/Ecommerce/CarrinhosAbandonados'));
const EcommerceLojas = lazy(() => import('./pages/Admin/EcommerceLojas'));
const WhatsAppApiConfig = lazy(() => import('./pages/Admin/WhatsAppApiConfig'));

// WhatsApp (módulo independente)
const WhatsAppHub = lazy(() => import('./pages/WhatsApp').then(m => ({ default: m.WhatsAppHub })));
const WhatsAppAtendimento = lazy(() => import('./pages/WhatsApp').then(m => ({ default: m.Atendimento })));
const WhatsAppDashboard = lazy(() => import('./pages/WhatsApp').then(m => ({ default: m.Dashboard })));
const WhatsAppConfiguracoes = lazy(() => import('./pages/WhatsApp').then(m => ({ default: m.Configuracoes })));

// Automação
const FluxosLista = lazy(() => import('./pages/Automacao').then(m => ({ default: m.FluxosLista })));
const FluxoEditor = lazy(() => import('./pages/Automacao').then(m => ({ default: m.FluxoEditor })));
const AgentesIA = lazy(() => import('./pages/Automacao').then(m => ({ default: m.AgentesIA })));

// Tarefas
const TarefasLista = lazy(() => import('./pages/Tarefas').then(m => ({ default: m.TarefasLista })));
const TarefaDetalhes = lazy(() => import('./pages/Tarefas').then(m => ({ default: m.TarefaDetalhes })));

// RH - Gestão de Colaboradores
const DashboardRH = lazy(() => import('./pages/RH').then(m => ({ default: m.DashboardRH })));
const ColaboradoresLista = lazy(() => import('./pages/RH').then(m => ({ default: m.ColaboradoresLista })));
const ColaboradorForm = lazy(() => import('./pages/RH').then(m => ({ default: m.ColaboradorForm })));
const ColaboradorDetalhes = lazy(() => import('./pages/RH').then(m => ({ default: m.ColaboradorDetalhes })));
const HistoricoSalarial = lazy(() => import('./pages/RH').then(m => ({ default: m.HistoricoSalarial })));
const ControleFerias = lazy(() => import('./pages/RH').then(m => ({ default: m.ControleFerias })));
const FechamentoMensal = lazy(() => import('./pages/RH').then(m => ({ default: m.FechamentoMensal })));
const BonificacoesLista = lazy(() => import('./pages/RH').then(m => ({ default: m.BonificacoesLista })));
const MimosControle = lazy(() => import('./pages/RH').then(m => ({ default: m.MimosControle })));
const CalendarioCorporativo = lazy(() => import('./pages/RH').then(m => ({ default: m.CalendarioCorporativo })));
const RelatoriosRH = lazy(() => import('./pages/RH').then(m => ({ default: m.RelatoriosRH })));

// Suprimentos - Fornecedores e Compras
const SuprimentosDashboard = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.SuprimentosDashboard })));
const FornecedoresLista = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.FornecedoresLista })));
const FornecedorForm = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.FornecedorForm })));
const InsumosLista = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.InsumosLista })));
const InsumoForm = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.InsumoForm })));
const ComprasLista = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.ComprasLista })));
const CompraForm = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.CompraForm })));
const CompraDetalhe = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.CompraDetalhe })));
const HistoricoPrecos = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.HistoricoPrecos })));
const ComposicoesLista = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.ComposicoesLista })));
const RelatoriosSuprimentos = lazy(() => import('./pages/Suprimentos').then(m => ({ default: m.RelatoriosSuprimentos })));

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,   // 2 minutos
      gcTime: 1000 * 60 * 10,     // 10 minutos
      retry: 1,                    // 1 tentativa em caso de erro
      refetchOnWindowFocus: false, // desativo para evitar excesso de queries
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={
              <div className="flex h-screen w-full items-center justify-center bg-background/50 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                  <p className="text-sm font-medium animate-pulse text-muted-foreground">Carregando módulo...</p>
                </div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />

            <Route path="/clientes" element={<ProtectedRoute><AppLayout><ClientesLista /></AppLayout></ProtectedRoute>} />
            <Route path="/clientes/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['clientes.criar']}><AppLayout><ClienteForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/clientes/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['clientes.editar']}><AppLayout><ClienteForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/clientes/:id" element={<ProtectedRoute><AppLayout><ClienteDetalhes /></AppLayout></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><AppLayout><ProdutosLista /></AppLayout></ProtectedRoute>} />
            <Route path="/produtos/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['produtos.criar']}><AppLayout><ProdutoForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/produtos/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['produtos.editar']}><AppLayout><ProdutoForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/propostas" element={<ProtectedRoute><AppLayout><PropostasLista /></AppLayout></ProtectedRoute>} />
            <Route path="/propostas/nova" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['propostas.criar']}><AppLayout><PropostaForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/propostas/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['propostas.editar', 'propostas.editar_todos']}><AppLayout><PropostaForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/propostas/:id" element={<ProtectedRoute><AppLayout><PropostaDetalhes /></AppLayout></ProtectedRoute>} />
            <Route path="/propostas/:id/orcamento" element={<ProtectedRoute><PropostaOrcamento /></ProtectedRoute>} />
            <Route path="/comissoes" element={<ProtectedRoute><AppLayout><MinhasComissoes /></AppLayout></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['leads.visualizar']}><AppLayout><LeadsLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/leads/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['leads.criar']}><AppLayout><LeadForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/leads/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['leads.editar']}><AppLayout><LeadForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/leads/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['leads.visualizar']}><AppLayout><LeadDetalhes /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pedidos" element={<ProtectedRoute><AppLayout><PedidosLista /></AppLayout></ProtectedRoute>} />
            <Route path="/pedidos/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['pedidos.criar']}><AppLayout><PedidoForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pedidos/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['pedidos.editar', 'pedidos.editar_todos', 'pedidos.alteracoes.solicitar']}><AppLayout><PedidoForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pedidos/:id" element={<ProtectedRoute><AppLayout><PedidoDetalhes /></AppLayout></ProtectedRoute>} />
            <Route path="/entrega-pedidos" element={<ProtectedRoute><AppLayout><EntregaPedidos /></AppLayout></ProtectedRoute>} />
            <Route path="/vendas/grades-prova" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['grades_prova.visualizar']}><AppLayout><GradesProva /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/financeiro/pagamentos-pendentes" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'financeiro']} allowedPermissions={['pagamentos.visualizar', 'pagamentos.aprovar']}><AppLayout><PagamentosPendentes /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/financeiro/controle-recebimentos" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'financeiro']} allowedPermissions={['pagamentos.visualizar']}><AppLayout><ControleRecebimentos /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/financeiro/historico" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'financeiro']} allowedPermissions={['pagamentos.visualizar_historico']}><AppLayout><HistoricoFinanceiro /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute requireAdmin><AppLayout><UsuariosLista /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/usuarios/novo" element={<ProtectedRoute requireAdmin><AppLayout><UsuarioForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/usuarios/editar/:id" element={<ProtectedRoute requireAdmin><AppLayout><UsuarioForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/perfis" element={<ProtectedRoute requireAdmin><AppLayout><PerfisLista /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/perfis/novo" element={<ProtectedRoute requireAdmin><AppLayout><PerfilForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/perfis/editar/:id" element={<ProtectedRoute requireAdmin><AppLayout><PerfilForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/regras-comissao" element={<ProtectedRoute requireAdmin><AppLayout><RegrasComissao /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/relatorio-comissoes" element={<ProtectedRoute requireAdmin><AppLayout><RelatorioComissoes /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/relatorio-atendimentos" element={<ProtectedRoute requireAdmin><AppLayout><RelatorioAtendimentos /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/aprovar-pedidos" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['aprovacoes.aprovar', 'pedidos.alteracoes.aprovar']}><AppLayout><AprovarPedidos /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/segmentos" element={<ProtectedRoute requireAdmin><AppLayout><SegmentosLista /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/segmentos/novo" element={<ProtectedRoute requireAdmin><AppLayout><SegmentoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/segmentos/editar/:id" element={<ProtectedRoute requireAdmin><AppLayout><SegmentoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/grades-tamanho" element={<ProtectedRoute requireAdmin><AppLayout><GradesTamanhoLista /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/grades-tamanho/novo" element={<ProtectedRoute requireAdmin><AppLayout><GradeTamanhoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/grades-tamanho/:id" element={<ProtectedRoute requireAdmin><AppLayout><GradeTamanhoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/ecommerce-lojas" element={<ProtectedRoute requireAdmin><AppLayout><EcommerceLojas /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/whatsapp-api" element={<ProtectedRoute requireAdmin><AppLayout><WhatsAppApiConfig /></AppLayout></ProtectedRoute>} />
            
            {/* PCP - Módulo de Produção */}
            <Route path="/pcp" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.dashboard']}><AppLayout><DashboardPCP /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/cadastros" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.cadastros.visualizar']}><AppLayout><CadastrosHub /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/cadastros/maquinas-estampas" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.cadastros.visualizar']}><AppLayout><MaquinasEstampasLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/cadastros/falhas" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.cadastros.visualizar']}><AppLayout><FalhasLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/cadastros/etapas" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.cadastros.visualizar']}><AppLayout><EtapasLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/cadastros/categorias-ecommerce" element={<ProtectedRoute requireAdmin><AppLayout><CategoriasEcommerceLista /></AppLayout></ProtectedRoute>} />
            <Route path="/pcp/impressao" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.impressao.visualizar']}><AppLayout><Impressao /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/falhas" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.falhas.visualizar']}><AppLayout><LancamentoFalhas /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/kanban" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.kanban.visualizar']}><AppLayout><Kanban /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/expedicao" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.expedicao.visualizar']}><AppLayout><Expedicao /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/calendario" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.calendario.visualizar']}><AppLayout><Calendario /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/resumo-impressao" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.impressao.visualizar']}><AppLayout><ResumoImpressao /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/quantidades" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.dashboard']}><AppLayout><QuantidadesDashboard /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/pcp/quantidades/relatorio" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'pcp']} allowedPermissions={['pcp.dashboard']}><AppLayout><QuantidadesRelatorio /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* E-commerce - Dashboard Principal */}
            <Route path="/ecommerce" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.dashboard.visualizar']}><AppLayout><EcommerceDashboard /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/pedidos" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.pedidos.visualizar']}><AppLayout><EcommercePedidosLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/carrinhos-abandonados" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.carrinhos.visualizar']}><AppLayout><CarrinhosAbandonados /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* E-commerce - Envios */}
            <Route path="/ecommerce/envios" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.envios.visualizar']}><AppLayout><EnviosDashboard /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/envios/despacho" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.envios.despachar']}><AppLayout><Despacho /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/envios/atrasados" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.envios.visualizar']}><AppLayout><EnviosAtrasados /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/envios/relatorios" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.envios.relatorios']}><AppLayout><EnviosRelatorios /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* E-commerce - Relatórios */}
            <Route path="/ecommerce/relatorios" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.relatorios.visualizar']}><AppLayout><RelatoriosEcommerce /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* E-commerce - Suporte (Trocas e Devoluções) */}
            <Route path="/ecommerce/suporte" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.visualizar']}><AppLayout><SuporteDashboard /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/chamados" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.problemas']}><AppLayout><ProblemasLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/chamados/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.problemas']}><AppLayout><ProblemaForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/chamados/:id/editar" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.problemas']}><AppLayout><ProblemaForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/trocas" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.trocas']}><AppLayout><TrocasLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/trocas/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.trocas']}><AppLayout><TrocaForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/trocas/:id/editar" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.trocas']}><AppLayout><TrocaForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/devolucoes" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.devolucoes']}><AppLayout><DevolucoesLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/devolucoes/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.devolucoes']}><AppLayout><DevolucaoForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/devolucoes/:id/editar" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.devolucoes']}><AppLayout><DevolucaoForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/extravios" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.extravios']}><AppLayout><ExtraviosLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/extravios/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.extravios']}><AppLayout><ExtravioForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/extravios/:id/editar" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.extravios']}><AppLayout><ExtravioForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/relatorios" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.suporte.relatorios']}><AppLayout><SuporteRelatorios /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/motivos" element={<ProtectedRoute requireAdmin><AppLayout><MotivosLista /></AppLayout></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/motivos/novo" element={<ProtectedRoute requireAdmin><AppLayout><MotivoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/ecommerce/suporte/motivos/:id/editar" element={<ProtectedRoute requireAdmin><AppLayout><MotivoForm /></AppLayout></ProtectedRoute>} />
            
            {/* WhatsApp - Módulo Independente */}
            <Route path="/whatsapp" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['whatsapp.visualizar']}><AppLayout><WhatsAppHub /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/whatsapp/atendimento" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['whatsapp.atender']}><AppLayout><WhatsAppAtendimento /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/whatsapp/dashboard" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['whatsapp.dashboard', 'whatsapp.visualizar']}><AppLayout><WhatsAppDashboard /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/whatsapp/configuracoes" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['whatsapp.configurar']}><AppLayout><WhatsAppConfiguracoes /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* Redirecionamentos WhatsApp (compatibilidade) */}
            <Route path="/ecommerce/whatsapp" element={<Navigate to="/whatsapp" replace />} />
            <Route path="/ecommerce/whatsapp/atendimento" element={<Navigate to="/whatsapp/atendimento" replace />} />
            <Route path="/ecommerce/whatsapp/dashboard" element={<Navigate to="/whatsapp/dashboard" replace />} />
            <Route path="/ecommerce/whatsapp/configuracoes" element={<Navigate to="/whatsapp/configuracoes" replace />} />
            
            {/* Automação */}
            <Route path="/automacao" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['automacao.visualizar']}><AppLayout><FluxosLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/automacao/agentes-ia" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['automacao.visualizar']}><AppLayout><AgentesIA /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/automacao/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['automacao.criar']}><AppLayout><FluxoEditor /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/automacao/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['automacao.visualizar']}><AppLayout><FluxoEditor /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />

            {/* Suprimentos - Fornecedores e Compras */}
            <Route path="/suprimentos" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.module.view', 'procurement.suppliers.view', 'procurement.products.view', 'procurement.purchases.view']}><AppLayout><SuprimentosDashboard /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/fornecedores" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.suppliers.view']}><AppLayout><FornecedoresLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/fornecedores/novo" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.suppliers.create']}><AppLayout><FornecedorForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/fornecedores/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.suppliers.edit']}><AppLayout><FornecedorForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/insumos" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.products.view']}><AppLayout><InsumosLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/insumos/novo" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.products.create']}><AppLayout><InsumoForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/insumos/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.products.edit']}><AppLayout><InsumoForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/compras" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.purchases.view']}><AppLayout><ComprasLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/compras/nova" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.purchases.create']}><AppLayout><CompraForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/compras/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.purchases.edit']}><AppLayout><CompraForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/compras/:id" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.purchases.view']}><AppLayout><CompraDetalhe /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/historico-precos" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.prices.view']}><AppLayout><HistoricoPrecos /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/composicoes" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.compositions.manage']}><AppLayout><ComposicoesLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/suprimentos/relatorios" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['procurement.reports.view']}><AppLayout><RelatoriosSuprimentos /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* Tarefas */}
            <Route path="/tarefas" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['tarefas.visualizar']}><AppLayout><TarefasLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/tarefas/:id" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['tarefas.visualizar']}><AppLayout><TarefaDetalhes /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* RH - Gestão de Colaboradores */}
            <Route path="/rh" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.colaboradores.visualizar']}><AppLayout><DashboardRH /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/colaboradores" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.colaboradores.visualizar']}><AppLayout><ColaboradoresLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/colaboradores/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.colaboradores.criar']}><AppLayout><ColaboradorForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/colaboradores/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.colaboradores.visualizar']}><AppLayout><ColaboradorDetalhes /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/colaboradores/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.colaboradores.editar']}><AppLayout><ColaboradorForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/salarios" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.salarios.visualizar']}><AppLayout><HistoricoSalarial /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/ferias" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.ferias.visualizar']}><AppLayout><ControleFerias /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/fechamento" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.fechamento.visualizar']}><AppLayout><FechamentoMensal /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/bonificacoes" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.bonificacoes.visualizar']}><AppLayout><BonificacoesLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/mimos" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.mimos.visualizar']}><AppLayout><MimosControle /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/calendario" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.calendario.visualizar']}><AppLayout><CalendarioCorporativo /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/rh/relatorios" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['rh.relatorios.visualizar']}><AppLayout><RelatoriosRH /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/docs" element={<ProtectedRoute><AppLayout><GuiaSistema /></AppLayout></ProtectedRoute>} />
            
            {/* Redirecionamentos de rotas antigas para novas */}
            <Route path="/trocas-devolucoes" element={<Navigate to="/ecommerce/suporte" replace />} />
            <Route path="/trocas-devolucoes/problemas" element={<Navigate to="/ecommerce/suporte/chamados" replace />} />
            <Route path="/trocas-devolucoes/problemas/novo" element={<Navigate to="/ecommerce/suporte/chamados/novo" replace />} />
            <Route path="/trocas-devolucoes/problemas/:id" element={<Navigate to="/ecommerce/suporte/chamados" replace />} />
            <Route path="/trocas-devolucoes/problemas/:id/editar" element={<Navigate to="/ecommerce/suporte/chamados" replace />} />
            <Route path="/trocas-devolucoes/trocas" element={<Navigate to="/ecommerce/suporte/trocas" replace />} />
            <Route path="/trocas-devolucoes/trocas/novo" element={<Navigate to="/ecommerce/suporte/trocas/novo" replace />} />
            <Route path="/trocas-devolucoes/trocas/:id" element={<Navigate to="/ecommerce/suporte/trocas" replace />} />
            <Route path="/trocas-devolucoes/trocas/:id/editar" element={<Navigate to="/ecommerce/suporte/trocas" replace />} />
            <Route path="/trocas-devolucoes/devolucoes" element={<Navigate to="/ecommerce/suporte/devolucoes" replace />} />
            <Route path="/trocas-devolucoes/devolucoes/novo" element={<Navigate to="/ecommerce/suporte/devolucoes/novo" replace />} />
            <Route path="/trocas-devolucoes/devolucoes/:id" element={<Navigate to="/ecommerce/suporte/devolucoes" replace />} />
            <Route path="/trocas-devolucoes/devolucoes/:id/editar" element={<Navigate to="/ecommerce/suporte/devolucoes" replace />} />
            <Route path="/trocas-devolucoes/extravios" element={<Navigate to="/ecommerce/suporte/extravios" replace />} />
            <Route path="/trocas-devolucoes/extravios/novo" element={<Navigate to="/ecommerce/suporte/extravios/novo" replace />} />
            <Route path="/trocas-devolucoes/extravios/:id" element={<Navigate to="/ecommerce/suporte/extravios" replace />} />
            <Route path="/trocas-devolucoes/extravios/:id/editar" element={<Navigate to="/ecommerce/suporte/extravios" replace />} />
            <Route path="/trocas-devolucoes/motivos" element={<Navigate to="/ecommerce/suporte/motivos" replace />} />
            <Route path="/trocas-devolucoes/motivos/novo" element={<Navigate to="/ecommerce/suporte/motivos/novo" replace />} />
            <Route path="/trocas-devolucoes/motivos/:id/editar" element={<Navigate to="/ecommerce/suporte/motivos" replace />} />
            <Route path="/trocas-devolucoes/orders" element={<Navigate to="/ecommerce/pedidos" replace />} />
            
            <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
