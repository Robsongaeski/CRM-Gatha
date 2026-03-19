// Fluxos de exemplo para testar o construtor de automações
// Estes fluxos demonstram cenários reais de uso e são FUNCIONAIS

import { Node, Edge } from '@xyflow/react';

export interface FluxoExemplo {
  id: string;
  nome: string;
  descricao: string;
  tipo: 'ecommerce' | 'leads' | 'whatsapp' | 'comercial' | 'geral';
  nodes: Node[];
  edges: Edge[];
}

// ============================================
// FLUXO 01: Pedido Ecommerce - Aprovado/Pendente
// ============================================
export const fluxoPedidoAprovadoPendente: FluxoExemplo = {
  id: 'exemplo-pedido-aprovado-pendente',
  nome: 'Fluxo Pedido Aprovado/Pendente',
  descricao: 'Fluxo completo para pedidos aprovados ou pendentes com mensagens automáticas e controle de status. Sai automaticamente se cancelado.',
  tipo: 'ecommerce',
  nodes: [
    // Gatilho
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 50 },
      data: {
        label: 'Novo Pedido Ecommerce',
        subtype: 'order_created',
        config: {}
      }
    },
    // Condição: Status Aprovado?
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 400, y: 180 },
      data: {
        label: 'Status é Aprovado?',
        subtype: 'field_equals',
        config: {
          field: 'status',
          operator: 'equals',
          value: 'aprovado'
        }
      }
    },
    // RAMO APROVADO (esquerda)
    {
      id: 'action-tag-aprovado',
      type: 'action',
      position: { x: 150, y: 320 },
      data: {
        label: 'Tag: Pedido Aprovado',
        subtype: 'add_tag',
        config: {
          tag_name: 'pedido-aprovado',
          tag_color: '#22c55e'
        }
      }
    },
    {
      id: 'delay-aprovado-1',
      type: 'control',
      position: { x: 150, y: 440 },
      data: {
        label: 'Aguardar 10 minutos',
        subtype: 'delay',
        config: {
          amount: 10,
          unit: 'minutes'
        }
      }
    },
    {
      id: 'action-whatsapp-aprovado',
      type: 'action',
      position: { x: 150, y: 560 },
      data: {
        label: 'WhatsApp: Confirmação',
        subtype: 'send_whatsapp',
        config: {
          randomMessages: true,
          messages: [
            '🎉 Olá {nome}! Seu pedido #{numero_pedido} foi aprovado! Em breve começaremos a produção. Acompanhe por aqui!',
            '✅ {nome}, confirmamos seu pedido #{numero_pedido}! Nossa equipe já está preparando tudo para você!',
            '🌟 Oba! Pedido #{numero_pedido} aprovado, {nome}! Logo mais você receberá atualizações sobre a produção.',
            '👍 {nome}, seu pedido #{numero_pedido} está confirmado! Fique de olho nas próximas mensagens para acompanhar o status!'
          ]
        }
      }
    },
    {
      id: 'condition-producao',
      type: 'condition',
      position: { x: 150, y: 700 },
      data: {
        label: 'Aguardar Status: Em Produção',
        subtype: 'wait_for_status',
        config: {
          targetStatus: 'em_producao',
          timeout: 72,
          timeoutUnit: 'hours'
        }
      }
    },
    {
      id: 'action-email-producao',
      type: 'action',
      position: { x: 150, y: 840 },
      data: {
        label: 'Email: Produção Iniciada',
        subtype: 'send_email',
        config: {
          subject: '🏭 Seu pedido #{numero_pedido} entrou em produção!',
          body: `Olá {nome}!

Temos ótimas notícias! Seu pedido #{numero_pedido} acabou de entrar em produção.

Nossa equipe está trabalhando com todo carinho para entregar um produto de qualidade.

Você receberá uma nova atualização quando o pedido estiver pronto para envio.

Obrigado por confiar em nós!

Atenciosamente,
Equipe de Produção`
        }
      }
    },
    // RAMO PENDENTE (direita)
    {
      id: 'action-tag-pendente',
      type: 'action',
      position: { x: 650, y: 320 },
      data: {
        label: 'Tag: Pedido Pendente',
        subtype: 'add_tag',
        config: {
          tag_name: 'pedido-pendente',
          tag_color: '#f59e0b'
        }
      }
    },
    {
      id: 'delay-pendente-1',
      type: 'control',
      position: { x: 650, y: 440 },
      data: {
        label: 'Aguardar 10 minutos',
        subtype: 'delay',
        config: {
          amount: 10,
          unit: 'minutes'
        }
      }
    },
    {
      id: 'action-whatsapp-pendente',
      type: 'action',
      position: { x: 650, y: 560 },
      data: {
        label: 'WhatsApp: Lembrete Pagamento',
        subtype: 'send_whatsapp',
        config: {
          randomMessages: true,
          messages: [
            '⏳ Olá {nome}! Notamos que seu pedido #{numero_pedido} está pendente. Finalize o pagamento para garantir sua compra!',
            '💳 {nome}, seu pedido #{numero_pedido} aguarda confirmação de pagamento. Precisa de ajuda? Estamos aqui!',
            '🔔 Oi {nome}! Lembrete: seu pedido #{numero_pedido} está quase garantido! Complete o pagamento para prosseguirmos.',
            '📦 {nome}, queremos muito enviar seu pedido #{numero_pedido}! Finalize o pagamento e começamos a produção!'
          ]
        }
      }
    },
    // Condição de saída: Cancelado
    {
      id: 'condition-cancelado',
      type: 'condition',
      position: { x: 400, y: 950 },
      data: {
        label: 'Pedido Cancelado?',
        subtype: 'exit_condition',
        config: {
          exitOnStatus: ['cancelado', 'cancelled'],
          description: 'Sai do fluxo se o pedido for cancelado'
        }
      }
    },
    {
      id: 'control-stop',
      type: 'control',
      position: { x: 400, y: 1080 },
      data: {
        label: 'Encerrar Fluxo',
        subtype: 'stop_flow',
        config: {
          reason: 'Fluxo concluído ou pedido cancelado'
        }
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'condition-1', type: 'custom' },
    { id: 'e2', source: 'condition-1', target: 'action-tag-aprovado', sourceHandle: 'yes', type: 'custom' },
    { id: 'e3', source: 'condition-1', target: 'action-tag-pendente', sourceHandle: 'no', type: 'custom' },
    { id: 'e4', source: 'action-tag-aprovado', target: 'delay-aprovado-1', type: 'custom' },
    { id: 'e5', source: 'delay-aprovado-1', target: 'action-whatsapp-aprovado', type: 'custom' },
    { id: 'e6', source: 'action-whatsapp-aprovado', target: 'condition-producao', type: 'custom' },
    { id: 'e7', source: 'condition-producao', target: 'action-email-producao', sourceHandle: 'yes', type: 'custom' },
    { id: 'e8', source: 'action-tag-pendente', target: 'delay-pendente-1', type: 'custom' },
    { id: 'e9', source: 'delay-pendente-1', target: 'action-whatsapp-pendente', type: 'custom' },
    { id: 'e10', source: 'action-email-producao', target: 'condition-cancelado', type: 'custom' },
    { id: 'e11', source: 'action-whatsapp-pendente', target: 'condition-cancelado', type: 'custom' },
    { id: 'e12', source: 'condition-cancelado', target: 'control-stop', sourceHandle: 'yes', type: 'custom' }
  ]
};

// ============================================
// FLUXO 02: Produto Personalizado
// ============================================
export const fluxoProdutoPersonalizado: FluxoExemplo = {
  id: 'exemplo-produto-personalizado',
  nome: 'Fluxo Produto Personalizado',
  descricao: 'Identifica pedidos com produtos personalizados e envia comunicações diferenciadas',
  tipo: 'ecommerce',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 50 },
      data: {
        label: 'Novo Pedido Ecommerce',
        subtype: 'order_created',
        config: {}
      }
    },
    {
      id: 'condition-personalizado',
      type: 'condition',
      position: { x: 400, y: 180 },
      data: {
        label: 'Contém "Personalizado"?',
        subtype: 'field_contains',
        config: {
          field: 'items',
          operator: 'contains',
          value: 'Personalizado',
          caseSensitive: false
        }
      }
    },
    // RAMO PERSONALIZADO (esquerda)
    {
      id: 'action-whatsapp-personalizado',
      type: 'action',
      position: { x: 150, y: 320 },
      data: {
        label: 'WhatsApp: Produto Personalizado',
        subtype: 'send_whatsapp',
        config: {
          randomMessages: true,
          messages: [
            '🎨 Olá {nome}! Vimos que você escolheu um produto personalizado no pedido #{numero_pedido}! Poderia nos enviar a arte ou referência para personalizarmos?',
            '✨ {nome}, que escolha incrível! Seu pedido #{numero_pedido} inclui personalização. Envie os detalhes da arte que deseja para prosseguirmos!'
          ]
        }
      }
    },
    {
      id: 'action-tag-personalizado',
      type: 'action',
      position: { x: 150, y: 450 },
      data: {
        label: 'Tag: Personalizado',
        subtype: 'add_tag',
        config: {
          tag_name: 'personalizado',
          tag_color: '#8b5cf6'
        }
      }
    },
    // RAMO PADRÃO (direita)
    {
      id: 'action-whatsapp-padrao',
      type: 'action',
      position: { x: 650, y: 320 },
      data: {
        label: 'WhatsApp: Confirmação Padrão',
        subtype: 'send_whatsapp',
        config: {
          randomMessages: true,
          messages: [
            '✅ Olá {nome}! Recebemos seu pedido #{numero_pedido}. Nossa equipe já está preparando tudo com muito carinho!',
            '🎉 {nome}, seu pedido #{numero_pedido} foi recebido! Em breve você receberá atualizações sobre o andamento.'
          ]
        }
      }
    },
    {
      id: 'action-email-padrao',
      type: 'action',
      position: { x: 650, y: 450 },
      data: {
        label: 'Email: Confirmação',
        subtype: 'send_email',
        config: {
          subject: '✅ Pedido #{numero_pedido} recebido com sucesso!',
          body: `Olá {nome}!

Seu pedido #{numero_pedido} foi recebido com sucesso!

Você receberá atualizações por aqui e pelo WhatsApp.

Obrigado pela preferência!`
        }
      }
    },
    {
      id: 'control-stop',
      type: 'control',
      position: { x: 400, y: 600 },
      data: {
        label: 'Fim do Fluxo',
        subtype: 'stop_flow',
        config: {}
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'condition-personalizado', type: 'custom' },
    { id: 'e2', source: 'condition-personalizado', target: 'action-whatsapp-personalizado', sourceHandle: 'yes', type: 'custom' },
    { id: 'e3', source: 'condition-personalizado', target: 'action-whatsapp-padrao', sourceHandle: 'no', type: 'custom' },
    { id: 'e4', source: 'action-whatsapp-personalizado', target: 'action-tag-personalizado', type: 'custom' },
    { id: 'e5', source: 'action-whatsapp-padrao', target: 'action-email-padrao', type: 'custom' },
    { id: 'e6', source: 'action-tag-personalizado', target: 'control-stop', type: 'custom' },
    { id: 'e7', source: 'action-email-padrao', target: 'control-stop', type: 'custom' }
  ]
};

// ============================================
// FLUXO 03: Carrinho Abandonado
// ============================================
export const fluxoCarrinhoAbandonado: FluxoExemplo = {
  id: 'exemplo-carrinho-abandonado',
  nome: 'Fluxo Carrinho Abandonado',
  descricao: 'Recupera carrinhos abandonados com sequência de mensagens. Sai automaticamente quando o cliente finaliza a compra.',
  tipo: 'ecommerce',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 50 },
      data: {
        label: 'Carrinho Abandonado',
        subtype: 'order_status_changed',
        config: {
          status: 'carrinho_abandonado'
        }
      }
    },
    // Condição de saída global - verifica antes de cada passo
    {
      id: 'condition-comprou',
      type: 'condition',
      position: { x: 400, y: 180 },
      data: {
        label: 'Cliente Comprou?',
        subtype: 'exit_condition',
        config: {
          exitOnStatus: ['aprovado', 'pago', 'em_producao', 'completed'],
          description: 'Sai do fluxo se o cliente finalizar a compra'
        }
      }
    },
    {
      id: 'delay-1',
      type: 'control',
      position: { x: 400, y: 320 },
      data: {
        label: 'Aguardar 30 minutos',
        subtype: 'delay',
        config: {
          amount: 30,
          unit: 'minutes'
        }
      }
    },
    {
      id: 'action-whatsapp-1',
      type: 'action',
      position: { x: 400, y: 450 },
      data: {
        label: 'WhatsApp: Lembrete 1',
        subtype: 'send_whatsapp',
        config: {
          message: '👋 Oi {nome}! Notamos que você deixou alguns itens no carrinho. Precisa de ajuda para finalizar? Estamos aqui!'
        }
      }
    },
    {
      id: 'delay-2',
      type: 'control',
      position: { x: 400, y: 580 },
      data: {
        label: 'Aguardar 2 horas',
        subtype: 'delay',
        config: {
          amount: 2,
          unit: 'hours'
        }
      }
    },
    {
      id: 'action-whatsapp-2',
      type: 'action',
      position: { x: 400, y: 710 },
      data: {
        label: 'WhatsApp: Lembrete 2 + Desconto',
        subtype: 'send_whatsapp',
        config: {
          message: '🔥 {nome}, seus itens ainda estão esperando por você! Use o cupom VOLTE10 e ganhe 10% de desconto. Válido por 24h!'
        }
      }
    },
    {
      id: 'delay-3',
      type: 'control',
      position: { x: 400, y: 840 },
      data: {
        label: 'Aguardar 24 horas',
        subtype: 'delay',
        config: {
          amount: 24,
          unit: 'hours'
        }
      }
    },
    {
      id: 'action-email-final',
      type: 'action',
      position: { x: 400, y: 970 },
      data: {
        label: 'Email: Última Chance',
        subtype: 'send_email',
        config: {
          subject: '⏰ Última chance! Seus itens vão voltar ao estoque',
          body: `Olá {nome}!

Notamos que você ainda não finalizou sua compra. Os itens do seu carrinho são muito procurados e podem esgotar!

Use o cupom ULTIMACHANCE para 15% de desconto - válido apenas hoje!

Precisa de ajuda? Responda este email!`
        }
      }
    },
    {
      id: 'control-stop',
      type: 'control',
      position: { x: 400, y: 1100 },
      data: {
        label: 'Fim do Fluxo',
        subtype: 'stop_flow',
        config: {}
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'condition-comprou', type: 'custom' },
    { id: 'e2', source: 'condition-comprou', target: 'delay-1', sourceHandle: 'no', type: 'custom' },
    { id: 'e3', source: 'delay-1', target: 'action-whatsapp-1', type: 'custom' },
    { id: 'e4', source: 'action-whatsapp-1', target: 'delay-2', type: 'custom' },
    { id: 'e5', source: 'delay-2', target: 'action-whatsapp-2', type: 'custom' },
    { id: 'e6', source: 'action-whatsapp-2', target: 'delay-3', type: 'custom' },
    { id: 'e7', source: 'delay-3', target: 'action-email-final', type: 'custom' },
    { id: 'e8', source: 'action-email-final', target: 'control-stop', type: 'custom' }
  ]
};

// ============================================
// FLUXO 04: Lead Comercial - Qualificação
// ============================================
export const fluxoLeadQualificacao: FluxoExemplo = {
  id: 'exemplo-lead-qualificacao',
  nome: 'Fluxo Qualificação de Lead',
  descricao: 'Fluxo de nutrição e qualificação de leads comerciais com follow-up automático. Sai quando lead é convertido.',
  tipo: 'leads',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 50 },
      data: {
        label: 'Novo Lead Cadastrado',
        subtype: 'lead_created',
        config: {}
      }
    },
    {
      id: 'action-whatsapp-boas-vindas',
      type: 'action',
      position: { x: 400, y: 180 },
      data: {
        label: 'WhatsApp: Boas-vindas',
        subtype: 'send_whatsapp',
        config: {
          message: '👋 Olá {nome}! Sou do time comercial. Vi que você tem interesse em nossos produtos. Posso te ajudar com alguma informação?'
        }
      }
    },
    {
      id: 'action-notificacao-vendedor',
      type: 'action',
      position: { x: 400, y: 310 },
      data: {
        label: 'Notificar Vendedor',
        subtype: 'create_notification',
        config: {
          message: 'Novo lead cadastrado: {nome}. Entre em contato!',
          link: '/leads/{entity_id}'
        }
      }
    },
    {
      id: 'delay-1',
      type: 'control',
      position: { x: 400, y: 440 },
      data: {
        label: 'Aguardar 1 dia',
        subtype: 'delay',
        config: {
          amount: 1,
          unit: 'days'
        }
      }
    },
    {
      id: 'condition-respondeu',
      type: 'condition',
      position: { x: 400, y: 570 },
      data: {
        label: 'Lead Respondeu?',
        subtype: 'has_interaction',
        config: {
          interactionType: 'whatsapp_reply',
          withinHours: 24
        }
      }
    },
    // RAMO: Respondeu (esquerda)
    {
      id: 'action-update-status-quente',
      type: 'action',
      position: { x: 150, y: 700 },
      data: {
        label: 'Status: Lead Quente',
        subtype: 'update_status',
        config: {
          status: 'quente'
        }
      }
    },
    // RAMO: Não respondeu (direita)
    {
      id: 'action-whatsapp-followup',
      type: 'action',
      position: { x: 650, y: 700 },
      data: {
        label: 'WhatsApp: Follow-up',
        subtype: 'send_whatsapp',
        config: {
          message: '😊 {nome}, tudo bem? Notei que não conseguimos conversar ainda. Que tal agendarmos uma ligação rápida? Qual o melhor horário para você?'
        }
      }
    },
    {
      id: 'delay-2',
      type: 'control',
      position: { x: 650, y: 830 },
      data: {
        label: 'Aguardar 3 dias',
        subtype: 'delay',
        config: {
          amount: 3,
          unit: 'days'
        }
      }
    },
    {
      id: 'action-update-status-frio',
      type: 'action',
      position: { x: 650, y: 960 },
      data: {
        label: 'Status: Lead Frio',
        subtype: 'update_status',
        config: {
          status: 'frio'
        }
      }
    },
    // Condição de saída
    {
      id: 'condition-converteu',
      type: 'condition',
      position: { x: 400, y: 1100 },
      data: {
        label: 'Lead Convertido?',
        subtype: 'exit_condition',
        config: {
          exitOnStatus: ['convertido', 'cliente'],
          description: 'Sai do fluxo quando lead vira cliente'
        }
      }
    },
    {
      id: 'control-stop',
      type: 'control',
      position: { x: 400, y: 1230 },
      data: {
        label: 'Fim do Fluxo',
        subtype: 'stop_flow',
        config: {}
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'action-whatsapp-boas-vindas', type: 'custom' },
    { id: 'e2', source: 'action-whatsapp-boas-vindas', target: 'action-notificacao-vendedor', type: 'custom' },
    { id: 'e3', source: 'action-notificacao-vendedor', target: 'delay-1', type: 'custom' },
    { id: 'e4', source: 'delay-1', target: 'condition-respondeu', type: 'custom' },
    { id: 'e5', source: 'condition-respondeu', target: 'action-update-status-quente', sourceHandle: 'yes', type: 'custom' },
    { id: 'e6', source: 'condition-respondeu', target: 'action-whatsapp-followup', sourceHandle: 'no', type: 'custom' },
    { id: 'e7', source: 'action-whatsapp-followup', target: 'delay-2', type: 'custom' },
    { id: 'e8', source: 'delay-2', target: 'action-update-status-frio', type: 'custom' },
    { id: 'e9', source: 'action-update-status-quente', target: 'condition-converteu', type: 'custom' },
    { id: 'e10', source: 'action-update-status-frio', target: 'condition-converteu', type: 'custom' },
    { id: 'e11', source: 'condition-converteu', target: 'control-stop', sourceHandle: 'yes', type: 'custom' }
  ]
};

// ============================================
// FLUXO 05: Pedido Comercial - Produção
// ============================================
export const fluxoPedidoProducao: FluxoExemplo = {
  id: 'exemplo-pedido-producao',
  nome: 'Fluxo Acompanhamento Produção',
  descricao: 'Acompanha pedidos comerciais durante a produção e notifica cliente sobre cada etapa',
  tipo: 'comercial',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 50 },
      data: {
        label: 'Pedido Entrou em Produção',
        subtype: 'pedido_created',
        config: {
          status: 'em_producao'
        }
      }
    },
    {
      id: 'action-whatsapp-producao',
      type: 'action',
      position: { x: 400, y: 180 },
      data: {
        label: 'WhatsApp: Produção Iniciada',
        subtype: 'send_whatsapp',
        config: {
          randomMessages: true,
          messages: [
            '🏭 {nome}, boas notícias! Seu pedido #{numero_pedido} acabou de entrar na linha de produção!',
            '⚙️ Olá {nome}! O pedido #{numero_pedido} está sendo produzido neste momento. Em breve mais novidades!',
            '🎉 {nome}, seu pedido #{numero_pedido} está em produção! Nossa equipe está caprichando para você!'
          ]
        }
      }
    },
    {
      id: 'condition-etapa-impressao',
      type: 'condition',
      position: { x: 400, y: 340 },
      data: {
        label: 'Aguardar: Etapa Impressão',
        subtype: 'wait_for_stage',
        config: {
          targetStage: 'impressao',
          timeout: 48,
          timeoutUnit: 'hours'
        }
      }
    },
    {
      id: 'action-whatsapp-impressao',
      type: 'action',
      position: { x: 400, y: 480 },
      data: {
        label: 'WhatsApp: Impressão',
        subtype: 'send_whatsapp',
        config: {
          message: '🖨️ {nome}, seu pedido #{numero_pedido} está na etapa de impressão! Já já mostramos o resultado. 😊'
        }
      }
    },
    {
      id: 'condition-etapa-acabamento',
      type: 'condition',
      position: { x: 400, y: 620 },
      data: {
        label: 'Aguardar: Etapa Acabamento',
        subtype: 'wait_for_stage',
        config: {
          targetStage: 'acabamento',
          timeout: 48,
          timeoutUnit: 'hours'
        }
      }
    },
    {
      id: 'action-whatsapp-acabamento',
      type: 'action',
      position: { x: 400, y: 760 },
      data: {
        label: 'WhatsApp: Acabamento',
        subtype: 'send_whatsapp',
        config: {
          message: '✂️ Quase lá, {nome}! Seu pedido #{numero_pedido} está no acabamento. Finalizando os detalhes!'
        }
      }
    },
    {
      id: 'condition-pronto',
      type: 'condition',
      position: { x: 400, y: 900 },
      data: {
        label: 'Aguardar: Pronto para Envio',
        subtype: 'wait_for_stage',
        config: {
          targetStage: 'expedicao',
          timeout: 24,
          timeoutUnit: 'hours'
        }
      }
    },
    {
      id: 'action-whatsapp-pronto',
      type: 'action',
      position: { x: 400, y: 1040 },
      data: {
        label: 'WhatsApp: Pronto!',
        subtype: 'send_whatsapp',
        config: {
          message: '📦 {nome}, seu pedido #{numero_pedido} está PRONTO e será enviado em breve! Você receberá o código de rastreio assim que sair. 🚚'
        }
      }
    },
    {
      id: 'action-email-pronto',
      type: 'action',
      position: { x: 400, y: 1170 },
      data: {
        label: 'Email: Pedido Pronto',
        subtype: 'send_email',
        config: {
          subject: '🎉 Pedido #{numero_pedido} pronto para envio!',
          body: `Olá {nome}!

Temos o prazer de informar que seu pedido #{numero_pedido} está finalizado e será despachado em breve!

Você receberá o código de rastreio assim que o pedido sair para entrega.

Obrigado pela confiança!`
        }
      }
    },
    {
      id: 'control-stop',
      type: 'control',
      position: { x: 400, y: 1300 },
      data: {
        label: 'Fim do Fluxo',
        subtype: 'stop_flow',
        config: {}
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'action-whatsapp-producao', type: 'custom' },
    { id: 'e2', source: 'action-whatsapp-producao', target: 'condition-etapa-impressao', type: 'custom' },
    { id: 'e3', source: 'condition-etapa-impressao', target: 'action-whatsapp-impressao', sourceHandle: 'yes', type: 'custom' },
    { id: 'e4', source: 'action-whatsapp-impressao', target: 'condition-etapa-acabamento', type: 'custom' },
    { id: 'e5', source: 'condition-etapa-acabamento', target: 'action-whatsapp-acabamento', sourceHandle: 'yes', type: 'custom' },
    { id: 'e6', source: 'action-whatsapp-acabamento', target: 'condition-pronto', type: 'custom' },
    { id: 'e7', source: 'condition-pronto', target: 'action-whatsapp-pronto', sourceHandle: 'yes', type: 'custom' },
    { id: 'e8', source: 'action-whatsapp-pronto', target: 'action-email-pronto', type: 'custom' },
    { id: 'e9', source: 'action-email-pronto', target: 'control-stop', type: 'custom' }
  ]
};

// ============================================
// FLUXO 06: WhatsApp - Atendimento Automático
// ============================================
export const fluxoAtendimentoWhatsapp: FluxoExemplo = {
  id: 'exemplo-atendimento-whatsapp',
  nome: 'Fluxo Atendimento WhatsApp',
  descricao: 'Responde automaticamente mensagens recebidas fora do horário comercial e encaminha para atendente',
  tipo: 'whatsapp',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 50 },
      data: {
        label: 'Mensagem Recebida',
        subtype: 'whatsapp_message',
        config: {
          direction: 'incoming'
        }
      }
    },
    {
      id: 'condition-horario',
      type: 'condition',
      position: { x: 400, y: 180 },
      data: {
        label: 'Horário Comercial?',
        subtype: 'time_condition',
        config: {
          startTime: '08:00',
          endTime: '18:00',
          days: ['mon', 'tue', 'wed', 'thu', 'fri']
        }
      }
    },
    // RAMO: Dentro do horário (esquerda)
    {
      id: 'action-notificar-atendente',
      type: 'action',
      position: { x: 150, y: 320 },
      data: {
        label: 'Notificar Atendente',
        subtype: 'create_notification',
        config: {
          message: 'Nova mensagem WhatsApp de {nome}',
          link: '/ecommerce/whatsapp/atendimento'
        }
      }
    },
    // RAMO: Fora do horário (direita)
    {
      id: 'action-whatsapp-ausente',
      type: 'action',
      position: { x: 650, y: 320 },
      data: {
        label: 'WhatsApp: Ausência',
        subtype: 'send_whatsapp',
        config: {
          message: '🌙 Olá! Nosso horário de atendimento é de segunda a sexta, das 8h às 18h. Recebemos sua mensagem e retornaremos assim que possível. Obrigado!'
        }
      }
    },
    {
      id: 'action-tag-fora-horario',
      type: 'action',
      position: { x: 650, y: 450 },
      data: {
        label: 'Tag: Fora do Horário',
        subtype: 'add_tag',
        config: {
          tag_name: 'fora-horario',
          tag_color: '#6b7280'
        }
      }
    },
    {
      id: 'control-schedule',
      type: 'control',
      position: { x: 650, y: 580 },
      data: {
        label: 'Agendar: Próximo Dia Útil',
        subtype: 'schedule',
        config: {
          scheduleType: 'next_business_day',
          time: '08:30'
        }
      }
    },
    {
      id: 'action-notificar-retorno',
      type: 'action',
      position: { x: 650, y: 710 },
      data: {
        label: 'Notificar: Retorno Pendente',
        subtype: 'create_notification',
        config: {
          message: 'Retorno pendente: {nome} enviou mensagem fora do horário.',
          link: '/ecommerce/whatsapp/atendimento'
        }
      }
    },
    {
      id: 'control-stop',
      type: 'control',
      position: { x: 400, y: 850 },
      data: {
        label: 'Fim do Fluxo',
        subtype: 'stop_flow',
        config: {}
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'condition-horario', type: 'custom' },
    { id: 'e2', source: 'condition-horario', target: 'action-notificar-atendente', sourceHandle: 'yes', type: 'custom' },
    { id: 'e3', source: 'condition-horario', target: 'action-whatsapp-ausente', sourceHandle: 'no', type: 'custom' },
    { id: 'e4', source: 'action-whatsapp-ausente', target: 'action-tag-fora-horario', type: 'custom' },
    { id: 'e5', source: 'action-tag-fora-horario', target: 'control-schedule', type: 'custom' },
    { id: 'e6', source: 'control-schedule', target: 'action-notificar-retorno', type: 'custom' },
    { id: 'e7', source: 'action-notificar-atendente', target: 'control-stop', type: 'custom' },
    { id: 'e8', source: 'action-notificar-retorno', target: 'control-stop', type: 'custom' }
  ]
};

// ============================================
// FLUXO 07: Pós-Venda - NPS e Avaliação
// ============================================
export const fluxoPosVendaNPS: FluxoExemplo = {
  id: 'exemplo-pos-venda-nps',
  nome: 'Fluxo Pós-Venda e NPS',
  descricao: 'Coleta feedback do cliente após entrega e solicita avaliação na loja',
  tipo: 'ecommerce',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 50 },
      data: {
        label: 'Pedido Entregue',
        subtype: 'order_status_changed',
        config: {
          status: 'entregue'
        }
      }
    },
    {
      id: 'delay-1',
      type: 'control',
      position: { x: 400, y: 180 },
      data: {
        label: 'Aguardar 2 dias',
        subtype: 'delay',
        config: {
          amount: 2,
          unit: 'days'
        }
      }
    },
    {
      id: 'action-whatsapp-feedback',
      type: 'action',
      position: { x: 400, y: 310 },
      data: {
        label: 'WhatsApp: Solicitar Feedback',
        subtype: 'send_whatsapp',
        config: {
          message: '😊 Olá {nome}! Seu pedido #{numero_pedido} foi entregue. Como foi sua experiência? De 0 a 10, quanto você recomendaria nossa loja?'
        }
      }
    },
    {
      id: 'delay-2',
      type: 'control',
      position: { x: 400, y: 440 },
      data: {
        label: 'Aguardar 1 dia',
        subtype: 'delay',
        config: {
          amount: 1,
          unit: 'days'
        }
      }
    },
    {
      id: 'condition-respondeu',
      type: 'condition',
      position: { x: 400, y: 570 },
      data: {
        label: 'Cliente Respondeu?',
        subtype: 'has_interaction',
        config: {
          interactionType: 'whatsapp_reply',
          withinHours: 24
        }
      }
    },
    // RAMO: Respondeu (esquerda)
    {
      id: 'action-agradecer',
      type: 'action',
      position: { x: 150, y: 700 },
      data: {
        label: 'WhatsApp: Agradecer',
        subtype: 'send_whatsapp',
        config: {
          message: '🙏 Muito obrigado pelo feedback, {nome}! Sua opinião é muito importante para nós.'
        }
      }
    },
    // RAMO: Não respondeu (direita)
    {
      id: 'action-email-avaliacao',
      type: 'action',
      position: { x: 650, y: 700 },
      data: {
        label: 'Email: Solicitar Avaliação',
        subtype: 'send_email',
        config: {
          subject: '⭐ Como foi sua experiência com o pedido #{numero_pedido}?',
          body: `Olá {nome}!

Gostaríamos de saber como foi sua experiência com seu pedido.

Sua avaliação nos ajuda a melhorar cada vez mais!

Obrigado por ser nosso cliente!`
        }
      }
    },
    {
      id: 'control-stop',
      type: 'control',
      position: { x: 400, y: 850 },
      data: {
        label: 'Fim do Fluxo',
        subtype: 'stop_flow',
        config: {}
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'delay-1', type: 'custom' },
    { id: 'e2', source: 'delay-1', target: 'action-whatsapp-feedback', type: 'custom' },
    { id: 'e3', source: 'action-whatsapp-feedback', target: 'delay-2', type: 'custom' },
    { id: 'e4', source: 'delay-2', target: 'condition-respondeu', type: 'custom' },
    { id: 'e5', source: 'condition-respondeu', target: 'action-agradecer', sourceHandle: 'yes', type: 'custom' },
    { id: 'e6', source: 'condition-respondeu', target: 'action-email-avaliacao', sourceHandle: 'no', type: 'custom' },
    { id: 'e7', source: 'action-agradecer', target: 'control-stop', type: 'custom' },
    { id: 'e8', source: 'action-email-avaliacao', target: 'control-stop', type: 'custom' }
  ]
};

// ============================================
// FLUXO 08: Pedido Pendente → Aprovado (Troca de Fluxo)
// ============================================
export const fluxoPendentePagamento: FluxoExemplo = {
  id: 'exemplo-pendente-pagamento',
  nome: 'Fluxo Cobrança Pendente',
  descricao: 'Fluxo de cobrança para pedidos pendentes. SAI AUTOMATICAMENTE quando o pagamento é confirmado (status muda para aprovado)',
  tipo: 'comercial',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 400, y: 50 },
      data: {
        label: 'Pedido Pendente',
        subtype: 'pedido_created',
        config: {
          status: 'pendente'
        }
      }
    },
    // Condição de saída: Pagou
    {
      id: 'condition-pagou',
      type: 'condition',
      position: { x: 400, y: 180 },
      data: {
        label: 'Pagamento Confirmado?',
        subtype: 'exit_condition',
        config: {
          exitOnStatus: ['aprovado', 'pago', 'em_producao'],
          description: 'Sai do fluxo quando pagamento é confirmado'
        }
      }
    },
    {
      id: 'action-tag-pendente',
      type: 'action',
      position: { x: 400, y: 320 },
      data: {
        label: 'Tag: Aguardando Pagamento',
        subtype: 'add_tag',
        config: {
          tag_name: 'aguardando-pagamento',
          tag_color: '#f59e0b'
        }
      }
    },
    {
      id: 'delay-1',
      type: 'control',
      position: { x: 400, y: 450 },
      data: {
        label: 'Aguardar 1 hora',
        subtype: 'delay',
        config: {
          amount: 1,
          unit: 'hours'
        }
      }
    },
    {
      id: 'action-whatsapp-1',
      type: 'action',
      position: { x: 400, y: 580 },
      data: {
        label: 'WhatsApp: Lembrete 1',
        subtype: 'send_whatsapp',
        config: {
          randomMessages: true,
          messages: [
            '💳 Olá {nome}! Seu pedido #{numero_pedido} está aguardando confirmação de pagamento. Precisando de ajuda, é só chamar!',
            '🔔 {nome}, notamos que o pagamento do pedido #{numero_pedido} ainda não foi confirmado. Posso te ajudar com algo?'
          ]
        }
      }
    },
    {
      id: 'delay-2',
      type: 'control',
      position: { x: 400, y: 710 },
      data: {
        label: 'Aguardar 24 horas',
        subtype: 'delay',
        config: {
          amount: 24,
          unit: 'hours'
        }
      }
    },
    {
      id: 'action-whatsapp-2',
      type: 'action',
      position: { x: 400, y: 840 },
      data: {
        label: 'WhatsApp: Lembrete 2',
        subtype: 'send_whatsapp',
        config: {
          message: '⏰ {nome}, seu pedido #{numero_pedido} ainda aguarda pagamento. Lembre-se que reservamos os itens por 48h!'
        }
      }
    },
    {
      id: 'delay-3',
      type: 'control',
      position: { x: 400, y: 970 },
      data: {
        label: 'Aguardar 24 horas',
        subtype: 'delay',
        config: {
          amount: 24,
          unit: 'hours'
        }
      }
    },
    {
      id: 'action-email-final',
      type: 'action',
      position: { x: 400, y: 1100 },
      data: {
        label: 'Email: Último Aviso',
        subtype: 'send_email',
        config: {
          subject: '⚠️ Pedido #{numero_pedido} será cancelado em 24h',
          body: `Olá {nome},

Seu pedido #{numero_pedido} está há mais de 48h aguardando confirmação de pagamento.

Se não recebermos a confirmação nas próximas 24 horas, infelizmente precisaremos cancelar o pedido.

Precisa de ajuda? Responda este email!`
        }
      }
    },
    {
      id: 'control-stop',
      type: 'control',
      position: { x: 400, y: 1230 },
      data: {
        label: 'Fim do Fluxo',
        subtype: 'stop_flow',
        config: {}
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'condition-pagou', type: 'custom' },
    { id: 'e2', source: 'condition-pagou', target: 'action-tag-pendente', sourceHandle: 'no', type: 'custom' },
    { id: 'e3', source: 'action-tag-pendente', target: 'delay-1', type: 'custom' },
    { id: 'e4', source: 'delay-1', target: 'action-whatsapp-1', type: 'custom' },
    { id: 'e5', source: 'action-whatsapp-1', target: 'delay-2', type: 'custom' },
    { id: 'e6', source: 'delay-2', target: 'action-whatsapp-2', type: 'custom' },
    { id: 'e7', source: 'action-whatsapp-2', target: 'delay-3', type: 'custom' },
    { id: 'e8', source: 'delay-3', target: 'action-email-final', type: 'custom' },
    { id: 'e9', source: 'action-email-final', target: 'control-stop', type: 'custom' }
  ]
};

// ============================================
// Lista de todos os fluxos de exemplo
// ============================================
export const fluxosExemplo: FluxoExemplo[] = [
  fluxoPedidoAprovadoPendente,
  fluxoProdutoPersonalizado,
  fluxoCarrinhoAbandonado,
  fluxoLeadQualificacao,
  fluxoPedidoProducao,
  fluxoAtendimentoWhatsapp,
  fluxoPosVendaNPS,
  fluxoPendentePagamento
];

export default fluxosExemplo;
