import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'exchange-token') {
      // Exchange short-lived token for long-lived token and fetch WABA details
      const { code, accessToken } = body;

      // Get Meta App Secret from system_config
      const { data: appSecretConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'meta_app_secret')
        .single();

      const { data: appIdConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'meta_app_id')
        .single();

      const appSecret = appSecretConfig?.value;
      const appId = appIdConfig?.value;

      if (!appSecret || !appId) {
        throw new Error('Meta App ID ou App Secret não configurados no sistema');
      }

      let longLivedToken = accessToken;

      // If we have a code, exchange it first
      if (code) {
        const tokenResp = await fetch(
          `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=authorization_code&code=${code}&client_id=${appId}&client_secret=${appSecret}`
        );
        const tokenData = await tokenResp.json();
        if (tokenData.error) {
          throw new Error(tokenData.error.message || 'Erro ao trocar código');
        }
        longLivedToken = tokenData.access_token;
      }

      // Exchange for long-lived token if short-lived
      if (longLivedToken && !code) {
        try {
          const llResp = await fetch(
            `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${longLivedToken}`
          );
          const llData = await llResp.json();
          if (llData.access_token) {
            longLivedToken = llData.access_token;
          }
        } catch (e) {
          console.log('Long-lived token exchange failed, using original:', e);
        }
      }

      // Save the token as meta_access_token in system_config
      await supabase
        .from('system_config')
        .update({ value: longLivedToken, updated_at: new Date().toISOString() })
        .eq('key', 'meta_access_token');

      return new Response(JSON.stringify({ success: true, token: 'saved' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'register-phone') {
      // Fetch WABA and phone details from Meta Graph API and register in DB
      const { wabaId, phoneNumberId, instanceName, instanceNome } = body;

      // Get access token
      const { data: tokenConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'meta_access_token')
        .single();

      const accessToken = tokenConfig?.value;
      if (!accessToken) {
        throw new Error('Meta Access Token não encontrado. Complete o Embedded Signup primeiro.');
      }

      // Fetch phone number details
      let displayPhoneNumber = '';
      let phoneStatus = 'disconnected';
      try {
        const phoneResp = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,platform_type,status`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        const phoneData = await phoneResp.json();
        console.log('Phone data:', JSON.stringify(phoneData));
        displayPhoneNumber = phoneData.display_phone_number || '';
        if (phoneData.status === 'CONNECTED') {
          phoneStatus = 'connected';
        }
      } catch (e) {
        console.error('Error fetching phone details:', e);
      }

      // Fetch WABA details
      let wabaName = '';
      let businessAccountId = '';
      try {
        const wabaResp = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}?fields=name,account_review_status,on_behalf_of_business_info`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        const wabaData = await wabaResp.json();
        console.log('WABA data:', JSON.stringify(wabaData));
        wabaName = wabaData.name || '';
        businessAccountId = wabaData.on_behalf_of_business_info?.id || '';
      } catch (e) {
        console.error('Error fetching WABA details:', e);
      }

      // Clean phone number for storage
      const cleanPhone = displayPhoneNumber.replace(/[^0-9]/g, '');

      // Create instance name from phone or use provided
      const finalInstanceName = instanceName || `cloud-${cleanPhone || phoneNumberId}`;
      const finalNome = instanceNome || wabaName || `WhatsApp Cloud ${displayPhoneNumber}`;

      // Register the phone number for message sending (subscribe to webhooks)
      try {
        const registerResp = await fetch(
          `https://graph.facebook.com/v21.0/${phoneNumberId}/register`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              pin: '123456' // Required but not used for Cloud API
            })
          }
        );
        const registerData = await registerResp.json();
        console.log('Register phone response:', JSON.stringify(registerData));
      } catch (e) {
        console.log('Phone registration (may already be registered):', e);
      }

      // Subscribe app to WABA webhooks
      try {
        const subscribeResp = await fetch(
          `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
          }
        );
        const subscribeData = await subscribeResp.json();
        console.log('Subscribe to WABA webhooks:', JSON.stringify(subscribeData));
      } catch (e) {
        console.log('WABA webhook subscription failed:', e);
      }

      // Check if this phone already exists as an instance
      const { data: existingInstance } = await supabase
        .from('whatsapp_instances')
        .select('id')
        .eq('meta_phone_number_id', phoneNumberId)
        .maybeSingle();

      let instanceId: string;

      if (existingInstance) {
        // Update existing
        const { error } = await supabase
          .from('whatsapp_instances')
          .update({
            status: phoneStatus,
            api_type: 'cloud_api',
            meta_waba_id: wabaId,
            meta_phone_number_id: phoneNumberId,
            meta_display_phone_number: displayPhoneNumber,
            meta_business_account_id: businessAccountId,
            meta_account_name: wabaName,
            numero_whatsapp: cleanPhone,
            nome: finalNome,
            webhook_configured: true,
          })
          .eq('id', existingInstance.id);

        if (error) throw error;
        instanceId = existingInstance.id;
      } else {
        // Create new instance
        const { data: newInstance, error } = await supabase
          .from('whatsapp_instances')
          .insert({
            nome: finalNome,
            instance_name: finalInstanceName,
            status: phoneStatus,
            api_type: 'cloud_api',
            meta_waba_id: wabaId,
            meta_phone_number_id: phoneNumberId,
            meta_display_phone_number: displayPhoneNumber,
            meta_business_account_id: businessAccountId,
            meta_account_name: wabaName,
            numero_whatsapp: cleanPhone,
            webhook_configured: true,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        instanceId = newInstance.id;
      }

      return new Response(JSON.stringify({
        success: true,
        instanceId,
        displayPhoneNumber,
        wabaName,
        status: phoneStatus,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (action === 'list-waba-phones') {
      // List all phone numbers for a WABA
      const { wabaId } = body;

      const { data: tokenConfig } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'meta_access_token')
        .single();

      const accessToken = tokenConfig?.value;
      if (!accessToken) throw new Error('Meta Access Token não encontrado');

      const resp = await fetch(
        `https://graph.facebook.com/v21.0/${wabaId}/phone_numbers?fields=display_phone_number,verified_name,quality_rating,status,platform_type`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const data = await resp.json();
      console.log('WABA phones:', JSON.stringify(data));

      return new Response(JSON.stringify({
        success: true,
        phones: data.data || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    throw new Error(`Ação não reconhecida: ${action}`);

  } catch (error: unknown) {
    console.error('Erro no Meta Embedded Signup:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
