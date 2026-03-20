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

// Gera variações do número brasileiro (com/sem nono dígito)
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

// ─── UAZAPI: Extrair número limpo do JID ──────────────────────────────────────
function jidToPhone(jid: string): string {
  return jid.replace(/@.*$/, '');
}

// ─── UAZAPI: Enviar mensagem ───────────────────────────────────────────────────
async function sendViaUazapi(
  uazapiUrl: string,
  adminToken: string,
  instanceName: string,
  targetJid: string,
  messageType: string,
  content: string,
  mediaUrl?: string,
  mediaBase64?: string,
  mediaMimeType?: string,
  mediaFilename?: string,
): Promise<any> {
  const phone = jidToPhone(targetJid);
  const headers = { 'Authorization': adminToken, 'Content-Type': 'application/json' };

  if (messageType === 'text') {
    const response = await fetch(`${uazapiUrl}/send/text`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ phone, message: content, instanceName })
    });
    const json = await response.json();
    json._httpStatus = response.status;
    return json;
  } else if (['image', 'video', 'audio', 'document'].includes(messageType)) {
    const payload: any = { phone, instanceName, caption: content || '' };
    if (mediaUrl) { payload.url = mediaUrl; }
    else if (mediaBase64) {
      payload.base64 = mediaBase64;
      payload.mimetype = mediaMimeType;
      payload.filename = mediaFilename;
    }
    const response = await fetch(`${uazapiUrl}/send/media`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await response.json();
    json._httpStatus = response.status;
    return json;
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

    // Buscar instância
    let instance;
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

    if (!instance) throw new Error('Nenhuma instância WhatsApp disponível');

    // ─── ROTEAMENTO POR PROVEDOR ──────────────────────────────────────────────
    const apiType = instance.api_type || 'evolution';
    console.log('API Type da instância:', apiType);

    // ─── UAZAPI ──────────────────────────────────────────────────────────────
    if (apiType === 'uazapi') {
      // Buscar configs da UAZAPI no banco
      const { data: configs } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['uazapi_api_url', 'uazapi_admin_token']);

      const configMap: Record<string, string> = {};
      for (const c of configs || []) configMap[c.key] = c.value;

      const uazapiUrl = (configMap['uazapi_api_url'] || '').replace(/\/+$/, '');
      const adminToken = configMap['uazapi_admin_token'] || '';

      if (!uazapiUrl || !adminToken) {
        throw new Error('UAZAPI não configurada. Configure a URL e Admin Token nas configurações.');
      }

      // Verificar status real da instância via UAZAPI
      let isReallyConnected = instance.status === 'connected';
      if (isReallyConnected) {
        try {
          const checkResp = await fetch(`${uazapiUrl}/instance/status?instanceName=${instance.instance_name}`, {
            headers: { 'Authorization': adminToken },
            signal: AbortSignal.timeout(5000)
          });
          const checkData = await checkResp.json();
          const rawState = checkData?.state || checkData?.status || checkData?.connection || 'unknown';
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
        // Adicionar à fila
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

        return new Response(JSON.stringify({ success: true, queued: true, message: 'Mensagem adicionada à fila (instância offline)' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 202
        });
      }

      const formattedJid = remoteJid.includes('@') ? remoteJid : formatRemoteJid(remoteJid);
      const uazapiResponse = await sendViaUazapi(
        uazapiUrl, adminToken, instance.instance_name, formattedJid,
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
            last_message_preview: `❌ ${content?.substring(0, 80) || '[mídia]'}`,
          }).eq('id', conversationId);
        }
        return new Response(JSON.stringify({ success: false, error: errorMsg }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
        });
      }

      const messageIdExternal = uazapiResponse?.id || uazapiResponse?.messageId || uazapiResponse?.key?.id;

      // Salvar mídia no Storage se vier base64
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
        } catch (e) { console.error('Erro ao salvar mídia:', e); }
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

    // ─── EVOLUTION API (padrão) ───────────────────────────────────────────────
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API não configurada');
    }
    console.log('Evolution API URL normalizada:', evolutionApiUrl);

    // Verificar se instância está realmente conectada
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
        console.log('Falha ao verificar status real da instância (continuando com status do banco):', e);
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
        success: true, queued: true, message: 'Mensagem adicionada à fila (instância offline)'
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
        ? 'Este número não possui WhatsApp ativo. Verifique se o número está correto (com DDD).'
        : evolutionResponse?.error || 'Erro ao enviar mensagem pelo WhatsApp';

      if (conversationId) {
        await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationId, instance_id: instance.id, from_me: true,
          content, message_type: messageType, media_url: mediaUrl, status: 'error', error_message: errorMsg
        });
        await supabase.from('whatsapp_conversations').update({
          last_message_at: new Date().toISOString(),
          last_message_preview: `❌ ${content?.substring(0, 80) || '[mídia]'}`,
        }).eq('id', conversationId);
      }

      return new Response(JSON.stringify({ success: false, error: errorMsg, evolutionResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
      });
    }

    messageIdExternal = evolutionResponse?.key?.id || evolutionResponse?.messageId;

    // Upload de mídia base64 para Storage
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
      } catch (e) { console.error('Erro no upload de mídia:', e); }
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
    if (errorMessage.includes('not connected')) friendlyMessage = 'WhatsApp não está conectado. Verifique a instância.';
    else if (errorMessage.includes('invalid number')) friendlyMessage = 'Número de telefone inválido.';

    return new Response(JSON.stringify({ success: false, error: friendlyMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    });
  }
});
