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
  
  // Validar que parece um telefone brasileiro válido
  // Telefones brasileiros têm 10-11 dígitos (sem código do país) ou 12-13 (com 55)
  if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  
  // Após normalização, deve ter 12-13 dígitos (55 + DDD + número)
  // Se não tiver esse formato, retornar vazio para evitar salvar números inválidos
  if (!cleaned.match(/^55\d{10,11}$/)) {
    return '';
  }
  
  return cleaned;
}

// Extrai telefone do JID
function extractPhoneFromJid(jid: string): string {
  if (!jid) return '';
  return jid.split('@')[0];
}

// Verifica se é grupo
function isGroupJid(jid: string): boolean {
  return jid?.includes('@g.us') || false;
}

// Verifica se é Linked ID (não é telefone real)
function isLinkedId(jid: string): boolean {
  return jid?.includes('@lid') || false;
}

// Verifica magic bytes para validar imagem
function isValidImage(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false;
  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50;
  const isWebp = buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  const isGif = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46;
  return isJpeg || isPng || isWebp || isGif;
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

// Sanitiza mime type removendo parâmetros (ex: "audio/ogg; codecs=opus" -> "audio/ogg")
function sanitizeMimeType(mimeType: string | null): string {
  if (!mimeType) return 'application/octet-stream';
  return mimeType.split(';')[0].trim();
}

// Infere mime type pelos magic bytes do buffer
function inferMimeTypeFromBuffer(buffer: Uint8Array, mediaType: string, fallback: string): string {
  if (buffer.length < 12) return fallback;
  
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
  // WebP: RIFF....WEBP (bytes 8-11)
  if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  // GIF: GIF8
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  // MP4: ftyp (bytes 4-7)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return 'video/mp4';
  // PDF: %PDF
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return 'application/pdf';
  // OGG: OggS
  if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) return 'audio/ogg';
  
  // Fallback por tipo de mídia
  if (mediaType === 'image') return 'image/jpeg';
  if (mediaType === 'sticker') return 'image/webp';
  if (mediaType === 'video') return 'video/mp4';
  if (mediaType === 'audio') return 'audio/ogg';
  if (mediaType === 'document') return 'application/octet-stream';
  
  return fallback;
}

function parseEvolutionContact(contactData: any): { name: string | null; photoUrl: string | null } {
  const first = Array.isArray(contactData) ? contactData[0] : contactData;
  if (!first || typeof first !== 'object') return { name: null, photoUrl: null };

  const name = first.pushName || first.name || first.notify || first.waName || first.contactName || null;
  const photoUrl = first.profilePicUrl ||
    first.profilePictureUrl ||
    first.pictureUrl ||
    first.image ||
    first.imageUrl ||
    first.photo ||
    null;

  return {
    name: typeof name === 'string' && name.trim() ? name.trim() : null,
    photoUrl: typeof photoUrl === 'string' && photoUrl.trim() ? photoUrl.trim() : null,
  };
}

async function fetchEvolutionContactData(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  remoteJid: string,
  senderPhone: string,
): Promise<{ name: string | null; photoUrl: string | null }> {
  const candidates = [
    remoteJid?.includes('@s.whatsapp.net') ? remoteJid : null,
    senderPhone ? `${senderPhone}@s.whatsapp.net` : null,
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const contactResponse = await fetch(`${evolutionApiUrl}/chat/findContacts/${instanceName}`, {
        method: 'POST',
        headers: {
          'apikey': evolutionApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          where: { id: candidate }
        })
      });
      if (!contactResponse.ok) continue;
      const contactData = await contactResponse.json();
      const parsed = parseEvolutionContact(contactData);
      if (parsed.name || parsed.photoUrl) return parsed;
    } catch {
      // ignore
    }
  }

  return { name: null, photoUrl: null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    let evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    // Normalizar URL da Evolution API - remover barra final e /manager se presente
    if (evolutionApiUrl) {
      evolutionApiUrl = evolutionApiUrl.replace(/\/+$/, '').replace(/\/manager$/, '');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const payload = await req.json();
    console.log('Webhook recebido:', JSON.stringify(payload, null, 2).substring(0, 2000));

    const { event, instance: instanceName, data, sender: payloadSender } = payload;
    
    // Normalizar nome do evento (Evolution API v2 usa maiúsculo)
    const normalizedEvent = event?.toLowerCase();

    // Processar CONNECTION_UPDATE para atualizar status da instância
    if (normalizedEvent === 'connection.update') {
      const state = data?.state || data?.status || data?.instance?.state || data?.instance?.status || data?.connection?.state;
      const stateNormalized = String(state || '').toLowerCase().trim();
      const connectedStates = new Set(['open', 'opened', 'connected', 'online', 'authenticated', 'ready']);
      const isConnected = connectedStates.has(stateNormalized);
      console.log('Connection update:', instanceName, state, stateNormalized);
      
      if (instanceName && state) {
        const status = isConnected ? 'connected' : 'disconnected';
        const updateData: any = { status };
        let resolvedInstanceId: string | null = null;
        
        // Se conectou, tentar extrair o número do payload
        if (isConnected) {
          // O número pode vir em diferentes campos do payload
          const ownerJid = data?.ownerJid || data?.owner || data?.instance?.ownerJid || data?.instance?.owner;
          if (ownerJid) {
            const numeroWhatsapp = ownerJid.split('@')[0].split(':')[0];
            if (numeroWhatsapp && numeroWhatsapp.match(/^\d{10,15}$/)) {
              updateData.numero_whatsapp = numeroWhatsapp;
              console.log('Número capturado do connection.update:', numeroWhatsapp);
            }
          }
        }
        
        const { data: updatedInstance } = await supabase
          .from('whatsapp_instances')
          .select('id')
          .update(updateData)
          .eq('instance_name', instanceName)
          .maybeSingle();

        resolvedInstanceId = updatedInstance?.id || null;

        // Reaproveita a lógica central de conflito/migração por número
        if (status === 'connected' && resolvedInstanceId) {
          supabase.functions.invoke('whatsapp-instance-manage', {
            body: {
              action: 'check-status',
              instanceId: resolvedInstanceId,
              instanceName,
              apiType: 'evolution',
            },
          }).catch((err) => {
            console.error('Erro ao reconciliar status após connection.update:', err);
          });
        }
      }
      
      return new Response(JSON.stringify({ success: true, connectionUpdate: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Processar MESSAGES.UPDATE para atualizar status de entrega/leitura
    if (normalizedEvent === 'messages.update') {
      console.log('Message update recebido:', JSON.stringify(data, null, 2));
      
      // data pode ser um array de updates ou um único objeto
      const updates = Array.isArray(data) ? data : [data];
      
      for (const update of updates) {
        // O Evolution API v2 envia: data.keyId (ID externo da mensagem) e data.status (string)
        // Também pode vir em formato antigo: update.key.id e update.update.status
        const messageId = update.keyId || update.key?.id || update.messageId;
        const statusRaw = update.status || update.update?.status;
        
        if (messageId && statusRaw !== undefined) {
          // Normalizar status para lowercase
          let status = 'sent';
          
          if (typeof statusRaw === 'number') {
            // Formato numérico: 0 = error, 1 = pending, 2 = server_ack, 3 = delivery_ack, 4 = read, 5 = played
            switch (statusRaw) {
              case 0: status = 'error'; break;
              case 1: status = 'pending'; break;
              case 2: status = 'server_ack'; break;
              case 3: status = 'delivery_ack'; break;
              case 4: status = 'read'; break;
              case 5: status = 'played'; break;
            }
          } else if (typeof statusRaw === 'string') {
            // Formato string: SERVER_ACK, DELIVERY_ACK, READ, etc.
            status = statusRaw.toLowerCase();
          }
          
          console.log('Atualizando status da mensagem:', messageId, '-> status:', status);
          
          const { error: updateError } = await supabase
            .from('whatsapp_messages')
            .update({ status })
            .eq('message_id_external', messageId);
          
          if (updateError) {
            console.error('Erro ao atualizar status:', updateError);
          } else {
            console.log('Status atualizado com sucesso para:', messageId);
          }
        }
      }
      
      return new Response(JSON.stringify({ success: true, statusUpdated: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Ignorar eventos que não são mensagens
    if (normalizedEvent !== 'messages.upsert') {
      console.log('Evento ignorado:', event);
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
      console.error('Instância não encontrada:', instanceName);
      return new Response(JSON.stringify({ success: false, error: 'Instance not found' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    // Extrair dados da mensagem - key pode estar em diferentes lugares
    const key = data.key || {};
    const remoteJid = key.remoteJid || data.remoteJid || data.from;
    const fromMe = key.fromMe || data.fromMe || false;
    const externalMessageId = key.id || data.messageId;
    const message = data.message || {};
    const pushName = data.pushName || '';

    // Ignorar broadcasts
    if (remoteJid?.includes('@broadcast')) {
      console.log('Broadcast ignorado');
      return new Response(JSON.stringify({ success: true, ignored: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Verificar se é grupo
    const isGroup = isGroupJid(remoteJid);
    const groupId = isGroup ? remoteJid.split('@')[0] : null;

    // Extrair telefone do remetente
    // IMPORTANTE: Se remoteJid é @lid (Linked Device ID), usar remoteJidAlt que contém o número real do contato
    // O campo 'sender' do payload raiz contém o número da INSTÂNCIA, não do contato!
    let senderPhone = '';
    let senderName = '';
    
    // Para mensagens fromMe (enviadas pela instância), não usar pushName pois é o nome da instância
    // Para mensagens recebidas (não fromMe), pushName é do cliente
    if (!fromMe && pushName) {
      senderName = pushName;
    }
    
    if (isLinkedId(remoteJid)) {
      // Para @lid, o número real do CONTATO está em remoteJidAlt
      const remoteJidAlt = key.remoteJidAlt;
      if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
        senderPhone = extractPhoneFromJid(remoteJidAlt);
        console.log('Número real extraído do remoteJidAlt:', senderPhone);
      } else {
        // Fallback para @lid sem remoteJidAlt: NÃO usar o LID como telefone, deixar vazio
        // Isso evita salvar números inválidos
        console.log('remoteJid é @lid mas sem remoteJidAlt válido - telefone não extraído');
        senderPhone = '';
      }
    } else if (remoteJid?.includes('@s.whatsapp.net')) {
      senderPhone = extractPhoneFromJid(remoteJid);
    }

    // Para grupos, extrair participante
    if (isGroup && (key.participant || key.participantAlt)) {
      const participant = key.participantAlt || key.participant;
      // Ignorar @lid (linked device IDs)
      if (!participant.includes('@lid')) {
        senderPhone = extractPhoneFromJid(participant);
      }

      if (!fromMe && !senderName) {
        senderName = data.participantName ||
          data.authorName ||
          data.senderName ||
          data.notifyName ||
          '';
      }

      if (!fromMe && !senderName && senderPhone) {
        senderName = senderPhone;
      }
    }

    // Verificar mensagem duplicada (fromMe)
    if (fromMe && externalMessageId) {
      const { data: existingMsg } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('message_id_external', externalMessageId)
        .maybeSingle();
      
      if (existingMsg) {
        console.log('Mensagem duplicada ignorada:', externalMessageId);
        return new Response(JSON.stringify({ success: true, duplicate: true }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    // Extrair conteúdo e tipo da mensagem
    let content = '';
    let messageType = 'text';
    let mediaUrl = null;
    let mediaMimeType = null;
    let mediaFilename = null;

    // Processar diferentes tipos de mensagem
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
    } else if (message.reactionMessage) {
      // Processar reação
      const reactionKey = message.reactionMessage.key;
      const emoji = message.reactionMessage.text;
      
      if (reactionKey?.id) {
        const { data: originalMsg } = await supabase
          .from('whatsapp_messages')
          .select('id, reactions')
          .eq('message_id_external', reactionKey.id)
          .maybeSingle();
        
        if (originalMsg) {
          const reactions = [...(originalMsg.reactions || [])];
          if (emoji?.trim()) {
            reactions.push({ emoji, sender_name: senderName, sender_phone: senderPhone });
          }
          await supabase
            .from('whatsapp_messages')
            .update({ reactions })
            .eq('id', originalMsg.id);
        }
      }
      
      return new Response(JSON.stringify({ success: true, reaction: true }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    } else if (message.locationMessage) {
      messageType = 'location';
      const loc = message.locationMessage;
      content = `📍 ${loc.degreesLatitude}, ${loc.degreesLongitude}`;
    }

    // Extrair contextInfo (mensagem citada) - pode estar em vários lugares
    const contextInfo = data.contextInfo || 
                        message.contextInfo ||
                        message.extendedTextMessage?.contextInfo || 
                        message.imageMessage?.contextInfo ||
                        message.videoMessage?.contextInfo ||
                        message.audioMessage?.contextInfo ||
                        message.documentMessage?.contextInfo ||
                        message.stickerMessage?.contextInfo;

    let quotedMessageId = null;
    let quotedContent = null;
    let quotedSender = null;

    if (contextInfo?.stanzaId) {
      // Buscar mensagem citada no banco
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
        // Tentar extrair do contextInfo
        quotedContent = contextInfo.quotedMessage?.conversation || 
                        contextInfo.quotedMessage?.extendedTextMessage?.text ||
                        contextInfo.quotedMessage?.imageMessage?.caption ||
                        '[Mensagem]';
      }
    }

    // Download de mídia via Evolution API (NUNCA direto!) - Stickers e Videos NÃO são salvos no storage para economizar espaço
    if (['image', 'audio', 'document'].includes(messageType)) {
      try {
        // Buscar configurações da Evolution API no banco para garantir sincronia com a UI
        const { data: configs } = await supabase
          .from('system_config')
          .select('key, value')
          .in('key', ['evolution_api_url', 'evolution_api_key']);
        
        const configMap: Record<string, string> = {};
        for (const c of configs || []) configMap[c.key] = c.value;
        
        const finalApiUrl = (configMap['evolution_api_url'] || evolutionApiUrl || '').replace(/\/+$/, '').replace(/\/manager$/, '');
        const finalApiKey = configMap['evolution_api_key'] || evolutionApiKey || '';

        if (finalApiUrl && finalApiKey) {
          console.log('Tentando baixar mídia:', messageType, 'da URL:', finalApiUrl, 'Instância:', instanceName);
          
          const mediaResponse = await fetch(`${finalApiUrl}/chat/getBase64FromMediaMessage/${instanceName}`, {
            method: 'POST',
            headers: {
              'apikey': finalApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              message: { key },
              convertToMp4: false
            }),
            signal: AbortSignal.timeout(60000) // 60s timeout
          });

          console.log('Media response status:', mediaResponse.status);

          if (!mediaResponse.ok) {
            const errorText = await mediaResponse.text();
            console.error('Erro ao buscar mídia - status:', mediaResponse.status, 'resposta:', errorText);
          } else {
            const mediaData = await mediaResponse.json();
            console.log('Media data recebido, tem base64:', !!mediaData.base64, 'mimetype:', mediaData.mimetype);
            
            if (mediaData.base64) {
              const base64Clean = mediaData.base64.includes(',') 
                ? mediaData.base64.split(',')[1] 
                : mediaData.base64;
              
              const buffer = base64Decode(base64Clean);
              console.log('Buffer size:', buffer.length);
              
              if (messageType === 'image' && !isValidImage(buffer)) {
                console.log('Imagem inválida (magic bytes não conferem)');
              } else if (buffer.length > 0) {
                let finalMimeType = sanitizeMimeType(mediaData.mimetype || mediaMimeType);
                if (finalMimeType === 'application/octet-stream') {
                  finalMimeType = inferMimeTypeFromBuffer(buffer, messageType, finalMimeType);
                }
                
                const extMap: Record<string, string> = {
                  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
                  'video/mp4': 'mp4', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3',
                  'application/pdf': 'pdf'
                };
                const ext = extMap[finalMimeType] || finalMimeType.split('/')[1] || 'bin';
                const fileName = `${instance.id}/${Date.now()}_${mediaFilename || `media.${ext}`}`;
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('whatsapp-media')
                  .upload(fileName, buffer, { contentType: finalMimeType, upsert: false });

                if (uploadError) {
                  console.error('Erro upload storage:', uploadError);
                } else if (uploadData) {
                  const { data: publicUrl } = supabase.storage.from('whatsapp-media').getPublicUrl(fileName);
                  mediaUrl = publicUrl.publicUrl;
                  mediaMimeType = finalMimeType;
                  console.log('Mídia salva com sucesso:', mediaUrl);
                }
              }
            }
          }
        }
      } catch (mediaError) {
        console.error('Erro ao baixar mídia:', mediaError);
      }
    }

    // Buscar ou criar conversa
    // Primeiro buscar por remote_jid exato, depois por contact_phone (para tratar @lid)
    let conversation;
    let existingConversation = null;
    
    // Busca 1: pelo remote_jid exato
    const { data: byJid } = await supabase
      .from('whatsapp_conversations')
      .select('*')
      .eq('instance_id', instance.id)
      .eq('remote_jid', remoteJid)
      .maybeSingle();
    
    existingConversation = byJid;
    
    // Busca 2: Se não achou e temos um telefone válido (não é grupo), buscar pelo contact_phone
    // Isso resolve o problema de @lid criando conversas duplicadas
    const normalizedPhone = normalizePhone(senderPhone);
    if (!existingConversation && !isGroup && normalizedPhone) {
      const { data: byPhone } = await supabase
        .from('whatsapp_conversations')
        .select('*')
        .eq('instance_id', instance.id)
        .eq('contact_phone', normalizedPhone)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (byPhone) {
        existingConversation = byPhone;
        console.log('Conversa encontrada pelo contact_phone:', normalizedPhone, 'id:', byPhone.id);
      }
    }

    if (existingConversation) {
      conversation = existingConversation;
      
      // Atualizar conversa
      const updateData: any = {
        last_message_at: new Date().toISOString(),
        last_message_preview: content?.substring(0, 100) || `[${messageType}]`
      };
      
      // Incrementar unread apenas se não for mensagem própria
      if (!fromMe) {
        updateData.unread_count = (conversation.unread_count || 0) + 1;
        
        // Se conversa está finalizada e cliente mandou mensagem, reativar automaticamente
        // E limpar o atendente para que qualquer um possa atender
        if (conversation.status === 'finished') {
          updateData.status = 'pending';
          updateData.assigned_to = null;
          updateData.finished_by = null;
          console.log('Conversa finalizada reativada automaticamente (atendente removido):', conversation.id);
        }
      }
      
      // Atualizar nome do contato apenas se NÃO for mensagem nossa e temos um nome válido
      // Evita sobrescrever com nome da instância ("Ana atendimento")
      if (!isGroup && !fromMe && senderName && senderName !== conversation.contact_name) {
        // Verificar se o nome parece ser de uma instância/atendente
        const instanceName = instance.nome || '';
        const lowerName = senderName.toLowerCase();
        const isInstanceName = lowerName.includes('atendimento') || 
          lowerName.includes(instanceName.toLowerCase()) ||
          lowerName === instanceName.toLowerCase();
        
        if (!isInstanceName) {
          updateData.contact_name = senderName;
        }
      }
      
      // IMPORTANTE: Atualizar telefone se temos um número real e o salvo é inválido
      if (!isGroup && senderPhone && senderPhone.match(/^55\d{10,11}$/)) {
        const savedPhone = conversation.contact_phone || '';
        // Se o telefone salvo não parece um número brasileiro válido, atualizar
        // Também atualizar se o telefone salvo é igual ao número da instância (erro anterior)
        const instancePhone = extractPhoneFromJid(instance.instance_name || '');
        if (!savedPhone.match(/^55\d{10,11}$/) || savedPhone.includes(instancePhone)) {
          updateData.contact_phone = senderPhone;
          console.log('Atualizando telefone de', savedPhone, 'para', senderPhone);
        }
      }

      // Se ainda não tem foto do contato, tentar buscar no provider
      if (!isGroup && !fromMe && !conversation.contact_photo_url && evolutionApiUrl && evolutionApiKey && senderPhone) {
        try {
          const contactData = await fetchEvolutionContactData(
            evolutionApiUrl,
            evolutionApiKey,
            instanceName,
            remoteJid,
            senderPhone,
          );
          if (contactData.photoUrl) {
            updateData.contact_photo_url = contactData.photoUrl;
          }
          if (!updateData.contact_name && !conversation.contact_name && contactData.name) {
            updateData.contact_name = contactData.name;
          }
        } catch (e) {
          console.error('Erro ao buscar foto do contato (update):', e);
        }
      }

      // Para grupos: buscar nome se ainda não tiver
      if (isGroup && !conversation.group_name && evolutionApiUrl && evolutionApiKey) {
        try {
          console.log('Buscando metadata do grupo existente:', remoteJid);
          const groupResponse = await fetch(
            `${evolutionApiUrl}/group/findGroupInfos/${instanceName}?groupJid=${remoteJid}`,
            { headers: { 'apikey': evolutionApiKey } }
          );
          if (groupResponse.ok) {
            const groupData = await groupResponse.json();
            console.log('Group metadata:', groupData);
            if (groupData.subject || groupData.name) {
              updateData.group_name = groupData.subject || groupData.name;
            }
            if (groupData.pictureUrl) {
              updateData.group_photo_url = groupData.pictureUrl;
            }
          }
        } catch (e) {
          console.error('Erro ao buscar info do grupo (update):', e);
        }
      }

      await supabase
        .from('whatsapp_conversations')
        .update(updateData)
        .eq('id', conversation.id);
    } else {
      // Criar nova conversa
      let groupName = null;
      let groupPhotoUrl = null;
      let contactPhotoUrl = null;

      // Buscar metadados do grupo
      if (isGroup && evolutionApiUrl && evolutionApiKey) {
        try {
          console.log('Buscando metadata do grupo novo:', remoteJid);
          const groupResponse = await fetch(
            `${evolutionApiUrl}/group/findGroupInfos/${instanceName}?groupJid=${remoteJid}`,
            { headers: { 'apikey': evolutionApiKey } }
          );
          if (groupResponse.ok) {
            const groupData = await groupResponse.json();
            console.log('Group metadata:', groupData);
            groupName = groupData.subject || groupData.name;
            groupPhotoUrl = groupData.pictureUrl;
          }
        } catch (e) {
          console.error('Erro ao buscar info do grupo:', e);
        }
      }

      // Para contatos individuais com @lid: buscar nome do contato via API se não temos pushName
      let contactName = senderName;
      if (!isGroup && evolutionApiUrl && evolutionApiKey && senderPhone) {
        try {
          const contactData = await fetchEvolutionContactData(
            evolutionApiUrl,
            evolutionApiKey,
            instanceName,
            remoteJid,
            senderPhone,
          );
          if ((!contactName || isLinkedId(remoteJid)) && contactData.name) {
            contactName = contactData.name;
          }
          if (contactData.photoUrl) {
            contactPhotoUrl = contactData.photoUrl;
          }
        } catch (e) {
          console.error('Erro ao buscar dados do contato:', e);
        }
      }

      const { data: newConversation, error: convError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          instance_id: instance.id,
          remote_jid: remoteJid,
          is_group: isGroup,
          group_name: groupName,
          group_photo_url: groupPhotoUrl,
          contact_name: isGroup ? null : contactName,
          contact_phone: isGroup ? null : normalizePhone(senderPhone),
          contact_photo_url: isGroup ? null : contactPhotoUrl,
          status: 'pending',
          unread_count: fromMe ? 0 : 1,
          last_message_at: new Date().toISOString(),
          last_message_preview: content?.substring(0, 100) || `[${messageType}]`
        })
        .select()
        .single();

      if (convError) {
        console.error('Erro ao criar conversa:', convError);
        throw convError;
      }
      
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

    if (msgError) {
      console.error('Erro ao salvar mensagem:', msgError);
      throw msgError;
    }

    console.log('Mensagem salva:', savedMessage.id, 'mediaUrl:', mediaUrl);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: savedMessage.id,
      conversationId: conversation.id
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    console.error('Erro no webhook WhatsApp:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
