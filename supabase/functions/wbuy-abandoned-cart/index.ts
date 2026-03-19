import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CartItem {
  produto?: string;
  name?: string;
  sku?: string;
  codigo?: string;
  cod?: string;
  qtd?: number;
  quantity?: number;
  valor?: number;
  price?: number;
  cor?: string;
  color?: string;
  tamanho?: string;
  size?: string;
}

interface ClienteData {
  nome?: string;
  name?: string;
  email?: string;
  telefone?: string;
  phone?: string;
  doc1?: string;
  cpf?: string;
  document?: string;
}

interface WBuyCartData {
  id_envio?: string;
  enviar_em?: string;
  expirar_em?: string;
  cliente?: ClienteData;
  produtos?: CartItem[];
  valor_total?: number;
  url_checkout?: string;
  url_carrinho?: string;
}

interface AbandonedCartPayload {
  lid?: string;
  type?: string;
  method?: string;
  data?: WBuyCartData;
  // Fallback direct fields
  id?: string;
  cart_id?: string;
  carrinho_id?: string;
  cliente?: ClienteData;
  customer?: ClienteData;
  produtos?: CartItem[];
  items?: CartItem[];
  valor_total?: number;
  total?: number;
  url_carrinho?: string;
  recovery_url?: string;
  checkout_url?: string;
  data_abandono?: string;
  abandoned_at?: string;
  created_at?: string;
}

function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  // Remove country code if present
  if (digits.length > 11 && digits.startsWith('55')) {
    return digits.substring(2);
  }
  return digits;
}

function extractCartData(payload: AbandonedCartPayload) {
  // WBuy sends data nested inside "data" object
  const wbuyData = payload.data;
  
  // Extract external ID - prioritize WBuy format
  const externalId = wbuyData?.id_envio || payload.id || payload.cart_id || payload.carrinho_id || '';
  
  // Extract customer data - prioritize WBuy nested format
  const cliente = wbuyData?.cliente || payload.cliente || payload.customer || {};
  const customerName = cliente.nome || cliente.name || 'Cliente';
  const customerEmail = cliente.email?.toLowerCase()?.trim() || null;
  const customerPhone = normalizePhone(cliente.telefone || cliente.phone);
  const customerDocument = cliente.doc1 || cliente.cpf || cliente.document || null;
  
  // Extract items - prioritize WBuy nested format
  const rawItems = wbuyData?.produtos || payload.produtos || payload.items || [];
  const items = rawItems.map((item: CartItem) => ({
    name: item.produto || item.name || 'Produto',
    sku: item.sku || item.codigo || item.cod || '',
    quantity: item.qtd || item.quantity || 1,
    price: item.valor || item.price || 0,
    color: item.cor || item.color || null,
    size: item.tamanho || item.size || null,
  }));
  
  // Extract total
  const total = wbuyData?.valor_total || payload.valor_total || payload.total || 
    items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  
  // Extract recovery URL
  const recoveryUrl = wbuyData?.url_checkout || wbuyData?.url_carrinho || 
    payload.url_carrinho || payload.recovery_url || payload.checkout_url || null;
  
  // Extract abandoned date from WBuy format (enviar_em)
  const abandonedAtRaw = wbuyData?.enviar_em || payload.data_abandono || payload.abandoned_at || payload.created_at;
  let abandonedAt: string;
  if (abandonedAtRaw) {
    // Handle WBuy date format: "2026-01-22 12:39:09"
    const parsed = new Date(abandonedAtRaw.replace(' ', 'T'));
    abandonedAt = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  } else {
    abandonedAt = new Date().toISOString();
  }
  
  return {
    externalId,
    customerName,
    customerEmail,
    customerPhone,
    customerDocument,
    items,
    total,
    recoveryUrl,
    abandonedAt,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('=== WBUY ABANDONED CART WEBHOOK ===');
  console.log(`Method: ${req.method}`);
  console.log(`URL: ${req.url}`);

  try {
    // Only accept POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const body = await req.text();
    console.log('Raw body:', body.substring(0, 500));
    
    let data: AbandonedCartPayload;
    try {
      data = JSON.parse(body);
    } catch (e) {
      console.error('JSON parse error:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get store code from query params
    const url = new URL(req.url);
    const storeCode = url.searchParams.get('store')?.toLowerCase() || 'default';
    console.log(`Store code: ${storeCode}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get store ID
    const { data: store, error: storeError } = await supabase
      .from('ecommerce_stores')
      .select('id')
      .eq('codigo', storeCode)
      .eq('ativo', true)
      .single();

    if (storeError || !store) {
      console.log(`Store not found for code: ${storeCode}, will proceed without store_id`);
    }

    // Extract cart data
    const cartData = extractCartData(data);
    console.log('Extracted cart data:', JSON.stringify(cartData, null, 2));

    if (!cartData.externalId) {
      return new Response(
        JSON.stringify({ error: 'Missing cart ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert abandoned cart
    const { data: result, error: upsertError } = await supabase
      .from('abandoned_carts')
      .upsert({
        external_id: cartData.externalId,
        store_id: store?.id || null,
        store_code: storeCode,
        customer_name: cartData.customerName,
        customer_email: cartData.customerEmail,
        customer_phone: cartData.customerPhone,
        customer_document: cartData.customerDocument,
        total: cartData.total,
        items: cartData.items,
        recovery_url: cartData.recoveryUrl,
        abandoned_at: cartData.abandonedAt,
        status: 'abandoned',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'external_id,store_code',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save abandoned cart', details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SUCCESS] Abandoned cart saved: ${result.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Abandoned cart received',
        cart_id: result.id,
        store_code: storeCode,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
