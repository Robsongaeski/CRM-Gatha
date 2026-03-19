import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const WBUY_API_BASE = 'https://sistema.sistemawbuy.com.br/api/v1'

// Map WBuy status code to our internal status
const statusCodeMap: Record<number, string> = {
  1: 'pending', 2: 'pending', 3: 'processing', 4: 'processing', 5: 'processing',
  6: 'shipped', 7: 'shipped', 8: 'shipped', 9: 'cancelled', 10: 'delivered',
  11: 'payment_denied', 12: 'cancelled', 13: 'cancelled', 14: 'pending',
  15: 'processing', 16: 'processing',
}

interface SyncResult {
  imported: number
  enriched: number
  skipped: number
  errors: number
  details: string[]
}

async function fetchWbuyOrders(authToken: string, offset: number, limit: number): Promise<{ orders: any[], total: number }> {
  // WBuy API uses limit=offset,count format
  const url = `${WBUY_API_BASE}/order/?limit=${offset},${limit}&order=id,desc`
  console.log(`[SYNC] Fetching: ${url}`)
  
  const resp = await fetch(url, {
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'SalesPeakCRM (suporte@salespeak.com.br)',
    },
  })
  
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`API ${resp.status}: ${text.substring(0, 300)}`)
  }
  
  const data = await resp.json()
  const orders = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])
  const total = parseInt(data.total) || orders.length
  
  return { orders, total }
}

function extractOrderData(wbuyOrder: any, storeCode: string, storeId: string | null) {
  const cliente = wbuyOrder.cliente || wbuyOrder.customer || {}
  
  const produtosArray = wbuyOrder.produtos || wbuyOrder.items || []
  const items = produtosArray.map((p: any) => ({
    sku: p.cod_estoque || p.codEstoque || p.cod || p.codigo || p.sku || '',
    codigo: p.cod || p.codigo || '',
    name: p.produto || p.nome || '',
    quantity: parseInt(p.qtd || p.quantidade || '1'),
    price: parseFloat(p.valor || p.preco || '0'),
    color: p.cor || '',
    size: p.variacaoValor || p.tamanho || '',
  }))
  
  const shippingAddress = [
    cliente.endereco, cliente.endnum || cliente.numero,
    cliente.complemento, cliente.bairro,
    cliente.cidade, cliente.uf || cliente.estado, cliente.cep,
  ].filter(Boolean).join(', ')
  
  // Parse status - WBuy may return status as string id or object
  let wbuyStatusCode = 1
  if (wbuyOrder.status_id) {
    wbuyStatusCode = parseInt(wbuyOrder.status_id)
  } else if (typeof wbuyOrder.status === 'object' && wbuyOrder.status?.id) {
    wbuyStatusCode = parseInt(wbuyOrder.status.id)
  } else if (typeof wbuyOrder.status === 'string' || typeof wbuyOrder.status === 'number') {
    wbuyStatusCode = parseInt(String(wbuyOrder.status)) || 1
  }
  
  const mappedStatus = statusCodeMap[wbuyStatusCode] || 'pending'
  const orderId = String(wbuyOrder.id || wbuyOrder.pedido_id)
  
  const orderData: Record<string, any> = {
    external_id: orderId,
    order_number: orderId,
    customer_name: cliente.nome || 'Cliente não informado',
    customer_email: cliente.email || '',
    customer_phone: cliente.telefone2 || cliente.telefone1 || cliente.telefone || '',
    customer_document: cliente.doc1 || cliente.cpf || cliente.cnpj || '',
    status: mappedStatus,
    wbuy_status_code: wbuyStatusCode,
    total: parseFloat(wbuyOrder.valor_total?.total || wbuyOrder.total || wbuyOrder.valor || '0'),
    items,
    shipping_address: shippingAddress,
    delivery_estimate: wbuyOrder.frete?.estimativa || wbuyOrder.previsao_entrega || null,
    tracking_code: wbuyOrder.frete?.rastreio || wbuyOrder.rastreio || null,
    carrier: wbuyOrder.frete?.nome || wbuyOrder.transportadora || null,
    observations: wbuyOrder.observacoes || wbuyOrder.obs || null,
    store_id: storeId,
    store_code: storeCode,
    enriched_at: new Date().toISOString(),
  }
  
  // Enrichment data
  if (wbuyOrder.pagamento_nome || wbuyOrder.payment_name || wbuyOrder.pagamento?.nome) {
    orderData.payment_method = wbuyOrder.pagamento_nome || wbuyOrder.payment_name || wbuyOrder.pagamento?.nome
  }
  if (wbuyOrder.pagamento?.parcelas || wbuyOrder.payment_installments) {
    orderData.payment_installments = parseInt(wbuyOrder.pagamento?.parcelas || wbuyOrder.payment_installments) || null
  }
  if (wbuyOrder.subtotal !== undefined) orderData.subtotal = parseFloat(wbuyOrder.subtotal) || null
  if (wbuyOrder.frete?.valor !== undefined) orderData.shipping_cost = parseFloat(wbuyOrder.frete.valor) || null
  if (wbuyOrder.valor_frete !== undefined) orderData.shipping_cost = parseFloat(wbuyOrder.valor_frete) || null
  if (wbuyOrder.desconto !== undefined) orderData.discount = parseFloat(wbuyOrder.desconto) || null
  if (wbuyOrder.discount !== undefined) orderData.discount = parseFloat(wbuyOrder.discount) || null
  if (wbuyOrder.cupom || wbuyOrder.coupon) orderData.coupon_code = wbuyOrder.cupom || wbuyOrder.coupon
  if (wbuyOrder.cliente?.id) orderData.wbuy_customer_id = String(wbuyOrder.cliente.id)
  if (wbuyOrder.data || wbuyOrder.created_at || wbuyOrder.cadastro) {
    orderData.order_date = wbuyOrder.data || wbuyOrder.created_at || wbuyOrder.cadastro
  }
  
  // NF-e
  if (wbuyOrder.nota_fiscal) {
    const nf = Array.isArray(wbuyOrder.nota_fiscal) ? wbuyOrder.nota_fiscal[0] : wbuyOrder.nota_fiscal
    if (nf?.numero) orderData.nfe_number = String(nf.numero)
    if (nf?.serie) orderData.nfe_series = String(nf.serie)
    const chave = nf?.chaveAcesso || nf?.chave_acesso || nf?.chave
    if (chave && typeof chave === 'string') {
      const normalized = chave.replace(/[^0-9]/g, '')
      if (normalized.length >= 40 && normalized.length <= 46) {
        orderData.chave_nfe = normalized.padStart(44, '0').substring(0, 44)
      }
    }
  }
  
  // Status envio for cancelled orders
  if ([9, 11, 12, 13].includes(wbuyStatusCode)) {
    orderData.status_envio = 'cancelado'
  }
  
  return orderData
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { store_code, mode } = await req.json()

    if (!store_code) {
      return new Response(JSON.stringify({ error: 'store_code é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: store, error: storeError } = await adminClient
      .from('ecommerce_stores')
      .select('wbuy_api_user, wbuy_api_password, codigo, id')
      .eq('codigo', store_code)
      .eq('ativo', true)
      .single()

    if (storeError || !store?.wbuy_api_user || !store?.wbuy_api_password) {
      return new Response(JSON.stringify({ error: 'Loja não encontrada ou sem credenciais API' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authToken = btoa(`${store.wbuy_api_user}:${store.wbuy_api_password}`)
    
    if (mode === 'full_import') {
      // FULL IMPORT: Paginate through all orders from WBuy API
      const result: SyncResult = { imported: 0, enriched: 0, skipped: 0, errors: 0, details: [] }
      const BATCH_SIZE = 100
      let offset = 0
      let hasMore = true
      let totalOrders = 0
      
      while (hasMore) {
        try {
          // Rate limit: ~100 req/min = 600ms between requests
          if (offset > 0) {
            await new Promise(r => setTimeout(r, 650))
          }
          
          const { orders, total } = await fetchWbuyOrders(authToken, offset, BATCH_SIZE)
          
          if (offset === 0) {
            totalOrders = total
            console.log(`[SYNC] Total orders in WBuy: ${totalOrders}`)
            result.details.push(`Total de pedidos na WBuy: ${totalOrders}`)
          }
          
          if (!orders || orders.length === 0) {
            hasMore = false
            break
          }
          
          console.log(`[SYNC] Processing batch offset=${offset}, got ${orders.length} orders`)
          
          for (const wbuyOrder of orders) {
            try {
              const externalId = String(wbuyOrder.id || wbuyOrder.pedido_id)
              if (!externalId || externalId === 'undefined') {
                result.skipped++
                continue
              }
              
              const orderData = extractOrderData(wbuyOrder, store_code, store.id)
              
              // Check if order exists
              const { data: existing } = await adminClient
                .from('orders')
                .select('id, enriched_at, wbuy_status_code')
                .eq('external_id', externalId)
                .maybeSingle()
              
              if (existing) {
                if (!existing.enriched_at) {
                  // Enrich existing order (don't overwrite core webhook fields)
                  const enrichFields: Record<string, any> = { enriched_at: orderData.enriched_at }
                  // Only add enrichment data, don't overwrite webhook data
                  const enrichKeys = ['payment_method', 'payment_installments', 'subtotal', 'shipping_cost', 
                    'discount', 'coupon_code', 'wbuy_customer_id', 'order_date', 'nfe_number', 'nfe_series']
                  for (const key of enrichKeys) {
                    if (orderData[key] !== null && orderData[key] !== undefined) {
                      enrichFields[key] = orderData[key]
                    }
                  }
                  // Update chave_nfe only if we have one and existing doesn't
                  if (orderData.chave_nfe) enrichFields.chave_nfe = orderData.chave_nfe
                  
                  await adminClient.from('orders').update(enrichFields).eq('id', existing.id)
                  result.enriched++
                } else {
                  result.skipped++
                }
              } else {
                // Insert new order
                const { error: insertError } = await adminClient.from('orders').insert(orderData)
                if (insertError) {
                  console.error(`[SYNC] Insert error for #${externalId}:`, insertError.message)
                  result.errors++
                  if (result.details.length < 20) {
                    result.details.push(`Erro #${externalId}: ${insertError.message}`)
                  }
                } else {
                  result.imported++
                }
              }
            } catch (orderErr: any) {
              result.errors++
              if (result.details.length < 20) {
                result.details.push(`Erro: ${orderErr.message}`)
              }
            }
          }
          
          // Next page
          offset += BATCH_SIZE
          if (orders.length < BATCH_SIZE || offset >= totalOrders) {
            hasMore = false
          }
          
          // Safety limit
          if (offset > 10000) {
            result.details.push('Limite de 10.000 pedidos atingido')
            hasMore = false
          }
          
        } catch (fetchErr: any) {
          console.error(`[SYNC] Fetch error at offset ${offset}:`, fetchErr.message)
          result.details.push(`Erro ao buscar offset ${offset}: ${fetchErr.message}`)
          hasMore = false
        }
      }
      
      console.log(`[SYNC] Complete: imported=${result.imported} enriched=${result.enriched} skipped=${result.skipped} errors=${result.errors}`)
      
      return new Response(JSON.stringify({ success: true, ...result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
      
    } else {
      // ENRICH ONLY mode
      const { data: pendingOrders } = await adminClient
        .from('orders')
        .select('id, external_id, order_number')
        .eq('store_code', store_code)
        .is('enriched_at', null)
        .not('external_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50)

      if (!pendingOrders?.length) {
        return new Response(JSON.stringify({ 
          success: true, message: 'Nenhum pedido pendente de enriquecimento', enriched: 0 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let enriched = 0, errors = 0

      for (const order of pendingOrders) {
        try {
          if (enriched > 0) await new Promise(r => setTimeout(r, 650))

          const resp = await fetch(`${WBUY_API_BASE}/order/?id=${order.external_id}`, {
            headers: { 
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'SalesPeakCRM (suporte@salespeak.com.br)',
            },
          })

          if (!resp.ok) { errors++; continue }

          const apiData = await resp.json()
          const wbuyOrder = Array.isArray(apiData.data) ? apiData.data[0] : (Array.isArray(apiData) ? apiData[0] : apiData)

          if (!wbuyOrder) continue

          const orderData = extractOrderData(wbuyOrder, store_code, null)
          const enrichFields: Record<string, any> = { enriched_at: new Date().toISOString() }
          const enrichKeys = ['payment_method', 'payment_installments', 'subtotal', 'shipping_cost', 
            'discount', 'coupon_code', 'wbuy_customer_id', 'order_date', 'nfe_number', 'nfe_series']
          for (const key of enrichKeys) {
            if (orderData[key] !== null && orderData[key] !== undefined) {
              enrichFields[key] = orderData[key]
            }
          }

          await adminClient.from('orders').update(enrichFields).eq('id', order.id)
          enriched++
        } catch {
          errors++
        }
      }

      return new Response(JSON.stringify({ success: true, enriched, errors, total: pendingOrders.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (err: any) {
    console.error('wbuy-sync-orders error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
