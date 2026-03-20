import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Normaliza telefone brasileiro
function normalizePhone(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  if (!cleaned.match(/^55\d{10,11}$/)) return '';
  return cleaned;
}

function extractPhoneFromJid(jid: string): string {
  if (!jid) return '';
  return jid.split('@')[0];
}

function isGroupJid(jid: string): boolean {
  return jid?.includes('@g.us') || false;
}

// Base64 decode
function base64Decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function sanitizeMimeType(mimeType: string | null): string {
  if (!mimeType) return 'application/octet-stream';
  return mimeType.split(';')[0].trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    console.log('UAZAPI Webhook recebido:', JSON.stringify(payload).substring(0, 2000));

    // Estrutura do payload UAZAPI:
    // { event: 'message' | 'connection' | 'status', instanceName: string, data: {...} }
    const { event, instanceName, data } = payload;
    const normalizedEvent = event?.toLowerCase();

    // ─── CONNECTION UPDATE ────────────────────────────────────────────────────
    if (normalizedEvent === 'connection' || normalizedEvent === 'connection.update') {
      const state = data?.state || data?.status || data?.connection;
      console.log('UAZAPI Connection update:', instanceName, state);

      if (instanceName && state) {
        const connectedStates = ['open', 'connected', 'online'];
        const status = connectedStates.includes(String(state).toLowerCase()) ? 'connected' : 'disconnected';
        const updateData: any = { status };

        // Capturar número do celular se conectou
        if (status === 'connected' && data?.me?.id) {
          const phoneRaw = data.me.id.split('@')[0].split(':')[0];
          if (phoneRaw?.match(/^\d{10,15}$/)) {
            updateData.numero_whatsapp = phoneRaw;
          }
        }

        await supabase
          .from('whatsapp_instances')
          .update(updateData)
          .eq('instance_name', instanceName);
      }

      return new Response(JSON.stringify({ success: true, connectionUpdate: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ─── MESSAGE STATUS UPDATE ────────────────────────────────────────────────
    if (normalizedEvent === 'message.update' || normalizedEvent === 'messages.update') {
      const updates = Array.isArray(data) ? data : [data];
      for (const update of updates) {
        const messageId = update.id || update.key?.id || update.messageId;
        const statusRaw = update.status || update.ack;

        if (messageId && statusRaw !== undefined) {
          let status = 'sent';
          if (typeof statusRaw === 'number') {
            switch (statusRaw) {
              case 0: status = 'error'; break;
              case 1: status = 'pending'; break;
              case 2: status = 'server_ack'; break;
              case 3: status = 'delivery_ack'; break;
              case 4: status = 'read'; break;
              case 5: status = 'played'; break;
            }
          } else if (typeof statusRaw === 'string') {
            status = statusRaw.toLowerCase();
          }

          await supabase
            .from('whatsapp_messages')
            .update({ status })
            .eq('message_id_external', messageId);
        }
      }

      return new Response(JSON.stringify({ success: true, statusUpdated: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ─── MENSAGEM RECEBIDA ────────────────────────────────────────────────────
    // UAZAPI envia eventos: 'message', 'messages.upsert'
    if (!['message', 'messages.upsert', 'messages_upsert'].includes(normalizedEvent)) {
      console.log('UAZAPI evento ignorado:', event);
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar instância pelo nome
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('instance_name', instanceName)
      .single();

    if (!instance) {
      console.error('UAZAPI: Instância não encontrada:', instanceName);
      return new Response(JSON.stringify({ success: false, error: 'Instance not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Extrair dados da mensagem - UAZAPI pode enviar array ou objeto único
    const messages = Array.isArray(data) ? data : [data];
    const results = [];

    for (const msgData of messages) {
      try {
        // O formato do UAZAPI é compatível com o Evolution API
        const key = msgData.key || {};
        const remoteJid = key.remoteJid || msgData.remoteJid || msgData.from;
        const fromMe = key.fromMe ?? msgData.fromMe ?? false;
        const externalMessageId = key.id || msgData.id || msgData.messageId;
        const message = msgData.message || msgData.messages || {};
        const pushName = msgData.pushName || msgData.notifyName || '';

        if (!remoteJid) {
          console.log('remoteJid ausente, pulando mensagem');
          continue;
        }

        // Ignorar broadcasts
        if (remoteJid.includes('@broadcast')) {
          console.log('Broadcast ignorado');
          continue;
        }

        const isGroup = isGroupJid(remoteJid);

        // Extrair telefone do remetente
        let senderPhone = '';
        let senderName = !fromMe ? (pushName || '') : '';

        if (remoteJid.includes('@s.whatsapp.net')) {
          senderPhone = extractPhoneFromJid(remoteJid);
        }

        // Para grupos, extrair participante
        if (isGroup && (key.participant || msgData.participant)) {
          const participant = key.participant || msgData.participant;
          if (participant && !participant.includes('@lid')) {
            senderPhone = extractPhoneFromJid(participant);
          }
        }

        // Verificar mensagem duplicada (mensagens fromMe)
        if (fromMe && externalMessageId) {
          const { data: existingMsg } = await supabase
            .from('whatsapp_messages')
            .select('id')
            .eq('message_id_external', externalMessageId)
            .maybeSingle();

          if (existingMsg) {
            console.log('Mensagem duplicada ignorada:', externalMessageId);
            continue;
          }
        }

        // Extrair conteúdo e tipo
        let content = '';
        let messageType = 'text';
        let mediaUrl = null;
        let mediaMimeType = null;
        let mediaFilename = null;

        if (message.conversation) {
          content = message.conversation;
        } else if (message.extendedTextMessage) {
          content = message.extendedTextMessage.text || '';
        } else if (message.imageMessage) {
          messageType = 'image';
          content = message.imageMessage.caption || '';
          mediaMimeType = message.imageMessage.mimetype;
        } else if (message.videoMessage) {
          messageType = 'video';
          content = message.videoMessage.caption || '';
          mediaMimeType = message.videoMessage.mimetype;
        } else if (message.audioMessage) {
          messageType = 'audio';
          mediaMimeType = message.audioMessage.mimetype;
        } else if (message.documentMessage) {
          messageType = 'document';
          content = message.documentMessage.caption || '';
          mediaMimeType = message.documentMessage.mimetype;
          mediaFilename = message.documentMessage.fileName;
        } else if (message.stickerMessage) {
          messageType = 'sticker';
          mediaMimeType = message.stickerMessage.mimetype;
        } else if (message.locationMessage) {
          messageType = 'location';
          const loc = message.locationMessage;
          content = `📍 ${loc.degreesLatitude}, ${loc.degreesLongitude}`;
        }
        // UAZAPI também pode vir como texto puro no campo body
        else if (typeof msgData.body === 'string' && msgData.body) {
          content = msgData.body;
        } else if (typeof msgData.text === 'string' && msgData.text) {
          content = msgData.text;
        }

        // Extrair mensagem citada
        const contextInfo = msgData.contextInfo ||
          message.contextInfo ||
          message.extendedTextMessage?.contextInfo ||
          message.imageMessage?.contextInfo ||
          message.videoMessage?.contextInfo ||
          message.audioMessage?.contextInfo ||
          message.documentMessage?.contextInfo ||
          message.stickerMessage?.contextInfo;

        // Download de mídia via UAZAPI (se for mídia e tivermos as configs)
        if (['image', 'audio', 'document', 'video', 'sticker'].includes(messageType)) {
          try {
            // Buscar credenciais da UAZAPI
            const { data: configs } = await supabase
              .from('system_config')
              .select('key, value')
              .in('key', ['uazapi_api_url', 'uazapi_admin_token']);
            
            const configMap: Record<string, string> = {};
            for (const c of configs || []) configMap[c.key] = c.value;
            const uazapiUrl = (configMap['uazapi_api_url'] || '').replace(/\/+$/, '');
            const uazapiAdminToken = configMap['uazapi_admin_token'] || '';

            if (uazapiUrl && uazapiAdminToken) {
              console.log('Solicitando Base64 da mídia UAZAPI para:', externalMessageId);
              
              const mediaResponse = await fetch(`${uazapiUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
                method: 'POST',
                headers: {
                  'Authorization': uazapiAdminToken,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  message: { key }
                })
              });

              if (mediaResponse.ok) {
                const mediaData = await mediaResponse.json();
                const base64 = mediaData.base64 || mediaData.media?.base64;
                const mime = mediaData.mimetype || mediaData.media?.mimetype || mediaMimeType;

                if (base64) {
                  const base64Clean = base64.includes(',') ? base64.split(',')[1] : base64;
                  const buffer = base64Decode(base64Clean);

                  if (buffer.length > 0) {
                    let finalMimeType = sanitizeMimeType(mime);
                    const extMap: Record<string, string> = {
                      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 
                      'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3',
                      'application/pdf': 'pdf'
                    };
                    const ext = extMap[finalMimeType] || finalMimeType.split('/')[1] || 'bin';
                    const fileName = `${instance.id}/${Date.now()}_${mediaFilename || `media.${ext}`}`;

                    const { data: uploadData, error: uploadError } = await supabase.storage
                      .from('whatsapp-media')
                      .upload(fileName, buffer, { contentType: finalMimeType, upsert: false });

                    if (!uploadError && uploadData) {
                      const { data: publicUrl } = supabase.storage.from('whatsapp-media').getPublicUrl(fileName);
                      mediaUrl = publicUrl.publicUrl;
                      mediaMimeType = finalMimeType;
                      console.log('Mídia UAZAPI salva com sucesso no storage:', mediaUrl);
                    }
                  }
                }
              } else {
                console.error('Falha ao obter Base64 da UAZAPI:', mediaResponse.status);
              }
            }
          } catch (mediaErr) {
            console.error('Erro ao processar mídia UAZAPI:', mediaErr);
          }
        }

        let quotedMessageId = null;
        let quotedContent = null;
        let quotedSender = null;

        if (contextInfo?.stanzaId) {
          const { data: quotedMsg } = await supabase
            .from('whatsapp_messages')
            .select('id, content, sender_name')
            .eq('message_id_external', contextInfo.stanzaId)
            .maybeSingle();

          if (quotedMsg) {
            quotedMessageId = quotedMsg.id;
            quotedContent = quotedMsg.content;
            quotedSender = quotedMsg.sender_name;
          } else {
            quotedContent = contextInfo.quotedMessage?.conversation ||
              contextInfo.quotedMessage?.extendedTextMessage?.text ||
              '[Mensagem]';
          }
        }

        // Buscar ou criar conversa
        const normalizedPhone = normalizePhone(senderPhone);

        let conversation;
        const { data: byJid } = await supabase
          .from('whatsapp_conversations')
          .select('*')
          .eq('instance_id', instance.id)
          .eq('remote_jid', remoteJid)
          .maybeSingle();

        let existingConversation = byJid;

        if (!existingConversation && !isGroup && normalizedPhone) {
          const { data: byPhone } = await supabase
            .from('whatsapp_conversations')
            .select('*')
            .eq('instance_id', instance.id)
            .eq('contact_phone', normalizedPhone)
            .order('last_message_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (byPhone) existingConversation = byPhone;
        }

        if (existingConversation) {
          conversation = existingConversation;
          const updateData: any = {
            last_message_at: new Date().toISOString(),
            last_message_preview: content?.substring(0, 100) || `[${messageType}]`
          };

          if (!fromMe) {
            updateData.unread_count = (conversation.unread_count || 0) + 1;
            if (conversation.status === 'finished') {
              updateData.status = 'pending';
              updateData.assigned_to = null;
              updateData.finished_by = null;
            }
          }

          if (!isGroup && !fromMe && senderName && senderName !== conversation.contact_name) {
            updateData.contact_name = senderName;
          }

          if (!isGroup && normalizedPhone && normalizedPhone.match(/^55\d{10,11}$/)) {
            const savedPhone = conversation.contact_phone || '';
            if (!savedPhone.match(/^55\d{10,11}$/)) {
              updateData.contact_phone = normalizedPhone;
            }
          }

          await supabase.from('whatsapp_conversations').update(updateData).eq('id', conversation.id);
        } else {
          const { data: newConversation, error: convError } = await supabase
            .from('whatsapp_conversations')
            .insert({
              instance_id: instance.id,
              remote_jid: remoteJid,
              is_group: isGroup,
              contact_name: isGroup ? null : senderName,
              contact_phone: isGroup ? null : normalizedPhone || null,
              status: 'pending',
              unread_count: fromMe ? 0 : 1,
              last_message_at: new Date().toISOString(),
              last_message_preview: content?.substring(0, 100) || `[${messageType}]`
            })
            .select()
            .single();

          if (convError) throw convError;
          conversation = newConversation;
        }

        // Salvar mensagem
        const { data: savedMessage, error: msgError } = await supabase
          .from('whatsapp_messages')
          .insert({
            conversation_id: conversation.id,
            instance_id: instance.id,
            message_id_external: externalMessageId,
            from_me: fromMe,
            sender_phone: senderPhone,
            sender_name: senderName,
            content,
            message_type: messageType,
            media_url: mediaUrl,
            media_mime_type: mediaMimeType,
            media_filename: mediaFilename,
            quoted_message_id: quotedMessageId,
            quoted_content: quotedContent,
            quoted_sender: quotedSender,
            status: fromMe ? 'sent' : 'delivered'
          })
          .select()
          .single();

        if (msgError) throw msgError;

        results.push({ messageId: savedMessage.id, conversationId: conversation.id });
        console.log('UAZAPI mensagem salva:', savedMessage.id);
      } catch (msgErr) {
        console.error('Erro ao processar mensagem UAZAPI:', msgErr);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Erro no webhook UAZAPI:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
