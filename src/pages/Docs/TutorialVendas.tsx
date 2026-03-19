import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  FileSpreadsheet, ShoppingCart, Grid3X3, Truck,
  ArrowRight, CheckCircle, AlertTriangle, Info,
  Plus, Search, Edit, Eye, Printer, DollarSign,
  Package, ClipboardList, Calendar, Users,
  CreditCard, Receipt, Ban, RotateCcw, Upload,
  FileCheck, Clock, ShieldCheck, ArrowDown
} from 'lucide-react';

export default function TutorialVendas() {
  return (
    <div className="space-y-8">
      {/* Intro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Tutoriais de Uso — Módulo Vendas & Atendimento</CardTitle>
          <CardDescription>
            Passo a passo de como utilizar as principais funcionalidades do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Propostas</Badge>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Pedidos</Badge>
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Grades para Prova</Badge>
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Entrega de Pedidos</Badge>
          </div>
        </CardContent>
      </Card>

      {/* ======================== PROPOSTAS ======================== */}
      <Card>
        <CardHeader className="bg-blue-50 dark:bg-blue-950">
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            Tutorial: Propostas
          </CardTitle>
          <CardDescription>Como criar, gerenciar e converter propostas comerciais</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Passo 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">1</Badge>
              <h3 className="font-semibold text-lg">Acessar a Lista de Propostas</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              No menu lateral, clique em <strong>Vendas → Propostas</strong>. A tela lista todas as propostas com filtros por status (Pendente, Enviada, Follow-up, Ganha, Perdida), vendedor e cliente.
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border">
              <div className="flex items-center gap-2 text-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span>Use a barra de busca para encontrar propostas pelo nome do cliente</span>
              </div>
              <div className="flex items-center gap-2 text-sm mt-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span>Clique em qualquer proposta para ver seus detalhes completos</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">2</Badge>
              <h3 className="font-semibold text-lg">Criar uma Nova Proposta</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Clique no botão <strong>"Nova Proposta"</strong> no canto superior direito da lista.
            </p>
            <div className="ml-9 space-y-2 text-sm">
              <div className="bg-muted rounded-lg p-4 border space-y-3">
                <p className="font-medium">Preencha os campos obrigatórios:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li><strong>Cliente</strong> — Selecione um cliente existente ou cadastre rapidamente pelo botão "+"</li>
                  <li><strong>Status</strong> — Defina o status inicial (geralmente "Pendente")</li>
                  <li><strong>Vendedor</strong> — Será preenchido automaticamente com o usuário logado (admins podem alterar)</li>
                  <li><strong>Data</strong> — A data pode ser personalizada para propostas retroativas</li>
                </ul>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">3</Badge>
              <h3 className="font-semibold text-lg">Adicionar Itens à Proposta</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Na seção <strong>"Itens da Proposta"</strong>, clique em <strong>"Adicionar Item"</strong> para incluir produtos.
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <span>Selecione o <strong>produto</strong> no campo de busca</span>
              </div>
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-primary" />
                <span>Informe a <strong>quantidade</strong> e o <strong>valor unitário</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <span>Adicione <strong>observações</strong> específicas para cada item (opcional)</span>
              </div>
              <p className="text-muted-foreground mt-2">O valor total da proposta é calculado automaticamente.</p>
            </div>
          </div>

          <Separator />

          {/* Passo 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">4</Badge>
              <h3 className="font-semibold text-lg">Opções de Criação de Arte (Prévia)</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Marque a opção <strong>"Criar Prévia/Arte"</strong> caso a proposta precise de criação visual. Isso fará a proposta aparecer no <strong>Kanban de Aprovação de Artes</strong> no módulo PCP.
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <p><strong>Campos disponíveis ao ativar criação:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Descrição da Criação</strong> — Detalhe o que precisa ser criado</li>
                <li><strong>Caminho dos Arquivos</strong> — Informe onde estão os arquivos de referência</li>
                <li><strong>Imagem de Referência</strong> — Faça upload de uma imagem para guiar a criação</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Passo 5 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">5</Badge>
              <h3 className="font-semibold text-lg">Acompanhar e Converter Propostas</h3>
            </div>
            <div className="ml-9 space-y-3 text-sm">
              <div className="bg-muted rounded-lg p-4 border space-y-2">
                <p className="font-medium">Fluxo de status da proposta:</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Pendente</Badge>
                  <ArrowRight className="h-4 w-4" />
                  <Badge variant="secondary">Enviada</Badge>
                  <ArrowRight className="h-4 w-4" />
                  <Badge variant="secondary">Follow-up</Badge>
                  <ArrowRight className="h-4 w-4" />
                  <Badge className="bg-green-100 text-green-800">Ganha</Badge>
                  <span className="text-muted-foreground">ou</span>
                  <Badge variant="destructive">Perdida</Badge>
                </div>
              </div>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Conversão em Pedido</AlertTitle>
                <AlertDescription>
                  Quando a proposta for marcada como <strong>"Ganha"</strong>, você pode convertê-la diretamente em um pedido pelo botão na tela de detalhes. Os itens e dados do cliente serão copiados automaticamente.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <Separator />

          {/* Passo 6 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">6</Badge>
              <h3 className="font-semibold text-lg">Gerar Orçamento (PDF)</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Na tela de detalhes da proposta, clique em <strong>"Gerar Orçamento"</strong> para criar um PDF profissional com todos os itens, valores e dados do cliente. O PDF pode ser enviado diretamente ao cliente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ======================== PEDIDOS ======================== */}
      <Card>
        <CardHeader className="bg-green-50 dark:bg-green-950">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-green-600" />
            Tutorial: Pedidos
          </CardTitle>
          <CardDescription>Como criar, gerenciar e acompanhar pedidos de produção</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Passo 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">1</Badge>
              <h3 className="font-semibold text-lg">Acessar a Lista de Pedidos</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              No menu lateral, clique em <strong>Vendas → Pedidos</strong>. A tela mostra todos os pedidos com filtros por status, vendedor, cliente e período.
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <p className="font-medium">Status disponíveis:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Rascunho</Badge>
                <Badge variant="outline">Pendente</Badge>
                <Badge variant="outline">Aprovado</Badge>
                <Badge variant="outline">Em Produção</Badge>
                <Badge variant="outline">Pronto</Badge>
                <Badge variant="outline">Entregue</Badge>
                <Badge variant="outline">Cancelado</Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">2</Badge>
              <h3 className="font-semibold text-lg">Criar um Novo Pedido</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Clique em <strong>"Novo Pedido"</strong>. O formulário possui várias seções:
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-3">
              <div>
                <p className="font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Dados do Cliente</p>
                <p className="text-muted-foreground ml-6">Selecione o cliente e o vendedor responsável</p>
              </div>
              <div>
                <p className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Datas</p>
                <p className="text-muted-foreground ml-6">Data do pedido, previsão de entrega</p>
              </div>
              <div>
                <p className="font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Itens do Pedido</p>
                <p className="text-muted-foreground ml-6">Adicione produtos com quantidade, valor e detalhes</p>
              </div>
              <div>
                <p className="font-medium flex items-center gap-2"><DollarSign className="h-4 w-4" /> Financeiro</p>
                <p className="text-muted-foreground ml-6">Condição de pagamento, desconto, frete</p>
              </div>
              <div>
                <p className="font-medium flex items-center gap-2"><Upload className="h-4 w-4" /> Caminho dos Arquivos / Logos do Cliente</p>
                <p className="text-muted-foreground ml-6">Informe o caminho da rede ou pasta onde estão os arquivos e logos do cliente para criação das artes</p>
              </div>
            </div>
            <Alert className="ml-9 border-orange-300 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertTitle className="text-orange-800 dark:text-orange-300">Muito Importante: Caminho dos Arquivos</AlertTitle>
              <AlertDescription className="text-orange-700 dark:text-orange-400">
                O campo <strong>"Caminho dos Arquivos/Logos"</strong> é essencial para a equipe de arte criar as estampas. 
                Informe o caminho completo da rede onde estão os logos, vetores e referências do cliente 
                (ex: <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">\\servidor\arquivos\cliente\logos</code>). 
                Sem essa informação, a produção não consegue iniciar a criação das artes.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Passo 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">3</Badge>
              <h3 className="font-semibold text-lg">Adicionar Itens com Grade de Tamanhos</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Ao adicionar um item, você pode selecionar uma <strong>grade de tamanhos</strong> para distribuir as quantidades por tamanho (PP, P, M, G, GG, etc.).
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-primary" />
                <span>Selecione a grade desejada no campo "Grade de Tamanhos"</span>
              </div>
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-primary" />
                <span>Preencha a quantidade para cada tamanho</span>
              </div>
              <p className="text-muted-foreground">A quantidade total é somada automaticamente a partir da grade.</p>
            </div>
          </div>

          <Separator />

          {/* Passo 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">4</Badge>
              <h3 className="font-semibold text-lg">Foto do Modelo / Referência</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Em cada item do pedido, você pode fazer upload de uma <strong>foto do modelo</strong> para referência da produção. Essa imagem aparecerá na ficha de produção e no Kanban do PCP.
            </p>
          </div>

          <Separator />

          {/* Passo 5 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">5</Badge>
              <h3 className="font-semibold text-lg">Salvar como Rascunho</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Salve o pedido com status <strong>"Rascunho"</strong> para continuar editando depois. Pedidos em rascunho podem ser livremente editados por qualquer usuário com permissão.
            </p>
            <Alert className="ml-9">
              <Info className="h-4 w-4" />
              <AlertTitle>Edição de Pedidos</AlertTitle>
              <AlertDescription>
                Pedidos em <strong>Rascunho</strong> permitem edição completa. Após aprovação, a edição pode ser restrita dependendo do status de pagamento e das permissões do perfil.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Passo 6 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">6</Badge>
              <h3 className="font-semibold text-lg">Detalhes e Ações do Pedido</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Na tela de detalhes do pedido você encontra:
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-primary" />
                <span><strong>Imprimir Ficha</strong> — Gera a ficha do pedido para a produção</span>
              </div>
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-primary" />
                <span><strong>Alterar Status</strong> — Avance o pedido no fluxo de produção</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span><strong>Registrar Pagamento</strong> — Registre pagamentos parciais ou totais</span>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <span><strong>Observações</strong> — Adicione notas e histórico ao pedido</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 7 - PAGAMENTOS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">7</Badge>
              <h3 className="font-semibold text-lg">Lançar Pagamentos</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              No detalhes do pedido, clique em <strong>"Registrar Pagamento"</strong> para abrir o modal de lançamento. Este é o passo essencial para controlar o financeiro do pedido.
            </p>

            {/* Simulação visual do modal */}
            <div className="ml-9 border-2 border-dashed border-primary/30 rounded-xl p-5 bg-card space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <CreditCard className="h-5 w-5" />
                <span>Modal: Registrar Pagamento</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-muted rounded-lg p-3 border space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Tipo do Pagamento *</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">Entrada</Badge>
                    <Badge variant="outline" className="text-xs">Parcial</Badge>
                    <Badge variant="outline" className="text-xs">Quitação</Badge>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3 border space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Forma de Pagamento *</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-xs">PIX</Badge>
                    <Badge variant="outline" className="text-xs">Cartão</Badge>
                    <Badge variant="outline" className="text-xs">Boleto</Badge>
                    <Badge variant="outline" className="text-xs">Dinheiro</Badge>
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3 border space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Valor (R$) *</p>
                  <div className="bg-background rounded p-2 border text-muted-foreground">R$ 0,00</div>
                </div>
                <div className="bg-muted rounded-lg p-3 border space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Data do Pagamento *</p>
                  <div className="bg-background rounded p-2 border text-muted-foreground">dd/mm/aaaa</div>
                </div>
              </div>
              <div className="bg-muted rounded-lg p-3 border space-y-1 text-sm">
                <p className="text-xs text-muted-foreground font-medium">Comprovante (opcional)</p>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Upload className="h-4 w-4" />
                  <span>Arraste ou clique para enviar comprovante</span>
                </div>
              </div>
              <div className="bg-muted rounded-lg p-3 border space-y-1 text-sm">
                <p className="text-xs text-muted-foreground font-medium">Observação (opcional)</p>
                <div className="bg-background rounded p-2 border text-muted-foreground text-xs">Ex: Pagamento via PIX referente à 1ª parcela</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 8 - Validações automáticas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">8</Badge>
              <h3 className="font-semibold text-lg">Validações Automáticas de Pagamento</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              O sistema realiza diversas validações para evitar erros ao registrar pagamentos:
            </p>
            <div className="ml-9 space-y-3">
              <div className="bg-muted rounded-lg p-4 border text-sm space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Verificação de Saldo Disponível</p>
                    <p className="text-muted-foreground text-xs">O valor lançado não pode exceder o saldo restante (valor do pedido - já pago - pendentes)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Proteção contra Duplicatas</p>
                    <p className="text-muted-foreground text-xs">Não permite registrar dois pagamentos com mesmo valor pendentes (exceto boletos parcelados)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Bloqueio de Pedido Cancelado</p>
                    <p className="text-muted-foreground text-xs">Pedidos cancelados não aceitam novos pagamentos</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Aguardando Aprovação de Preço</p>
                    <p className="text-muted-foreground text-xs">Pedidos que requerem aprovação de preço não permitem pagamento até serem liberados</p>
                  </div>
                </div>
              </div>

              {/* Exemplo visual de erro */}
              <Alert variant="destructive" className="text-sm">
                <Ban className="h-4 w-4" />
                <AlertTitle className="text-sm">Exemplo de Validação</AlertTitle>
                <AlertDescription className="text-xs space-y-1">
                  <p>Valor excede o saldo disponível.</p>
                  <p>Valor do pedido: R$ 5.000,00</p>
                  <p>Já aprovado: R$ 3.000,00</p>
                  <p>Pendente aprovação: R$ 1.000,00</p>
                  <p className="font-medium">Saldo disponível: R$ 1.000,00</p>
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <Separator />

          {/* Passo 9 - Fluxo de Aprovação */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">9</Badge>
              <h3 className="font-semibold text-lg">Fluxo de Aprovação do Pagamento</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Após registrar o pagamento, ele fica com status <strong>"Aguardando"</strong> até que um usuário do setor <strong>Financeiro</strong> aprove ou rejeite.
            </p>

            {/* Fluxo visual */}
            <div className="ml-9 bg-muted rounded-xl p-5 border space-y-4">
              <p className="text-sm font-medium text-center">Ciclo de Vida do Pagamento</p>
              <div className="flex flex-col items-center gap-2 text-sm">
                <div className="flex items-center gap-3 w-full justify-center">
                  <div className="bg-card border rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm">
                    <Receipt className="h-4 w-4 text-primary" />
                    <span className="font-medium">Vendedor registra pagamento</span>
                  </div>
                </div>
                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                <div className="bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg px-4 py-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium text-yellow-800 dark:text-yellow-300">Status: Aguardando</span>
                </div>
                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                <div className="bg-card border rounded-lg px-4 py-2 flex items-center gap-2 shadow-sm">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span className="font-medium">Financeiro analisa</span>
                </div>
                <ArrowDown className="h-5 w-5 text-muted-foreground" />
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg px-4 py-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-300">Aprovado</span>
                  </div>
                  <span className="text-muted-foreground text-sm">ou</span>
                  <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg px-4 py-2 flex items-center gap-2">
                    <Ban className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-red-800 dark:text-red-300">Rejeitado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 10 - Tela de Pagamentos Pendentes */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">10</Badge>
              <h3 className="font-semibold text-lg">Tela: Pagamentos Pendentes (Financeiro)</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Acesse <strong>Financeiro → Pagamentos Pendentes</strong>. Esta tela mostra todos os pagamentos aguardando aprovação, agrupados por pedido.
            </p>

            {/* Simulação da tela */}
            <div className="ml-9 border-2 border-dashed border-primary/30 rounded-xl p-5 bg-card space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <FileCheck className="h-5 w-5" />
                <span>Tela: Pagamentos Pendentes</span>
              </div>
              {/* Simulação de card de pedido */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#1234</Badge>
                    <span className="font-medium">Cliente Exemplo Ltda</span>
                  </div>
                  <span className="text-muted-foreground">Valor Total: R$ 5.000,00</span>
                </div>
                <div className="p-3 space-y-2">
                  {/* Linha de pagamento */}
                  <div className="flex items-center justify-between text-sm bg-muted/50 rounded p-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">Aguardando</Badge>
                      <span>Entrada — PIX</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">R$ 2.500,00</span>
                      <div className="flex gap-1">
                        <div className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded px-2 py-1 text-xs font-medium cursor-pointer">✓ Aprovar</div>
                        <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded px-2 py-1 text-xs font-medium cursor-pointer">✕ Rejeitar</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center">
                Clique em "Aprovar" para confirmar ou "Rejeitar" informando o motivo
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 11 - Estorno */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">11</Badge>
              <h3 className="font-semibold text-lg">Estornar um Pagamento</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Pagamentos já aprovados podem ser <strong>estornados</strong> caso necessário (devolução, erro, etc.). O estorno exige um <strong>motivo obrigatório</strong> e é registrado no histórico.
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-primary" />
                <span>Acesse o pedido → aba de pagamentos → botão <strong>"Estornar"</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-primary" />
                <span>Informe o <strong>motivo do estorno</strong> (campo obrigatório)</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span>O valor estornado volta a ficar <strong>disponível</strong> no saldo do pedido</span>
              </div>
            </div>
            <Alert className="ml-9">
              <Info className="h-4 w-4" />
              <AlertTitle>Comissões</AlertTitle>
              <AlertDescription>
                Ao estornar um pagamento, as <strong>comissões</strong> vinculadas a ele são automaticamente recalculadas.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Passo 12 - Histórico Financeiro */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">12</Badge>
              <h3 className="font-semibold text-lg">Histórico Financeiro</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Acesse <strong>Financeiro → Histórico</strong> para ver todos os pagamentos realizados com filtros por status, período e cliente.
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <p className="font-medium">Informações disponíveis no histórico:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Data e valor de cada pagamento</li>
                <li>Forma de pagamento (PIX, Cartão, Boleto, Dinheiro)</li>
                <li>Status atual (Aprovado, Rejeitado, Aguardando, Estornado)</li>
                <li>Quem registrou e quem aprovou/rejeitou</li>
                <li>Comprovante anexado (quando disponível)</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Passo 13 - Dicas */}
          <Alert className="border-primary/30">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Dicas sobre Pagamentos</AlertTitle>
            <AlertDescription className="space-y-2 text-sm">
              <p>• <strong>Boletos parcelados:</strong> Selecione "Boleto" e registre cada parcela individualmente com sua data de vencimento.</p>
              <p>• <strong>Pagamento automático:</strong> Ao criar o pedido, um pagamento de quitação é gerado automaticamente. Conforme parciais são aprovadas, esse valor é atualizado.</p>
              <p>• <strong>Permissões:</strong> Apenas usuários com perfil <strong>Financeiro</strong> ou <strong>Admin</strong> podem aprovar, rejeitar e estornar pagamentos.</p>
              <p>• <strong>Comprovante:</strong> Sempre anexe o comprovante ao registrar um PIX ou transferência — facilita a aprovação pelo financeiro.</p>
            </AlertDescription>
          </Alert>

          <Separator />

          {/* Passo 14 - Fluxo Completo */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">13</Badge>
              <h3 className="font-semibold text-lg">Fluxo Completo do Pedido</h3>
            </div>
            <div className="ml-9 bg-muted rounded-lg p-4 border">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">Rascunho</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="secondary">Pendente</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="secondary">Aprovado</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="secondary">Em Produção</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="secondary">Pronto</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge className="bg-green-100 text-green-800">Entregue</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Cada mudança de status é registrada no histórico do pedido com data, hora e usuário responsável.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======================== GRADES PARA PROVA ======================== */}
      <Card>
        <CardHeader className="bg-purple-50 dark:bg-purple-950">
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-purple-600" />
            Tutorial: Grades para Prova
          </CardTitle>
          <CardDescription>Como emprestar e controlar grades de mostruário para clientes</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Passo 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">1</Badge>
              <h3 className="font-semibold text-lg">O que são Grades para Prova?</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              As grades para prova são <strong>mostruários</strong> emprestados aos clientes para que possam avaliar os produtos antes de fazer um pedido. O sistema controla todo o ciclo de empréstimo e devolução.
            </p>
          </div>

          <Separator />

          {/* Passo 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">2</Badge>
              <h3 className="font-semibold text-lg">Registrar um Novo Empréstimo</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Acesse <strong>Vendas → Grades para Prova</strong> e clique em <strong>"Novo Empréstimo"</strong>.
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <p className="font-medium">Campos do formulário:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Cliente</strong> — Busque pelo nome ou pelo contato/responsável</li>
                <li><strong>Vendedor</strong> — Responsável pelo empréstimo</li>
                <li><strong>Data de Empréstimo</strong> — Quando a grade será enviada</li>
                <li><strong>Previsão de Devolução</strong> — Prazo para o cliente devolver</li>
                <li><strong>Observações</strong> — Informações adicionais sobre o empréstimo</li>
              </ul>
            </div>
          </div>

          <Separator />

          {/* Passo 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">3</Badge>
              <h3 className="font-semibold text-lg">Adicionar Itens ao Empréstimo</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Adicione os itens que compõem a grade emprestada, informando descrição, quantidade e tamanhos disponíveis.
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <span><strong>Descrição</strong> — Ex: "Camiseta Polo Masculina"</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span><strong>Quantidade</strong> — Número de peças emprestadas</span>
              </div>
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-primary" />
                <span><strong>Tamanhos</strong> — Especifique quais tamanhos estão na grade</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">4</Badge>
              <h3 className="font-semibold text-lg">Imprimir Ficha de Empréstimo</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Após criar o empréstimo, clique no botão <strong>"Imprimir"</strong> para gerar a ficha de controle. O cliente assina o documento confirmando o recebimento das peças.
            </p>
          </div>

          <Separator />

          {/* Passo 5 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">5</Badge>
              <h3 className="font-semibold text-lg">Registrar Devolução</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Quando o cliente devolver a grade, clique em <strong>"Registrar Devolução"</strong> no empréstimo correspondente.
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <p className="font-medium">Na devolução você pode:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Informar a <strong>quantidade devolvida</strong> de cada item</li>
                <li>Registrar <strong>problemas</strong> encontrados nas peças (defeito, peça faltante, etc.)</li>
                <li>Adicionar <strong>observações</strong> sobre a devolução</li>
              </ul>
            </div>
            <Alert className="ml-9">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Empréstimos Vencidos</AlertTitle>
              <AlertDescription>
                Empréstimos que ultrapassam a data prevista de devolução são destacados em vermelho na lista, facilitando o controle de peças em atraso.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Passo 6 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">6</Badge>
              <h3 className="font-semibold text-lg">Status do Empréstimo</h3>
            </div>
            <div className="ml-9 bg-muted rounded-lg p-4 border">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="secondary">Emprestado</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge className="bg-green-100 text-green-800">Devolvido</Badge>
                <span className="text-muted-foreground mx-2">ou</span>
                <Badge variant="secondary">Emprestado</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge className="bg-yellow-100 text-yellow-800">Devolvido Parcialmente</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======================== ENTREGA DE PEDIDOS ======================== */}
      <Card>
        <CardHeader className="bg-orange-50 dark:bg-orange-950">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-orange-600" />
            Tutorial: Entrega de Pedidos
          </CardTitle>
          <CardDescription>Como gerenciar e controlar entregas no módulo Atendimento</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Passo 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">1</Badge>
              <h3 className="font-semibold text-lg">Acessar a Tela de Entregas</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              No menu lateral, clique em <strong>Atendimento → Entrega de Pedidos</strong>. Esta tela centraliza todos os pedidos que precisam ser entregues, com indicadores visuais de urgência.
            </p>
          </div>

          <Separator />

          {/* Passo 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">2</Badge>
              <h3 className="font-semibold text-lg">Entender os Indicadores Visuais</h3>
            </div>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-destructive" />
                <span><strong>Vermelho — Atrasado</strong>: A data de entrega já passou</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-orange-500" />
                <span><strong>Laranja — Entrega Hoje</strong>: O pedido precisa ser entregue hoje</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-yellow-500" />
                <span><strong>Amarelo — Próximo</strong>: Entrega nos próximos 3 dias</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span><strong>Verde — Normal</strong>: Entrega com mais de 3 dias de prazo</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-muted-foreground" />
                <span><strong>Cinza — Sem Data</strong>: Nenhuma data de entrega definida</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">3</Badge>
              <h3 className="font-semibold text-lg">Filtrar Pedidos para Entrega</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              Use os filtros disponíveis para organizar a visualização:
            </p>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <span><strong>Cliente</strong> — Filtre por cliente específico</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span><strong>Vendedor</strong> — Veja pedidos de um vendedor específico</span>
              </div>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <span><strong>Status</strong> — Filtre por status (Pronto, Em Produção, etc.)</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span><strong>Período</strong> — 1 dia, 14 dias, 30 dias ou máximo</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span><strong>Mostrar Entregues</strong> — Inclua pedidos já entregues na lista</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">4</Badge>
              <h3 className="font-semibold text-lg">Painel de Estatísticas</h3>
            </div>
            <p className="text-sm text-muted-foreground ml-9">
              No topo da tela, cards resumem a situação atual:
            </p>
            <div className="ml-9 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-muted rounded-lg p-3 border text-center">
                <p className="font-bold text-lg text-primary">—</p>
                <p className="text-muted-foreground text-xs">Pendentes</p>
              </div>
              <div className="bg-muted rounded-lg p-3 border text-center">
                <p className="font-bold text-lg text-destructive">—</p>
                <p className="text-muted-foreground text-xs">Atrasados</p>
              </div>
              <div className="bg-muted rounded-lg p-3 border text-center">
                <p className="font-bold text-lg text-yellow-600">—</p>
                <p className="text-muted-foreground text-xs">Pgto. Pendente</p>
              </div>
              <div className="bg-muted rounded-lg p-3 border text-center">
                <p className="font-bold text-lg text-green-600">—</p>
                <p className="text-muted-foreground text-xs">Prontos p/ Entrega</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Passo 5 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 font-bold">5</Badge>
              <h3 className="font-semibold text-lg">Ações em cada Pedido</h3>
            </div>
            <div className="ml-9 bg-muted rounded-lg p-4 border text-sm space-y-2">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                <span><strong>Ver Detalhes</strong> — Acesse a ficha completa do pedido</span>
              </div>
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-primary" />
                <span><strong>Alterar Status</strong> — Marque como entregue ou atualize o status</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span><strong>Status do Pagamento</strong> — Verifique se o pagamento está em dia</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dicas */}
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Dicas Importantes</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>• Priorize os pedidos marcados em <strong>vermelho</strong> (atrasados) e <strong>laranja</strong> (entrega hoje).</p>
              <p>• Sempre verifique o <strong>status do pagamento</strong> antes de liberar a entrega.</p>
              <p>• Use o filtro "Prontos para Entrega" para ver apenas os pedidos que já podem ser despachados.</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
