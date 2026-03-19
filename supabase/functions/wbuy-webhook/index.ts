import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função auxiliar para log de segurança
function logSecurityEvent(type: string, data: Record<string, unknown>) {
  console.log(`[SECURITY] ${type}:`, JSON.stringify(data));
}

// Função robusta para extrair chave NF-e de qualquer formato
function extractChaveNfe(data: any): string | null {
  // Log completo do campo nota_fiscal para debug
  if (data.nota_fiscal !== undefined) {
    console.log('[NF-e] Campo nota_fiscal encontrado:', JSON.stringify(data.nota_fiscal));
  }
  
  // Tentar múltiplos caminhos possíveis
  const possiblePaths = [
    // Formato objeto direto
    data.nota_fiscal?.chaveAcesso,
    data.nota_fiscal?.chave_acesso,
    data.nota_fiscal?.chave,
    data.nota_fiscal?.key,
    
    // Array de notas fiscais (pegar a primeira)
    Array.isArray(data.nota_fiscal) && data.nota_fiscal[0]?.chaveAcesso,
    Array.isArray(data.nota_fiscal) && data.nota_fiscal[0]?.chave_acesso,
    Array.isArray(data.nota_fiscal) && data.nota_fiscal[0]?.chave,
    
    // Campo nfe separado
    data.nfe?.chaveAcesso,
    data.nfe?.chave_acesso,
    data.nfe?.chave,
    
    // Array de nfe
    Array.isArray(data.nfe) && data.nfe[0]?.chaveAcesso,
    Array.isArray(data.nfe) && data.nfe[0]?.chave_acesso,
    
    // Campos diretos no payload
    data.chave_nfe,
    data.chaveNfe,
    data.chave_acesso,
    data.chaveAcesso,
    
    // Campo nfe_key ou similar
    data.nfe_key,
    data.nfeKey,
    
    // Dentro de fatura
    data.fatura?.chave_nfe,
    data.fatura?.chaveAcesso,
    
    // Dentro de cobranca
    data.cobranca?.nota_fiscal?.chaveAcesso,
    data.cobranca?.nfe?.chave,
  ];
  
  for (const value of possiblePaths) {
    if (value && typeof value === 'string') {
      // Normalizar - remover espaços e caracteres especiais
      const normalized = value.replace(/[^0-9]/g, '');
      // Chave NF-e válida tem 44 dígitos, mas aceitar 40-46 por variações do WBuy
      if (normalized.length >= 40 && normalized.length <= 46) {
        console.log('[NF-e] Chave encontrada (length=' + normalized.length + '):', normalized);
        // Padronizar para 44 dígitos (preencher com zeros ou truncar)
        const padded = normalized.padStart(44, '0').substring(0, 44);
        return padded;
      } else if (normalized.length > 30) {
        console.log('[NF-e] Chave parcial encontrada (length=' + normalized.length + '):', normalized);
      }
    }
  }
  
  // Se não encontrou, logar todas as chaves do objeto para debug
  console.log('[NF-e] Chave não encontrada. Campos do payload:', Object.keys(data));
  if (data.nota_fiscal) {
    console.log('[NF-e] Campos do nota_fiscal:', 
      typeof data.nota_fiscal === 'object' ? Object.keys(data.nota_fiscal) : typeof data.nota_fiscal
    );
  }
  
  return null;
}

// Função robusta para extrair chave PIX
function extractPixKey(data: any): string | null {
  const possiblePaths = [
    data.pagamento?.linha_digitavel,
    data.pagamento?.pix_key,
    data.pagamento?.chave_pix,
    data.pagamento?.pix,
    data.pix_key,
    data.chave_pix,
    data.linha_digitavel,
    data.cobranca?.linha_digitavel,
    data.cobranca?.pix,
  ];
  
  for (const value of possiblePaths) {
    if (value && typeof value === 'string' && value.length > 5) {
      console.log('[PIX] Chave encontrada:', value.substring(0, 20) + '...');
      return value;
    }
  }
  
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Capturar informações do request para auditoria
  const clientIP = req.headers.get('cf-connecting-ip') || 
                   req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') ||
                   'unknown';
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const requestId = crypto.randomUUID();
  
  // MULTI-STORE: Extrair código da loja do query param
  const url = new URL(req.url);
  const storeCode = url.searchParams.get('store') || 'update'; // Default: update
  
  console.log(`\n========== WEBHOOK RECEIVED [${requestId}] ==========`);
  console.log('Timestamp:', new Date().toISOString());
  console.log('Client IP:', clientIP);
  console.log('User-Agent:', userAgent);
  console.log('Method:', req.method);
  console.log('[STORE] Store code:', storeCode);

  try {
    // Parse do payload com tratamento de erro
    let payload: any;
    const rawBody = await req.text();
    
    console.log('[RAW] Body length:', rawBody.length);
    
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      logSecurityEvent('INVALID_JSON', { 
        requestId, 
        clientIP, 
        error: String(parseError),
        bodyPreview: rawBody.substring(0, 200)
      });
      return new Response(JSON.stringify({ success: false, message: 'Invalid JSON payload' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validação básica de estrutura do payload
    if (!payload || typeof payload !== 'object') {
      logSecurityEvent('INVALID_PAYLOAD_STRUCTURE', { 
        requestId, 
        clientIP, 
        payloadType: typeof payload 
      });
      return new Response(JSON.stringify({ success: false, message: 'Invalid payload structure' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar secret opcional (se configurado)
    const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');
    const requestSecret = req.headers.get('x-webhook-secret') || 
                          new URL(req.url).searchParams.get('secret');
    
    if (WEBHOOK_SECRET && requestSecret) {
      if (requestSecret !== WEBHOOK_SECRET) {
        logSecurityEvent('INVALID_SECRET', { 
          requestId, 
          clientIP,
          providedSecret: requestSecret?.substring(0, 4) + '***'
        });
        console.warn('⚠️ Secret inválido recebido, mas processando webhook');
      } else {
        console.log('✓ Secret validado com sucesso');
      }
    }

    // Extrair dados do payload - WBuy pode enviar em diferentes formatos
    const webhookType = payload.type || payload.webhook_type || payload.evento;
    const data = payload.data || payload.pedido || payload;
    const orderId = data.id || data.pedido_id || payload.id || payload.pedido_id;
    
    console.log('[PARSE] Webhook type:', webhookType);
    console.log('[PARSE] Order ID:', orderId);
    console.log('[PARSE] Status nome:', data.status_nome);
    console.log('[PARSE] Status id:', data.status?.id || data.status);
    
    // Log completo do payload para debug (limitado)
    const payloadStr = JSON.stringify(payload, null, 2);
    console.log('[PAYLOAD] Preview (2000 chars):', payloadStr.substring(0, 2000));
    if (payloadStr.length > 2000) {
      console.log('[PAYLOAD] ... (truncated, total:', payloadStr.length, 'chars)');
    }
    
    if (!data || !orderId) {
      console.log('[SKIP] Ignoring webhook - no order data found');
      return new Response(JSON.stringify({ success: true, message: 'Ignored - no order ID' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Map WBuy status CODE to our status
    const statusCodeMap: Record<string, string> = {
      '1': 'pending',         // Aguardando pagamento
      '2': 'pending',         // Pagamento em análise
      '3': 'processing',      // Pagamento efetuado
      '4': 'processing',      // Em produção
      '5': 'processing',      // Em expedição
      '6': 'shipped',         // Em transporte
      '7': 'shipped',         // Saiu para entrega
      '8': 'shipped',         // Disponível para retirada
      '9': 'cancelled',       // Pedido cancelado
      '10': 'delivered',      // Pedido concluído/Entregue
      '11': 'payment_denied', // Pagamento negado
      '12': 'cancelled',      // Sem Retorno do Cliente
      '13': 'cancelled',      // Devolvido
      '14': 'pending',        // Pedido em análise
      '15': 'processing',     // Fatura gerada
      '16': 'processing',     // Nota fiscal emitida
      '17': 'processing',     // Nota fiscal emitida (variação)
    };

    // Map WBuy status NAME to our status (fallback when code is wrong)
    const statusNameMap: Record<string, { status: string; code: number }> = {
      'aguardando pagamento': { status: 'pending', code: 1 },
      'pagamento em análise': { status: 'pending', code: 2 },
      'pagamento efetuado': { status: 'processing', code: 3 },
      'em produção': { status: 'processing', code: 4 },
      'em expedição': { status: 'processing', code: 5 },
      'em transporte': { status: 'shipped', code: 6 },
      'saiu para entrega': { status: 'shipped', code: 7 },
      'disponível para retirada': { status: 'shipped', code: 8 },
      'pedido cancelado': { status: 'cancelled', code: 9 },
      'pedido concluído': { status: 'delivered', code: 10 },
      'entregue': { status: 'delivered', code: 10 },
      'pagamento negado': { status: 'payment_denied', code: 11 },
      'sem retorno do cliente': { status: 'cancelled', code: 12 },
      'devolvido': { status: 'cancelled', code: 13 },
      'pedido em análise': { status: 'pending', code: 14 },
      'fatura gerada': { status: 'processing', code: 15 },
      'nota fiscal emitida': { status: 'processing', code: 16 },
      'nf emitida': { status: 'processing', code: 16 },
      'nfe emitida': { status: 'processing', code: 16 },
    };

    // Get status code and name from payload
    const rawStatusCode = String(data.status?.id || data.status_id || data.status || '1');
    const statusName = (data.status_nome || data.status?.nome || '').toLowerCase().trim();
    
    console.log('[STATUS] Raw code:', rawStatusCode, '| Name:', statusName);
    
    // Priority: Use status_nome if available (more reliable), fallback to code
    let mappedStatus: string;
    let wbuyStatusCode: number;
    
    if (statusName && statusNameMap[statusName]) {
      mappedStatus = statusNameMap[statusName].status;
      wbuyStatusCode = statusNameMap[statusName].code;
      console.log('[STATUS] Using status_nome mapping:', statusName, '->', mappedStatus, '(code:', wbuyStatusCode, ')');
    } else {
      mappedStatus = statusCodeMap[rawStatusCode] || 'pending';
      wbuyStatusCode = parseInt(rawStatusCode) || 1;
      console.log('[STATUS] Using status code mapping:', rawStatusCode, '->', mappedStatus);
    }

    // Extrair chave NF-e usando função robusta
    const chaveNfe = extractChaveNfe(data);
    
    // Extrair chave PIX usando função robusta
    const pixKey = extractPixKey(data);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // MULTI-STORE: Buscar ID da loja pelo código
    let storeId: string | null = null;
    const { data: storeData } = await supabase
      .from('ecommerce_stores')
      .select('id')
      .eq('codigo', storeCode)
      .eq('ativo', true)
      .maybeSingle();
    
    if (storeData) {
      storeId = storeData.id;
      console.log('[STORE] Found store ID:', storeId);
    } else {
      console.log('[STORE] Store not found or inactive, using code only:', storeCode);
    }

    // Ordem de progressão natural dos status (para proteção contra regressão)
    // Status de cancelamento (9, 11, 12, 13) podem vir a qualquer momento
    const STATUS_PROGRESSION_ORDER: Record<number, number> = {
      1: 10,   // Aguardando pagamento
      2: 20,   // Pagamento em análise
      14: 25,  // Pedido em análise
      3: 30,   // Pagamento efetuado
      15: 35,  // Fatura gerada
      16: 40,  // Nota fiscal emitida
      4: 50,   // Em produção
      5: 60,   // Em expedição
      6: 70,   // Em transporte
      7: 80,   // Saiu para entrega
      8: 85,   // Disponível para retirada
      10: 100, // Pedido concluído
      // Status de cancelamento - podem vir a qualquer momento
      9: 999,  // Pedido cancelado
      11: 999, // Pagamento negado
      12: 999, // Sem retorno do cliente
      13: 999, // Devolvido
    };
    
    // Status que são exceções (podem sobrescrever qualquer status)
    const STATUS_EXCECOES = [9, 10, 11, 12, 13];

    // Handle STATUS UPDATE webhook (order_status type or PUT method)
    if (webhookType === 'order_status' || webhookType === 'status' || req.method === 'PUT') {
      console.log('\n=== PROCESSING STATUS UPDATE ===');
      
      const externalId = String(data.pedido_id || data.id || orderId);
      console.log('[FIND] Looking for order with external_id:', externalId);
      
      const { data: existingOrder, error: findError } = await supabase
        .from('orders')
        .select('id, status, wbuy_status_code, chave_nfe')
        .eq('external_id', externalId)
        .maybeSingle();
      
      if (findError) {
        console.error('[ERROR] Finding order:', findError);
        throw findError;
      }
      
      if (!existingOrder) {
        console.log('[SKIP] Order not found for status update, external_id:', externalId);
        return new Response(JSON.stringify({ success: true, message: 'Order not found - ignored' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const currentWbuyCode = existingOrder.wbuy_status_code || 1;
      console.log('[FOUND] Order:', existingOrder.id, '| Current wbuy_status_code:', currentWbuyCode, '| New wbuy_status_code:', wbuyStatusCode);
      
      // PROTEÇÃO CONTRA REGRESSÃO DE STATUS
      const currentProgression = STATUS_PROGRESSION_ORDER[currentWbuyCode] || 0;
      const newProgression = STATUS_PROGRESSION_ORDER[wbuyStatusCode] || 0;
      const isExcecao = STATUS_EXCECOES.includes(wbuyStatusCode);
      
      if (!isExcecao && newProgression < currentProgression) {
        console.log('[SKIP] Status regression blocked:', currentWbuyCode, '->', wbuyStatusCode, 
          '| Progression:', currentProgression, '->', newProgression);
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Status regression blocked',
          current_status: currentWbuyCode,
          attempted_status: wbuyStatusCode
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('[STATUS] Allowed update:', currentWbuyCode, '->', wbuyStatusCode, 
        '| isExcecao:', isExcecao, '| Progression:', currentProgression, '->', newProgression);
      
      const updateData: Record<string, any> = {
        status: mappedStatus,
        wbuy_status_code: wbuyStatusCode,
      };
      
      // Tracking
      if (data.frete?.rastreio || data.rastreio || data.tracking) {
        updateData.tracking_code = data.frete?.rastreio || data.rastreio || data.tracking;
        console.log('[UPDATE] tracking_code:', updateData.tracking_code);
      }
      
      // Carrier
      if (data.frete?.nome || data.transportadora) {
        updateData.carrier = data.frete?.nome || data.transportadora;
        console.log('[UPDATE] carrier:', updateData.carrier);
      }
      
      // Chave NF-e - atualizar se encontrada OU se não tinha antes
      if (chaveNfe) {
        updateData.chave_nfe = chaveNfe;
        console.log('[UPDATE] chave_nfe:', chaveNfe);
      }
      
      // PIX key
      if (pixKey && !existingOrder.chave_nfe) { // Só atualiza PIX se não tinha
        updateData.pix_key = pixKey;
        console.log('[UPDATE] pix_key:', pixKey.substring(0, 20) + '...');
      }
      
      console.log('[UPDATE] Data to update:', JSON.stringify(updateData));
      
      const { data: updated, error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', existingOrder.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('[ERROR] Update failed:', updateError);
        throw updateError;
      }
      
      // Registrar histórico de mudança de status
      if (currentWbuyCode !== wbuyStatusCode) {
        const { error: historyError } = await supabase
          .from('orders_status_history')
          .insert({
            order_id: existingOrder.id,
            status_anterior: existingOrder.status,
            status_novo: mappedStatus,
            wbuy_status_code_anterior: currentWbuyCode,
            wbuy_status_code_novo: wbuyStatusCode,
          });
        
        if (historyError) {
          console.error('[WARN] Failed to insert status history:', historyError);
          // Não falha a requisição por causa do histórico
        } else {
          console.log('[HISTORY] Status change recorded:', currentWbuyCode, '->', wbuyStatusCode);
        }
      }
      
      console.log(`[SUCCESS] Order ${updated.id} updated | Status: ${updated.status} | wbuy_code: ${updated.wbuy_status_code} | Has chave_nfe: ${!!updated.chave_nfe}`);
      
      // TRIGGER AUTOMAÇÃO - Disparar fluxos de automação para mudança de status
      try {
        const triggerPayload = {
          trigger_type: 'order_status_changed',
          entity_type: 'order',
          entity_id: updated.id,
          data: {
            ...updated,
            status_anterior: existingOrder.status,
            wbuy_status_code_anterior: currentWbuyCode,
          },
          old_data: {
            status: existingOrder.status,
            wbuy_status_code: currentWbuyCode,
          }
        };
        
        console.log('[AUTOMATION] Triggering automation for status change');
        const automationResponse = await fetch(`${supabaseUrl}/functions/v1/automation-trigger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(triggerPayload),
        });
        
        if (automationResponse.ok) {
          const automationResult = await automationResponse.json();
          console.log('[AUTOMATION] Trigger result:', JSON.stringify(automationResult));
        } else {
          console.error('[AUTOMATION] Trigger failed:', await automationResponse.text());
        }
      } catch (automationError) {
        console.error('[AUTOMATION] Error calling automation-trigger:', automationError);
        // Não falha o webhook por causa de erro na automação
      }
      
      return new Response(JSON.stringify({
        success: true, 
        order_id: updated.id, 
        status: updated.status,
        wbuy_status_code: updated.wbuy_status_code,
        chave_nfe: updated.chave_nfe ? 'present' : 'missing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle ORDER CREATION webhook (order type or POST method)
    console.log('\n=== PROCESSING ORDER CREATION/UPDATE ===');
    
    // DEBUG: Logar estrutura completa do primeiro produto para descobrir campo do código externo
    const produtosArray = data.produtos || data.items || [];
    if (produtosArray.length > 0) {
      console.log('[DEBUG PRODUTO] Primeiro produto completo:', JSON.stringify(produtosArray[0], null, 2));
      console.log('[DEBUG PRODUTO] Campos disponíveis:', Object.keys(produtosArray[0]));
    }

    const items = produtosArray.map((produto: any) => {
      // WBuy envia:
      // - cod_estoque: código completo com tamanho/cor (ex: "C-1358PERSO-M-Cueca-Branca")
      // - cod: código base do produto (ex: "C-1358PERSO")
      // - sku: SKU numérico interno da WBuy (ex: "4150733.252521.416185.335666")
      // Priorizar cod_estoque > cod > sku
      const codigoCompleto = produto.cod_estoque || produto.codEstoque || '';
      const codigoBase = produto.cod || produto.codigo || '';
      const skuNumerico = produto.sku || '';
      
      // Usar código completo se disponível, senão código base, senão SKU
      const skuFinal = codigoCompleto || codigoBase || skuNumerico;
      
      console.log('[PRODUTO] cod_estoque:', codigoCompleto, '| cod:', codigoBase, '| sku:', skuNumerico, '| FINAL:', skuFinal);
      
      return {
        sku: skuFinal,
        codigo: codigoBase, // Guardar código base separado para facilitar classificação
        name: produto.produto || produto.nome || '',
        quantity: parseInt(produto.qtd || produto.quantidade || '1'),
        price: parseFloat(produto.valor || produto.preco || '0'),
        color: produto.cor || '',
        size: produto.variacaoValor || produto.tamanho || '',
      };
    });

    const cliente = data.cliente || data.customer || {};
    const shippingAddress = [
      cliente.endereco,
      cliente.endnum || cliente.numero,
      cliente.complemento,
      cliente.bairro,
      cliente.cidade,
      cliente.uf || cliente.estado,
      cliente.cep,
    ].filter(Boolean).join(', ');

    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, chave_nfe')
      .eq('external_id', String(orderId))
      .maybeSingle();

    console.log('[CHECK] Existing order:', existingOrder ? existingOrder.id : 'none');

    const statusEnvioMap: Record<number, string> = {
      9: 'cancelado',
      11: 'cancelado',
      12: 'cancelado',
      13: 'cancelado',
    };
    const statusEnvio = statusEnvioMap[wbuyStatusCode] || null;

    const orderData: Record<string, any> = {
      external_id: String(orderId),
      order_number: String(orderId),
      customer_name: cliente.nome || 'Cliente não informado',
      customer_email: cliente.email || '',
      customer_phone: cliente.telefone2 || cliente.telefone1 || cliente.telefone || '',
      customer_document: cliente.doc1 || cliente.cpf || cliente.cnpj || '',
      status: mappedStatus,
      wbuy_status_code: wbuyStatusCode,
      total: parseFloat(data.valor_total?.total || data.total || data.valor || '0'),
      items: items,
      shipping_address: shippingAddress,
      delivery_estimate: data.frete?.estimativa || data.previsao_entrega || null,
      tracking_code: data.frete?.rastreio || data.rastreio || null,
      carrier: data.frete?.nome || data.transportadora || null,
      observations: data.observacoes || data.obs || null,
      // MULTI-STORE: Salvar identificação da loja
      store_id: storeId,
      store_code: storeCode,
    };

    // Só atualiza chave_nfe se encontrou uma nova ou se não tinha
    if (chaveNfe || !existingOrder?.chave_nfe) {
      orderData.chave_nfe = chaveNfe;
    }
    
    // Só atualiza pix_key se encontrou uma nova
    if (pixKey) {
      orderData.pix_key = pixKey;
    }

    if (statusEnvio) {
      orderData.status_envio = statusEnvio;
    }

    console.log('[SAVE] Order data:', JSON.stringify(orderData, null, 2));

    let result;
    if (existingOrder) {
      // Não sobrescrever chave_nfe se já existe e nova é null
      if (!chaveNfe && existingOrder.chave_nfe) {
        delete orderData.chave_nfe;
        console.log('[PRESERVE] Keeping existing chave_nfe');
      }
      
      // PROTEÇÃO CONTRA REGRESSÃO DE STATUS também em updates de pedido
      // Buscar status atual para verificar progressão
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('wbuy_status_code, status')
        .eq('id', existingOrder.id)
        .single();
      
      if (currentOrder) {
        const currentWbuyCode = currentOrder.wbuy_status_code || 1;
        const currentProgression = STATUS_PROGRESSION_ORDER[currentWbuyCode] || 0;
        const newProgression = STATUS_PROGRESSION_ORDER[wbuyStatusCode] || 0;
        const isExcecao = STATUS_EXCECOES.includes(wbuyStatusCode);
        
        // Se o novo status é uma regressão (não é exceção), manter o status atual
        if (!isExcecao && newProgression < currentProgression) {
          console.log('[PROTECT] Keeping current status on order update:', currentWbuyCode, 
            '| Blocked:', wbuyStatusCode, '| Progression:', currentProgression, '->', newProgression);
          // Remover campos de status para não sobrescrever
          delete orderData.status;
          delete orderData.wbuy_status_code;
        } else {
          console.log('[STATUS] Allowing status update:', currentWbuyCode, '->', wbuyStatusCode);
        }
      }
      
      const { data: updated, error } = await supabase
        .from('orders')
        .update(orderData)
        .eq('id', existingOrder.id)
        .select()
        .single();
      
      if (error) {
        console.error('[ERROR] Update failed:', error);
        throw error;
      }
      result = updated;
      console.log(`[SUCCESS] Order updated: ${result.id} | Status: ${result.status} | wbuy_code: ${result.wbuy_status_code} | chave_nfe: ${result.chave_nfe ? 'present' : 'missing'}`);
    } else {
      const { data: inserted, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();
      
      if (error) {
        console.error('[ERROR] Insert failed:', error);
        throw error;
      }
      result = inserted;
      console.log(`[SUCCESS] Order created: ${result.id}`);
      
      // RECUPERAÇÃO DE CARRINHO ABANDONADO
      // Quando um novo pedido é criado, verificar se existe carrinho abandonado do cliente
      const customerEmail = (cliente.email || '').toLowerCase().trim();
      const customerPhone = (cliente.telefone2 || cliente.telefone1 || cliente.telefone || '').replace(/\D/g, '');
      
      if (customerEmail || customerPhone) {
        console.log('[CART RECOVERY] Checking for abandoned carts:', { email: customerEmail, phone: customerPhone, storeCode });
        
        // Buscar carrinhos abandonados do cliente na mesma loja
        let abandonedQuery = supabase
          .from('abandoned_carts')
          .select('id')
          .eq('status', 'abandoned')
          .eq('store_code', storeCode);
        
        // Construir condição OR para email ou telefone
        const conditions: string[] = [];
        if (customerEmail) {
          conditions.push(`customer_email.eq.${customerEmail}`);
        }
        if (customerPhone && customerPhone.length >= 10) {
          conditions.push(`customer_phone.eq.${customerPhone}`);
        }
        
        if (conditions.length > 0) {
          abandonedQuery = abandonedQuery.or(conditions.join(','));
          
          const { data: abandonedCarts, error: abandonedError } = await abandonedQuery;
          
          if (abandonedError) {
            console.error('[CART RECOVERY] Error fetching abandoned carts:', abandonedError);
          } else if (abandonedCarts && abandonedCarts.length > 0) {
            console.log(`[CART RECOVERY] Found ${abandonedCarts.length} abandoned cart(s) to recover`);
            
            // Marcar carrinhos como recuperados
            const cartIds = abandonedCarts.map(c => c.id);
            const { error: updateError } = await supabase
              .from('abandoned_carts')
              .update({ 
                status: 'recovered',
                recovered_order_id: result.id,
                updated_at: new Date().toISOString()
              })
              .in('id', cartIds);
            
            if (updateError) {
              console.error('[CART RECOVERY] Error updating abandoned carts:', updateError);
            } else {
              console.log(`[CART RECOVERY] Successfully marked ${cartIds.length} cart(s) as recovered`);
            }
          } else {
            console.log('[CART RECOVERY] No abandoned carts found for this customer');
          }
        }
      }
    }
    
    // TRIGGER AUTOMAÇÃO - Disparar fluxos para pedido criado/atualizado
    try {
      const isNewOrder = !existingOrder;
      const triggerType = isNewOrder ? 'order_created' : 'order_status_changed';
      
      const triggerPayload = {
        trigger_type: triggerType,
        entity_type: 'order',
        entity_id: result.id,
        data: result,
        old_data: existingOrder ? { id: existingOrder.id } : undefined
      };
      
      console.log(`[AUTOMATION] Triggering automation for ${triggerType}`);
      const automationResponse = await fetch(`${supabaseUrl}/functions/v1/automation-trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(triggerPayload),
      });
      
      if (automationResponse.ok) {
        const automationResult = await automationResponse.json();
        console.log('[AUTOMATION] Trigger result:', JSON.stringify(automationResult));
      } else {
        console.error('[AUTOMATION] Trigger failed:', await automationResponse.text());
      }
    } catch (automationError) {
      console.error('[AUTOMATION] Error calling automation-trigger:', automationError);
      // Não falha o webhook por causa de erro na automação
    }

    return new Response(JSON.stringify({ success: true, order_id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[ERROR] Webhook error:`, error);
    logSecurityEvent('WEBHOOK_ERROR', { 
      requestId, 
      clientIP, 
      error: String(error) 
    });
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
