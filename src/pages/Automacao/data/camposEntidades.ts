// Mapeamento de campos disponíveis por tipo de entidade
// Usado para popular os selects de condição de forma contextual

export interface CampoEntidade {
  field: string;
  label: string;
  type: 'select' | 'number' | 'text' | 'boolean' | 'date';
  options?: string[];
  category?: string; // Para agrupar campos no select
}

// ============================================
// CAMPOS POR ENTIDADE
// ============================================

export const camposEntidades: Record<string, CampoEntidade[]> = {
  pedido: [
    // Status e Etapas
    { 
      field: 'status', 
      label: 'Status do Pedido', 
      type: 'select', 
      options: ['orcamento', 'pendente', 'aprovado', 'em_producao', 'pronto', 'enviado', 'entregue', 'cancelado'],
      category: 'Status'
    },
    { 
      field: 'status_pagamento', 
      label: 'Status do Pagamento', 
      type: 'select', 
      options: ['pendente', 'parcial', 'pago'],
      category: 'Status'
    },
    { 
      field: 'origem', 
      label: 'Origem', 
      type: 'select', 
      options: ['comercial', 'ecommerce'],
      category: 'Status'
    },
    { 
      field: 'requer_aprovacao_preco', 
      label: 'Requer Aprovação de Preço', 
      type: 'boolean',
      category: 'Status'
    },
    { 
      field: 'imagem_aprovada', 
      label: 'Imagem Aprovada', 
      type: 'boolean',
      category: 'Status'
    },
    
    // Valores
    { 
      field: 'valor_total', 
      label: 'Valor Total (R$)', 
      type: 'number',
      category: 'Valores'
    },
    { 
      field: 'numero_pedido', 
      label: 'Número do Pedido', 
      type: 'number',
      category: 'Valores'
    },
    
    // Datas
    { 
      field: 'data_pedido', 
      label: 'Data do Pedido', 
      type: 'date',
      category: 'Datas'
    },
    { 
      field: 'data_entrega', 
      label: 'Data de Entrega', 
      type: 'date',
      category: 'Datas'
    },
    
    // Texto
    { 
      field: 'observacao', 
      label: 'Observação', 
      type: 'text',
      category: 'Texto'
    },
  ],
  
  lead: [
    // Status
    { 
      field: 'status', 
      label: 'Status do Lead', 
      type: 'select', 
      options: ['novo', 'em_contato', 'qualificado', 'negociacao', 'convertido', 'perdido'],
      category: 'Status'
    },
    
    // Contato
    { 
      field: 'nome', 
      label: 'Nome', 
      type: 'text',
      category: 'Contato'
    },
    { 
      field: 'email', 
      label: 'Email', 
      type: 'text',
      category: 'Contato'
    },
    { 
      field: 'telefone', 
      label: 'Telefone', 
      type: 'text',
      category: 'Contato'
    },
    { 
      field: 'whatsapp', 
      label: 'WhatsApp', 
      type: 'text',
      category: 'Contato'
    },
    
    // Origem e Segmento
    { 
      field: 'origem', 
      label: 'Origem', 
      type: 'text',
      category: 'Classificação'
    },
    { 
      field: 'segmento_id', 
      label: 'Segmento', 
      type: 'text',
      category: 'Classificação'
    },
    
    // Datas
    { 
      field: 'data_retorno', 
      label: 'Data de Retorno', 
      type: 'date',
      category: 'Datas'
    },
    { 
      field: 'data_conversao', 
      label: 'Data de Conversão', 
      type: 'date',
      category: 'Datas'
    },
    
    // Texto
    { 
      field: 'observacao', 
      label: 'Observação', 
      type: 'text',
      category: 'Texto'
    },
  ],
  
  order: [
    // Status
    { 
      field: 'status', 
      label: 'Status do Pedido', 
      type: 'select', 
      options: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      category: 'Status'
    },
    { 
      field: 'status_envio', 
      label: 'Status do Envio', 
      type: 'select', 
      options: ['aguardando_nf', 'nf_emitida', 'despachado', 'em_transito', 'entregue', 'extravio', 'devolvido'],
      category: 'Status'
    },
    { 
      field: 'wbuy_status_code', 
      label: 'Código Status WBuy', 
      type: 'select', 
      options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
      category: 'Status'
    },
    
    // Logística
    { 
      field: 'carrier', 
      label: 'Transportadora', 
      type: 'text',
      category: 'Logística'
    },
    { 
      field: 'tracking_code', 
      label: 'Código de Rastreio', 
      type: 'text',
      category: 'Logística'
    },
    { 
      field: 'has_tracking', 
      label: 'Tem Rastreio?', 
      type: 'boolean',
      category: 'Logística'
    },
    { 
      field: 'chave_nfe', 
      label: 'Chave NF-e', 
      type: 'text',
      category: 'Logística'
    },
    
    // Valores
    { 
      field: 'total', 
      label: 'Valor Total (R$)', 
      type: 'number',
      category: 'Valores'
    },
    { 
      field: 'order_number', 
      label: 'Número do Pedido', 
      type: 'text',
      category: 'Valores'
    },
    
    // Cliente
    { 
      field: 'customer_name', 
      label: 'Nome do Cliente', 
      type: 'text',
      category: 'Cliente'
    },
    { 
      field: 'customer_email', 
      label: 'Email do Cliente', 
      type: 'text',
      category: 'Cliente'
    },
    { 
      field: 'customer_phone', 
      label: 'Telefone do Cliente', 
      type: 'text',
      category: 'Cliente'
    },
    { 
      field: 'shipping_address', 
      label: 'Endereço de Entrega', 
      type: 'text',
      category: 'Cliente'
    },
    
    // Datas
    { 
      field: 'created_at', 
      label: 'Data do Pedido', 
      type: 'date',
      category: 'Datas'
    },
    { 
      field: 'delivery_estimate', 
      label: 'Previsão de Entrega', 
      type: 'date',
      category: 'Datas'
    },
    { 
      field: 'data_despacho', 
      label: 'Data de Despacho', 
      type: 'date',
      category: 'Datas'
    },
  ],
  
  whatsapp_conversation: [
    // Status
    { 
      field: 'status', 
      label: 'Status da Conversa', 
      type: 'select', 
      options: ['aberta', 'em_atendimento', 'finalizada'],
      category: 'Status'
    },
    
    // Contato
    { 
      field: 'contact_name', 
      label: 'Nome do Contato', 
      type: 'text',
      category: 'Contato'
    },
    { 
      field: 'contact_phone', 
      label: 'Telefone do Contato', 
      type: 'text',
      category: 'Contato'
    },
    
    // Métricas
    { 
      field: 'unread_count', 
      label: 'Mensagens Não Lidas', 
      type: 'number',
      category: 'Métricas'
    },
    { 
      field: 'has_unread', 
      label: 'Tem Não Lidas?', 
      type: 'boolean',
      category: 'Métricas'
    },
  ],
};

// ============================================
// CONDIÇÕES ESPECIAIS POR TIPO
// ============================================

export interface CondicaoEspecial {
  subtype: string;
  label: string;
  description: string;
  icon?: string;
  category: string;
  appliesTo: string[]; // Entidades que suportam esta condição
  configFields?: {
    field: string;
    label: string;
    type: 'number' | 'select' | 'text';
    options?: string[];
    placeholder?: string;
    suffix?: string;
  }[];
}

export const condicoesEspeciais: CondicaoEspecial[] = [
  // CONDIÇÕES DE TEMPO
  {
    subtype: 'time_elapsed',
    label: 'Tempo Decorrido',
    description: 'Verifica se passou X tempo desde a criação ou última atualização',
    category: 'Tempo',
    appliesTo: ['pedido', 'lead', 'order', 'whatsapp_conversation'],
    configFields: [
      { field: 'timeValue', label: 'Tempo', type: 'number', placeholder: '1' },
      { field: 'timeUnit', label: 'Unidade', type: 'select', options: ['minutos', 'horas', 'dias'] },
      { field: 'since', label: 'Desde', type: 'select', options: ['criacao', 'ultima_atualizacao'] },
    ]
  },
  {
    subtype: 'business_hours',
    label: 'Horário Comercial',
    description: 'Verifica se está dentro do horário comercial',
    category: 'Tempo',
    appliesTo: ['pedido', 'lead', 'order', 'whatsapp_conversation'],
    configFields: [
      { field: 'startHour', label: 'Início', type: 'select', options: ['06:00', '07:00', '08:00', '09:00', '10:00'] },
      { field: 'endHour', label: 'Fim', type: 'select', options: ['17:00', '18:00', '19:00', '20:00', '21:00', '22:00'] },
    ]
  },
  {
    subtype: 'weekday',
    label: 'Dia da Semana',
    description: 'Verifica se é um dia específico (útil, fim de semana, etc.)',
    category: 'Tempo',
    appliesTo: ['pedido', 'lead', 'order', 'whatsapp_conversation'],
    configFields: [
      { field: 'dayType', label: 'Tipo', type: 'select', options: ['dia_util', 'fim_de_semana', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'] },
    ]
  },
  {
    subtype: 'date_passed',
    label: 'Data Passou',
    description: 'Verifica se uma data específica já passou (ex: prazo de entrega)',
    category: 'Tempo',
    appliesTo: ['pedido', 'order'],
    configFields: [
      { field: 'dateField', label: 'Campo de Data', type: 'select', options: ['data_entrega', 'delivery_estimate', 'data_pedido'] },
      { field: 'margin', label: 'Margem (dias)', type: 'number', placeholder: '0' },
    ]
  },
  
  // CONDIÇÕES DE INTERAÇÃO
  {
    subtype: 'customer_replied',
    label: 'Cliente Respondeu',
    description: 'Verifica se o cliente respondeu após última mensagem do atendente',
    category: 'Interação',
    appliesTo: ['whatsapp_conversation'],
  },
  {
    subtype: 'no_reply_timeout',
    label: 'Sem Resposta',
    description: 'Verifica se não houve resposta em X tempo',
    category: 'Interação',
    appliesTo: ['whatsapp_conversation', 'lead'],
    configFields: [
      { field: 'timeValue', label: 'Tempo', type: 'number', placeholder: '24' },
      { field: 'timeUnit', label: 'Unidade', type: 'select', options: ['horas', 'dias'] },
    ]
  },
  {
    subtype: 'last_interaction',
    label: 'Última Interação',
    description: 'Tempo desde a última interação com o lead',
    category: 'Interação',
    appliesTo: ['lead'],
    configFields: [
      { field: 'operator', label: 'Condição', type: 'select', options: ['mais_de', 'menos_de'] },
      { field: 'timeValue', label: 'Tempo', type: 'number', placeholder: '7' },
      { field: 'timeUnit', label: 'Unidade', type: 'select', options: ['dias', 'horas'] },
    ]
  },
  
  // CONDIÇÕES DE VALOR
  {
    subtype: 'value_range',
    label: 'Faixa de Valor',
    description: 'Verifica se o valor está em uma faixa específica',
    category: 'Valor',
    appliesTo: ['pedido', 'order'],
    configFields: [
      { field: 'minValue', label: 'Valor Mínimo', type: 'number', placeholder: '0', suffix: 'R$' },
      { field: 'maxValue', label: 'Valor Máximo', type: 'number', placeholder: '1000', suffix: 'R$' },
    ]
  },
  {
    subtype: 'has_discount',
    label: 'Tem Desconto',
    description: 'Verifica se foi aplicado desconto no pedido',
    category: 'Valor',
    appliesTo: ['pedido'],
  },
  
  // CONDIÇÕES DE RELACIONAMENTO
  {
    subtype: 'returning_customer',
    label: 'Cliente Recorrente',
    description: 'Verifica se o cliente já fez pedidos anteriores',
    category: 'Relacionamento',
    appliesTo: ['pedido', 'order'],
    configFields: [
      { field: 'minOrders', label: 'Mínimo de Pedidos', type: 'number', placeholder: '1' },
    ]
  },
  {
    subtype: 'customer_segment',
    label: 'Segmento do Cliente',
    description: 'Verifica se o cliente pertence a um segmento específico',
    category: 'Relacionamento',
    appliesTo: ['pedido', 'lead'],
    configFields: [
      { field: 'segmentName', label: 'Segmento', type: 'text', placeholder: 'Nome do segmento' },
    ]
  },
  
  // CONDIÇÕES DE LOGÍSTICA (E-commerce)
  {
    subtype: 'delivery_delayed',
    label: 'Entrega Atrasada',
    description: 'Verifica se a entrega está atrasada em relação à estimativa',
    category: 'Logística',
    appliesTo: ['order'],
    configFields: [
      { field: 'delayDays', label: 'Dias de Atraso', type: 'number', placeholder: '1' },
    ]
  },
  {
    subtype: 'carrier_check',
    label: 'Verificar Transportadora',
    description: 'Verifica se o pedido está com uma transportadora específica',
    category: 'Logística',
    appliesTo: ['order'],
    configFields: [
      { field: 'carrier', label: 'Transportadora', type: 'text', placeholder: 'Correios, Jadlog, etc.' },
    ]
  },
  {
    subtype: 'tracking_status',
    label: 'Status do Rastreio',
    description: 'Verifica se tem código de rastreio cadastrado',
    category: 'Logística',
    appliesTo: ['order'],
    configFields: [
      { field: 'hasTracking', label: 'Condição', type: 'select', options: ['tem_rastreio', 'sem_rastreio'] },
    ]
  },
];

// ============================================
// MAPPERS E HELPERS
// ============================================

// Mapeia subtipo de trigger para tipo de entidade
export const triggerToEntityMap: Record<string, string> = {
  // Pedidos comerciais
  'order_created': 'pedido',
  'order_status_changed': 'pedido',
  'pedido_novo': 'pedido',
  'pedido_status_changed': 'pedido',
  
  // Leads
  'lead_created': 'lead',
  'lead_status_changed': 'lead',
  'lead_novo': 'lead',
  
  // E-commerce
  'ecommerce_order_created': 'order',
  'ecommerce_order_status_changed': 'order',
  
  // WhatsApp
  'whatsapp_message': 'whatsapp_conversation',
  'whatsapp_message_received': 'whatsapp_conversation',
  'whatsapp_new_lead': 'whatsapp_conversation',
  'whatsapp_inactive': 'whatsapp_conversation',
};

// Helper para obter campos disponíveis para um tipo de entidade
export const getCamposParaEntidade = (entityType: string | null): CampoEntidade[] => {
  if (!entityType) return [];
  return camposEntidades[entityType] || [];
};

// Helper para obter tipo de entidade a partir do subtipo do trigger
export const getEntityTypeFromTrigger = (triggerSubtype: string | null): string | null => {
  if (!triggerSubtype) return null;
  return triggerToEntityMap[triggerSubtype] || null;
};

// Helper para obter condições especiais para um tipo de entidade
export const getCondicoesEspeciaisParaEntidade = (entityType: string | null): CondicaoEspecial[] => {
  if (!entityType) return condicoesEspeciais;
  return condicoesEspeciais.filter(c => c.appliesTo.includes(entityType));
};

// Helper para obter campos agrupados por categoria
export const getCamposAgrupados = (entityType: string | null): Record<string, CampoEntidade[]> => {
  const campos = getCamposParaEntidade(entityType);
  return campos.reduce((acc, campo) => {
    const category = campo.category || 'Outros';
    if (!acc[category]) acc[category] = [];
    acc[category].push(campo);
    return acc;
  }, {} as Record<string, CampoEntidade[]>);
};

// Labels amigáveis para os operadores
export const operatorLabels: Record<string, string> = {
  equals: 'é igual a',
  not_equals: 'é diferente de',
  contains: 'contém',
  not_contains: 'não contém',
  greater: 'é maior que',
  greater_equals: 'é maior ou igual a',
  less: 'é menor que',
  less_equals: 'é menor ou igual a',
  is_empty: 'está vazio',
  is_not_empty: 'não está vazio',
  starts_with: 'começa com',
  ends_with: 'termina com',
  before: 'é antes de',
  after: 'é depois de',
  between: 'está entre',
};

// Operadores disponíveis por tipo de campo
export const operadoresPorTipo: Record<string, string[]> = {
  select: ['equals', 'not_equals'],
  text: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty'],
  number: ['equals', 'not_equals', 'greater', 'greater_equals', 'less', 'less_equals', 'between'],
  boolean: ['equals'],
  date: ['equals', 'before', 'after', 'between'],
};

// Labels para categorias de condições especiais
export const categoryIcons: Record<string, string> = {
  'Tempo': '⏰',
  'Interação': '💬',
  'Valor': '💰',
  'Relacionamento': '🤝',
  'Logística': '📦',
};
