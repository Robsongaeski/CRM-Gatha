import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/RoleProtectedRoute";
import { AppLayout } from "@/components/Layout/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ClientesLista from "./pages/Clientes/ClientesLista";
import ClienteForm from "./pages/Clientes/ClienteForm";
import ClienteDetalhes from "./pages/Clientes/ClienteDetalhes";
import ProdutosLista from "./pages/Produtos/ProdutosLista";
import ProdutoForm from "./pages/Produtos/ProdutoForm";
import PropostasLista from "./pages/Propostas/PropostasLista";
import PropostaForm from "./pages/Propostas/PropostaForm";
import PropostaDetalhes from "./pages/Propostas/PropostaDetalhes";
import PropostaOrcamento from "./pages/Propostas/PropostaOrcamento";
import PedidosLista from "./pages/Pedidos/PedidosLista";
import PedidoForm from "./pages/Pedidos/PedidoForm";
import PedidoDetalhes from "./pages/Pedidos/PedidoDetalhes";
import PagamentosPendentes from "./pages/Financeiro/PagamentosPendentes";
import HistoricoFinanceiro from "./pages/Financeiro/HistoricoFinanceiro";
import ControleRecebimentos from "./pages/Financeiro/ControleRecebimentos";
import UsuariosLista from "./pages/Admin/UsuariosLista";
import UsuarioForm from "./pages/Admin/UsuarioForm";
import PerfisLista from "./pages/Admin/PerfisLista";
import PerfilForm from "./pages/Admin/PerfilForm";
import RegrasComissao from './pages/Admin/RegrasComissao';
import MinhasComissoes from './pages/Comissoes/MinhasComissoes';
import AprovarPedidos from './pages/Admin/AprovarPedidos';
import RelatorioComissoes from './pages/Admin/RelatorioComissoes';
import LeadsLista from './pages/Leads/LeadsLista';
import LeadDetalhes from './pages/Leads/LeadDetalhes';
import LeadForm from './pages/Leads/LeadForm';
import SegmentosLista from './pages/Admin/SegmentosLista';
import SegmentoForm from './pages/Admin/SegmentoForm';
import GradesTamanhoLista from './pages/Admin/GradesTamanhoLista';
import GradeTamanhoForm from './pages/Admin/GradeTamanhoForm';
import NotFound from "./pages/NotFound";
import GuiaSistema from "./pages/Docs/GuiaSistema";
import EntregaPedidos from "./pages/Pedidos/EntregaPedidos";
import GradesProva from "./pages/Vendas/GradesProva";

// PCP - MÃ³dulo de ProduÃ§Ã£o
import DashboardPCP from './pages/PCP/Dashboard';
import CadastrosHub from './pages/PCP/CadastrosHub';
import MaquinasEstampasLista from './pages/PCP/Cadastros/MaquinasEstampasLista';
import FalhasLista from './pages/PCP/Cadastros/FalhasLista';
import EtapasLista from './pages/PCP/Cadastros/EtapasLista';
import CategoriasEcommerceLista from './pages/PCP/Cadastros/CategoriasEcommerceLista';
import Impressao from './pages/PCP/Impressao';
import LancamentoFalhas from './pages/PCP/LancamentoFalhas';
import Kanban from './pages/PCP/Kanban';
import Expedicao from './pages/PCP/Expedicao';
import Calendario from './pages/PCP/Calendario';
import ResumoImpressao from './pages/PCP/ResumoImpressao';
import QuantidadesDashboard from './pages/PCP/QuantidadesDashboard';
import QuantidadesRelatorio from './pages/PCP/QuantidadesRelatorio';

// Trocas e DevoluÃ§Ãµes (componentes usados nas rotas de suporte E-commerce)
import {
  TrocasLista,
  TrocaForm,
  DevolucoesLista,
  DevolucaoForm,
  ExtraviosLista,
  ExtravioForm,
  ProblemasLista,
  ProblemaForm,
  MotivosLista,
  MotivoForm,
} from './pages/TrocasDevolucoes';

// Envios
import { Despacho, Relatorios as EnviosRelatorios } from './pages/Envios';

// Ecommerce
import { 
  EcommerceDashboard, 
  EnviosDashboard,
  EnviosAtrasados,
  SuporteDashboard, 
  SuporteRelatorios,
  PedidosLista as EcommercePedidosLista,
  RelatoriosEcommerce
} from './pages/Ecommerce';
import CarrinhosAbandonados from './pages/Ecommerce/CarrinhosAbandonados';
import EcommerceLojas from './pages/Admin/EcommerceLojas';
import WhatsAppApiConfig from './pages/Admin/WhatsAppApiConfig';

// WhatsApp (mÃ³dulo independente)
import { 
  WhatsAppHub, 
  Atendimento as WhatsAppAtendimento, 
  Dashboard as WhatsAppDashboard, 
  Configuracoes as WhatsAppConfiguracoes 
} from './pages/WhatsApp';

// AutomaÃ§Ã£o
import { FluxosLista, FluxoEditor, AgentesIA } from './pages/Automacao';

// Tarefas
import { TarefasLista, TarefaDetalhes } from './pages/Tarefas';

// RH - GestÃ£o de Colaboradores
import { 
  DashboardRH, 
  ColaboradoresLista, 
  ColaboradorForm,
  ColaboradorDetalhes,
  HistoricoSalarial, 
  ControleFerias, 
  FechamentoMensal,
  BonificacoesLista,
  MimosControle,
  CalendarioCorporativo,
  RelatoriosRH
} from './pages/RH';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><AppLayout><ClientesLista /></AppLayout></ProtectedRoute>} />
            <Route path="/clientes/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['clientes.criar']}><AppLayout><ClienteForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/clientes/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['clientes.editar']}><AppLayout><ClienteForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/clientes/:id" element={<ProtectedRoute><AppLayout><ClienteDetalhes /></AppLayout></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute><AppLayout><ProdutosLista /></AppLayout></ProtectedRoute>} />
            <Route path="/produtos/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['produtos.criar']}><AppLayout><ProdutoForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/produtos/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['produtos.editar']}><AppLayout><ProdutoForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/propostas" element={<ProtectedRoute><AppLayout><PropostasLista /></AppLayout></ProtectedRoute>} />
            <Route path="/propostas/nova" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['propostas.criar']}><AppLayout><PropostaForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/propostas/editar/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'vendedor']} allowedPermissions={['propostas.editar', 'propostas.editar_todos', 'propostas.editar_todas']}><AppLayout><PropostaForm /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
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
            <Route path="/admin/aprovar-pedidos" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['aprovacoes.aprovar', 'pedidos.alteracoes.aprovar']}><AppLayout><AprovarPedidos /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/admin/segmentos" element={<ProtectedRoute requireAdmin><AppLayout><SegmentosLista /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/segmentos/novo" element={<ProtectedRoute requireAdmin><AppLayout><SegmentoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/segmentos/editar/:id" element={<ProtectedRoute requireAdmin><AppLayout><SegmentoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/grades-tamanho" element={<ProtectedRoute requireAdmin><AppLayout><GradesTamanhoLista /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/grades-tamanho/novo" element={<ProtectedRoute requireAdmin><AppLayout><GradeTamanhoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/grades-tamanho/:id" element={<ProtectedRoute requireAdmin><AppLayout><GradeTamanhoForm /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/ecommerce-lojas" element={<ProtectedRoute requireAdmin><AppLayout><EcommerceLojas /></AppLayout></ProtectedRoute>} />
            <Route path="/admin/whatsapp-api" element={<ProtectedRoute requireAdmin><AppLayout><WhatsAppApiConfig /></AppLayout></ProtectedRoute>} />
            
            {/* PCP - MÃ³dulo de ProduÃ§Ã£o */}
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
            <Route path="/ecommerce/pedidos" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.pedidos.visualizar']}><AppLayout><EcommercePedidosLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* E-commerce - Envios */}
            <Route path="/ecommerce/envios" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.envios.visualizar']}><AppLayout><EnviosDashboard /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/envios/despacho" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.envios.despachar']}><AppLayout><Despacho /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/envios/atrasados" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.envios.visualizar']}><AppLayout><EnviosAtrasados /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/ecommerce/envios/relatorios" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.envios.relatorios']}><AppLayout><EnviosRelatorios /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* E-commerce - RelatÃ³rios */}
            <Route path="/ecommerce/relatorios" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['ecommerce.relatorios.visualizar']}><AppLayout><RelatoriosEcommerce /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* E-commerce - Suporte (Trocas e DevoluÃ§Ãµes) */}
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
            
            {/* WhatsApp - MÃ³dulo Independente */}
            <Route path="/whatsapp" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['whatsapp.visualizar']}><AppLayout><WhatsAppHub /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/whatsapp/atendimento" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['whatsapp.atender']}><AppLayout><WhatsAppAtendimento /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/whatsapp/dashboard" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['whatsapp.dashboard', 'whatsapp.visualizar']}><AppLayout><WhatsAppDashboard /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/whatsapp/configuracoes" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin', 'atendente']} allowedPermissions={['whatsapp.configurar']}><AppLayout><WhatsAppConfiguracoes /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* Redirecionamentos WhatsApp (compatibilidade) */}
            <Route path="/ecommerce/whatsapp" element={<Navigate to="/whatsapp" replace />} />
            <Route path="/ecommerce/whatsapp/atendimento" element={<Navigate to="/whatsapp/atendimento" replace />} />
            <Route path="/ecommerce/whatsapp/dashboard" element={<Navigate to="/whatsapp/dashboard" replace />} />
            <Route path="/ecommerce/whatsapp/configuracoes" element={<Navigate to="/whatsapp/configuracoes" replace />} />
            
            {/* AutomaÃ§Ã£o */}
            <Route path="/automacao" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['automacao.visualizar']}><AppLayout><FluxosLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/automacao/agentes-ia" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['automacao.visualizar']}><AppLayout><AgentesIA /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/automacao/novo" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['automacao.criar']}><AppLayout><FluxoEditor /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/automacao/:id" element={<ProtectedRoute><RoleProtectedRoute allowedRoles={['admin']} allowedPermissions={['automacao.visualizar']}><AppLayout><FluxoEditor /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* Tarefas */}
            <Route path="/tarefas" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['tarefas.visualizar']}><AppLayout><TarefasLista /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            <Route path="/tarefas/:id" element={<ProtectedRoute><RoleProtectedRoute allowedPermissions={['tarefas.visualizar']}><AppLayout><TarefaDetalhes /></AppLayout></RoleProtectedRoute></ProtectedRoute>} />
            
            {/* RH - GestÃ£o de Colaboradores */}
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;


