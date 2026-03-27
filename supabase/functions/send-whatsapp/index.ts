import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  instanceId?: string;
  remoteJid: string;
  content: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'document';
  mediaUrl?: string;
  mediaBase64?: string;
  mediaFilename?: string;
  mediaMimeType?: string;
  quotedMessageId?: string;
  conversationId?: string;
  senderName?: string;
}

// Normaliza telefone brasileiro
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}

// Gera variaÃ§Ãµes do nÃºmero brasileiro (com/sem nono dÃ­gito)
function getPhoneVariations(jid: string): string[] {
  const cleaned = jid.replace(/@.*$/, '').replace(/\D/g, '');
  const variations: string[] = [cleaned];
  if (cleaned.length === 13 && cleaned.startsWith('55') && cleaned[4] === '9') {
    variations.push(cleaned.slice(0, 4) + cleaned.slice(5));
  } else if (cleaned.length === 12 && cleaned.startsWith('55')) {
    variations.push(cleaned.slice(0, 4) + '9' + cleaned.slice(4));
  }
  return variations;
}

// Formata remoteJid
function formatRemoteJid(phone: string, isGroup: boolean = false): string {
  if (isGroup) return phone;
  const normalized = normalizePhone(phone);
  return `${normalized}@s.whatsapp.net`;
}

function pick(obj: any, paths: string[]): any {
  for (const path of paths) {
    const value = path.split('.').reduce((acc: any, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

async function parseJsonSafe(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }
  return { raw: await response.text() };
}

async function loadUazapiConfig(supabase: any): Promise<{ baseUrl: string; adminToken: string }> {
  const { data, error } = await supabase
    .from('system_config')
    .select('key, value')
    .in('key', ['uazapi_api_url', 'uazapi_admin_token']);
  if (error) throw error;

  const map: Record<string, string> = {};
  for (const row of data || []) map[row.key] = row.value || '';

  const baseUrl = (map['uazapi_api_url'] || '').replace(/\/+$/, '');
  const adminToken = map['uazapi_admin_token'] || '';
  if (!baseUrl || !adminToken) throw new Error('UAZAPI nao configurada. Configure URL e Admin Token nas configuracoes.');
  return { baseUrl, adminToken };
}

async function uazapiRequest(
  baseUrl: string,
  path: string,
  opts: { method?: string; token?: string; adminToken?: string; body?: any } = {}
): Promise<{ response: Response; data: any }> {
  const { method = 'GET', token, adminToken, body } = opts;
  const url = new URL(`${baseUrl}${path}`);
  if (token) url.searchParams.set('token', token);

  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (adminToken) headers['admintoken'] = adminToken;
  if (token) {
    headers['token'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const data = await parseJsonSafe(response);
  return { response, data };
}

async function persistUazapiToken(supabase: any, instanceId: string, token: string, externalId?: string | null) {
  try {
    await supabase
      .from('whatsapp_instances')
      .update({
        uazapi_instance_token: token,
        uazapi_instance_external_id: externalId || null,
      })
      .eq('id', instanceId);
  } catch {
    // Keep compatibility if new columns are not in DB yet.
  }
}

async function resolveUazapiTokenForInstance(supabase: any, instance: any, baseUrl: string, adminToken: string): Promise<string> {
  let token = String(instance?.uazapi_instance_token || '');
  if (token) return token;

  const allResp = await uazapiRequest(baseUrl, '/instance/all', { adminToken });
  if (!allResp.response.ok) {
    throw new Error('Nao foi possivel listar instancias da UAZAPI para recuperar o token.');
  }

  const instances = Array.isArray(allResp.data)
    ? allResp.data
    : pick(allResp.data, ['instances', 'data', 'results', 'response']) || [];

  const found = (instances as any[]).find((item) =>
    String(item?.name || item?.instanceName || item?.instance_name || '').trim().toLowerCase() ===
    String(instance.instance_name || '').trim().toLowerCase()
  );
  token = String(pick(found, ['token', 'instance.token']) || '');
  if (!token) throw new Error(`Token da instancia UAZAPI nao encontrado para \"${instance.instance_name}\".`);

  await persistUazapiToken(supabase, instance.id, token, String(pick(found, ['id', 'instance.id']) || ''));
  return token;
}

// â”€â”€â”€ UAZAPI: Extrair nÃºmero limpo do JID â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function jidToPhone(jid: string): string {
  return jid.replace(/@.*$/, '');
}

// â”€â”€â”€ UAZAPI: Enviar mensagem â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function sendViaUazapi(
  uazapiUrl: string,
  instanceToken: string,
  targetJid: string,
  messageType: string,
  content: string,
  mediaUrl?: string,
  mediaBase64?: string,
  mediaMimeType?: string,
  mediaFilename?: string,
): Promise<any> {
  const phone = jidToPhone(targetJid);
  const number = targetJid.includes('@g.us') ? targetJid : phone;

  if (messageType === 'text') {
    const { response, data } = await uazapiRequest(uazapiUrl, '/send/text', {
      method: 'POST',
      token: instanceToken,
      body: { number, phone: number, text: content, message: content }
    });
    data._httpStatus = response.status;
    return data;
  } else if (['image', 'video', 'audio', 'document'].includes(messageType)) {
    const payload: any = { number, phone: number, type: messageType, caption: content || '' };
    if (mediaUrl) {
      payload.media = mediaUrl;
      payload.url = mediaUrl;
    } else if (mediaBase64) {
      payload.media = mediaBase64;
      payload.base64 = mediaBase64;
      payload.mimetype = mediaMimeType;
      payload.fileName = mediaFilename;
      payload.docName = mediaFilename;
    }
    const { response, data } = await uazapiRequest(uazapiUrl, '/send/media', {
      method: 'POST',
      token: instanceToken,
      body: payload
    });
    data._httpStatus = response.status;
    return data;
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Normalizar URL Evolution
    if (evolutionApiUrl) {
      evolutionApiUrl = evolutionApiUrl.replace(/\/+$/, '').replace(/\/manager$/, '');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SendMessageRequest = await req.json();
    const {
      instanceId,
      remoteJid,
      content,
      messageType = 'text',
      mediaUrl,
      mediaBase64,
      mediaFilename,
      mediaMimeType,
      quotedMessageId,
      conversationId,
      senderName
    } = body;

    console.log('Enviando mensagem:', { instanceId, remoteJid, messageType });

    // Buscar instÃ¢ncia
    let instance: any;
    if (instanceId) {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('id', instanceId)
        .single();
      instance = data;
    } else {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('is_active', true)
        .order('ordem', { ascending: true })
        .limit(1)
        .single();
      instance = data;
    }

    if (!instance) throw new Error('Nenhuma instÃ¢ncia WhatsApp disponÃ­vel');

    // â”€â”€â”€ ROTEAMENTO POR PROVEDOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const apiType = instance.api_type || 'evolution';
    console.log('API Type da instÃ¢ncia:', apiType);

    // â”€â”€â”€ UAZAPI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (apiType === 'uazapi') {
      const { baseUrl: uazapiUrl, adminToken } = await loadUazapiConfig(supabase);
      const instanceToken = await resolveUazapiTokenForInstance(supabase, instance, uazapiUrl, adminToken);

      // Verificar status real da instÃ¢ncia via UAZAPI
      let isReallyConnected = instance.status === 'connected';
      if (isReallyConnected) {
        try {
          const checkResp = await uazapiRequest(uazapiUrl, '/instance/status', {
            token: instanceToken,
          });
          const checkData = checkResp.data;
          const rawState = pick(checkData, ['instance.status', 'status', 'state', 'connection', 'data.status']) || 'unknown';
          const connectedStates = ['open', 'connected', 'online'];
          if (!connectedStates.includes(String(rawState).toLowerCase())) {
            isReallyConnected = false;
            await supabase.from('whatsapp_instances').update({ status: 'disconnected' }).eq('id', instance.id);
          }
        } catch (e) {
          console.log('Falha ao verificar status UAZAPI (usando status do banco):', e);
        }
      }

      if (!isReallyConnected) {
        // Adicionar Ã  fila
        await supabase.from('whatsapp_message_queue').insert({
          instance_id: instance.id,
          conversation_id: conversationId,
          remote_jid: remoteJid,
          content,
          message_type: messageType,
          media_url: mediaUrl,
          media_base64: mediaBase64,
          status: 'pending'
        });

        if (conversationId) {
          await supabase.from('whatsapp_messages').insert({
            conversation_id: conversationId,
            instance_id: instance.id,
            from_me: true,
            content,
            message_type: messageType,
            media_url: mediaUrl,
            media_mime_type: mediaMimeType,
            media_filename: mediaFilename,
            status: 'queued'
          });
          await supabase.from('whatsapp_conversations').update({
            last_message_at: new Date().toISOString(),
            last_message_preview: content?.substring(0, 100) || `[${messageType}]`,
            unread_count: 0
          }).eq('id', conversationId);
        }

        return new Response(JSON.stringify({ success: true, queued: true, message: 'Mensagem adicionada Ã  fila (instÃ¢ncia offline)' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 202
        });
      }

      const formattedJid = remoteJid.includes('@') ? remoteJid : formatRemoteJid(remoteJid);
      const uazapiResponse = await sendViaUazapi(
        uazapiUrl, instanceToken, formattedJid,
        messageType, content, mediaUrl, mediaBase64, mediaMimeType, mediaFilename
      );

      console.log('UAZAPI response:', uazapiResponse);

      const uazapiError = uazapiResponse?._httpStatus >= 400 || uazapiResponse?.error;
      if (uazapiError) {
        const errorMsg = uazapiResponse?.error || uazapiResponse?.message || 'Erro ao enviar mensagem via UAZAPI';
        if (conversationId) {
          await supabase.from('whatsapp_messages').insert({
            conversation_id: conversationId, instance_id: instance.id, from_me: true,
            content, message_type: messageType, media_url: mediaUrl, status: 'error', error_message: errorMsg
          });
          await supabase.from('whatsapp_conversations').update({
            last_message_at: new Date().toISOString(),
            last_message_preview: `âŒ ${content?.substring(0, 80) || '[mÃ­dia]'}`,
          }).eq('id', conversationId);
        }
        return new Response(JSON.stringify({ success: false, error: errorMsg }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
        });
      }

      const messageIdExternal = uazapiResponse?.id || uazapiResponse?.messageId || uazapiResponse?.key?.id;

      // Salvar mÃ­dia no Storage se vier base64
      let finalMediaUrl = mediaUrl;
      if (mediaBase64 && !finalMediaUrl) {
        try {
          const fileExt = mediaMimeType?.split('/')[1] || 'bin';
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `whatsapp-media/${fileName}`;
          const binaryString = atob(mediaBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
          const { error: uploadError } = await supabase.storage.from('whatsapp-media').upload(filePath, bytes, { contentType: mediaMimeType || 'application/octet-stream', upsert: false });
          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage.from('whatsapp-media').getPublicUrl(filePath);
            finalMediaUrl = publicUrlData?.publicUrl;
          }
        } catch (e) { console.error('Erro ao salvar mÃ­dia:', e); }
      }

      const { data: savedMessage } = await supabase.from('whatsapp_messages').insert({
        conversation_id: conversationId,
        instance_id: instance.id,
        message_id_external: messageIdExternal,
        from_me: true,
        content,
        message_type: messageType,
        media_url: finalMediaUrl,
        media_mime_type: mediaMimeType,
        media_filename: mediaFilename,
        quoted_message_id: quotedMessageId,
        sender_name: senderName,
        status: 'sent'
      }).select().single();

      if (conversationId) {
        await supabase.from('whatsapp_conversations').update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content?.substring(0, 100) || `[${messageType}]`,
          unread_count: 0
        }).eq('id', conversationId);
      }

      return new Response(JSON.stringify({ success: true, message: savedMessage, uazapiResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // â”€â”€â”€ EVOLUTION API (padrÃ£o) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API nÃ£o configurada');
    }
    console.log('Evolution API URL normalizada:', evolutionApiUrl);

    // Verificar se instÃ¢ncia estÃ¡ realmente conectada
    let isReallyConnected = instance.status === 'connected';
    if (isReallyConnected) {
      try {
        const checkUrl = `${evolutionApiUrl}/instance/connectionState/${instance.instance_name}`;
        const checkResp = await fetch(checkUrl, { headers: { 'apikey': evolutionApiKey }, signal: AbortSignal.timeout(5000) });
        const checkData = await checkResp.json();
        const rawState = checkData?.instance?.state || checkData?.state || 'unknown';
        const connectedStates = ['open', 'connected', 'online'];
        if (!connectedStates.includes(String(rawState).toLowerCase())) {
          isReallyConnected = false;
          await supabase.from('whatsapp_instances').update({ status: 'disconnected' }).eq('id', instance.id);
        }
      } catch (e) {
        console.log('Falha ao verificar status real da instÃ¢ncia (continuando com status do banco):', e);
      }
    }

    if (!isReallyConnected) {
      await supabase.from('whatsapp_message_queue').insert({
        instance_id: instance.id,
        conversation_id: conversationId,
        remote_jid: remoteJid,
        content,
        message_type: messageType,
        media_url: mediaUrl,
        media_base64: mediaBase64,
        status: 'pending'
      });

      if (conversationId) {
        await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationId,
          instance_id: instance.id,
          from_me: true,
          content,
          message_type: messageType,
          media_url: mediaUrl,
          media_mime_type: mediaMimeType,
          media_filename: mediaFilename,
          status: 'queued'
        });
        await supabase.from('whatsapp_conversations').update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content?.substring(0, 100) || `[${messageType}]`,
          unread_count: 0
        }).eq('id', conversationId);
      }

      return new Response(JSON.stringify({
        success: true, queued: true, message: 'Mensagem adicionada Ã  fila (instÃ¢ncia offline)'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 202 });
    }

    // Tratar @lid
    let formattedJid = remoteJid.includes('@') ? remoteJid : formatRemoteJid(remoteJid);
    if (formattedJid.includes('@lid') && conversationId) {
      const { data: convData } = await supabase.from('whatsapp_conversations').select('contact_phone').eq('id', conversationId).single();
      if (convData?.contact_phone && convData.contact_phone.match(/^\d{10,13}$/)) {
        formattedJid = formatRemoteJid(convData.contact_phone);
      }
    }

    let evolutionResponse;
    let messageIdExternal;
    let usedJid = formattedJid;

    // Quoted options
    let quotedOptions: any = {};
    if (quotedMessageId) {
      const { data: quotedMsg } = await supabase.from('whatsapp_messages').select('message_id_external').eq('id', quotedMessageId).single();
      if (quotedMsg?.message_id_external) {
        quotedOptions = { quoted: { key: { remoteJid: formattedJid, id: quotedMsg.message_id_external } } };
      }
    }

    async function sendViaEvolution(targetJid: string) {
      if (messageType === 'text') {
        const response = await fetch(`${evolutionApiUrl}/message/sendText/${instance.instance_name}`, {
          method: 'POST',
          headers: { 'apikey': evolutionApiKey!, 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: targetJid, text: content, ...quotedOptions })
        });
        const json = await response.json();
        json._httpStatus = response.status;
        return json;
      } else if (['image', 'video', 'audio', 'document'].includes(messageType)) {
        const mediaPayload: any = { number: targetJid, caption: content || '', mediatype: messageType, ...quotedOptions };
        if (mediaBase64) {
          mediaPayload.media = mediaBase64;
          mediaPayload.mimetype = mediaMimeType;
          mediaPayload.fileName = mediaFilename || `file.${mediaMimeType?.split('/')[1] || 'bin'}`;
        } else if (mediaUrl) {
          mediaPayload.media = mediaUrl;
        }
        const response = await fetch(`${evolutionApiUrl}/message/sendMedia/${instance.instance_name}`, {
          method: 'POST',
          headers: { 'apikey': evolutionApiKey!, 'Content-Type': 'application/json' },
          body: JSON.stringify(mediaPayload)
        });
        const json = await response.json();
        json._httpStatus = response.status;
        return json;
      }
      return null;
    }

    function isNumberNotFound(resp: any): boolean {
      return resp && (
        (Array.isArray(resp?.response?.message) && resp.response.message.some((m: any) => m.exists === false)) ||
        (resp?._httpStatus >= 400 && JSON.stringify(resp).includes('exists'))
      );
    }

    function hasApiError(resp: any): boolean {
      return resp?.error || resp?._httpStatus >= 400 || isNumberNotFound(resp);
    }

    const phoneVariations = getPhoneVariations(formattedJid);
    evolutionResponse = await sendViaEvolution(formattedJid);
    console.log('Evolution response (tentativa 1):', evolutionResponse);

    if (isNumberNotFound(evolutionResponse) && phoneVariations.length > 1) {
      const altJid = `${phoneVariations[1]}@s.whatsapp.net`;
      const altResponse = await sendViaEvolution(altJid);
      console.log('Evolution response (tentativa 2):', altResponse);
      if (!hasApiError(altResponse)) {
        evolutionResponse = altResponse;
        usedJid = altJid;
      }
    }

    if (hasApiError(evolutionResponse)) {
      const numberNotExists = isNumberNotFound(evolutionResponse);
      const errorMsg = numberNotExists
        ? 'Este nÃºmero nÃ£o possui WhatsApp ativo. Verifique se o nÃºmero estÃ¡ correto (com DDD).'
        : evolutionResponse?.error || 'Erro ao enviar mensagem pelo WhatsApp';

      if (conversationId) {
        await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationId, instance_id: instance.id, from_me: true,
          content, message_type: messageType, media_url: mediaUrl, status: 'error', error_message: errorMsg
        });
        await supabase.from('whatsapp_conversations').update({
          last_message_at: new Date().toISOString(),
          last_message_preview: `âŒ ${content?.substring(0, 80) || '[mÃ­dia]'}`,
        }).eq('id', conversationId);
      }

      return new Response(JSON.stringify({ success: false, error: errorMsg, evolutionResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
      });
    }

    messageIdExternal = evolutionResponse?.key?.id || evolutionResponse?.messageId;

    // Upload de mÃ­dia base64 para Storage
    let finalMediaUrl = mediaUrl;
    if (mediaBase64 && !finalMediaUrl) {
      try {
        const fileExt = mediaMimeType?.split('/')[1] || 'bin';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `whatsapp-media/${fileName}`;
        const binaryString = atob(mediaBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        const { error: uploadError } = await supabase.storage.from('whatsapp-media').upload(filePath, bytes, { contentType: mediaMimeType || 'application/octet-stream', upsert: false });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('whatsapp-media').getPublicUrl(filePath);
          finalMediaUrl = publicUrlData?.publicUrl;
        }
      } catch (e) { console.error('Erro no upload de mÃ­dia:', e); }
    }

    const { data: savedMessage, error: saveError } = await supabase.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      instance_id: instance.id,
      message_id_external: messageIdExternal,
      from_me: true,
      content,
      message_type: messageType,
      media_url: finalMediaUrl,
      media_mime_type: mediaMimeType,
      media_filename: mediaFilename,
      quoted_message_id: quotedMessageId,
      sender_name: senderName,
      status: 'sent'
    }).select().single();

    if (saveError) console.error('Erro ao salvar mensagem:', saveError);

    if (conversationId) {
      await supabase.from('whatsapp_conversations').update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content?.substring(0, 100) || `[${messageType}]`,
        unread_count: 0
      }).eq('id', conversationId);
    }

    return new Response(JSON.stringify({ success: true, message: savedMessage, evolutionResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Erro ao enviar WhatsApp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    let friendlyMessage = errorMessage;
    if (errorMessage.includes('not connected')) friendlyMessage = 'WhatsApp nÃ£o estÃ¡ conectado. Verifique a instÃ¢ncia.';
    else if (errorMessage.includes('invalid number')) friendlyMessage = 'NÃºmero de telefone invÃ¡lido.';

    return new Response(JSON.stringify({ success: false, error: friendlyMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    });
  }
});



