import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TutorialVendas from './TutorialVendas';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, Users, ShoppingCart, Factory, DollarSign, Truck, 
  MessageSquare, Zap, Settings, AlertTriangle, CheckCircle, 
  ArrowRight, Link2, ShieldAlert, Download, LayoutDashboard,
  UserPlus, FileSpreadsheet, Package, ClipboardList, Calendar,
  BarChart3, Printer, AlertCircle, BoxIcon, MessageCircle,
  RefreshCcw, PackageX, HelpCircle, Bot, UserCog, Percent,
  Store, Grid3X3, Tag, CreditCard, Receipt, History, Loader2,
  ListChecks, Building2, Heart, Gift, CalendarDays, Wallet,
  TrendingUp, Repeat, Eye
} from 'lucide-react';

// All accordion item IDs for controlled open/close
const ALL_ACCORDION_IDS = [
  // Vendas
  'vendas-dashboard', 'vendas-leads', 'vendas-propostas', 'vendas-pedidos',
  'vendas-clientes', 'vendas-grades', 'vendas-comissoes', 'vendas-produtos',
  // PCP
  'pcp-dashboard', 'pcp-kanban', 'pcp-impressao', 'pcp-falhas',
  'pcp-expedicao', 'pcp-calendario', 'pcp-quantidades', 'pcp-cadastros', 'pcp-resumo',
  // Financeiro
  'fin-pagamentos', 'fin-recebimentos', 'fin-historico',
  // Atendimento
  'atd-entrega',
  // E-commerce
  'ecom-dashboard', 'ecom-pedidos', 'ecom-carrinhos', 'ecom-envios',
  'ecom-suporte', 'ecom-whatsapp', 'ecom-relatorios', 'ecom-suporte-relatorios',
  // Automação
  'auto-fluxos',
  // Tarefas
  'tarefas-lista', 'tarefas-detalhes',
  // RH
  'rh-dashboard', 'rh-colaboradores', 'rh-calendario', 'rh-salarios',
  'rh-ferias', 'rh-fechamento', 'rh-bonificacoes', 'rh-mimos', 'rh-relatorios',
  // Admin
  'admin-usuarios', 'admin-perfis', 'admin-aprovacoes', 'admin-regras-comissao',
  'admin-outros', 'admin-whatsapp-api',
  // FAQ
  'faq-1', 'faq-2', 'faq-3', 'faq-4', 'faq-5', 'faq-6', 'faq-7', 'faq-8',
  'faq-9', 'faq-10', 'faq-11',
];

export default function GuiaSistema() {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingTutorialPdf, setIsGeneratingTutorialPdf] = useState(false);
  const [forceAllOpen, setForceAllOpen] = useState(false);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const tutorialRef = useRef<HTMLDivElement>(null);

  // When forceAllOpen, use ALL IDs; otherwise use user-controlled state
  const accordionValue = forceAllOpen ? ALL_ACCORDION_IDS : openItems;
  const handleAccordionChange = (value: string[]) => {
    if (!forceAllOpen) setOpenItems(value);
  };

  const getSafeScale = (width: number, height: number, desiredScale = 1.25) => {
    const safeWidth = Math.max(width, 1);
    const safeHeight = Math.max(height, 1);

    // Conservative limits to avoid browser canvas overflow (especially Firefox/Safari)
    const MAX_CANVAS_DIMENSION = 16000;
    const MAX_CANVAS_AREA = 12_000_000;

    const scaleByDimension = Math.min(
      MAX_CANVAS_DIMENSION / safeWidth,
      MAX_CANVAS_DIMENSION / safeHeight,
    );
    const scaleByArea = Math.sqrt(MAX_CANVAS_AREA / (safeWidth * safeHeight));

    return Math.max(0.2, Math.min(desiredScale, scaleByDimension, scaleByArea));
  };

  const generatePdfFromRef = async (ref: React.RefObject<HTMLDivElement>, filename: string, setLoading: (v: boolean) => void) => {
    const rootElement = ref.current;
    if (!rootElement || isGeneratingPdf || isGeneratingTutorialPdf) return;

    setLoading(true);
    toast({ title: 'Gerando PDF...', description: 'Preparando conteúdo. Aguarde...' });

    try {
      if (ref === contentRef) {
        setForceAllOpen(true);
        await new Promise((resolve) => setTimeout(resolve, 800));
      }

      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const sections = Array.from(rootElement.children).filter(
        (child) => !(child as HTMLElement).classList.contains('print-hidden-buttons'),
      ) as HTMLElement[];

      if (sections.length === 0) {
        throw new Error('Nenhum conteúdo encontrado para exportar no PDF.');
      }

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = pdfHeight - margin * 2;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let pageCount = 0;

      const startPage = () => {
        if (pageCount === 0) {
          pageCount = 1;
          return;
        }
        pdf.addPage();
        pageCount += 1;
      };

      for (const section of sections) {
        const sectionWidth = Math.max(section.scrollWidth, section.clientWidth, 1);
        const sectionHeight = Math.max(section.scrollHeight, section.clientHeight, 1);
        const scale = getSafeScale(sectionWidth, sectionHeight);

        const canvas = await html2canvas(section, {
          scale,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: sectionWidth,
          windowHeight: sectionHeight,
        });

        const fullImageHeightMm = (canvas.height * contentWidth) / canvas.width;

        if (fullImageHeightMm <= contentHeight) {
          startPage();
          pdf.addImage(canvas.toDataURL('image/jpeg', 0.88), 'JPEG', margin, margin, contentWidth, fullImageHeightMm, undefined, 'FAST');
          continue;
        }

        const pxPerMm = canvas.width / contentWidth;
        const sliceHeightPx = Math.max(1, Math.floor(contentHeight * pxPerMm));

        let offsetY = 0;
        while (offsetY < canvas.height) {
          const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - offsetY);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = currentSliceHeight;

          const ctx = sliceCanvas.getContext('2d');
          if (!ctx) throw new Error('Falha ao preparar as páginas do PDF.');

          ctx.drawImage(canvas, 0, offsetY, canvas.width, currentSliceHeight, 0, 0, canvas.width, currentSliceHeight);

          const sliceHeightMm = (currentSliceHeight * contentWidth) / sliceCanvas.width;
          startPage();
          pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.88), 'JPEG', margin, margin, contentWidth, sliceHeightMm, undefined, 'FAST');

          offsetY += currentSliceHeight;
        }
      }

      pdf.save(filename);
      toast({ title: 'PDF gerado com sucesso!', description: `${pageCount} páginas geradas.` });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({ title: 'Erro ao gerar PDF', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setForceAllOpen(false);
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => generatePdfFromRef(contentRef, 'SalesPeak-CRM-Guia-do-Sistema.pdf', setIsGeneratingPdf);
  const handleDownloadTutorialPdf = () => generatePdfFromRef(tutorialRef, 'SalesPeak-CRM-Tutoriais-de-Uso.pdf', setIsGeneratingTutorialPdf);

  return (
    <div ref={contentRef} className="space-y-8 max-w-5xl mx-auto print:max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden print-hidden-buttons">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guia Completo do Sistema</h1>
          <p className="text-muted-foreground mt-2">
            Documentação técnica e funcional completa do SalesPeak CRM
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownloadPdf} variant="outline" disabled={isGeneratingPdf}>
            {isGeneratingPdf ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isGeneratingPdf ? 'Gerando PDF...' : 'Baixar PDF'}
          </Button>
          <Button variant="outline" asChild>
            <a 
              href="https://lyjzutjrmvgoeibaoizz.supabase.co/functions/v1/export-whatsapp-conversations?exclude=1806%20Comercial" 
              download
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Baixar Conversas WhatsApp
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="documentacao" className="w-full">
        <TabsList className="grid w-full grid-cols-2 print:hidden print-hidden-buttons">
          <TabsTrigger value="documentacao">📖 Documentação Técnica</TabsTrigger>
          <TabsTrigger value="tutoriais">🎓 Tutoriais de Uso</TabsTrigger>
        </TabsList>

        <TabsContent value="tutoriais" className="space-y-6 mt-6">
          <div className="flex justify-end print-hidden-buttons">
            <Button onClick={handleDownloadTutorialPdf} variant="outline" disabled={isGeneratingTutorialPdf}>
              {isGeneratingTutorialPdf ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isGeneratingTutorialPdf ? 'Gerando PDF...' : 'Baixar Tutoriais em PDF'}
            </Button>
          </div>
          <div ref={tutorialRef}>
            <TutorialVendas />
          </div>
        </TabsContent>

        <TabsContent value="documentacao" className="space-y-8 mt-6">

      {/* Visão Geral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Visão Geral do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            O <strong>SalesPeak CRM</strong> é um sistema completo de gestão comercial desenvolvido para empresas 
            de confecção e estamparia. Ele integra todos os processos desde a prospecção de clientes até a 
            entrega final e controle financeiro.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">React 18</div>
              <div className="text-sm text-muted-foreground">Frontend</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">Supabase</div>
              <div className="text-sm text-muted-foreground">Backend</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">Tailwind</div>
              <div className="text-sm text-muted-foreground">Estilização</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">TypeScript</div>
              <div className="text-sm text-muted-foreground">Tipagem</div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-3">Módulos do Sistema</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <Badge variant="outline" className="justify-center py-1">Vendas</Badge>
              <Badge variant="outline" className="justify-center py-1">PCP / Produção</Badge>
              <Badge variant="outline" className="justify-center py-1">Financeiro</Badge>
              <Badge variant="outline" className="justify-center py-1">Atendimento</Badge>
              <Badge variant="outline" className="justify-center py-1">E-commerce</Badge>
              <Badge variant="outline" className="justify-center py-1">Automação</Badge>
              <Badge variant="outline" className="justify-center py-1">Tarefas</Badge>
              <Badge variant="outline" className="justify-center py-1">RH</Badge>
              <Badge variant="outline" className="justify-center py-1">Administração</Badge>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-3">Fluxo Principal do Sistema</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="flex items-center gap-1">
                <UserPlus className="h-3 w-3" />
                Prospecção
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" />
                Proposta
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="flex items-center gap-1">
                <ShoppingCart className="h-3 w-3" />
                Pedido
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="flex items-center gap-1">
                <Factory className="h-3 w-3" />
                Produção
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                Entrega
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="outline" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Pagamento
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legenda da Documentação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Conexão
              </Badge>
              <span className="text-muted-foreground">Indica integração com outra tela/módulo</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Validação
              </Badge>
              <span className="text-muted-foreground">Regra de negócio crítica</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================== MÓDULO VENDAS ===================== */}
      <Card>
        <CardHeader className="bg-blue-50 dark:bg-blue-950">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            Módulo VENDAS
          </CardTitle>
          <CardDescription>
            Gestão completa do ciclo de vendas B2B: prospecção, propostas, pedidos, produtos e comissões
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4">
            O módulo de Vendas é o coração do sistema, gerenciando todo o ciclo comercial desde a 
            captação de leads até o fechamento de pedidos e acompanhamento de comissões. Integra-se 
            diretamente com os módulos de Produção (PCP) e Financeiro.
          </p>

          <div className="mb-4">
            <strong>Telas do Módulo:</strong>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge>Dashboard</Badge>
              <Badge>Leads</Badge>
              <Badge>Propostas</Badge>
              <Badge>Pedidos</Badge>
              <Badge>Clientes</Badge>
              <Badge>Produtos</Badge>
              <Badge>Grades para Prova</Badge>
              <Badge>Minhas Comissões</Badge>
            </div>
          </div>

          <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={handleAccordionChange}>
            {/* Dashboard */}
            <AccordionItem value="vendas-dashboard">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard (/dashboard)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Tela inicial do sistema com visão consolidada de métricas. O conteúdo exibido é 
                  adaptado ao perfil do usuário logado.
                </p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Para Vendedores:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Total vendido no mês atual</li>
                      <li>Comissão acumulada</li>
                      <li>Leads ativos para contato</li>
                      <li>Propostas em negociação</li>
                      <li>Pedidos recentes</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Para Administradores:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Visão consolidada de todos os vendedores</li>
                      <li>Ranking de vendas</li>
                      <li>Pedidos aguardando aprovação</li>
                      <li>Métricas de produção</li>
                      <li>Alertas de pagamentos pendentes</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Comportamento Interativo</AlertTitle>
                  <AlertDescription>
                    Todos os cards de métricas são clicáveis e redirecionam para a tela correspondente. 
                    Ex: Clicar em "Leads Ativos" leva para /leads com filtro de status ativo.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            {/* Leads */}
            <AccordionItem value="vendas-leads">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Leads - Prospecção (/leads)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Gestão de leads (potenciais clientes) desde o primeiro contato até a conversão em cliente. 
                  Permite rastrear interações, agendar retornos e acompanhar o funil de vendas.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Status do Lead (Fluxo):</h4>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge className="bg-gray-500">Novo</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge className="bg-blue-500">Contatando</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge className="bg-green-500">Qualificado</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge className="bg-emerald-600">Convertido</Badge>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="destructive">Não Qualificado</Badge>
                    <Badge variant="outline">Perdido</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista de Leads:</strong> Filtros por status, segmento e vendedor responsável</li>
                    <li><strong>Dashboard Semanal:</strong> Resumo de leads da semana com gráficos de evolução</li>
                    <li><strong>Importar CSV:</strong> Upload de planilha com múltiplos leads de uma vez</li>
                    <li><strong>Novo Lead:</strong> Cadastro manual com dados de contato</li>
                    <li><strong>Registrar Contato:</strong> Histórico de interações (ligação, e-mail, WhatsApp, reunião)</li>
                    <li><strong>Agendar Retorno:</strong> Define data/hora para próximo contato</li>
                    <li><strong>Converter em Cliente:</strong> Transforma lead qualificado em cliente</li>
                    <li><strong>Ações em Lote:</strong> Selecionar múltiplos leads para atribuir vendedor ou alterar status</li>
                    <li><strong>Atribuir Vendedor:</strong> Distribuir leads entre vendedores</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Campos do Lead:</h4>
                  <div className="grid md:grid-cols-3 gap-2 text-sm">
                    <div>Nome*, Telefone, WhatsApp</div>
                    <div>E-mail, CPF/CNPJ</div>
                    <div>Segmento, Status, Vendedor*</div>
                    <div>Origem (como conheceu), Cidade/Estado</div>
                    <div>Data de retorno, Observações</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">* Campos obrigatórios</p>
                </div>

                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Conexões com Outras Telas</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>→ Clientes:</strong> Ao converter lead, um novo cliente é criado automaticamente com os dados do lead</li>
                      <li><strong>→ Menu Lateral:</strong> Badge vermelho aparece quando há retornos pendentes para hoje</li>
                      <li><strong>→ Automação:</strong> Triggers de automação podem ser disparados em mudanças de status</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Validações</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Vendedores só visualizam seus próprios leads</li>
                      <li>Administradores visualizam todos os leads</li>
                      <li>É obrigatório ter pelo menos telefone OU WhatsApp preenchido</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            {/* Propostas */}
            <AccordionItem value="vendas-propostas">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Propostas Comerciais (/propostas)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Criação e gerenciamento de propostas comerciais/orçamentos. Permite acompanhar 
                  negociações, agendar follow-ups e converter propostas ganhas em pedidos.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Status da Proposta (Fluxo):</h4>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge className="bg-gray-500">Pendente</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge className="bg-blue-500">Enviada</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge className="bg-yellow-500 text-black">Follow-up</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge className="bg-green-500">Ganha</Badge>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="destructive">Perdida</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista de Propostas:</strong> Filtros por status, cliente, vendedor, período</li>
                    <li><strong>Nova Proposta:</strong> Seleção de cliente, adição de múltiplos produtos com quantidades</li>
                    <li><strong>Upload de Referência:</strong> Imagem de referência para arte/design</li>
                    <li><strong>Agendar Follow-up:</strong> Data para retorno ao cliente</li>
                    <li><strong>Imprimir Orçamento:</strong> Gera PDF formatado para envio ao cliente</li>
                    <li><strong>Converter em Pedido:</strong> Cria pedido com dados da proposta</li>
                    <li><strong>Criar Prévia de Arte:</strong> Marcar proposta para criação de layout pelo designer</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Itens da Proposta:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Produto (selecionado do cadastro)</li>
                    <li>Quantidade</li>
                    <li>Valor unitário (busca automática por faixa de preço)</li>
                    <li>Observações do item</li>
                    <li>Desconto (opcional)</li>
                  </ul>
                </div>

                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Conexões com Outras Telas</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>→ Pedidos:</strong> Ao converter proposta "Ganha", dados são copiados para novo pedido</li>
                      <li><strong>→ Kanban PCP:</strong> Propostas com "criar_previa = true" aparecem nas colunas de aprovação</li>
                      <li><strong>→ Histórico:</strong> Todas alterações são registradas em propostas_historico</li>
                      <li><strong>→ Notificações:</strong> Designer recebe notificação quando proposta precisa de prévia</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Validações</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Proposta deve ter pelo menos 1 item</li>
                      <li>Ao marcar como "Perdida", motivo é obrigatório</li>
                      <li>Data de follow-up não pode ser no passado</li>
                      <li>Vendedores só editam próprias propostas</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            {/* Pedidos */}
            <AccordionItem value="vendas-pedidos">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Pedidos (/pedidos)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Gestão completa de pedidos de venda. Esta é uma das telas mais críticas do sistema, 
                  com múltiplas validações de negócio e integrações com produção e financeiro.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Status do Pedido (Fluxo):</h4>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge className="bg-gray-500">Rascunho</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge className="bg-blue-500">Confirmado</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge className="bg-yellow-500 text-black">Em Produção</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge className="bg-green-500">Pronto</Badge>
                    <ArrowRight className="h-4 w-4" />
                    <Badge className="bg-emerald-600">Entregue</Badge>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="destructive">Cancelado</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Status de Pagamento:</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline">Pendente</Badge>
                    <Badge className="bg-yellow-500 text-black">Parcial</Badge>
                    <Badge className="bg-green-500">Quitado</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista de Pedidos:</strong> Filtros avançados (status, pagamento, cliente, período, busca)</li>
                    <li><strong>Novo Pedido:</strong> Criação manual ou a partir de proposta</li>
                    <li><strong>Editar Pedido:</strong> Alterar dados (com restrições - ver validações)</li>
                    <li><strong>Duplicar Pedido:</strong> Cria cópia para novo pedido similar</li>
                    <li><strong>Registrar Pagamento:</strong> Abre modal para registro de pagamento com upload de comprovante</li>
                    <li><strong>Imprimir Ficha:</strong> Gera ficha do pedido para impressão (A4)</li>
                    <li><strong>Ver Detalhes:</strong> Visualização completa com histórico de alterações</li>
                    <li><strong>Adicionar Observação:</strong> Registra observações internas no pedido</li>
                    <li><strong>Alterar Status:</strong> Muda status do pedido com registro em histórico</li>
                    <li><strong>Excluir:</strong> Apenas administradores podem excluir pedidos</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Dados do Pedido:</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Cabeçalho:</strong>
                      <ul className="list-disc list-inside">
                        <li>Cliente (obrigatório)</li>
                        <li>Data do pedido</li>
                        <li>Data de entrega prevista</li>
                        <li>Observações gerais</li>
                        <li>Vendedor responsável</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Itens:</strong>
                      <ul className="list-disc list-inside">
                        <li>Produto, Quantidade, Valor unitário</li>
                        <li>Grade de tamanhos (P, M, G, etc.)</li>
                        <li>Detalhes por tamanho (cor, nome, número)</li>
                        <li>Foto modelo (referência visual)</li>
                        <li>Observações do item</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Conexões com Outras Telas</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>→ Financeiro (Pagamentos Pendentes):</strong> Pagamentos registrados vão para aprovação</li>
                      <li><strong>→ Kanban PCP:</strong> Pedidos "Confirmado" ou "Em Produção" aparecem no Kanban</li>
                      <li><strong>→ Comissões:</strong> Comissão é calculada automaticamente na criação</li>
                      <li><strong>→ Admin (Aprovar Pedidos):</strong> Pedidos com preço baixo vão para aprovação</li>
                      <li><strong>→ Histórico:</strong> Trigger SQL registra TODAS as alterações em pedido_historico</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Validações CRÍTICAS</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-2">
                      <li>
                        <strong>Preço Mínimo:</strong> Se valor_unitario &lt; preco_minimo do produto, 
                        o pedido recebe flag requer_aprovacao_preco = true e fica BLOQUEADO para 
                        pagamentos até aprovação do admin em /admin/aprovacoes
                      </li>
                      <li>
                        <strong>Bloqueio de Edição:</strong> Pedidos com QUALQUER pagamento aprovado 
                        (status='aprovado' AND estornado=false) NÃO podem ser editados. 
                        Exceção: Administradores podem editar qualquer pedido.
                        Validado via RPC pode_editar_pedido()
                      </li>
                      <li>
                        <strong>Pedido Cancelado:</strong> Não aceita novos pagamentos
                      </li>
                      <li>
                        <strong>Valor Excedente:</strong> Não permite registrar pagamento se 
                        (aprovado + pendente + novo) &gt; valor_total_pedido
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            {/* Produtos - NOVO */}
            <AccordionItem value="vendas-produtos">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos (/produtos)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Cadastro de produtos do catálogo utilizado em pedidos e propostas. Cada produto pode ter 
                  faixas de preço por quantidade e um código único de identificação.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista de Produtos:</strong> Todos os produtos com busca por nome ou código</li>
                    <li><strong>Novo Produto:</strong> Cadastro com nome, descrição, preço base e código</li>
                    <li><strong>Editar Produto:</strong> Atualização de dados e gerenciamento de faixas</li>
                    <li><strong>Excluir:</strong> Apenas produtos que não estão vinculados a pedidos</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Campos do Produto:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Nome (obrigatório)</li>
                    <li>Código do produto (único, ex: CAM-001)</li>
                    <li>Descrição</li>
                    <li>Preço mínimo (para validação de preço nos pedidos)</li>
                    <li>Status (Ativo/Inativo)</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Faixas de Preço por Quantidade:</h4>
                  <p className="text-sm mb-2">
                    Sistema de precificação progressiva. Cada produto pode ter múltiplas faixas de preço 
                    baseadas na quantidade vendida. Ao selecionar o produto em um pedido/proposta, 
                    o sistema busca automaticamente a faixa correspondente.
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Qtd. Mínima</TableHead>
                        <TableHead>Qtd. Máxima</TableHead>
                        <TableHead>Preço Mín.</TableHead>
                        <TableHead>Preço Máx.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>1</TableCell>
                        <TableCell>50</TableCell>
                        <TableCell>R$ 25,00</TableCell>
                        <TableCell>R$ 35,00</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>51</TableCell>
                        <TableCell>200</TableCell>
                        <TableCell>R$ 18,00</TableCell>
                        <TableCell>R$ 28,00</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>201</TableCell>
                        <TableCell>∞</TableCell>
                        <TableCell>R$ 12,00</TableCell>
                        <TableCell>R$ 20,00</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Conexões</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      <li><strong>→ Pedidos/Propostas:</strong> Produto é selecionado ao adicionar itens</li>
                      <li><strong>→ Faixas de Preço:</strong> Busca automática via RPC buscar_faixa_preco</li>
                      <li><strong>→ Validação de Preço:</strong> Se valor abaixo do mínimo da faixa, pedido requer aprovação</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            {/* Clientes */}
            <AccordionItem value="vendas-clientes">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Clientes (/clientes)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Cadastro e gerenciamento de clientes. Clientes podem ser criados manualmente ou 
                  através da conversão de leads.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista de Clientes:</strong> Busca por nome, telefone, CNPJ</li>
                    <li><strong>Novo Cliente:</strong> Cadastro manual completo</li>
                    <li><strong>Editar Cliente:</strong> Atualização de dados</li>
                    <li><strong>Detalhes:</strong> Visualização com histórico de pedidos e propostas</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Campos do Cliente:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Nome/Razão Social (obrigatório)</li>
                    <li>CPF ou CNPJ</li>
                    <li>Telefone, WhatsApp, E-mail</li>
                    <li>Endereço completo (CEP, Rua, Número, Bairro, Cidade, Estado)</li>
                    <li>Segmento de atuação</li>
                    <li>Responsável, Observações</li>
                  </ul>
                </div>

                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Conexões</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      <li><strong>← Leads:</strong> Cliente pode ser criado via conversão de lead</li>
                      <li><strong>→ Pedidos/Propostas:</strong> Cliente é selecionado ao criar pedido/proposta</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            {/* Grades para Prova */}
            <AccordionItem value="vendas-grades">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Grades para Prova (/vendas/grades-prova)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Controle de empréstimo de amostras e grades de prova para clientes. 
                  Permite rastrear o que foi emprestado e cobrar devolução.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Status do Empréstimo:</h4>
                  <div className="flex gap-2">
                    <Badge className="bg-yellow-500 text-black">Aberto</Badge>
                    <Badge className="bg-green-500">Devolvido</Badge>
                    <Badge variant="destructive">Atrasado</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista:</strong> Filtros por cliente, vendedor, status, período</li>
                    <li><strong>Novo Empréstimo:</strong> Registro com cliente, itens e data de devolução prevista (padrão: 10 dias)</li>
                    <li><strong>Registrar Devolução:</strong> Marca como devolvido com data efetiva e controle de quantidade por item</li>
                    <li><strong>Imprimir Ficha:</strong> Gera comprovante A4 para assinatura do cliente</li>
                    <li><strong>Duplicar Itens:</strong> Facilita criação de empréstimos similares</li>
                  </ul>
                </div>

                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Validações</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      <li>Data de devolução prevista é obrigatória</li>
                      <li>Empréstimos atrasados são destacados em vermelho na lista</li>
                      <li>Apenas administradores podem excluir empréstimos</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            {/* Comissões */}
            <AccordionItem value="vendas-comissoes">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Minhas Comissões (/comissoes/minhas)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Dashboard pessoal do vendedor para acompanhamento de comissões. 
                  Exibe vendas, comissões calculadas e progresso nas faixas.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Métricas Exibidas:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Total vendido no mês</li>
                    <li>Comissão acumulada</li>
                    <li>Faixa atual (percentual aplicado)</li>
                    <li>Progresso para próxima faixa</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Status da Comissão:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Prevista</Badge>
                    <Badge className="bg-yellow-500 text-black">Pendente</Badge>
                    <Badge className="bg-green-500">Paga</Badge>
                    <Badge variant="destructive">Cancelada</Badge>
                  </div>
                </div>

                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Como a Comissão é Calculada</AlertTitle>
                  <AlertDescription>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Ao criar pedido: comissão é registrada como "Prevista"</li>
                      <li>Ao aprovar pagamento: comissão muda para "Pendente"</li>
                      <li>Percentual é determinado pela faixa de volume mensal do vendedor</li>
                      <li>Se vendedor tem regra personalizada, usa essa; senão, faixas padrão</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== MÓDULO PCP ===================== */}
      <Card>
        <CardHeader className="bg-orange-50 dark:bg-orange-950">
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5 text-orange-600" />
            Módulo PCP - Produção
          </CardTitle>
          <CardDescription>
            Controle completo da produção: Kanban, impressão, falhas, expedição e rastreamento
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4">
            O módulo de PCP (Planejamento e Controle de Produção) gerencia todo o fluxo produtivo 
            desde a entrada do pedido até a expedição. Utiliza um sistema Kanban visual para 
            acompanhamento em tempo real.
          </p>

          <div className="mb-4">
            <strong>Telas do Módulo:</strong>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge>Dashboard</Badge>
              <Badge>Kanban</Badge>
              <Badge>Impressão</Badge>
              <Badge>Resumo para Impressão</Badge>
              <Badge>Falhas</Badge>
              <Badge>Expedição</Badge>
              <Badge>Calendário</Badge>
              <Badge>Quantidades</Badge>
              <Badge>Cadastros</Badge>
            </div>
          </div>

          <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={handleAccordionChange}>
            <AccordionItem value="pcp-dashboard">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard PCP (/pcp/dashboard)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Visão consolidada das métricas de produção com gráficos e indicadores em tempo real.</p>
                <div>
                  <h4 className="font-semibold mb-2">Métricas Exibidas:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Pedidos em produção (total e por etapa)</li>
                    <li>Impressões realizadas no dia/semana</li>
                    <li>Falhas registradas (por categoria)</li>
                    <li>Pedidos urgentes (prazo próximo)</li>
                    <li>Gráfico de pedidos por etapa</li>
                    <li>Gráfico de falhas por categoria</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pcp-kanban">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Kanban de Produção (/pcp/kanban)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Quadro visual estilo Trello para acompanhamento de pedidos em produção. 
                  Permite arrastar cards entre colunas para atualizar status.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Tipos de Colunas:</h4>
                  <div className="space-y-2">
                    <div>
                      <Badge className="bg-purple-500 mb-1">Colunas de Aprovação</Badge>
                      <p className="text-sm">Para propostas aguardando aprovação de arte/design</p>
                      <p className="text-xs text-muted-foreground">Ex: Criar Prévia → Layout Criado → Revisão → Aprovado</p>
                    </div>
                    <div>
                      <Badge className="bg-blue-500 mb-1">Colunas de Produção</Badge>
                      <p className="text-sm">Para pedidos em produção (configuráveis)</p>
                      <p className="text-xs text-muted-foreground">Ex: Entrada → Impressão → Costura → Revisão → Expedição</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Drag-and-Drop:</strong> Arrastar cards entre colunas para mover etapa</li>
                    <li><strong>Scroll Horizontal:</strong> Shift+Mouse Wheel ou arrastar para navegar</li>
                    <li><strong>Filtros:</strong> Por cliente, busca por número/nome, tags</li>
                    <li><strong>Ver Detalhes:</strong> Clicar no card abre modal com informações completas</li>
                    <li><strong>Upload de Imagem:</strong> Anexar foto de aprovação ao pedido (individual por item quando 2+ produtos)</li>
                    <li><strong>Gerenciar Colunas:</strong> Reordenar, mudar cores, criar novas etapas</li>
                    <li><strong>Tags:</strong> Classificar pedidos por tipo de estampa</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Card do Pedido Exibe:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Número do pedido e data de entrega</li>
                    <li>Nome do cliente</li>
                    <li>Produtos e quantidades</li>
                    <li>Tags (tipo de estampa)</li>
                    <li>Foto modelo (miniatura)</li>
                    <li>Indicador visual se atrasado</li>
                  </ul>
                </div>

                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Validações e Comportamentos Especiais</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>Restrição de Movimento (Propostas):</strong> Propostas só movem entre colunas de aprovação</li>
                      <li><strong>Restrição de Movimento (Pedidos):</strong> Pedidos só movem para colunas de produção</li>
                      <li><strong>Permissões:</strong> Vendedores movem propostas apenas para "Revisão" com observação obrigatória</li>
                      <li><strong>Visibilidade:</strong> Colunas de aprovação só visíveis com permissão pcp.kanban.aprovacao.visualizar</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pcp-impressao">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  Registro de Impressão (/pcp/impressao)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Registro de impressões realizadas, vinculadas a pedidos ou avulsas (testes/amostras).</p>
                <div>
                  <h4 className="font-semibold mb-2">Campos do Registro:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Tipo: Pedido (vinculado) ou Avulso (teste/amostra)</li>
                    <li>Tipo de estampa e máquina utilizada (do cadastro)</li>
                    <li>Quantidade impressa</li>
                    <li>Operador responsável</li>
                    <li>Data/hora do registro</li>
                    <li>Observações</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Resumo para Impressão - NOVO */}
            <AccordionItem value="pcp-resumo">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Resumo para Impressão (/pcp/resumo-impressao)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Gera um resumo consolidado dos pedidos em produção para impressão, facilitando 
                  o acompanhamento físico na fábrica.
                </p>
                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Filtro por Etapa:</strong> Selecionar pedidos de uma etapa específica</li>
                    <li><strong>Filtro por Período:</strong> Data de entrega dentro do período selecionado</li>
                    <li><strong>Impressão A4:</strong> Layout otimizado para impressão com dados essenciais</li>
                    <li><strong>Dados Exibidos:</strong> Nº pedido, cliente, produtos, quantidades, data de entrega, tags</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pcp-falhas">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Lançamento de Falhas (/pcp/falhas)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Registro de falhas/defeitos na produção para controle de qualidade.</p>
                <div>
                  <h4 className="font-semibold mb-2">Campos do Registro:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Pedido afetado (opcional)</li>
                    <li>Categoria da falha (ex: Impressão, Material, Operador)</li>
                    <li>Tipo da falha (dentro da categoria)</li>
                    <li>Quantidade de peças afetadas</li>
                    <li>Descrição detalhada</li>
                    <li>Ação corretiva tomada</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pcp-expedicao">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Expedição PCP (/pcp/expedicao)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Registro de expedição de produtos acabados com dados de envio.</p>
                <div>
                  <h4 className="font-semibold mb-2">Campos:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Pedido ou registro avulso</li>
                    <li>Data de envio, quantidade expedida</li>
                    <li>Transportadora e código de rastreio</li>
                    <li>Observações</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pcp-calendario">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Calendário de Entregas (/pcp/calendario)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Visualização de pedidos organizados por data de entrega prevista.</p>
                <div>
                  <h4 className="font-semibold mb-2">Modos de Visualização:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Semana:</strong> Visão detalhada dos próximos 7 dias</li>
                    <li><strong>Mês:</strong> Visão geral do mês completo</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Métricas:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Total de entregas no período, entregas para hoje</li>
                    <li>Pedidos atrasados, finalizados no período</li>
                    <li>Cores: verde=pronto, amarelo=em produção, vermelho=atrasado</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pcp-quantidades">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Quantidades Vendidas (/pcp/quantidades)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Relatório de quantidades produzidas/vendidas por categoria de produto e período.</p>
                <div>
                  <h4 className="font-semibold mb-2">Filtros:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Hoje, Ontem, Última semana, Período personalizado</li>
                  </ul>
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Alerta de Produtos Não Classificados</AlertTitle>
                  <AlertDescription>
                    Se existirem produtos sem categoria E-commerce configurada, um alerta é exibido.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pcp-cadastros">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Cadastros PCP (/pcp/cadastros)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Hub de cadastros auxiliares utilizados pelo módulo de produção.</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Cadastros Disponíveis:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li><strong>Máquinas de Impressão:</strong> Equipamentos utilizados</li>
                      <li><strong>Tipos de Estampa:</strong> Silk, Sublimação, DTF, etc.</li>
                      <li><strong>Categorias de Falha:</strong> Agrupamentos de tipos de falha</li>
                      <li><strong>Tipos de Falha:</strong> Falhas específicas por categoria</li>
                    </ul>
                  </div>
                  <div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li><strong>Etapas de Produção:</strong> Definem as colunas do Kanban</li>
                      <li><strong>Categorias E-commerce:</strong> Para relatório de quantidades</li>
                    </ul>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Etapas de Produção - Campos:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Nome da etapa, Ordem de exibição</li>
                    <li>Tipo: Aprovação (para propostas) ou Produção (para pedidos)</li>
                    <li>Cor da coluna no Kanban</li>
                    <li>É etapa final? (marca pedido como "Pronto")</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== MÓDULO FINANCEIRO ===================== */}
      <Card>
        <CardHeader className="bg-green-50 dark:bg-green-950">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Módulo FINANCEIRO
          </CardTitle>
          <CardDescription>
            Controle de pagamentos, aprovações financeiras e histórico de transações
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4">
            O módulo Financeiro gerencia todo o fluxo de recebimentos: desde o registro de pagamentos 
            pelos vendedores, passando pela aprovação/rejeição, até o histórico completo de transações.
          </p>

          <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={handleAccordionChange}>
            <AccordionItem value="fin-pagamentos">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pagamentos Pendentes (/financeiro/pagamentos)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Tela principal do financeiro para aprovar ou rejeitar pagamentos registrados 
                  pelos vendedores.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Status dos Pagamentos:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-yellow-500 text-black">Aguardando Aprovação</Badge>
                    <Badge className="bg-green-500">Aprovado</Badge>
                    <Badge variant="destructive">Rejeitado</Badge>
                    <Badge variant="outline">Estornado</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Formas de Pagamento:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Dinheiro, PIX, Cartão de Crédito (parcelas), Cartão de Débito</li>
                    <li>Boleto (com data de vencimento), Transferência, Cheque</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Filtros:</strong> Por vendedor, cliente, pedido, forma de pagamento, boletos vencidos</li>
                    <li><strong>Aprovar:</strong> Confirma o pagamento (observação opcional)</li>
                    <li><strong>Rejeitar:</strong> Recusa o pagamento (motivo obrigatório)</li>
                    <li><strong>Ver Comprovante:</strong> Visualiza imagem/PDF anexado (via URL assinada segura)</li>
                    <li><strong>Ver Pedido:</strong> Abre detalhes do pedido relacionado</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Destaques Visuais:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><Badge variant="destructive">Vermelho</Badge> - Boletos vencidos</li>
                    <li><Badge className="bg-yellow-500 text-black">Amarelo</Badge> - Boletos próximos do vencimento (3 dias)</li>
                  </ul>
                </div>

                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Validações CRÍTICAS</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li><strong>Valor Excedente:</strong> Não aprovar se exceder valor total do pedido</li>
                      <li><strong>Duplicidade:</strong> Bloqueia pagamento duplicado (mesmo valor pendente)</li>
                      <li><strong>Pedido Bloqueado:</strong> Não permite aprovar se pedido requer aprovação de preço</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fin-recebimentos">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Controle de Recebimentos (/financeiro/recebimentos)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Visão de pedidos com valores pendentes de recebimento.</p>
                <div>
                  <h4 className="font-semibold mb-2">Informações Exibidas:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Número do pedido, Cliente, Vendedor</li>
                    <li>Valor total, Valor já pago (aprovado), Valor pendente</li>
                    <li>Status do pagamento (Pendente, Parcial)</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="fin-historico">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Histórico Financeiro (/financeiro/historico)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Histórico completo de todas as operações financeiras.</p>
                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Filtros:</strong> Por status, período, busca</li>
                    <li><strong>Estornar:</strong> Reverter pagamento aprovado (requer permissão e motivo obrigatório)</li>
                    <li><strong>Métricas:</strong> Total aprovado, rejeitado, estornado</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== MÓDULO ATENDIMENTO ===================== */}
      <Card>
        <CardHeader className="bg-purple-50 dark:bg-purple-950">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-purple-600" />
            Módulo ATENDIMENTO
          </CardTitle>
          <CardDescription>
            Controle de entregas e atendimento ao cliente
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={handleAccordionChange}>
            <AccordionItem value="atd-entrega">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Entrega de Pedidos (/pedidos/entrega)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Lista de pedidos com status "Pronto" aguardando entrega ao cliente.</p>
                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista:</strong> Filtros por data, cliente, status de pagamento</li>
                    <li><strong>Marcar como Entregue:</strong> Atualiza status do pedido</li>
                    <li><strong>Registrar Pagamento:</strong> Permite receber pagamento no ato da entrega</li>
                    <li><strong>Ver Detalhes:</strong> Informações completas do pedido</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== MÓDULO E-COMMERCE ===================== */}
      <Card>
        <CardHeader className="bg-pink-50 dark:bg-pink-950">
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5 text-pink-600" />
            Módulo E-COMMERCE
          </CardTitle>
          <CardDescription>
            Integração com loja virtual WBuy: pedidos, envios, suporte, relatórios e WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4">
            Módulo de integração com a plataforma de e-commerce WBuy. Gerencia pedidos externos, 
            logística de envios, atendimento ao cliente via WhatsApp e suporte pós-venda.
          </p>

          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Arquitetura Separada</AlertTitle>
            <AlertDescription>
              Pedidos do e-commerce (tabela orders) são SEPARADOS dos pedidos internos (tabela pedidos). 
              Não há conversão entre eles. E-commerce foca em fulfillment e atendimento.
            </AlertDescription>
          </Alert>

          <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={handleAccordionChange}>
            <AccordionItem value="ecom-dashboard">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard E-commerce (/ecommerce/dashboard)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Visão geral das operações de e-commerce com métricas do dia e período.</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Pedidos recebidos hoje, Ticket médio</li>
                  <li>Principais produtos vendidos</li>
                  <li>Pedidos pendentes de despacho</li>
                  <li>Carrinhos abandonados</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ecom-pedidos">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Pedidos E-commerce (/ecommerce/pedidos)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Lista de pedidos recebidos da loja virtual via webhook WBuy.</p>
                <div>
                  <h4 className="font-semibold mb-2">Status:</h4>
                  <p className="text-sm">Pendente → Processando → Enviado → Entregue | Cancelado</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Informações:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Número do pedido (externo), data, cliente, valor total</li>
                    <li>Status atual, código de rastreamento, previsão de entrega</li>
                    <li>Loja de origem (badge colorido por loja)</li>
                  </ul>
                </div>
                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Integração WBuy</AlertTitle>
                  <AlertDescription>
                    Pedidos recebidos via webhook. Status sincronizados bidirecionalmente. 
                    Chave NF-e (44 dígitos) usada para despacho via código de barras.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ecom-carrinhos">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Carrinhos Abandonados (/ecommerce/carrinhos)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Lista de carrinhos abandonados com ações de recuperação.</p>
                <div>
                  <h4 className="font-semibold mb-2">Status:</h4>
                  <div className="flex gap-2">
                    <Badge className="bg-yellow-500 text-black">Abandonado</Badge>
                    <Badge className="bg-green-500">Recuperado</Badge>
                    <Badge variant="outline">Expirado</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Métricas: total abandonados, recuperados, taxa de recuperação, valor potencial</li>
                    <li>Contato WhatsApp com mensagem pré-formatada</li>
                    <li>Link de recuperação para o cliente</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ecom-envios">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Envios (/ecommerce/envios)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Módulo completo de gestão de envios e logística.</p>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Dashboard de Envios</h4>
                    <p className="text-sm">Métricas: total despachado, em trânsito, entregues, atrasados.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Despacho (/envios/despacho)</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Campo para leitura de código de barras da NF-e (44 dígitos)</li>
                      <li>Busca pedido automaticamente e atualiza status para "Despachado"</li>
                      <li>Modal de erro se NF-e não encontrada</li>
                      <li>Modal de aviso se já despachado (opção reprocessar)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Atrasados (/ecommerce/envios/atrasados)</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>"Envio Atrasado": data_pedido + 4 dias úteis sem "Em trânsito"</li>
                      <li>"Entrega Atrasada": passou da previsão sem "Entregue"</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Relatórios (/envios/relatorios)</h4>
                    <p className="text-sm">Análise por dia, transportadora, pendentes e sem rastreio.</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ecom-suporte">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Suporte - Trocas e Devoluções (/ecommerce/suporte)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Gestão de atendimento pós-venda: trocas, devoluções, extravios e problemas.</p>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-1">Hub de Suporte</h4>
                    <p className="text-sm">Resumo com contadores de cada categoria e alertas de urgência.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Chamados/Problemas</h4>
                    <p className="text-sm">Tipos: Atraso, Produto errado, Defeito. Status: Aberto → Em Andamento → Resolvido. Alerta amarelo &gt;48h, vermelho &gt;96h.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Trocas e Devoluções</h4>
                    <p className="text-sm">Registro com pedido, cliente, produto, motivo, valor. Upload de comprovante obrigatório em devoluções.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Extravios/Roubos</h4>
                    <p className="text-sm">Registro de perdas logísticas com controle de ressarcimento (Pendente → Aprovado/Negado).</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Motivos</h4>
                    <p className="text-sm">Cadastro de motivos (multi-select: Troca/Devolução/Problema).</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Relatórios E-commerce - NOVO */}
            <AccordionItem value="ecom-relatorios">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Relatórios E-commerce (/ecommerce/relatorios)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Relatórios de vendas e desempenho do e-commerce.</p>
                <div>
                  <h4 className="font-semibold mb-2">Relatórios Disponíveis:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Vendas por Período:</strong> Gráficos de vendas diárias/semanais/mensais</li>
                    <li><strong>Vendas por Loja:</strong> Comparativo entre lojas/marcas</li>
                    <li><strong>Produtos Mais Vendidos:</strong> Ranking de produtos</li>
                    <li><strong>Ticket Médio:</strong> Evolução do ticket médio ao longo do tempo</li>
                    <li><strong>Taxa de Cancelamento:</strong> Percentual de pedidos cancelados</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Relatórios Suporte - NOVO */}
            <AccordionItem value="ecom-suporte-relatorios">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Relatórios de Suporte (/ecommerce/suporte/relatorios)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Métricas e análises do suporte pós-venda.</p>
                <div>
                  <h4 className="font-semibold mb-2">Relatórios Disponíveis:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Dashboard de Suporte:</strong> Resumo com cards de KPIs (chamados abertos, resolvidos, tempo médio)</li>
                    <li><strong>Por Motivo:</strong> Distribuição de trocas/devoluções por motivo</li>
                    <li><strong>Por Período:</strong> Volume de ocorrências ao longo do tempo</li>
                    <li><strong>Extravios:</strong> Valores perdidos e recuperados por transportadora</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ecom-whatsapp">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Atendimento (/ecommerce/whatsapp)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Sistema integrado de atendimento via WhatsApp com múltiplas instâncias.</p>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold mb-1">Atendimento</h4>
                    <p className="text-sm mb-1">Interface de chat com três colunas: Lista de conversas | Chat | Info do contato</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Múltiplas instâncias WhatsApp (números diferentes)</li>
                      <li>Mensagens rápidas com variáveis: {'{nome}'}, {'{produtos_carrinho}'}, {'{link_carrinho}'}</li>
                      <li>Histórico de pedidos e carrinhos na barra lateral</li>
                      <li>Transferência de atendimento, lido/não lido</li>
                      <li>Alias de contato (apelido customizado)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Dashboard WhatsApp</h4>
                    <p className="text-sm">Métricas de atendimento, ranking de atendentes, status das instâncias.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Configurações</h4>
                    <p className="text-sm">Gerenciar instâncias, conectar via QR Code, usuários por instância, respostas rápidas.</p>
                  </div>
                </div>
                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Conexão com Carrinhos</AlertTitle>
                  <AlertDescription>
                    Quando o telefone do contato coincide com um carrinho abandonado, ele aparece na barra lateral 
                    com opções de recuperação.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== MÓDULO TAREFAS (NOVO) ===================== */}
      <Card>
        <CardHeader className="bg-indigo-50 dark:bg-indigo-950">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-indigo-600" />
            Módulo TAREFAS
          </CardTitle>
          <CardDescription>
            Gestão de tarefas internas com recorrência, prioridade e atribuição
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4">
            Módulo para gerenciamento de tarefas internas da equipe. Permite criar tarefas avulsas 
            ou recorrentes, atribuir responsáveis, definir prioridades e acompanhar o progresso.
          </p>

          <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={handleAccordionChange}>
            <AccordionItem value="tarefas-lista">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Lista de Tarefas (/tarefas)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Visualização e gestão de todas as tarefas. Filtros por status, prioridade, 
                  responsável e período.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Status da Tarefa:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Pendente</Badge>
                    <Badge className="bg-blue-500">Em Andamento</Badge>
                    <Badge className="bg-green-500">Concluída</Badge>
                    <Badge variant="destructive">Cancelada</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Prioridades:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Baixa</Badge>
                    <Badge className="bg-yellow-500 text-black">Média</Badge>
                    <Badge className="bg-orange-500">Alta</Badge>
                    <Badge variant="destructive">Urgente</Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Nova Tarefa:</strong> Título, descrição, responsável, prioridade, data limite</li>
                    <li><strong>Editar Tarefa:</strong> Atualizar qualquer campo</li>
                    <li><strong>Marcar Concluída:</strong> Ação rápida direto na lista</li>
                    <li><strong>Filtros:</strong> Status, prioridade, responsável, busca textual</li>
                    <li><strong>Indicadores Visuais:</strong> Tarefas atrasadas destacadas em vermelho</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Campos da Tarefa:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Título (obrigatório)</li>
                    <li>Descrição (texto longo)</li>
                    <li>Responsável (usuário do sistema)</li>
                    <li>Prioridade (baixa, média, alta, urgente)</li>
                    <li>Data limite</li>
                    <li>Categoria/tipo</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tarefas-detalhes">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Recorrência e Detalhes
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Tarefas Recorrentes:</h4>
                  <p className="text-sm mb-2">
                    Tarefas podem ser configuradas como recorrentes. O sistema gera automaticamente 
                    novas instâncias via Edge Function (gerar-tarefas-recorrentes) executada periodicamente.
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Frequências:</strong> Diária, Semanal, Quinzenal, Mensal</li>
                    <li><strong>Geração Automática:</strong> Nova tarefa criada ao final do ciclo</li>
                    <li><strong>Exemplo:</strong> "Conferir estoque" → repete toda segunda-feira</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Detalhes da Tarefa (/tarefas/:id):</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Visualização completa com todos os campos</li>
                    <li>Alterar status diretamente</li>
                    <li>Histórico de alterações</li>
                    <li>Informações do criador e responsável</li>
                  </ul>
                </div>

                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Conexões</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      <li><strong>← Automação:</strong> Fluxos de automação podem criar tarefas automaticamente</li>
                      <li><strong>→ Notificações:</strong> Responsável recebe notificação quando tarefa é atribuída</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== MÓDULO RH (NOVO) ===================== */}
      <Card>
        <CardHeader className="bg-teal-50 dark:bg-teal-950">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-teal-600" />
            Módulo RH - Recursos Humanos
          </CardTitle>
          <CardDescription>
            Gestão completa de colaboradores, salários, férias, bonificações e mimos
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4">
            O módulo de RH gerencia todos os aspectos relacionados aos colaboradores da empresa, 
            desde o cadastro até o fechamento mensal de folha. Inclui controle de férias, 
            histórico salarial, bonificações, presentes e calendário corporativo.
          </p>

          <div className="mb-4">
            <strong>Telas do Módulo:</strong>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge>Dashboard</Badge>
              <Badge>Colaboradores</Badge>
              <Badge>Calendário Corporativo</Badge>
              <Badge>Histórico Salarial</Badge>
              <Badge>Controle de Férias</Badge>
              <Badge>Fechamento Mensal</Badge>
              <Badge>Bonificações</Badge>
              <Badge>Mimos/Presentes</Badge>
              <Badge>Relatórios</Badge>
            </div>
          </div>

          <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={handleAccordionChange}>
            <AccordionItem value="rh-dashboard">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard RH (/rh/dashboard)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Visão consolidada de métricas do departamento pessoal.</p>
                <div>
                  <h4 className="font-semibold mb-2">Métricas Exibidas:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Total de colaboradores ativos</li>
                    <li>Aniversariantes do mês (pessoal e empresa)</li>
                    <li>Férias agendadas/em gozo</li>
                    <li>Férias vencidas (sem agendamento)</li>
                    <li>Colaboradores por setor (gráfico)</li>
                    <li>Folha salarial estimada</li>
                    <li>Alertas de datas importantes</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rh-colaboradores">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Colaboradores (/rh/colaboradores)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Cadastro completo de colaboradores com dados pessoais, trabalhistas e bancários.</p>
                
                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista:</strong> Todos os colaboradores com filtro por setor e status (ativo/inativo)</li>
                    <li><strong>Novo Colaborador:</strong> Cadastro completo</li>
                    <li><strong>Detalhes:</strong> Ficha completa com abas (dados, dependentes, histórico, férias)</li>
                    <li><strong>Vincular Usuário:</strong> Associar colaborador a um usuário do sistema</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Dados do Colaborador:</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Pessoais:</strong>
                      <ul className="list-disc list-inside">
                        <li>Nome, CPF, RG</li>
                        <li>Data de nascimento</li>
                        <li>Telefone, WhatsApp, E-mail</li>
                        <li>Endereço completo</li>
                        <li>Foto</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Trabalhistas:</strong>
                      <ul className="list-disc list-inside">
                        <li>Cargo, Setor</li>
                        <li>Data de admissão/demissão</li>
                        <li>Tipo de contrato (CLT, PJ, Estágio, Temporário)</li>
                        <li>Carga horária semanal</li>
                        <li>Salário atual</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Bancários:</strong>
                      <ul className="list-disc list-inside">
                        <li>Banco, Agência, Conta</li>
                        <li>Tipo de conta (Corrente, Poupança)</li>
                        <li>Chave PIX</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Dependentes:</strong>
                      <ul className="list-disc list-inside">
                        <li>Nome, Parentesco</li>
                        <li>Data de nascimento, CPF</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rh-calendario">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Calendário Corporativo (/rh/calendario)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Calendário visual com todos os eventos relevantes do RH.</p>
                <div>
                  <h4 className="font-semibold mb-2">Tipos de Eventos (cores):</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>🎂 <strong>Aniversário Pessoal</strong> (azul) - Data de nascimento dos colaboradores</li>
                    <li>🏢 <strong>Aniversário de Empresa</strong> (verde) - Anos de casa</li>
                    <li>🏖️ <strong>Férias</strong> (amarelo) - Períodos de férias agendadas/em gozo</li>
                    <li>💜 <strong>Data Comemorativa</strong> (roxo) - Eventos da empresa</li>
                    <li>🔴 <strong>Feriado</strong> (vermelho) - Feriados nacionais e locais</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Navegação por mês (anterior/próximo)</li>
                    <li>Cadastro de datas comemorativas e feriados</li>
                    <li>Datas recorrentes (ex: aniversários se repetem anualmente)</li>
                    <li>Filtro por tipo de evento</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rh-salarios">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Histórico Salarial (/rh/historico-salarial)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Registro de reajustes salariais com histórico completo de evolução.</p>
                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista:</strong> Todos os reajustes com filtro por colaborador</li>
                    <li><strong>Novo Reajuste:</strong> Colaborador, valor anterior, valor novo, data, motivo</li>
                    <li><strong>Gráfico de Evolução:</strong> Curva salarial ao longo do tempo</li>
                    <li><strong>Atualização Automática:</strong> Ao registrar reajuste, salário atual do colaborador é atualizado</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Campos do Reajuste:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Colaborador (obrigatório)</li>
                    <li>Data do reajuste</li>
                    <li>Valor anterior e novo (calculados automaticamente)</li>
                    <li>Motivo (Dissídio, Promoção, Mérito, Ajuste)</li>
                    <li>Observação</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rh-ferias">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Controle de Férias (/rh/ferias)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Gestão de férias com controle de período aquisitivo e tipos.</p>
                <div>
                  <h4 className="font-semibold mb-2">Status das Férias:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Agendada</Badge>
                    <Badge className="bg-blue-500">Em Gozo</Badge>
                    <Badge className="bg-green-500">Concluída</Badge>
                    <Badge variant="destructive">Cancelada</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Tipos de Férias:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Normal:</strong> Férias regulares de até 30 dias</li>
                    <li><strong>Fracionada:</strong> Dividida em até 3 períodos (mínimo 14 dias no maior)</li>
                    <li><strong>Coletiva:</strong> Para toda a empresa ou setor</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Campos:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Colaborador, Tipo de férias</li>
                    <li>Período aquisitivo (início/fim)</li>
                    <li>Data início e fim das férias</li>
                    <li>Dias (calculado automaticamente)</li>
                    <li>Abono pecuniário (sim/não)</li>
                    <li>Observação</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rh-fechamento">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Fechamento Mensal (/rh/fechamento)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Processo de fechamento mensal da folha com controle de extras, faltas e descontos.</p>
                <div>
                  <h4 className="font-semibold mb-2">Status do Fechamento:</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline">Aberto</Badge>
                    <Badge className="bg-yellow-500 text-black">Em Revisão</Badge>
                    <Badge className="bg-green-500">Fechado</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Campos por Colaborador:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Mês de referência</li>
                    <li>Horas extras (quantidade e valor)</li>
                    <li>Faltas (dias)</li>
                    <li>Bonificações acumuladas</li>
                    <li>Descontos</li>
                    <li>Observações</li>
                    <li>Data do fechamento</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rh-bonificacoes">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Bonificações (/rh/bonificacoes)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Gestão de regras de bonificação e registro mensal por colaborador.</p>
                <div>
                  <h4 className="font-semibold mb-2">Regras de Bonificação:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Nome e descrição da regra</li>
                    <li>Valor (fixo em R$ ou percentual)</li>
                    <li>Tipo: Fixo ou Percentual</li>
                    <li>Aplicável a: Todos, Por Setor ou Por Cargo</li>
                    <li>Status: Ativo/Inativo</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Registro Mensal:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Selecionar colaborador e regra (opcional)</li>
                    <li>Mês de referência, valor</li>
                    <li>Marcar se recebeu ou não (com justificativa)</li>
                    <li>Filtro por mês para visão consolidada</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rh-mimos">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4" />
                  Mimos / Presentes (/rh/mimos)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Controle de presentes e mimos dados aos colaboradores em datas especiais.</p>
                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista:</strong> Todos os mimos registrados com filtros por ano e ocasião</li>
                    <li><strong>Novo Mimo:</strong> Colaborador, ocasião, descrição, valor estimado, data de entrega</li>
                    <li><strong>Ocasiões Configuráveis:</strong> Aniversário, Natal, Dia das Mães, etc.</li>
                    <li><strong>Controle Anual:</strong> Rastreia quem já recebeu por ano</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Campos:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Colaborador (obrigatório)</li>
                    <li>Ocasião (cadastro de ocasiões)</li>
                    <li>Descrição do presente</li>
                    <li>Valor estimado</li>
                    <li>Data de entrega</li>
                    <li>Ano de referência</li>
                    <li>Observação</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="rh-relatorios">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Relatórios RH (/rh/relatorios)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Relatórios gerenciais do departamento de RH.</p>
                <div>
                  <h4 className="font-semibold mb-2">Relatórios Disponíveis:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Resumo de Folha:</strong> Custo total por mês com detalhamento</li>
                    <li><strong>Colaboradores por Setor:</strong> Distribuição e custos</li>
                    <li><strong>Evolução Salarial:</strong> Gráfico de reajustes ao longo do tempo</li>
                    <li><strong>Controle de Férias:</strong> Férias vencidas e a vencer</li>
                    <li><strong>Bonificações:</strong> Resumo mensal de bonificações por colaborador</li>
                    <li><strong>Turnover:</strong> Admissões e demissões por período</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== MÓDULO AUTOMAÇÃO ===================== */}
      <Card>
        <CardHeader className="bg-cyan-50 dark:bg-cyan-950">
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-cyan-600" />
            Módulo AUTOMAÇÃO
          </CardTitle>
          <CardDescription>
            Criação de fluxos automatizados visuais para ações repetitivas
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4">
            Sistema visual de criação de automações usando fluxos drag-and-drop. 
            Permite automatizar envio de mensagens, atualizações de status e outras ações 
            baseadas em eventos do sistema.
          </p>

          <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={handleAccordionChange}>
            <AccordionItem value="auto-fluxos">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Fluxos de Automação (/automacao)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Lista de Fluxos</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Visualização de todos os fluxos criados com status Ativo/Inativo</li>
                    <li>Estatísticas de execução (sucesso/falha)</li>
                    <li>Ações: Editar, Duplicar, Ativar/Desativar, Excluir</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Editor Visual (/automacao/fluxos/:id)</h4>
                  <p className="text-sm mb-2">Canvas fullscreen de construção de fluxos com nós arrastáveis e paleta flutuante.</p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <strong>Triggers (Gatilhos):</strong>
                      <ul className="list-disc list-inside text-sm">
                        <li>Scheduler (agendamento cron)</li>
                        <li>Webhook (HTTP externo)</li>
                        <li>Pedido Novo/Atualizado</li>
                        <li>Lead Novo/Atualizado</li>
                        <li>Carrinho Abandonado</li>
                        <li>Mensagem Recebida (WhatsApp)</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Ações:</strong>
                      <ul className="list-disc list-inside text-sm">
                        <li>Enviar WhatsApp (com 4 mensagens alternativas aleatórias)</li>
                        <li>Enviar E-mail</li>
                        <li>Atualizar Status</li>
                        <li>Adicionar/Remover Tag</li>
                        <li>Criar Tarefa</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Condições:</strong>
                      <ul className="list-disc list-inside text-sm">
                        <li>If/Else (baseado em campos da entidade)</li>
                        <li>Aguardar Status</li>
                        <li>Horário Comercial</li>
                        <li>Cliente Respondeu</li>
                        <li>Split (divisão condicional)</li>
                      </ul>
                    </div>
                    <div>
                      <strong>Controle:</strong>
                      <ul className="list-disc list-inside text-sm">
                        <li>Delay (aguardar minutos/horas/dias)</li>
                        <li>Exit (encerrar fluxo)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Galeria de Fluxos</h4>
                  <p className="text-sm">Biblioteca com 7+ fluxos prontos para cenários comuns:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Recuperação de carrinho abandonado</li>
                    <li>Follow-up de proposta</li>
                    <li>Lembrete de pagamento</li>
                    <li>Boas-vindas ao novo cliente</li>
                    <li>Notificação de envio</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Histórico de Execuções</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Visualizar todas as execuções (sucesso, falha, em andamento)</li>
                    <li>Detalhes passo a passo: nó executado, dados de entrada/saída, duração</li>
                    <li>Visualizador de caminho de execução (mostra qual ramo foi seguido)</li>
                    <li>Logs de erro detalhados</li>
                  </ul>
                </div>

                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Recursos Especiais</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside mt-2">
                      <li>Mensagens alternativas com seleção aleatória (mais natural)</li>
                      <li>Variáveis dinâmicas: {'{cliente.nome}'}, {'{pedido.numero}'}, etc.</li>
                      <li>Edges customizados com labels "Sim/Não" para condições</li>
                      <li>Execução em background via Edge Functions</li>
                      <li>Ações agendadas com delay (armazenadas em automation_scheduled_actions)</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== MÓDULO ADMINISTRAÇÃO ===================== */}
      <Card>
        <CardHeader className="bg-gray-100 dark:bg-gray-900">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Módulo ADMINISTRAÇÃO
          </CardTitle>
          <CardDescription>
            Configurações do sistema, usuários, perfis, regras de negócio e integrações
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="mb-4">
            Módulo de configurações gerais do sistema. Acesso restrito a administradores 
            e perfis com permissões específicas.
          </p>

          <div className="mb-4">
            <strong>Telas do Módulo:</strong>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge>Usuários</Badge>
              <Badge>Perfis de Acesso</Badge>
              <Badge>Aprovar Pedidos</Badge>
              <Badge>Regras de Comissão</Badge>
              <Badge>Relatório de Comissões</Badge>
              <Badge>Segmentos</Badge>
              <Badge>Grades de Tamanho</Badge>
              <Badge>Lojas E-commerce</Badge>
              <Badge>WhatsApp API Config</Badge>
            </div>
          </div>

          <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={handleAccordionChange}>
            <AccordionItem value="admin-usuarios">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Usuários (/admin/usuarios)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Gerenciamento de usuários do sistema.</p>
                <div>
                  <h4 className="font-semibold mb-2">Funcionalidades:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Lista:</strong> Todos os usuários com status e perfis</li>
                    <li><strong>Novo Usuário:</strong> Cria usuário com e-mail, nome e perfis via Edge Function (admin-create-user)</li>
                    <li><strong>Editar:</strong> Atualiza dados, perfis e e-mail (admin-update-email)</li>
                    <li><strong>Ativar/Desativar:</strong> Bloqueia acesso sem excluir</li>
                    <li><strong>Resetar Senha:</strong> Envia e-mail de redefinição (admin-reset-password)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Campos:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Nome completo*, E-mail*, WhatsApp</li>
                    <li>Perfis de acesso (múltiplos)</li>
                    <li>Status (ativo/inativo)</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="admin-perfis">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  Perfis de Acesso (/admin/perfis)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Gerenciamento de perfis de acesso e permissões (RBAC).</p>
                <div>
                  <h4 className="font-semibold mb-2">Tipos:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Sistema:</strong> Pré-definidos, não editáveis (Admin, Vendedor, Financeiro, etc.)</li>
                    <li><strong>Customizado:</strong> Criados pelo usuário, totalmente configuráveis</li>
                  </ul>
                </div>
                <Alert>
                  <Link2 className="h-4 w-4" />
                  <AlertTitle>Sistema de Permissões</AlertTitle>
                  <AlertDescription>
                    O sistema possui mais de 90 permissões granulares organizadas por módulo. 
                    Usuários podem ter múltiplos perfis, e as permissões são somadas (união).
                    Verificação via RPC get_user_permissions().
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="admin-aprovacoes">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Aprovar Pedidos (/admin/aprovacoes)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Aprovação de pedidos com preço abaixo do mínimo.</p>
                <div>
                  <h4 className="font-semibold mb-2">Informações:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>Nº pedido, cliente, vendedor</li>
                    <li>Produtos com preço abaixo do mínimo</li>
                    <li>Diferença entre preço praticado e mínimo</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Ações:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>Aprovar:</strong> Libera pedido para produção e pagamentos</li>
                    <li><strong>Rejeitar:</strong> Devolve ao vendedor para correção</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="admin-regras-comissao">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Regras de Comissão (/admin/regras-comissao)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>Configuração de regras de comissão por vendedor com faixas progressivas.</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Faixa</TableHead>
                      <TableHead>Valor Mínimo</TableHead>
                      <TableHead>Valor Máximo</TableHead>
                      <TableHead>Percentual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>1</TableCell>
                      <TableCell>R$ 0</TableCell>
                      <TableCell>R$ 10.000</TableCell>
                      <TableCell>5%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2</TableCell>
                      <TableCell>R$ 10.001</TableCell>
                      <TableCell>R$ 25.000</TableCell>
                      <TableCell>7%</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>3</TableCell>
                      <TableCell>R$ 25.001</TableCell>
                      <TableCell>∞</TableCell>
                      <TableCell>10%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Validação</AlertTitle>
                  <AlertDescription>
                    Apenas 1 regra pode estar ativa por vendedor. Ao ativar uma nova, a anterior é desativada.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            {/* WhatsApp API Config - NOVO */}
            <AccordionItem value="admin-whatsapp-api">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp API Config (/admin/whatsapp-api)
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <p>
                  Configuração da integração com a API Evolution para WhatsApp Business.
                </p>
                <div>
                  <h4 className="font-semibold mb-2">Configurações:</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li><strong>URL da API:</strong> Endereço do servidor Evolution API</li>
                    <li><strong>API Key Global:</strong> Chave de autenticação</li>
                    <li><strong>Webhook URL:</strong> URL para receber mensagens (configurada automaticamente)</li>
                    <li><strong>Teste de Conexão:</strong> Verifica se a API está acessível</li>
                  </ul>
                </div>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Segurança</AlertTitle>
                  <AlertDescription>
                    As credenciais da API são armazenadas na tabela system_config com RLS restrito a administradores.
                    Nunca exponha a API Key no frontend.
                  </AlertDescription>
                </Alert>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="admin-outros">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Outros Cadastros
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Relatório de Comissões</h4>
                    <p className="text-sm">Visão gerencial de todas as comissões com filtros por vendedor, mês e status. Exportação de dados.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Segmentos</h4>
                    <p className="text-sm">Cadastro de segmentos de mercado para categorização de clientes e leads.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Grades de Tamanho</h4>
                    <p className="text-sm">Templates de tamanhos reutilizáveis para itens de pedido (P, M, G, GG, etc.).</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Lojas E-commerce</h4>
                    <p className="text-sm">Configuração de lojas WBuy com credenciais de API, webhooks e sincronização diária automática (wbuy-daily-sync).</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== REGRAS DE NEGÓCIO CRÍTICAS ===================== */}
      <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Regras de Negócio CRÍTICAS
          </CardTitle>
          <CardDescription className="text-red-600 dark:text-red-300">
            Validações essenciais que afetam o funcionamento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              1. Validação de Preço Mínimo
            </h3>
            <div className="pl-6 space-y-2 text-sm">
              <ol className="list-decimal list-inside space-y-1">
                <li>Sistema busca faixa de preço do produto baseada na quantidade</li>
                <li>Se valor_unitario &lt; preco_minimo da faixa → requer_aprovacao_preco = true</li>
                <li>Pedido fica BLOQUEADO para registros de pagamento</li>
                <li>Aparece na tela Admin → Aprovar Pedidos</li>
                <li>Após aprovação, pedido segue fluxo normal</li>
              </ol>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              2. Bloqueio de Edição com Pagamentos
            </h3>
            <div className="pl-6 space-y-2 text-sm">
              <ul className="list-disc list-inside space-y-1">
                <li>Condição: existe pagamento com status='aprovado' AND estornado=false</li>
                <li>Efeito: vendedor não consegue editar o pedido</li>
                <li>Exceção: administradores podem editar qualquer pedido</li>
                <li>Para liberar: admin deve estornar os pagamentos</li>
              </ul>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              3. Cálculo de Comissões
            </h3>
            <div className="pl-6 space-y-2 text-sm">
              <ol className="list-decimal list-inside space-y-1">
                <li><strong>Criar pedido:</strong> Comissão registrada como "Prevista"</li>
                <li><strong>Aprovar pagamento:</strong> Comissão muda para "Pendente"</li>
                <li><strong>Percentual:</strong> Pela faixa de volume mensal do vendedor</li>
                <li><strong>Prioridade:</strong> Regra personalizada → Regra padrão</li>
                <li><strong>Estorno:</strong> Comissão recalculada</li>
                <li><strong>Cancelamento:</strong> Comissão → "Cancelada"</li>
              </ol>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              4. Fluxo de Status do Pedido
            </h3>
            <div className="pl-6 text-sm">
              <pre className="bg-white dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
{`Rascunho → Confirmado → Em Produção → Pronto → Entregue
                    ↓
                Cancelado

Regras:
- "Confirmado" libera para produção (aparece no Kanban)
- "Em Produção" setado ao mover no Kanban
- "Pronto" setado ao mover para etapa final
- "Entregue" setado manualmente na entrega
- "Cancelado" bloqueia novos pagamentos`}
              </pre>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-600" />
              5. Histórico de Alterações (Auditoria)
            </h3>
            <div className="pl-6 space-y-2 text-sm">
              <ul className="list-disc list-inside space-y-1">
                <li>Trigger SQL registrar_alteracao_pedido registra automaticamente</li>
                <li>Campos: status, data_entrega, cliente_id, observacoes, valor_total</li>
                <li>Registro: campo, valor anterior, valor novo, usuário, timestamp</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===================== FAQ ===================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            FAQ - Perguntas Frequentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" value={accordionValue} onValueChange={handleAccordionChange}>
            <AccordionItem value="faq-1">
              <AccordionTrigger>Por que não consigo editar um pedido?</AccordionTrigger>
              <AccordionContent>
                Pedidos com pagamentos aprovados ficam bloqueados. Se precisar editar, um administrador 
                deve estornar os pagamentos primeiro, ou um admin pode editar diretamente.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2">
              <AccordionTrigger>O que significa "Aguardando Aprovação de Preço"?</AccordionTrigger>
              <AccordionContent>
                Um ou mais itens foram vendidos abaixo do preço mínimo. O pedido precisa ser aprovado 
                em Admin → Aprovar Pedidos antes de poder receber pagamentos.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3">
              <AccordionTrigger>Como funciona a comissão por faixas?</AccordionTrigger>
              <AccordionContent>
                O percentual aumenta conforme o vendedor atinge maiores volumes no mês. 
                Ex: até R$ 10.000 = 5%, R$ 10.001 a R$ 25.000 = 7%, acima = 10%. 
                Considera pedidos com pagamentos aprovados no mês.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4">
              <AccordionTrigger>Posso estornar um pagamento aprovado?</AccordionTrigger>
              <AccordionContent>
                Sim, com permissão pagamentos.estornar. Motivo obrigatório. 
                Após estorno, valor fica disponível para novo registro e comissão é recalculada.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5">
              <AccordionTrigger>Por que meu pedido não aparece no Kanban?</AccordionTrigger>
              <AccordionContent>
                Apenas pedidos "Confirmado" ou "Em Produção" aparecem. Verifique se não está como 
                "Rascunho" ou "Aguardando Aprovação de Preço".
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-6">
              <AccordionTrigger>Como recuperar um carrinho abandonado?</AccordionTrigger>
              <AccordionContent>
                Na tela Carrinhos Abandonados ou na barra lateral do WhatsApp, você pode ver os produtos 
                e usar o botão de WhatsApp com mensagens que incluem {'{produtos_carrinho}'} e {'{link_carrinho}'}.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-7">
              <AccordionTrigger>Como configuro uma nova instância WhatsApp?</AccordionTrigger>
              <AccordionContent>
                E-commerce → WhatsApp → Configurações → Nova Instância. Dê um nome, clique em Conectar 
                e escaneie o QR Code. Depois adicione os usuários que terão acesso.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-8">
              <AccordionTrigger>Como funciona o despacho por código de barras?</AccordionTrigger>
              <AccordionContent>
                Em Envios → Despacho, use um leitor de código de barras para ler os 44 dígitos da NF-e. 
                O sistema identifica o pedido e atualiza para "Despachado". Se já despachado, 
                aparece opção para "Reprocessar".
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-9">
              <AccordionTrigger>Como funciona o módulo de Tarefas?</AccordionTrigger>
              <AccordionContent>
                Crie tarefas com título, descrição, responsável, prioridade e data limite. 
                Tarefas podem ser recorrentes (diária, semanal, quinzenal, mensal) e são geradas 
                automaticamente pelo sistema. Automações também podem criar tarefas.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-10">
              <AccordionTrigger>Como registro um reajuste salarial no RH?</AccordionTrigger>
              <AccordionContent>
                Em RH → Histórico Salarial, clique em "Novo Reajuste". Selecione o colaborador, 
                o valor anterior é preenchido automaticamente. Informe o novo valor, data e motivo. 
                O salário atual do colaborador é atualizado automaticamente.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-11">
              <AccordionTrigger>Como crio um fluxo de automação?</AccordionTrigger>
              <AccordionContent>
                Em Automação, clique em "Novo Fluxo" ou escolha um da Galeria. No editor visual, 
                arraste nós da paleta: comece com um Trigger (gatilho), adicione Condições e Ações. 
                Conecte os nós arrastando entre as portas. Salve e ative o fluxo.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* ===================== CATÁLOGO DE PERMISSÕES ===================== */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Catálogo de Permissões do Sistema
          </CardTitle>
          <CardDescription>
            Lista das principais permissões disponíveis organizadas por módulo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Vendas</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">pedidos.visualizar</Badge>
                <Badge variant="outline">pedidos.criar</Badge>
                <Badge variant="outline">pedidos.editar</Badge>
                <Badge variant="outline">pedidos.excluir</Badge>
                <Badge variant="outline">pedidos.visualizar_todos</Badge>
                <Badge variant="outline">propostas.*</Badge>
                <Badge variant="outline">clientes.*</Badge>
                <Badge variant="outline">leads.*</Badge>
                <Badge variant="outline">produtos.*</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Financeiro</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">pagamentos.visualizar</Badge>
                <Badge variant="outline">pagamentos.registrar</Badge>
                <Badge variant="outline">pagamentos.aprovar</Badge>
                <Badge variant="outline">pagamentos.rejeitar</Badge>
                <Badge variant="outline">pagamentos.estornar</Badge>
                <Badge variant="outline">comissoes.*</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">PCP</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">pcp.dashboard</Badge>
                <Badge variant="outline">pcp.kanban</Badge>
                <Badge variant="outline">pcp.kanban.movimentar</Badge>
                <Badge variant="outline">pcp.kanban.aprovacao.*</Badge>
                <Badge variant="outline">pcp.impressao</Badge>
                <Badge variant="outline">pcp.falhas</Badge>
                <Badge variant="outline">pcp.cadastros</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">E-commerce</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">ecommerce.dashboard</Badge>
                <Badge variant="outline">ecommerce.pedidos</Badge>
                <Badge variant="outline">ecommerce.carrinhos</Badge>
                <Badge variant="outline">ecommerce.envios.*</Badge>
                <Badge variant="outline">ecommerce.suporte.*</Badge>
                <Badge variant="outline">ecommerce.whatsapp</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Tarefas</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">tarefas.visualizar</Badge>
                <Badge variant="outline">tarefas.criar</Badge>
                <Badge variant="outline">tarefas.editar</Badge>
                <Badge variant="outline">tarefas.excluir</Badge>
                <Badge variant="outline">tarefas.visualizar_todos</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">RH</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">rh.dashboard</Badge>
                <Badge variant="outline">rh.colaboradores.*</Badge>
                <Badge variant="outline">rh.ferias.*</Badge>
                <Badge variant="outline">rh.salarios.*</Badge>
                <Badge variant="outline">rh.fechamento.*</Badge>
                <Badge variant="outline">rh.bonificacoes.*</Badge>
                <Badge variant="outline">rh.mimos.*</Badge>
                <Badge variant="outline">rh.calendario</Badge>
                <Badge variant="outline">rh.relatorios</Badge>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Administração</h4>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">usuarios.*</Badge>
                <Badge variant="outline">perfis.*</Badge>
                <Badge variant="outline">aprovacoes.*</Badge>
                <Badge variant="outline">automacao.*</Badge>
                <Badge variant="outline">configuracoes.*</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rodapé */}
      <div className="text-center text-sm text-muted-foreground py-8 print:hidden">
        <p>SalesPeak CRM - Documentação do Sistema</p>
        <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

        </TabsContent>
      </Tabs>

      <style>{`
        @media print {
          body { font-size: 12px; }
          .no-print { display: none !important; }
          h1 { font-size: 24px; }
          h2 { font-size: 18px; }
          h3 { font-size: 14px; }
        }
      `}</style>
    </div>
  );
}
