import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'create' | 'connect' | 'disconnect' | 'delete' | 'check-status' | 'set-webhook' | 'get-qrcode' | 'restart';
  instanceId?: string;
  instanceName?: string;
  webhookUrl?: string;
  apiType?: 'evolution' | 'uazapi'; // Provedor de API
}

// Migrar conversas órfãs para a instância atual
async function migrateOrphanConversations(supabase: any, currentInstanceId: string, numeroWhatsapp: string) {
  if (!currentInstanceId || !numeroWhatsapp) return;
  try {
    const { data: activeInstances } = await supabase.from('whatsapp_instances').select('id');
    const activeInstanceIds = (activeInstances || []).map((i: any) => i.id);

    const { data: orphanConversations } = await supabase
      .from('whatsapp_conversations').select('id, instance_id').is('instance_id', null);
    const { data: otherConversations } = await supabase
      .from('whatsapp_conversations').select('id, instance_id')
      .not('instance_id', 'is', null).neq('instance_id', currentInstanceId);

    let migratedCount = 0;
    for (const conv of orphanConversations || []) {
      await supabase.from('whatsapp_conversations').update({ instance_id: currentInstanceId }).eq('id', conv.id);
      await supabase.from('whatsapp_messages').update({ instance_id: currentInstanceId }).eq('conversation_id', conv.id);
      migratedCount++;
    }
    for (const conv of otherConversations || []) {
      if (!activeInstanceIds.includes(conv.instance_id)) {
        await supabase.from('whatsapp_conversations').update({ instance_id: currentInstanceId }).eq('id', conv.id);
        await supabase.from('whatsapp_messages').update({ instance_id: currentInstanceId }).eq('conversation_id', conv.id);
        migratedCount++;
      }
    }
    if (migratedCount > 0) console.log(`Migradas ${migratedCount} conversas órfãs para ${currentInstanceId}`);
  } catch (e) {
    console.error('Erro ao migrar conversas órfãs:', e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: RequestBody = await req.json();
    const { action, instanceId, instanceName, webhookUrl, apiType: bodyApiType } = body;

    console.log('Action:', action, 'InstanceId:', instanceId, 'InstanceName:', instanceName, 'BodyApiType:', bodyApiType);

    // Determinar api_type da instância (do body ou consultando o banco)
    let apiType = bodyApiType || 'evolution';
    if (instanceId && !bodyApiType) {
      const { data: inst } = await supabase.from('whatsapp_instances').select('api_type').eq('id', instanceId).single();
      if (inst?.api_type) apiType = inst.api_type;
    }
    console.log('API Type resolvido:', apiType);

    // Buscar configs da UAZAPI quando necessário
    let uazapiUrl = '';
    let uazapiAdminToken = '';
    if (apiType === 'uazapi') {
      const { data: configs } = await supabase
        .from('system_config').select('key, value').in('key', ['uazapi_api_url', 'uazapi_admin_token']);
      const configMap: Record<string, string> = {};
      for (const c of configs || []) configMap[c.key] = c.value;
      uazapiUrl = (configMap['uazapi_api_url'] || '').replace(/\/+$/, '');
      uazapiAdminToken = configMap['uazapi_admin_token'] || '';
      if (!uazapiUrl || !uazapiAdminToken) {
        throw new Error('UAZAPI não configurada. Configure a URL e Admin Token nas configurações.');
      }
    }

    // Evolution API base URL
    const baseUrl = (evolutionApiUrl || '')
      .replace(/\/+$/, '')
      .replace(/\/manager$/i, '');

    let result: any = {};

    switch (action) {
      // ─── CREATE ──────────────────────────────────────────────────────────────
      case 'create': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        if (apiType === 'uazapi') {
          // UAZAPI: criar instância
          const response = await fetch(`${uazapiUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Authorization': uazapiAdminToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName, qrcode: true })
          });
          const data = await response.json();
          console.log('UAZAPI create response:', response.status, JSON.stringify(data).substring(0, 500));
          if (!response.ok) throw new Error(data.message || data.error || 'Erro ao criar instância UAZAPI');
          result = { success: true, instance: data.instance || data, qrcode: data.qrcode };
        } else {
          // Evolution API
          if (!evolutionApiUrl || !evolutionApiKey) throw new Error('Evolution API não configurada');
          const createUrl = `${baseUrl}/instance/create`;
          const response = await fetch(createUrl, {
            method: 'POST',
            headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.response?.message?.[0] || data.message || 'Erro ao criar instância');
          result = { success: true, instance: data.instance, qrcode: data.qrcode };
        }
        break;
      }

      // ─── CONNECT (gerar novo QR) ──────────────────────────────────────────────
      case 'connect': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        if (apiType === 'uazapi') {
          // Tentar deletar instância antiga (ignorar erros)
          try {
            await fetch(`${uazapiUrl}/instance/delete?instanceName=${instanceName}`, {
              method: 'DELETE',
              headers: { 'Authorization': uazapiAdminToken }
            });
          } catch (e) { console.log('UAZAPI delete old instance falhou (ok):', e); }

          await new Promise(resolve => setTimeout(resolve, 1000));

          // Recriar instância
          const response = await fetch(`${uazapiUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Authorization': uazapiAdminToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName, qrcode: true })
          });
          const data = await response.json();
          console.log('UAZAPI connect response:', response.status, JSON.stringify(data).substring(0, 500));
          if (!response.ok) throw new Error(data.message || data.error || 'Erro ao recriar instância UAZAPI');

          if (instanceId) {
            await supabase.from('whatsapp_instances').update({ status: 'connecting' }).eq('id', instanceId);
          }
          result = { success: true, qrcode: data.qrcode?.base64 || data.qrcode, pairingCode: data.pairingCode };
        } else {
          if (!evolutionApiUrl || !evolutionApiKey) throw new Error('Evolution API não configurada');
          try {
            await fetch(`${baseUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } });
          } catch (e) { console.log('Delete old instance falhou:', e); }

          await new Promise(resolve => setTimeout(resolve, 1000));

          const createConnResponse = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
          });
          const createConnData = await createConnResponse.json();
          if (!createConnResponse.ok) throw new Error(createConnData.response?.message?.[0] || createConnData.message || 'Erro ao recriar instância');

          if (instanceId) {
            await supabase.from('whatsapp_instances').update({ status: 'connecting' }).eq('id', instanceId);
          }
          result = { success: true, qrcode: createConnData.qrcode?.base64 || createConnData.qrcode, pairingCode: createConnData.pairingCode };
        }
        break;
      }

      // ─── GET QR CODE ──────────────────────────────────────────────────────────
      case 'get-qrcode': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        if (apiType === 'uazapi') {
          const response = await fetch(`${uazapiUrl}/instance/connect?instanceName=${instanceName}`, {
            headers: { 'Authorization': uazapiAdminToken }
          });
          const data = await response.json();
          result = { success: true, qrcode: data.qrcode?.base64 || data.base64 || data.qrcode, pairingCode: data.pairingCode, state: data.state };
        } else {
          if (!evolutionApiUrl || !evolutionApiKey) throw new Error('Evolution API não configurada');
          const response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, { headers: { 'apikey': evolutionApiKey } });
          const data = await response.json();
          result = { success: true, qrcode: data.base64 || data.qrcode, pairingCode: data.pairingCode, state: data.state };
        }
        break;
      }

      // ─── DISCONNECT ───────────────────────────────────────────────────────────
      case 'disconnect': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        if (apiType === 'uazapi') {
          try {
            await fetch(`${uazapiUrl}/instance/logout?instanceName=${instanceName}`, {
              method: 'DELETE',
              headers: { 'Authorization': uazapiAdminToken }
            });
          } catch (e) { console.log('UAZAPI logout falhou:', e); }
          try {
            await fetch(`${uazapiUrl}/instance/delete?instanceName=${instanceName}`, {
              method: 'DELETE',
              headers: { 'Authorization': uazapiAdminToken }
            });
          } catch (e) { console.log('UAZAPI delete falhou:', e); }
        } else {
          if (!evolutionApiUrl || !evolutionApiKey) throw new Error('Evolution API não configurada');
          try { await fetch(`${baseUrl}/instance/logout/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (e) { }
          try { await fetch(`${baseUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (e) { }
        }

        if (instanceId) {
          await supabase.from('whatsapp_instances').update({ status: 'disconnected' }).eq('id', instanceId);
        }
        result = { success: true };
        break;
      }

      // ─── DELETE ───────────────────────────────────────────────────────────────
      case 'delete': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        if (apiType === 'uazapi') {
          try {
            await fetch(`${uazapiUrl}/instance/delete?instanceName=${instanceName}`, {
              method: 'DELETE',
              headers: { 'Authorization': uazapiAdminToken }
            });
          } catch (e) { console.log('UAZAPI delete instance falhou (ignorando):', e); }
        } else {
          if (evolutionApiUrl && evolutionApiKey) {
            try { await fetch(`${baseUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (e) { }
          }
        }
        result = { success: true };
        break;
      }

      // ─── CHECK STATUS ─────────────────────────────────────────────────────────
      case 'check-status': {
        if (instanceName) {
          if (apiType === 'uazapi') {
            const response = await fetch(`${uazapiUrl}/instance/status?instanceName=${instanceName}`, {
              headers: { 'Authorization': uazapiAdminToken }
            });
            const data = await response.json();
            console.log('UAZAPI status response:', JSON.stringify(data));

            const rawState = data?.state || data?.status || data?.connection || 'unknown';
            const connectedStates = ['open', 'connected', 'online'];
            const status = connectedStates.includes(String(rawState).toLowerCase()) ? 'connected' : 'disconnected';

            let numeroWhatsapp = null;
            if (status === 'connected' && data?.phone) {
              numeroWhatsapp = String(data.phone).replace(/\D/g, '');
            } else if (status === 'connected' && data?.me?.id) {
              numeroWhatsapp = data.me.id.split('@')[0].split(':')[0];
            }

            const updateData: any = { status };
            if (numeroWhatsapp) updateData.numero_whatsapp = numeroWhatsapp;

            if (instanceId) {
              await supabase.from('whatsapp_instances').update(updateData).eq('id', instanceId);
            } else {
              await supabase.from('whatsapp_instances').update(updateData).eq('instance_name', instanceName);
            }

            if (status === 'connected' && numeroWhatsapp) {
              await migrateOrphanConversations(supabase, instanceId || '', numeroWhatsapp);
            }

            result = { success: true, instanceName, status, numeroWhatsapp, rawState, rawData: data };
          } else {
            if (!evolutionApiUrl || !evolutionApiKey) throw new Error('Evolution API não configurada');
            const response = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers: { 'apikey': evolutionApiKey } });
            const data = await response.json();
            const rawState = data?.instance?.state || data?.state || data?.status || 'unknown';
            const state = String(rawState);
            const connectedStates = ['open', 'connected', 'online'];
            let status = connectedStates.includes(state.toLowerCase()) ? 'connected' : 'disconnected';

            let numeroWhatsapp = null;
            let sessionCorrupted = false;
            if (status === 'connected') {
              try {
                const fetchResponse = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, { headers: { 'apikey': evolutionApiKey } });
                const fetchData = await fetchResponse.json();
                const instanceData = Array.isArray(fetchData) ? fetchData[0] : fetchData;
                const disconnectionCode = instanceData?.disconnectionReasonCode || instanceData?.instance?.disconnectionReasonCode;
                const disconnectionObject = JSON.stringify(instanceData?.disconnectionObject || instanceData?.instance?.disconnectionObject || '');
                if (disconnectionCode === 401 || disconnectionCode > 0) { sessionCorrupted = true; status = 'error'; }
                if (disconnectionObject.includes('device_removed') || disconnectionObject.includes('conflict')) { sessionCorrupted = true; status = 'error'; }
                const ownerJid = instanceData?.ownerJid || instanceData?.instance?.ownerJid;
                const owner = instanceData?.owner || instanceData?.instance?.owner;
                if (ownerJid) numeroWhatsapp = ownerJid.split('@')[0];
                else if (owner) numeroWhatsapp = owner.split('@')[0].split(':')[0];
                else numeroWhatsapp = instanceData?.profileNumber || instanceData?.instance?.profileNumber || null;
              } catch (e) { console.error('Erro ao buscar número:', e); }
            }

            const updateData: any = { status };
            if (numeroWhatsapp) updateData.numero_whatsapp = numeroWhatsapp;
            const targetId = instanceId || null;
            if (targetId) {
              await supabase.from('whatsapp_instances').update(updateData).eq('id', targetId);
            } else {
              await supabase.from('whatsapp_instances').update(updateData).eq('instance_name', instanceName);
            }
            if (status === 'connected' && numeroWhatsapp) {
              await migrateOrphanConversations(supabase, instanceId || '', numeroWhatsapp);
            }
            result = { success: true, instanceName, status, numeroWhatsapp, sessionCorrupted, rawState: state, rawData: data };
          }
        } else {
          // Verificar todas as instâncias ativas
          const { data: instances } = await supabase.from('whatsapp_instances').select('*').eq('is_active', true);
          const statuses = [];
          for (const inst of instances || []) {
            try {
              const instApiType = inst.api_type || 'evolution';
              let status = 'disconnected';
              let numeroWhatsapp = null;

              if (instApiType === 'uazapi') {
                const response = await fetch(`${uazapiUrl}/instance/status?instanceName=${inst.instance_name}`, { headers: { 'Authorization': uazapiAdminToken } });
                const data = await response.json();
                const rawState = data?.state || data?.status || 'unknown';
                status = ['open', 'connected', 'online'].includes(String(rawState).toLowerCase()) ? 'connected' : 'disconnected';
                if (status === 'connected' && (data?.phone || data?.me?.id)) {
                  numeroWhatsapp = data.phone ? String(data.phone).replace(/\D/g, '') : data.me.id.split('@')[0];
                }
              } else {
                if (!evolutionApiUrl || !evolutionApiKey) continue;
                const response = await fetch(`${baseUrl}/instance/connectionState/${inst.instance_name}`, { headers: { 'apikey': evolutionApiKey } });
                const data = await response.json();
                status = data.state === 'open' ? 'connected' : 'disconnected';
                if (status === 'connected') {
                  try {
                    const fetchResponse = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${inst.instance_name}`, { headers: { 'apikey': evolutionApiKey } });
                    const fetchData = await fetchResponse.json();
                    const instanceData = Array.isArray(fetchData) ? fetchData[0] : fetchData;
                    const ownerJid = instanceData?.ownerJid || instanceData?.instance?.ownerJid;
                    const owner = instanceData?.owner || instanceData?.instance?.owner;
                    if (ownerJid) numeroWhatsapp = ownerJid.split('@')[0];
                    else if (owner) numeroWhatsapp = owner.split('@')[0].split(':')[0];
                  } catch (e) { }
                }
              }

              const updateData: any = { status };
              if (numeroWhatsapp) updateData.numero_whatsapp = numeroWhatsapp;
              await supabase.from('whatsapp_instances').update(updateData).eq('id', inst.id);
              if (status === 'connected' && numeroWhatsapp) {
                await migrateOrphanConversations(supabase, inst.id, numeroWhatsapp);
              }
              statuses.push({ id: inst.id, instance_name: inst.instance_name, status, numero_whatsapp: numeroWhatsapp });
            } catch (e: unknown) {
              await supabase.from('whatsapp_instances').update({ status: 'error' }).eq('id', inst.id);
              statuses.push({ id: inst.id, instance_name: inst.instance_name, status: 'error', error: e instanceof Error ? e.message : 'Erro' });
            }
          }
          result = { success: true, instances: statuses };
        }
        break;
      }

      // ─── SET WEBHOOK ──────────────────────────────────────────────────────────
      case 'set-webhook': {
        if (!instanceName) throw new Error('instanceName é obrigatório');
        if (!webhookUrl) throw new Error('webhookUrl é obrigatório');

        if (apiType === 'uazapi') {
          const response = await fetch(`${uazapiUrl}/instance/webhook`, {
            method: 'POST',
            headers: { 'Authorization': uazapiAdminToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName, webhookUrl, enabled: true, events: ['message', 'connection', 'message.update'] })
          });
          const data = await response.json();
          console.log('UAZAPI set-webhook response:', response.status, data);
          if (instanceId) await supabase.from('whatsapp_instances').update({ webhook_configured: true }).eq('id', instanceId);
          result = { success: true, webhookSet: response.ok, data };
        } else {
          if (!evolutionApiUrl || !evolutionApiKey) throw new Error('Evolution API não configurada');
          const webhookConfig = { webhook: { enabled: true, url: webhookUrl, byEvents: false, base64: true, events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'] } };
          let success = false;
          let response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
            method: 'POST',
            headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookConfig)
          });
          let data = await response.json();
          if (response.ok) { success = true; }
          else {
            response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
              method: 'POST',
              headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: webhookUrl, webhook_by_events: false, webhook_base64: true, events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE'] })
            });
            data = await response.json();
            if (response.ok) success = true;
          }
          if (instanceId) await supabase.from('whatsapp_instances').update({ webhook_configured: true }).eq('id', instanceId);
          else await supabase.from('whatsapp_instances').update({ webhook_configured: true }).eq('instance_name', instanceName);
          result = { success: true, webhookSet: success, data };
        }
        break;
      }

      // ─── RESTART ──────────────────────────────────────────────────────────────
      case 'restart': {
        if (!instanceName) throw new Error('instanceName é obrigatório');

        if (apiType === 'uazapi') {
          // Logout + delete + recriar
          try { await fetch(`${uazapiUrl}/instance/logout?instanceName=${instanceName}`, { method: 'DELETE', headers: { 'Authorization': uazapiAdminToken } }); } catch (e) { }
          try { await fetch(`${uazapiUrl}/instance/delete?instanceName=${instanceName}`, { method: 'DELETE', headers: { 'Authorization': uazapiAdminToken } }); } catch (e) { }
          await new Promise(resolve => setTimeout(resolve, 2000));

          const createResponse = await fetch(`${uazapiUrl}/instance/create`, {
            method: 'POST',
            headers: { 'Authorization': uazapiAdminToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName, qrcode: true })
          });
          const createData = await createResponse.json();
          if (!createResponse.ok) throw new Error(createData.message || 'Erro ao recriar instância UAZAPI');

          // Configurar webhook automaticamente para o endpoint UAZAPI
          const autoWebhookUrl = `${supabaseUrl}/functions/v1/receive-whatsapp-uazapi-webhook`;
          try {
            await fetch(`${uazapiUrl}/instance/webhook`, {
              method: 'POST',
              headers: { 'Authorization': uazapiAdminToken, 'Content-Type': 'application/json' },
              body: JSON.stringify({ instanceName, webhookUrl: autoWebhookUrl, enabled: true, events: ['message', 'connection', 'message.update'] })
            });
          } catch (e) { console.log('Auto webhook UAZAPI falhou:', e); }

          const restartUpdate: any = { status: 'disconnected', webhook_configured: true };
          if (instanceId) await supabase.from('whatsapp_instances').update(restartUpdate).eq('id', instanceId);
          else await supabase.from('whatsapp_instances').update(restartUpdate).eq('instance_name', instanceName);

          result = { success: true, qrcode: createData.qrcode?.base64 || createData.qrcode, message: 'Instância UAZAPI recriada. Escaneie o novo QR code.' };
        } else {
          if (!evolutionApiUrl || !evolutionApiKey) throw new Error('Evolution API não configurada');
          try { await fetch(`${baseUrl}/instance/logout/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (e) { }
          try { await fetch(`${baseUrl}/instance/delete/${instanceName}`, { method: 'DELETE', headers: { 'apikey': evolutionApiKey } }); } catch (e) { }
          await new Promise(resolve => setTimeout(resolve, 2000));

          const restartCreateResponse = await fetch(`${baseUrl}/instance/create`, {
            method: 'POST',
            headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
          });
          const restartCreateData = await restartCreateResponse.json();
          if (!restartCreateResponse.ok) throw new Error(restartCreateData.response?.message?.[0] || 'Erro ao recriar instância');

          const autoWebhookUrl = `${supabaseUrl}/functions/v1/receive-whatsapp-webhook`;
          try {
            await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
              method: 'POST',
              headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
              body: JSON.stringify({ webhook: { enabled: true, url: autoWebhookUrl, byEvents: false, base64: true, events: ['MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE', 'QRCODE_UPDATED'] } })
            });
          } catch (e) { }

          const restartUpdate: any = { status: 'disconnected', webhook_configured: true };
          if (instanceId) await supabase.from('whatsapp_instances').update(restartUpdate).eq('id', instanceId);
          else await supabase.from('whatsapp_instances').update(restartUpdate).eq('instance_name', instanceName);

          result = { success: true, qrcode: restartCreateData.qrcode?.base64 || restartCreateData.qrcode, pairingCode: restartCreateData.pairingCode, message: 'Instância recriada com sucesso. Escaneie o novo QR code.' };
        }
        break;
      }

      default:
        throw new Error(`Ação não reconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Erro na gestão de instância:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
