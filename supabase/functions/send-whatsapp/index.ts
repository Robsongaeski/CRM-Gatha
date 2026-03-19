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
  
  // 55 + DDD(2) + 9 dígitos = 13 → tentar sem o nono dígito
  if (cleaned.length === 13 && cleaned.startsWith('55') && cleaned[4] === '9') {
    variations.push(cleaned.slice(0, 4) + cleaned.slice(5));
  }
  // 55 + DDD(2) + 8 dígitos = 12 → tentar com o nono dígito
  else if (cleaned.length === 12 && cleaned.startsWith('55')) {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API não configurada');
    }

    // Normalizar URL - remover barra final e /manager se presente
    evolutionApiUrl = evolutionApiUrl.replace(/\/+$/, '').replace(/\/manager$/, '');
    console.log('Evolution API URL normalizada:', evolutionApiUrl);

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
      conversationId
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
      // Usar primeira instância ativa
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('is_active', true)
        .order('ordem', { ascending: true })
        .limit(1)
        .single();
      instance = data;
    }

    if (!instance) {
      throw new Error('Nenhuma instância WhatsApp disponível');
    }

    // Verificar se instância está realmente conectada (checar Evolution API se banco diz connected)
    let isReallyConnected = instance.status === 'connected';
    
    if (isReallyConnected) {
      try {
        const checkUrl = `${evolutionApiUrl}/instance/connectionState/${instance.instance_name}`;
        const checkResp = await fetch(checkUrl, {
          headers: { 'apikey': evolutionApiKey },
          signal: AbortSignal.timeout(5000)
        });
        const checkData = await checkResp.json();
        const rawState = checkData?.instance?.state || checkData?.state || 'unknown';
        const connectedStates = ['open', 'connected', 'online'];
        if (!connectedStates.includes(String(rawState).toLowerCase())) {
          console.log(`Instância ${instance.instance_name} reporta status "${rawState}" na Evolution API, atualizando banco`);
          isReallyConnected = false;
          await supabase.from('whatsapp_instances').update({ status: 'disconnected' }).eq('id', instance.id);
        }
      } catch (e) {
        console.log('Falha ao verificar status real da instância (continuando com status do banco):', e);
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

      // Também salvar a mensagem no banco para aparecer na conversa com status 'queued'
      if (conversationId) {
        await supabase
          .from('whatsapp_messages')
          .insert({
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

        // Atualizar conversa
        await supabase
          .from('whatsapp_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: content?.substring(0, 100) || `[${messageType}]`,
            unread_count: 0
          })
          .eq('id', conversationId);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        queued: true,
        message: 'Mensagem adicionada à fila (instância offline)'
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202
      });
    }

    // Se o remoteJid é @lid (Linked Device ID), tentar usar o contact_phone real da conversa
    // Isso resolve problemas de entrega em algumas instâncias onde @lid não funciona bem
    let formattedJid = remoteJid.includes('@') ? remoteJid : formatRemoteJid(remoteJid);
    
    if (formattedJid.includes('@lid') && conversationId) {
      const { data: convData } = await supabase
        .from('whatsapp_conversations')
        .select('contact_phone')
        .eq('id', conversationId)
        .single();
      
      if (convData?.contact_phone && convData.contact_phone.match(/^\d{10,13}$/)) {
        const phoneJid = formatRemoteJid(convData.contact_phone);
        console.log(`Substituindo @lid (${formattedJid}) por telefone real: ${phoneJid}`);
        formattedJid = phoneJid;
      }
    }
    
    let evolutionResponse;
    let messageIdExternal;
    let usedJid = formattedJid;

    // Preparar quoted options se houver
    let quotedOptions: any = {};
    if (quotedMessageId) {
      const { data: quotedMsg } = await supabase
        .from('whatsapp_messages')
        .select('message_id_external')
        .eq('id', quotedMessageId)
        .single();
      
      if (quotedMsg?.message_id_external) {
        quotedOptions = {
          quoted: {
            key: {
              remoteJid: formattedJid,
              id: quotedMsg.message_id_external
            }
          }
        };
      }
    }

    // Função auxiliar para enviar via Evolution API
    async function sendViaEvolution(targetJid: string) {
      if (messageType === 'text') {
        const response = await fetch(`${evolutionApiUrl}/message/sendText/${instance.instance_name}`, {
          method: 'POST',
          headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ number: targetJid, text: content, ...quotedOptions })
        });
        const httpStatus = response.status;
        const json = await response.json();
        json._httpStatus = httpStatus;
        return json;
      } else if (['image', 'video', 'audio', 'document'].includes(messageType)) {
        const mediaPayload: any = {
          number: targetJid, caption: content || '', mediatype: messageType, ...quotedOptions
        };
        if (mediaBase64) {
          mediaPayload.media = mediaBase64;
          mediaPayload.mimetype = mediaMimeType;
          mediaPayload.fileName = mediaFilename || `file.${mediaMimeType?.split('/')[1] || 'bin'}`;
        } else if (mediaUrl) {
          mediaPayload.media = mediaUrl;
        }
        const response = await fetch(`${evolutionApiUrl}/message/sendMedia/${instance.instance_name}`, {
          method: 'POST',
          headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(mediaPayload)
        });
        const httpStatus = response.status;
        const json = await response.json();
        json._httpStatus = httpStatus;
        return json;
      }
      return null;
    }

    // Verificar se resposta indica número inexistente
    function isNumberNotFound(resp: any): boolean {
      return resp && (
        (Array.isArray(resp?.response?.message) && resp.response.message.some((m: any) => m.exists === false)) ||
        (resp?._httpStatus >= 400 && JSON.stringify(resp).includes('exists'))
      );
    }

    function hasApiError(resp: any): boolean {
      return resp?.error || resp?._httpStatus >= 400 || isNumberNotFound(resp);
    }

    // Tentar enviar - com retry automático alternando nono dígito
    const phoneVariations = getPhoneVariations(formattedJid);
    
    evolutionResponse = await sendViaEvolution(formattedJid);
    console.log('Evolution response (tentativa 1):', evolutionResponse);

    // Se número não encontrado e temos variação, tentar com formato alternativo
    if (isNumberNotFound(evolutionResponse) && phoneVariations.length > 1) {
      const altJid = `${phoneVariations[1]}@s.whatsapp.net`;
      console.log(`Número não encontrado com ${formattedJid}, tentando variação: ${altJid}`);
      
      const altResponse = await sendViaEvolution(altJid);
      console.log('Evolution response (tentativa 2 - variação):', altResponse);
      
      if (!hasApiError(altResponse)) {
        evolutionResponse = altResponse;
        usedJid = altJid;
      }
    }

    // Verificar erro final após tentativas
    if (hasApiError(evolutionResponse)) {
      const numberNotExists = isNumberNotFound(evolutionResponse);
      const errorMsg = numberNotExists
        ? 'Este número não possui WhatsApp ativo. Verifique se o número está correto (com DDD).'
        : evolutionResponse?.error || 'Erro ao enviar mensagem pelo WhatsApp';
      
      console.error('Erro da Evolution API:', errorMsg, evolutionResponse);
      
      if (conversationId) {
        await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationId, instance_id: instance.id, from_me: true,
          content, message_type: messageType, media_url: mediaUrl,
          status: 'error', error_message: errorMsg
        });
        await supabase.from('whatsapp_conversations').update({
          last_message_at: new Date().toISOString(),
          last_message_preview: `❌ ${content?.substring(0, 80) || '[mídia]'}`,
        }).eq('id', conversationId);
      }
      
      return new Response(JSON.stringify({ 
        success: false, error: errorMsg, evolutionResponse
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
      });
    }

    // Extrair ID da mensagem
    messageIdExternal = evolutionResponse?.key?.id || evolutionResponse?.messageId;

    // Determinar a URL da mídia para salvar
    // Se temos base64, fazer upload para Supabase Storage
    let finalMediaUrl = mediaUrl;
    
    if (mediaBase64 && !finalMediaUrl) {
      try {
        // Gerar nome único para o arquivo
        const fileExt = mediaMimeType?.split('/')[1] || 'bin';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `whatsapp-media/${fileName}`;
        
        // Converter base64 para Uint8Array
        const binaryString = atob(mediaBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Upload para Supabase Storage
        const { error: uploadError } = await supabase
          .storage
          .from('whatsapp-media')
          .upload(filePath, bytes, {
            contentType: mediaMimeType || 'application/octet-stream',
            upsert: false
          });
        
        if (!uploadError) {
          // Gerar URL pública
          const { data: publicUrlData } = supabase
            .storage
            .from('whatsapp-media')
            .getPublicUrl(filePath);
          
          finalMediaUrl = publicUrlData?.publicUrl;
          console.log('Mídia salva no Storage:', finalMediaUrl);
        } else {
          console.error('Erro ao fazer upload da mídia:', uploadError);
        }
      } catch (uploadErr) {
        console.error('Erro ao processar upload da mídia:', uploadErr);
      }
    }

    // Salvar mensagem no banco
    const { data: savedMessage, error: saveError } = await supabase
      .from('whatsapp_messages')
      .insert({
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
        status: 'sent'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Erro ao salvar mensagem:', saveError);
    }

    // Atualizar conversa
    if (conversationId) {
      await supabase
        .from('whatsapp_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: content?.substring(0, 100) || `[${messageType}]`,
          unread_count: 0
        })
        .eq('id', conversationId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: savedMessage,
      evolutionResponse 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    console.error('Erro ao enviar WhatsApp:', error);
    
    // Traduzir erros comuns
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    let friendlyMessage = errorMessage;
    if (errorMessage.includes('not connected')) {
      friendlyMessage = 'WhatsApp não está conectado. Verifique a instância.';
    } else if (errorMessage.includes('invalid number')) {
      friendlyMessage = 'Número de telefone inválido.';
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: friendlyMessage 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
