import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const WBUY_API_BASE = 'https://sistema.sistemawbuy.com.br/api/v1'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate JWT
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

    const { store_code, endpoint, params, action } = await req.json()

    if (!store_code) {
      return new Response(JSON.stringify({ error: 'store_code é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get store credentials using service role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: store, error: storeError } = await adminClient
      .from('ecommerce_stores')
      .select('wbuy_api_user, wbuy_api_password, codigo, nome')
      .eq('codigo', store_code)
      .eq('ativo', true)
      .single()

    if (storeError || !store) {
      return new Response(JSON.stringify({ error: 'Loja não encontrada ou inativa' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!store.wbuy_api_user || !store.wbuy_api_password) {
      return new Response(JSON.stringify({ error: 'Credenciais da API não configuradas para esta loja' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle test connection
    if (action === 'test') {
      const authToken = btoa(`${store.wbuy_api_user}:${store.wbuy_api_password}`)
      const testResp = await fetch(`${WBUY_API_BASE}/order/?limit=0,1`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'SalesPeakCRM (suporte@salespeak.com.br)',
        },
      })
      
      if (!testResp.ok) {
        const errorText = await testResp.text()
        return new Response(JSON.stringify({ 
          success: false, 
          error: `API retornou ${testResp.status}: ${errorText}` 
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      return new Response(JSON.stringify({ success: true, store_name: store.nome }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Handle enrich action - fetch order from WBuy and update in DB
    if (action === 'enrich' && params?.order_id) {
      // Get order from our DB to find external_id
      const { data: order } = await adminClient
        .from('orders')
        .select('external_id, id')
        .eq('id', params.order_id)
        .single()

      if (!order?.external_id) {
        return new Response(JSON.stringify({ error: 'Pedido sem external_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const authToken = btoa(`${store.wbuy_api_user}:${store.wbuy_api_password}`)
      const apiResp = await fetch(`${WBUY_API_BASE}/order/?id=${order.external_id}`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'SalesPeakCRM (suporte@salespeak.com.br)',
        },
      })

      if (!apiResp.ok) {
        return new Response(JSON.stringify({ error: `API WBuy retornou ${apiResp.status}` }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const apiData = await apiResp.json()
      const wbuyOrder = Array.isArray(apiData.data) ? apiData.data[0] : (Array.isArray(apiData) ? apiData[0] : apiData)

      if (!wbuyOrder) {
        return new Response(JSON.stringify({ error: 'Pedido não encontrado na API WBuy' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Extract enrichment data
      const enrichment: Record<string, any> = {
        enriched_at: new Date().toISOString(),
      }

      // Payment info
      if (wbuyOrder.payment) {
        enrichment.payment_method = wbuyOrder.payment.method || wbuyOrder.payment.name || null
        enrichment.payment_installments = wbuyOrder.payment.installments || wbuyOrder.payment.parcels || null
      } else if (wbuyOrder.payment_method) {
        enrichment.payment_method = wbuyOrder.payment_method
      }
      if (wbuyOrder.payment_name) {
        enrichment.payment_method = wbuyOrder.payment_name
      }

      // Financial breakdown
      if (wbuyOrder.subtotal !== undefined) enrichment.subtotal = parseFloat(wbuyOrder.subtotal) || null
      if (wbuyOrder.shipping !== undefined) enrichment.shipping_cost = parseFloat(wbuyOrder.shipping) || null
      if (wbuyOrder.shipping_cost !== undefined) enrichment.shipping_cost = parseFloat(wbuyOrder.shipping_cost) || null
      if (wbuyOrder.discount !== undefined) enrichment.discount = parseFloat(wbuyOrder.discount) || null
      if (wbuyOrder.coupon) enrichment.coupon_code = wbuyOrder.coupon
      if (wbuyOrder.coupon_code) enrichment.coupon_code = wbuyOrder.coupon_code

      // Customer ID
      if (wbuyOrder.customer_id) enrichment.wbuy_customer_id = String(wbuyOrder.customer_id)
      if (wbuyOrder.customer?.id) enrichment.wbuy_customer_id = String(wbuyOrder.customer.id)

      // Original order date
      if (wbuyOrder.date) enrichment.order_date = wbuyOrder.date
      if (wbuyOrder.created_at) enrichment.order_date = wbuyOrder.created_at

      // NF-e details
      if (wbuyOrder.nfe_number) enrichment.nfe_number = String(wbuyOrder.nfe_number)
      if (wbuyOrder.nfe_series) enrichment.nfe_series = String(wbuyOrder.nfe_series)
      if (wbuyOrder.invoice?.number) enrichment.nfe_number = String(wbuyOrder.invoice.number)
      if (wbuyOrder.invoice?.series) enrichment.nfe_series = String(wbuyOrder.invoice.series)

      // Remove null values
      const cleanEnrichment = Object.fromEntries(
        Object.entries(enrichment).filter(([_, v]) => v !== null && v !== undefined)
      )

      // Update order in DB
      const { error: updateError } = await adminClient
        .from('orders')
        .update(cleanEnrichment)
        .eq('id', params.order_id)

      if (updateError) {
        console.error('Error updating order:', updateError)
        return new Response(JSON.stringify({ error: 'Erro ao salvar dados enriquecidos' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ 
        success: true, 
        enrichment: cleanEnrichment,
        raw_fields: Object.keys(wbuyOrder),
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generic API proxy (for custom queries)
    if (endpoint) {
      const authToken = btoa(`${store.wbuy_api_user}:${store.wbuy_api_password}`)
      const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
      const apiResp = await fetch(`${WBUY_API_BASE}/${endpoint}/${queryString}`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'SalesPeakCRM (suporte@salespeak.com.br)',
        },
      })

      const data = await apiResp.json()
      return new Response(JSON.stringify(data), {
        status: apiResp.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('wbuy-api-proxy error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
