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
  keepUnread?: boolean;
  keep_unread?: boolean;
}

// Normaliza telefone brasileiro
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}

// Gera variacoes do numero brasileiro (com/sem nono digito)
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

function extractDigits(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

function isLikelyIndividualJid(jid: string): boolean {
  return String(jid || '').includes('@s.whatsapp.net') || String(jid || '').includes('@c.us');
}

function shouldFallbackToConversationPhone(currentJid: string, conversationPhone: string): boolean {
  if (!conversationPhone) return false;
  if (!currentJid) return true;
  if (currentJid.includes('@lid')) return true;
  if (!isLikelyIndividualJid(currentJid)) return false;

  const currentDigits = extractDigits(currentJid.split('@')[0] || currentJid);
  const conversationDigits = extractDigits(conversationPhone);
  if (!currentDigits || !conversationDigits) return false;

  // No contexto do projeto (Brasil), números válidos normalmente ficam entre 10 e 13 dígitos.
  if (currentDigits.length < 10 || currentDigits.length > 13) return true;

  // Se os últimos dígitos não batem, provavelmente o JID está inconsistente.
  return currentDigits.slice(-8) !== conversationDigits.slice(-8);
}

function pick(obj: any, paths: string[]): any {
  for (const path of paths) {
    const value = path.split('.').reduce((acc: any, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + padding);
}

function parseAuthClaims(authorizationHeader: string | null): Record<string, unknown> | null {
  if (!authorizationHeader) return null;
  const token = authorizationHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = decodeBase64Url(parts[1]);
    const parsed = JSON.parse(payload);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
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

function looksLikeUuid(value: string | null | undefined): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '').trim(),
  );
}

function normalizeExternalMessageId(value: unknown): string {
  return String(value || '').trim();
}

function expandExternalMessageIdCandidates(value: unknown): string[] {
  const normalized = normalizeExternalMessageId(value);
  if (!normalized) return [];

  const withoutOwner = normalized.includes(':')
    ? (normalized.split(':').pop() || normalized).trim()
    : normalized;

  return Array.from(new Set([normalized, withoutOwner].filter(Boolean)));
}

function toUazapiReplyMessageId(value: unknown): string {
  const normalized = normalizeExternalMessageId(value);
  if (!normalized) return '';
  return normalized.includes(':')
    ? (normalized.split(':').pop() || normalized).trim()
    : normalized;
}

function pickUazapiMessageExternalId(payload: any): string {
  return normalizeExternalMessageId(
    pick(payload, [
      'messageid',
      'message.messageid',
      'data.messageid',
      'response.messageid',
      'key.id',
      'messageId',
      'message.messageId',
      'data.messageId',
      'response.messageId',
      'id',
      'message.id',
      'data.id',
      'response.id',
    ]),
  );
}

interface QuotedMessageContext {
  messageId: string | null;
  externalId: string | null;
  content: string | null;
  sender: string | null;
}

async function resolveQuotedMessageContext(
  supabase: any,
  quotedMessageId?: string,
  conversationId?: string,
): Promise<QuotedMessageContext> {
  const input = normalizeExternalMessageId(quotedMessageId);
  if (!input) {
    return { messageId: null, externalId: null, content: null, sender: null };
  }

  let quotedRecord: any = null;

  const queryById = await supabase
    .from('whatsapp_messages')
    .select('id, message_id_external, content, sender_name, conversation_id')
    .eq('id', input)
    .maybeSingle();

  if (!queryById.error && queryById.data) {
    quotedRecord = queryById.data;
  }

  if (!quotedRecord) {
    for (const candidateExternalId of expandExternalMessageIdCandidates(input)) {
      const queryByExternalId = await supabase
        .from('whatsapp_messages')
        .select('id, message_id_external, content, sender_name, conversation_id')
        .eq('message_id_external', candidateExternalId)
        .maybeSingle();

      if (!queryByExternalId.error && queryByExternalId.data) {
        quotedRecord = queryByExternalId.data;
        break;
      }
    }
  }

  if (quotedRecord && conversationId && String(quotedRecord.conversation_id) !== String(conversationId)) {
    quotedRecord = null;
  }

  if (!quotedRecord) {
    return {
      messageId: looksLikeUuid(input) ? input : null,
      externalId: looksLikeUuid(input) ? null : input,
      content: null,
      sender: null,
    };
  }

  return {
    messageId: looksLikeUuid(String(quotedRecord.id || '')) ? String(quotedRecord.id) : null,
    externalId: quotedRecord.message_id_external ? String(quotedRecord.message_id_external) : (looksLikeUuid(input) ? null : input),
    content: quotedRecord.content ? String(quotedRecord.content) : null,
    sender: quotedRecord.sender_name ? String(quotedRecord.sender_name) : null,
  };
}

function buildUazapiQuotedPayload(quotedExternalId?: string | null): Record<string, unknown> {
  const externalId = toUazapiReplyMessageId(quotedExternalId);
  if (!externalId) return {};

  // Mantemos o ID completo (owner:messageid quando presente) para preservar
  // compatibilidade com payloads onde o provedor exige o formato canônico.
  return { replyid: externalId };
}

async function resolveUazapiCanonicalReplyId(
  uazapiUrl: string,
  instanceToken: string,
  quotedExternalId?: string | null,
): Promise<string | null> {
  const normalized = normalizeExternalMessageId(quotedExternalId);
  if (!normalized) return null;

  for (const candidate of expandExternalMessageIdCandidates(normalized)) {
    try {
      const { response, data } = await uazapiRequest(uazapiUrl, '/message/find', {
        method: 'POST',
        token: instanceToken,
        body: { id: candidate, limit: 1 },
      });

      if (!response.ok) continue;

      const canonicalId = normalizeExternalMessageId(
        pick(data, [
          'messages.0.messageid',
          'data.messages.0.messageid',
          'results.0.messageid',
          'items.0.messageid',
          'messages.0.id',
          'data.messages.0.id',
          'results.0.id',
          'items.0.id',
        ]),
      );
      if (canonicalId) return toUazapiReplyMessageId(canonicalId);
    } catch {
      // fallback abaixo
    }
  }

  return toUazapiReplyMessageId(normalized);
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

async function userCanAccessInstance(supabase: any, userId: string, instanceId: string): Promise<boolean> {
  const normalizedUserId = String(userId || '').trim();
  const normalizedInstanceId = String(instanceId || '').trim();
  if (!normalizedUserId || !normalizedInstanceId) return false;

  const accessByRpc = await supabase.rpc('can_access_whatsapp_instance', {
    _user_id: normalizedUserId,
    _instance_id: normalizedInstanceId,
  });

  if (!accessByRpc.error && typeof accessByRpc.data === 'boolean') {
    return accessByRpc.data;
  }

  if (accessByRpc.error) {
    console.warn('can_access_whatsapp_instance indisponivel, usando fallback:', accessByRpc.error);
  }

  const [isAdminRes, canLegacyManageRes, canGranularManageRes] = await Promise.all([
    supabase.rpc('is_admin', { _user_id: normalizedUserId }),
    supabase.rpc('has_permission', { _user_id: normalizedUserId, _permission_id: 'ecommerce.whatsapp.configurar' }),
    supabase.rpc('has_permission', { _user_id: normalizedUserId, _permission_id: 'whatsapp.instancias.gerenciar' }),
  ]);

  if (Boolean(isAdminRes.data) || Boolean(canLegacyManageRes.data) || Boolean(canGranularManageRes.data)) {
    return true;
  }

  const { data: boundInstance, error: boundInstanceError } = await supabase
    .from('whatsapp_instance_users')
    .select('id')
    .eq('user_id', normalizedUserId)
    .eq('instance_id', normalizedInstanceId)
    .maybeSingle();

  if (boundInstanceError) {
    console.warn('Falha ao validar vinculo de instancia (fallback):', boundInstanceError);
    return false;
  }

  return Boolean(boundInstance?.id);
}

// --- UAZAPI: Extrair numero limpo do JID ---
function jidToPhone(jid: string): string {
  return jid.replace(/@.*$/, '');
}

// --- UAZAPI: Enviar mensagem ---
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
  quotedExternalId?: string | null,
): Promise<any> {
  const phone = jidToPhone(targetJid);
  const number = targetJid.includes('@g.us') ? targetJid : phone;
  const canonicalReplyId = await resolveUazapiCanonicalReplyId(uazapiUrl, instanceToken, quotedExternalId);
  const quotePayload = buildUazapiQuotedPayload(canonicalReplyId);

  if (messageType === 'text') {
    const { response, data } = await uazapiRequest(uazapiUrl, '/send/text', {
      method: 'POST',
      token: instanceToken,
      body: { number, phone: number, chatid: targetJid, text: content, message: content, ...quotePayload }
    });
    data._httpStatus = response.status;
    return data;
  } else if (['image', 'video', 'audio', 'document'].includes(messageType)) {
    const payload: any = {
      number,
      phone: number,
      chatid: targetJid,
      type: messageType,
      text: content || '',
      caption: content || '',
    };

    Object.assign(payload, quotePayload);

    if (mediaUrl) {
      payload.file = mediaUrl;
      payload.media = mediaUrl;
      payload.url = mediaUrl;
    } else if (mediaBase64) {
      payload.file = mediaBase64;
      payload.media = mediaBase64;
      payload.base64 = mediaBase64;
      payload.mimetype = mediaMimeType;
      payload.fileName = mediaFilename;
      payload.docName = mediaFilename;
    }

    if (mediaMimeType) {
      payload.mimeType = mediaMimeType;
      payload.mimetype = payload.mimetype || mediaMimeType;
    }

    if (mediaFilename) {
      payload.fileName = payload.fileName || mediaFilename;
      payload.docName = payload.docName || mediaFilename;
    }

    if (!payload.file) {
      throw new Error('Arquivo de mídia ausente para envio (campo file).');
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
    const authClaims = parseAuthClaims(req.headers.get('Authorization'));
    const requestRole = String(authClaims?.role || '').trim().toLowerCase();
    const requestUserId = typeof authClaims?.sub === 'string' ? String(authClaims.sub).trim() : '';
    const isServiceRoleRequest = requestRole === 'service_role';
    const isAuthenticatedUserRequest = requestRole === 'authenticated' && requestUserId.length > 0;

    if (!isServiceRoleRequest && !isAuthenticatedUserRequest) {
      throw new Error('Sem permissao para enviar mensagem.');
    }

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
      senderName,
      keepUnread,
      keep_unread,
    } = body;
    const preserveUnread = keepUnread === true || keep_unread === true;

    const clearFollowupFlagIfNeeded = async (id?: string) => {
      if (!id || preserveUnread) return;
      try {
        await supabase
          .from('whatsapp_conversations')
          .update({
            needs_followup: false,
            followup_reason: null,
            followup_color: null,
            followup_flagged_at: null,
          })
          .eq('id', id)
          .eq('needs_followup', true);
      } catch (clearError) {
        console.error('Falha ao limpar marcador de retorno da conversa:', clearError);
      }
    };

    console.log('Enviando mensagem:', { instanceId, remoteJid, messageType });

    // Buscar instancia
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

    if (!instance) throw new Error('Nenhuma instancia WhatsApp disponivel');

    let conversationData: any = null;
    if (conversationId) {
      const { data: fetchedConversationData, error: conversationError } = await supabase
        .from('whatsapp_conversations')
        .select('id, instance_id, is_group, remote_jid, contact_phone')
        .eq('id', conversationId)
        .maybeSingle();

      if (conversationError) throw conversationError;
      if (!fetchedConversationData) throw new Error('Conversa nao encontrada para envio.');
      if (!fetchedConversationData.instance_id) throw new Error('Conversa sem instancia valida para envio.');
      conversationData = fetchedConversationData;

      if (String(instance.id) !== String(fetchedConversationData.instance_id)) {
        const { data: instanceFromConversation, error: instanceFromConversationError } = await supabase
          .from('whatsapp_instances')
          .select('*')
          .eq('id', fetchedConversationData.instance_id)
          .maybeSingle();

        if (instanceFromConversationError) throw instanceFromConversationError;
        if (!instanceFromConversation) throw new Error('Instancia da conversa nao encontrada.');

        console.warn('Instancia divergente da conversa, aplicando instancia correta.', {
          requestedInstanceId: instance.id,
          conversationInstanceId: fetchedConversationData.instance_id,
          conversationId,
        });
        instance = instanceFromConversation;
      }
    }

    if (isAuthenticatedUserRequest) {
      const canAccessInstance = await userCanAccessInstance(supabase, requestUserId, instance.id);
      if (!canAccessInstance) {
        throw new Error('Usuario sem acesso a esta instancia de WhatsApp.');
      }
    }

    // Resolver JID de envio a partir da conversa para evitar JID inválido/stale (ex.: LID)
    let effectiveRemoteJid = remoteJid;
    if (conversationData) {

      if (conversationData?.is_group) {
        effectiveRemoteJid = String(
          remoteJid?.includes('@g.us')
            ? remoteJid
            : (conversationData.remote_jid || remoteJid || ''),
        );
      } else {
        const currentJid = remoteJid?.includes('@') ? remoteJid : formatRemoteJid(remoteJid || '');
        const conversationPhone = String(conversationData?.contact_phone || '');
        if (shouldFallbackToConversationPhone(currentJid, conversationPhone)) {
          effectiveRemoteJid = formatRemoteJid(conversationPhone);
        } else {
          effectiveRemoteJid = currentJid;
        }
      }
    } else {
      effectiveRemoteJid = remoteJid.includes('@') ? remoteJid : formatRemoteJid(remoteJid);
    }

    console.log('Target JID resolved:', { incoming: remoteJid, effective: effectiveRemoteJid, conversationId });
    const quotedContext = await resolveQuotedMessageContext(supabase, quotedMessageId, conversationId);

    // --- ROTEAMENTO POR PROVEDOR ---
    const apiType = instance.api_type || 'evolution';
    console.log('API Type da instancia:', apiType);

    // --- UAZAPI ---
    if (apiType === 'uazapi') {
      const { baseUrl: uazapiUrl, adminToken } = await loadUazapiConfig(supabase);
      const instanceToken = await resolveUazapiTokenForInstance(supabase, instance, uazapiUrl, adminToken);

      // Verificar status real da instancia via UAZAPI
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
        // Adicionar a fila
        await supabase.from('whatsapp_message_queue').insert({
          instance_id: instance.id,
          conversation_id: conversationId,
          remote_jid: effectiveRemoteJid,
          content,
          message_type: messageType,
          media_url: mediaUrl,
          media_base64: mediaBase64,
          quoted_message_id: quotedContext.messageId,
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
            quoted_message_id: quotedContext.messageId,
            quoted_content: quotedContext.content,
            quoted_sender: quotedContext.sender,
            status: 'queued'
          });
          const conversationPatch: Record<string, unknown> = {
            last_message_at: new Date().toISOString(),
            last_message_preview: content?.substring(0, 100) || `[${messageType}]`,
          };
          if (!preserveUnread) {
            conversationPatch.unread_count = 0;
          }
          await supabase.from('whatsapp_conversations').update(conversationPatch).eq('id', conversationId);
          await clearFollowupFlagIfNeeded(conversationId);
        }

        return new Response(JSON.stringify({ success: true, queued: true, message: 'Mensagem adicionada a fila (instancia offline)' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 202
        });
      }

      const formattedJid = effectiveRemoteJid.includes('@') ? effectiveRemoteJid : formatRemoteJid(effectiveRemoteJid);
      const uazapiResponse = await sendViaUazapi(
        uazapiUrl, instanceToken, formattedJid,
        messageType, content, mediaUrl, mediaBase64, mediaMimeType, mediaFilename, quotedContext.externalId
      );

      console.log('UAZAPI response:', uazapiResponse);

      const uazapiError = uazapiResponse?._httpStatus >= 400 || uazapiResponse?.error;
      if (uazapiError) {
        const errorMsg = uazapiResponse?.error || uazapiResponse?.message || 'Erro ao enviar mensagem via UAZAPI';
        if (conversationId) {
          await supabase.from('whatsapp_messages').insert({
            conversation_id: conversationId, instance_id: instance.id, from_me: true,
            content,
            message_type: messageType,
            media_url: mediaUrl,
            quoted_message_id: quotedContext.messageId,
            quoted_content: quotedContext.content,
            quoted_sender: quotedContext.sender,
            status: 'error',
            error_message: errorMsg
          });
          await supabase.from('whatsapp_conversations').update({
            last_message_at: new Date().toISOString(),
            last_message_preview: '[erro] ' + (content?.substring(0, 80) || '[midia]'),
          }).eq('id', conversationId);
        }
        return new Response(JSON.stringify({ success: false, error: errorMsg }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
        });
      }

      const messageIdExternal = pickUazapiMessageExternalId(uazapiResponse) || null;

      // Salvar midia no Storage se vier base64
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
        } catch (e) { console.error('Erro ao salvar midia:', e); }
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
        quoted_message_id: quotedContext.messageId,
        quoted_content: quotedContext.content,
        quoted_sender: quotedContext.sender,
        sender_name: senderName,
        status: 'sent'
      }).select().single();

      if (conversationId) {
        const conversationPatch: Record<string, unknown> = {
          last_message_at: new Date().toISOString(),
          last_message_preview: content?.substring(0, 100) || `[${messageType}]`,
        };
        if (!preserveUnread) {
          conversationPatch.unread_count = 0;
        }
        await supabase.from('whatsapp_conversations').update(conversationPatch).eq('id', conversationId);
        await clearFollowupFlagIfNeeded(conversationId);
      }

      return new Response(JSON.stringify({ success: true, message: savedMessage, uazapiResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // --- EVOLUTION API (padrao) ---
    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API nao configurada');
    }
    console.log('Evolution API URL normalizada:', evolutionApiUrl);

    // Verificar se instancia esta realmente conectada
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
        console.log('Falha ao verificar status real da instancia (continuando com status do banco):', e);
      }
    }

    if (!isReallyConnected) {
      await supabase.from('whatsapp_message_queue').insert({
        instance_id: instance.id,
        conversation_id: conversationId,
        remote_jid: effectiveRemoteJid,
        content,
        message_type: messageType,
        media_url: mediaUrl,
        media_base64: mediaBase64,
        quoted_message_id: quotedContext.messageId,
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
          quoted_message_id: quotedContext.messageId,
          quoted_content: quotedContext.content,
          quoted_sender: quotedContext.sender,
          status: 'queued'
        });
        const conversationPatch: Record<string, unknown> = {
          last_message_at: new Date().toISOString(),
          last_message_preview: content?.substring(0, 100) || `[${messageType}]`,
        };
        if (!preserveUnread) {
          conversationPatch.unread_count = 0;
        }
        await supabase.from('whatsapp_conversations').update(conversationPatch).eq('id', conversationId);
        await clearFollowupFlagIfNeeded(conversationId);
      }

      return new Response(JSON.stringify({
        success: true, queued: true, message: 'Mensagem adicionada a fila (instancia offline)'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 202 });
    }

    // Tratar @lid
    let formattedJid = effectiveRemoteJid.includes('@') ? effectiveRemoteJid : formatRemoteJid(effectiveRemoteJid);
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
    if (quotedContext.externalId) {
      quotedOptions = { quoted: { key: { remoteJid: formattedJid, id: quotedContext.externalId } } };
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
        ? 'Este numero nao possui WhatsApp ativo. Verifique se o numero esta correto (com DDD).'
        : evolutionResponse?.error || 'Erro ao enviar mensagem pelo WhatsApp';

      if (conversationId) {
        await supabase.from('whatsapp_messages').insert({
          conversation_id: conversationId, instance_id: instance.id, from_me: true,
          content, message_type: messageType, media_url: mediaUrl, status: 'error', error_message: errorMsg
        });
        await supabase.from('whatsapp_conversations').update({
          last_message_at: new Date().toISOString(),
          last_message_preview: '[erro] ' + (content?.substring(0, 80) || '[midia]'),
        }).eq('id', conversationId);
      }

      return new Response(JSON.stringify({ success: false, error: errorMsg, evolutionResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
      });
    }

    messageIdExternal = evolutionResponse?.key?.id || evolutionResponse?.messageId;

    // Upload de midia base64 para Storage
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
      } catch (e) { console.error('Erro no upload de midia:', e); }
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
      quoted_message_id: quotedContext.messageId,
      quoted_content: quotedContext.content,
      quoted_sender: quotedContext.sender,
      sender_name: senderName,
      status: 'sent'
    }).select().single();

    if (saveError) console.error('Erro ao salvar mensagem:', saveError);

    if (conversationId) {
      const conversationPatch: Record<string, unknown> = {
        last_message_at: new Date().toISOString(),
        last_message_preview: content?.substring(0, 100) || `[${messageType}]`,
      };
      if (!preserveUnread) {
        conversationPatch.unread_count = 0;
      }
      await supabase.from('whatsapp_conversations').update(conversationPatch).eq('id', conversationId);
      await clearFollowupFlagIfNeeded(conversationId);
    }

    return new Response(JSON.stringify({ success: true, message: savedMessage, evolutionResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Erro ao enviar WhatsApp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    let friendlyMessage = errorMessage;
    if (errorMessage.includes('not connected')) friendlyMessage = 'WhatsApp nao esta conectado. Verifique a instancia.';
    else if (errorMessage.includes('invalid number')) friendlyMessage = 'Numero de telefone invalido.';

    return new Response(JSON.stringify({ success: false, error: friendlyMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400
    });
  }
});
