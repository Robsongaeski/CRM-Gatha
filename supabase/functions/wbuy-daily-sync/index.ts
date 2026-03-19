import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WBUY_API_BASE = 'https://sistema.sistemawbuy.com.br/api/v1'

const statusCodeMap: Record<number, string> = {
  1: 'pending', 2: 'pending', 3: 'processing', 4: 'processing', 5: 'processing',
  6: 'shipped', 7: 'shipped', 8: 'shipped', 9: 'cancelled', 10: 'delivered',
  11: 'payment_denied', 12: 'cancelled', 13: 'cancelled', 14: 'pending',
  15: 'processing', 16: 'processing',
}

function extractOrderData(wbuyOrder: any, storeCode: string, storeId: string) {
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch all active stores with API credentials
    const { data: stores, error: storesError } = await supabase
      .from('ecommerce_stores')
      .select('id, codigo, nome, wbuy_api_user, wbuy_api_password')
      .eq('ativo', true)
      .not('wbuy_api_user', 'is', null)
      .not('wbuy_api_password', 'is', null)

    if (storesError || !stores?.length) {
      console.log('[DAILY-SYNC] No active stores with API credentials found')
      return new Response(JSON.stringify({ success: true, message: 'Nenhuma loja ativa com credenciais API' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const allResults: Record<string, { imported: number, updated: number, skipped: number, errors: number }> = {}

    for (const store of stores) {
      console.log(`[DAILY-SYNC] Processing store: ${store.nome} (${store.codigo})`)
      const result = { imported: 0, updated: 0, skipped: 0, errors: 0 }
      allResults[store.codigo] = result

      const authToken = btoa(`${store.wbuy_api_user}:${store.wbuy_api_password}`)
      const BATCH_SIZE = 100
      let offset = 0
      let foundOldOrder = false

      // Yesterday's date boundaries (UTC-3 for Brazil)
      const now = new Date()
      const yesterdayStart = new Date(now)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)
      yesterdayStart.setHours(0, 0, 0, 0)

      // We'll fetch recent orders and stop when we find orders older than yesterday
      while (!foundOldOrder) {
        try {
          if (offset > 0) {
            await new Promise(r => setTimeout(r, 650))
          }

          const url = `${WBUY_API_BASE}/order/?limit=${offset},${BATCH_SIZE}&order=id,desc`
          console.log(`[DAILY-SYNC] Fetching: ${url}`)

          const resp = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
              'User-Agent': 'SalesPeakCRM (suporte@salespeak.com.br)',
            },
          })

          if (!resp.ok) {
            console.error(`[DAILY-SYNC] API error ${resp.status} for ${store.codigo}`)
            result.errors++
            break
          }

          const data = await resp.json()
          const orders = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : [])

          if (!orders.length) break

          for (const wbuyOrder of orders) {
            try {
              const externalId = String(wbuyOrder.id || wbuyOrder.pedido_id)
              if (!externalId || externalId === 'undefined') {
                result.skipped++
                continue
              }

              // Check order date - stop if older than yesterday
              const orderDateStr = wbuyOrder.data || wbuyOrder.created_at || wbuyOrder.cadastro
              if (orderDateStr) {
                const orderDate = new Date(orderDateStr)
                if (orderDate < yesterdayStart) {
                  foundOldOrder = true
                  break
                }
              }

              const orderData = extractOrderData(wbuyOrder, store.codigo, store.id)

              // Check if order exists
              const { data: existing } = await supabase
                .from('orders')
                .select('id, wbuy_status_code')
                .eq('external_id', externalId)
                .maybeSingle()

              if (existing) {
                // Update status and enrichment data if changed
                const updateFields: Record<string, any> = {
                  status: orderData.status,
                  wbuy_status_code: orderData.wbuy_status_code,
                  tracking_code: orderData.tracking_code,
                  carrier: orderData.carrier,
                  enriched_at: orderData.enriched_at,
                }
                // Add enrichment fields
                const enrichKeys = ['payment_method', 'payment_installments', 'subtotal', 'shipping_cost',
                  'discount', 'coupon_code', 'order_date', 'nfe_number', 'nfe_series', 'chave_nfe']
                for (const key of enrichKeys) {
                  if (orderData[key] !== null && orderData[key] !== undefined) {
                    updateFields[key] = orderData[key]
                  }
                }
                if (orderData.status_envio) updateFields.status_envio = orderData.status_envio

                await supabase.from('orders').update(updateFields).eq('id', existing.id)
                result.updated++
              } else {
                // Insert new order
                const { error: insertError } = await supabase.from('orders').insert(orderData)
                if (insertError) {
                  console.error(`[DAILY-SYNC] Insert error #${externalId}:`, insertError.message)
                  result.errors++
                } else {
                  result.imported++
                }
              }
            } catch (orderErr: any) {
              result.errors++
            }
          }

          offset += BATCH_SIZE
          // Safety: never fetch more than 500 orders in daily sync
          if (offset >= 500) break

        } catch (fetchErr: any) {
          console.error(`[DAILY-SYNC] Fetch error for ${store.codigo}:`, fetchErr.message)
          result.errors++
          break
        }
      }

      console.log(`[DAILY-SYNC] ${store.codigo}: imported=${result.imported} updated=${result.updated} skipped=${result.skipped} errors=${result.errors}`)
    }

    return new Response(JSON.stringify({ success: true, stores: allResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('[DAILY-SYNC] Error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
