import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DISABLED_MAX_AGE_MS = 6 * 60 * 60 * 1000;

function normalizeImportHistoryDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 7;
  return Math.min(365, Math.max(1, Math.trunc(parsed)));
}

function parseIncomingTimestamp(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const asMs = value > 1_000_000_000_000 ? value : value * 1000;
    const date = new Date(asMs);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) return null;
      const asMs = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
      const date = new Date(asMs);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function normalizePhone(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.length >= 10 && cleaned.length <= 11 && !cleaned.startsWith("55")) {
    cleaned = "55" + cleaned;
  }
  if (!cleaned.match(/^55\d{10,11}$/)) return "";
  return cleaned;
}

function extractPhoneFromJid(jid: string): string {
  if (!jid) return "";
  return jid.split("@")[0];
}

function isGroupJid(jid: string): boolean {
  return jid?.includes("@g.us") || false;
}

function normalizeRemoteJid(raw: unknown, isGroupHint = false): string {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";
  if (value.includes("@")) return value;

  if (/^\d{10,15}$/.test(value)) {
    return `${value}@s.whatsapp.net`;
  }
  if (isGroupHint || /^\d{8,20}-\d{8,20}$/.test(value)) {
    return `${value}@g.us`;
  }
  return value;
}

function base64Decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function sanitizeMimeType(mimeType: string | null): string {
  if (!mimeType) return "application/octet-stream";
  return mimeType.split(";")[0].trim();
}

function pick(obj: any, paths: string[]): any {
  for (const path of paths) {
    const value = path.split(".").reduce((acc: any, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function pickFromMany(objects: any[], paths: string[]): any {
  for (const obj of objects) {
    if (!obj) continue;
    const value = pick(obj, paths);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function sanitizeHeaderValue(key: string, value: string): string {
  if (!value) return value;
  if (!/(authorization|token|apikey|api-key|key|secret)/i.test(key)) return value;
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function asArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === null || value === undefined) return [];
  return [value as T];
}

function hasDirectMessageShape(value: any): boolean {
  if (!value || typeof value !== "object") return false;
  const content = value.content && typeof value.content === "object" ? value.content : null;
  return Boolean(
    value.key ||
      value.message ||
      value.remoteJid ||
      value.from ||
      value.chatId ||
      value.jid ||
      value.text ||
      value.body ||
      value.messageType ||
      value.type ||
      value.mediaType ||
      value.mimetype ||
      value.mimeType ||
      value.fileName ||
      value.vcard ||
      value.contacts ||
      value.conversation ||
      value.extendedTextMessage ||
      value.imageMessage ||
      value.videoMessage ||
      value.audioMessage ||
      value.documentMessage ||
      value.stickerMessage ||
      value.locationMessage ||
      value.contactMessage ||
      value.contactsArrayMessage ||
      value.reactionMessage ||
      value.pollCreationMessage ||
      value.pollUpdateMessage ||
      value.pollResultSnapshotMessage ||
      value.listResponseMessage ||
      value.buttonsResponseMessage ||
      value.templateButtonReplyMessage ||
      value.interactiveResponseMessage ||
      content?.URL ||
      content?.url ||
      content?.directPath ||
      content?.mimetype ||
      content?.text ||
      content?.caption ||
      content?.conversation ||
      content?.vcard ||
      content?.contacts,
  );
}

function collectMessageCandidates(data: any): any[] {
  const out: any[] = [];
  const queue: any[] = [data];
  const visited = new Set<any>();
  const signatureSeen = new Set<string>();

  const pushCandidate = (candidate: any) => {
    if (!candidate || typeof candidate !== "object") return;
    const envelope = candidate.__envelope && typeof candidate.__envelope === "object" ? candidate.__envelope : null;
    const messageExternalId = pickFromMany([candidate, envelope], [
      "key.id",
      "id",
      "messageId",
      "messageid",
      "keyId",
      "msgId",
      "message.id",
      "message.messageId",
      "message.messageid",
    ]) || "";
    const signatureParts = [
      messageExternalId,
      pickFromMany([candidate, envelope], [
        "key.remoteJid",
        "remoteJid",
        "chatId",
        "chatid",
        "jid",
        "from",
        "to",
        "sender",
        "sender_pn",
      ]) || "",
      pickFromMany([candidate, envelope], ["messageType", "mediaType", "type"]) || "",
      pickFromMany([candidate, envelope], ["conversation", "text", "body", "message.conversation", "message.text", "message.body"]) || "",
      pickFromMany([candidate, envelope], [
        "messageTimestamp",
        "timestamp",
        "ts",
        "t",
        "message.messageTimestamp",
        "message.timestamp",
      ]) || "",
    ]
      .map((value) => String(value || "").trim())
      .join("|");

    if (messageExternalId) {
      const idSignature = `id:${String(messageExternalId)}`;
      if (signatureSeen.has(idSignature)) return;
      signatureSeen.add(idSignature);
    } else if (signatureParts) {
      // Fallback quando nao vem ID externo.
      // A assinatura inclui timestamp para evitar descartar mensagens distintas.
      if (signatureSeen.has(signatureParts)) return;
      signatureSeen.add(signatureParts);
    }
    out.push(candidate);
  };

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === null || current === undefined) continue;

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    if (typeof current !== "object") continue;

    if (visited.has(current)) continue;
    visited.add(current);

    const hasNestedMessage = current.message && typeof current.message === "object" && !Array.isArray(current.message);
    if (hasDirectMessageShape(current) && !hasNestedMessage) {
      pushCandidate(current);
    }

    if (hasNestedMessage) {
      const nestedCandidate = { ...current.message, __envelope: current };
      if (hasDirectMessageShape(nestedCandidate) || hasDirectMessageShape(current)) {
        pushCandidate(nestedCandidate);
      }
      queue.push(nestedCandidate);
    }

    if (Array.isArray(current.messages)) queue.push(...current.messages);
    if (Array.isArray(current.history)) queue.push(...current.history);
    if (Array.isArray(current.items)) queue.push(...current.items);
    if (Array.isArray(current.records)) queue.push(...current.records);
    if (Array.isArray(current.results)) queue.push(...current.results);
    if (Array.isArray(current.data)) queue.push(...current.data);

    if (!hasDirectMessageShape(current) && current.data && typeof current.data === "object" && !Array.isArray(current.data)) {
      queue.push(current.data);
    }
  }

  return out;
}

async function parseJsonSafe(response: Response): Promise<any> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
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
    .from("system_config")
    .select("key, value")
    .in("key", ["uazapi_api_url", "uazapi_admin_token"]);
  if (error) throw error;

  const map: Record<string, string> = {};
  for (const row of data || []) map[row.key] = row.value || "";

  return {
    baseUrl: (map["uazapi_api_url"] || "").replace(/\/+$/, ""),
    adminToken: map["uazapi_admin_token"] || "",
  };
}

async function uazapiRequest(
  baseUrl: string,
  path: string,
  opts: { method?: string; token?: string; adminToken?: string; body?: any } = {},
): Promise<{ response: Response; data: any }> {
  const { method = "GET", token, adminToken, body } = opts;
  const url = new URL(`${baseUrl}${path}`);
  if (token) url.searchParams.set("token", token);

  const headers: Record<string, string> = { "Content-Type": "application/json", "Accept": "application/json" };
  if (adminToken) headers.admintoken = adminToken;
  if (token) {
    headers.token = token;
    headers.Authorization = `Bearer ${token}`;
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
      .from("whatsapp_instances")
      .update({
        uazapi_instance_token: token,
        uazapi_instance_external_id: externalId || null,
      })
      .eq("id", instanceId);
  } catch {
    // Keep compatibility if migration not applied.
  }
}

async function resolveUazapiToken(supabase: any, instance: any, baseUrl: string, adminToken: string): Promise<string> {
  let token = String(instance?.uazapi_instance_token || "");
  if (token) return token;

  const allResp = await uazapiRequest(baseUrl, "/instance/all", { adminToken });
  if (!allResp.response.ok) throw new Error("Nao foi possivel listar instancias UAZAPI.");

  const instances = Array.isArray(allResp.data)
    ? allResp.data
    : pick(allResp.data, ["instances", "data", "results", "response"]) || [];

  const found = (instances as any[]).find((item) =>
    String(item?.name || item?.instanceName || item?.instance_name || "").trim().toLowerCase() ===
      String(instance.instance_name || "").trim().toLowerCase()
  );

  token = String(pick(found, ["token", "instance.token"]) || "");
  if (!token) throw new Error(`Token UAZAPI nao encontrado para ${instance.instance_name}.`);

  await persistUazapiToken(supabase, instance.id, token, String(pick(found, ["id", "instance.id"]) || ""));
  return token;
}

async function fetchUazapiContactPhoto(
  baseUrl: string,
  instanceToken: string,
  remoteJid: string,
  senderPhone?: string | null,
): Promise<string | null> {
  const normalizedPhone = normalizePhone(String(senderPhone || ""));
  const phoneJid = normalizedPhone ? `${normalizedPhone}@s.whatsapp.net` : "";

  const payloadCandidates = [
    remoteJid ? { chatid: remoteJid } : null,
    phoneJid ? { chatid: phoneJid } : null,
    normalizedPhone ? { number: normalizedPhone } : null,
    normalizedPhone ? { phone: normalizedPhone } : null,
    phoneJid ? { id: phoneJid } : null,
  ].filter(Boolean) as Array<Record<string, string>>;

  for (const body of payloadCandidates) {
    try {
      const details = await uazapiRequest(baseUrl, "/chat/details", {
        method: "POST",
        token: instanceToken,
        body,
      });
      if (!details.response.ok) continue;

      const photo = String(
        pick(details.data, [
          "imagePreview",
          "data.imagePreview",
          "chat.imagePreview",
          "image",
          "data.image",
          "chat.image",
        ]) || "",
      ).trim();

      if (photo && /^https?:\/\//i.test(photo)) {
        return photo;
      }
    } catch {
      // ignore and try next payload candidate
    }
  }

  return null;
}

async function resolveInstanceByIdentifier(supabase: any, identifier: string): Promise<any | null> {
  if (!identifier) return null;

  const idTrimmed = String(identifier).trim();
  if (!idTrimmed) return null;

  const byName = await supabase.from("whatsapp_instances").select("*").eq("instance_name", idTrimmed).maybeSingle();
  if (byName.data) return byName.data;

  const byId = await supabase.from("whatsapp_instances").select("*").eq("id", idTrimmed).maybeSingle();
  if (byId.data) return byId.data;

  try {
    const byToken = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("uazapi_instance_token", idTrimmed)
      .maybeSingle();
    if (byToken.data) return byToken.data;
  } catch {
    // Keep compatibility when column does not exist.
  }

  try {
    const byExternal = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("uazapi_instance_external_id", idTrimmed)
      .maybeSingle();
    if (byExternal.data) return byExternal.data;
  } catch {
    // Keep compatibility when column does not exist.
  }

  try {
    const cfg = await loadUazapiConfig(supabase);
    if (!cfg.baseUrl || !cfg.adminToken) return null;

    const allResp = await uazapiRequest(cfg.baseUrl, "/instance/all", { adminToken: cfg.adminToken });
    if (!allResp.response.ok) return null;

    const instances = Array.isArray(allResp.data)
      ? allResp.data
      : pick(allResp.data, ["instances", "data", "results", "response"]) || [];

    const found = (instances as any[]).find((item) => {
      const candidates = [
        pick(item, ["id", "instance.id"]),
        pick(item, ["name", "instance.name", "instanceName"]),
        pick(item, ["token", "instance.token"]),
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());
      return candidates.includes(idTrimmed.toLowerCase());
    });

    if (!found) return null;

    const resolvedName = String(pick(found, ["name", "instance.name", "instanceName"]) || "");
    if (!resolvedName) return null;

    const byResolvedName = await supabase
      .from("whatsapp_instances")
      .select("*")
      .eq("instance_name", resolvedName)
      .maybeSingle();

    if (byResolvedName.data) {
      const foundToken = String(pick(found, ["token", "instance.token"]) || "");
      const foundExtId = String(pick(found, ["id", "instance.id"]) || "");
      if (foundToken) await persistUazapiToken(supabase, byResolvedName.data.id, foundToken, foundExtId || null);
      return byResolvedName.data;
    }
  } catch {
    // If lookup in UAZAPI fails, continue returning null.
  }

  return null;
}

function normalizeMessageStatus(statusRaw: unknown): "pending" | "sent" | "delivered" | "read" | "error" {
  if (typeof statusRaw === "number") {
    switch (statusRaw) {
      case 0:
        return "error";
      case 1:
      case 2:
        return "sent";
      case 3:
        return "delivered";
      case 4:
      case 5:
        return "read";
      default:
        return "sent";
    }
  }

  const statusText = String(statusRaw || "").toLowerCase();
  if (["failed", "error"].includes(statusText)) return "error";
  if (["pending", "queue", "queued"].includes(statusText)) return "pending";
  if (["delivery_ack", "delivered"].includes(statusText)) return "delivered";
  if (["read", "played", "read_ack"].includes(statusText)) return "read";
  return "sent";
}

function normalizeIncomingMessageType(raw: unknown): string {
  const normalized = String(raw || "").trim().toLowerCase();
  if (!normalized) return "";

  const compact = normalized.replace(/[\s_.-]/g, "");
  if (["text", "conversation", "extendedtextmessage", "chat", "url", "linkpreview"].includes(compact)) return "text";
  if (["image", "imagemessage", "photo", "picture"].includes(compact)) return "image";
  if (["video", "videomessage"].includes(compact)) return "video";
  if (["audio", "audiomessage", "ptt", "voicenote", "voice", "voiceaudio"].includes(compact)) return "audio";
  if (["document", "documentmessage", "file"].includes(compact)) return "document";
  if (["sticker", "stickermessage"].includes(compact)) return "sticker";
  if (["location", "locationmessage", "livelocationmessage"].includes(compact)) return "location";
  if (["contact", "contactmessage", "contactsarraymessage", "vcard"].includes(compact)) return "contact";
  if (["reaction", "reactionmessage"].includes(compact)) return "reaction";
  if (["poll", "pollcreationmessage", "pollupdatemessage", "pollresultsnapshotmessage"].includes(compact)) return "poll";
  return "";
}

function asText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function extractHumanText(value: unknown, depth = 0): string {
  if (depth > 3 || value === null || value === undefined) return "";

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return "";

    // JSON string real
    if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
      try {
        const parsed = JSON.parse(text);
        const parsedText = extractHumanText(parsed, depth + 1);
        if (parsedText) return parsedText;
      } catch {
        // segue para regex pseudo-objeto
      }
    }

    // Formato pseudo-objeto: { text: '...', ... }
    const pseudoMatch = text.match(/(?:^|[,{]\s*)text\s*:\s*(['"])([\s\S]*?)\1/i);
    if (pseudoMatch?.[2]) {
      return pseudoMatch[2]
        .replace(/\\n/g, "\n")
        .replace(/\\'/g, "'")
        .replace(/\\"/g, "\"")
        .trim();
    }

    return text;
  }

  if (typeof value === "object") {
    const candidate = pick(value, [
      "text",
      "body",
      "conversation",
      "caption",
      "title",
      "description",
      "message.text",
      "message.body",
      "message.conversation",
      "message.content.text",
      "content.text",
      "data.text",
    ]);
    if (candidate !== null && candidate !== undefined) {
      const fromCandidate = extractHumanText(candidate, depth + 1);
      if (fromCandidate) return fromCandidate;
    }
  }

  return asText(value).trim();
}

function pickTextFromMany(objects: any[], paths: string[]): string {
  for (const obj of objects) {
    if (!obj) continue;
    for (const path of paths) {
      const value = pick(obj, [path]);
      const text = asText(value);
      if (text) return text;
    }
  }
  return "";
}

function inferMessageTypeFromMimeType(rawMimeType: unknown): string {
  const mime = sanitizeMimeType(asText(rawMimeType)).toLowerCase();
  if (!mime) return "";
  if (mime === "text/vcard" || mime.includes("vcard")) return "contact";
  if (mime.startsWith("image/")) return mime.includes("webp") ? "sticker" : "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("application/") || mime.startsWith("text/")) return "document";
  return "";
}

function hasMediaHints(objects: any[]): boolean {
  const hint = pickFromMany(objects, [
    "message.imageMessage",
    "message.videoMessage",
    "message.audioMessage",
    "message.documentMessage",
    "message.stickerMessage",
    "imageMessage",
    "videoMessage",
    "audioMessage",
    "documentMessage",
    "stickerMessage",
    "message.content.URL",
    "message.content.url",
    "message.content.directPath",
    "content.URL",
    "content.url",
    "content.directPath",
    "message.content.mediaKey",
    "content.mediaKey",
    "message.content.fileLength",
    "content.fileLength",
    "message.content.mimetype",
    "content.mimetype",
    "message.content.fileName",
    "content.fileName",
  ]);
  return Boolean(hint);
}

function extractPathHints(reqUrl: string): { eventFromPath: string; typeFromPath: string } {
  try {
    const pathname = new URL(reqUrl).pathname;
    const parts = pathname.split("/").filter(Boolean);
    const fnIndex = parts.findIndex((part) => part === "receive-whatsapp-uazapi-webhook");
    if (fnIndex < 0) return { eventFromPath: "", typeFromPath: "" };

    const eventFromPath = decodeURIComponent(parts[fnIndex + 1] || "");
    const typeFromPath = decodeURIComponent(parts[fnIndex + 2] || "");
    return { eventFromPath, typeFromPath };
  } catch {
    return { eventFromPath: "", typeFromPath: "" };
  }
}

function normalizeWebhookEvent(rawEvent: unknown): string {
  const normalized = String(rawEvent || "").trim().toLowerCase();
  if (!normalized) return "";

  const compact = normalized.replace(/[\s._-]/g, "");
  if (["connection", "connectionupdate", "instanceconnection"].includes(compact)) return "connection";
  if (["messageupdate", "messagesupdate", "messageack", "messagesack"].includes(compact)) return "messages_update";
  if (["history", "messagehistory", "messageshistory"].includes(compact)) return "history";
  if (["message", "messages", "messagesupsert", "messagesupserted", "messagereceived", "messagesreceived"].includes(compact)) {
    return "messages";
  }

  return normalized;
}

function extractMessageTimestampFromSources(sources: any[]): Date | null {
  const raw = pickFromMany(sources, [
    "messageTimestamp",
    "timestamp",
    "ts",
    "t",
    "key.timestamp",
    "message.messageTimestamp",
    "message.timestamp",
    "message.ts",
    "message.key.timestamp",
    "__envelope.messageTimestamp",
    "__envelope.timestamp",
    "__envelope.ts",
    "__envelope.t",
  ]);
  return parseIncomingTimestamp(raw);
}

function shouldSkipByHistoryPolicy(params: {
  eventType: string;
  instance: any;
  messageTimestamp: Date | null;
}): { skip: boolean; reason: string } {
  const importEnabled = Boolean(params.instance?.import_history_enabled);
  const historyDays = normalizeImportHistoryDays(params.instance?.import_history_days);
  const now = Date.now();

  if (params.eventType === "history" && !importEnabled) {
    return { skip: true, reason: "history-disabled" };
  }

  if (!params.messageTimestamp) {
    return { skip: false, reason: "no-timestamp" };
  }

  const ageMs = now - params.messageTimestamp.getTime();
  if (!Number.isFinite(ageMs)) {
    return { skip: false, reason: "invalid-age" };
  }

  if (importEnabled) {
    if (ageMs > historyDays * DAY_MS) {
      return { skip: true, reason: `older-than-${historyDays}d` };
    }
    return { skip: false, reason: "inside-history-window" };
  }

  if (params.eventType === "history") {
    return { skip: true, reason: "history-disabled" };
  }

  if (ageMs > HISTORY_DISABLED_MAX_AGE_MS) {
    return { skip: true, reason: "stale-message-while-history-disabled" };
  }

  return { skip: false, reason: "recent-message-while-history-disabled" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestHeaders = Object.fromEntries(
      Array.from(req.headers.entries()).map(([key, value]) => [key, sanitizeHeaderValue(key, value)]),
    );
    const rawBody = await req.text();
    console.log("[UAZAPI WEBHOOK] incoming request:", JSON.stringify({
      method: req.method,
      url: req.url,
      headers: requestHeaders,
      body: rawBody.substring(0, 20000),
    }));

    let payload: any = {};
    if (rawBody?.trim()) {
      try {
        payload = JSON.parse(rawBody);
      } catch (jsonErr) {
        const contentType = String(req.headers.get("content-type") || "").toLowerCase();
        if (contentType.includes("application/x-www-form-urlencoded")) {
          const formData = Object.fromEntries(new URLSearchParams(rawBody).entries());
          const embeddedPayload = String(formData.payload || formData.data || "").trim();
          if (embeddedPayload) {
            try {
              payload = JSON.parse(embeddedPayload);
            } catch {
              payload = formData;
            }
          } else {
            payload = formData;
          }
        } else {
          console.error("[UAZAPI WEBHOOK] invalid JSON payload:", {
            error: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
            snippet: rawBody.substring(0, 1200),
          });
          return new Response(JSON.stringify({ success: false, error: "Invalid JSON payload" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }
      }
    }

    if (typeof payload?.payload === "string") {
      try {
        payload = JSON.parse(payload.payload);
      } catch {
        // keep original payload if nested payload is not JSON
      }
    }

    if (typeof payload?.data === "string") {
      try {
        payload = { ...payload, data: JSON.parse(payload.data) };
      } catch {
        // keep original string value if data is not JSON
      }
    }

    console.log("[UAZAPI WEBHOOK] raw payload:", JSON.stringify(payload).substring(0, 12000));

    const pathHints = extractPathHints(req.url);
    const event = payload?.event || payload?.EventType || payload?.eventType || payload?.type ||
      payload?.data?.event || payload?.data?.EventType || payload?.data?.eventType || payload?.data?.type ||
      pathHints.eventFromPath;
    const data = payload?.data ?? payload;
    const hasMessagePayload = Boolean(
      payload?.message ||
        data?.message ||
        Array.isArray(data?.messages) ||
        hasDirectMessageShape(data) ||
        (Array.isArray(data) && data.length > 0),
    );
    let normalizedEvent = normalizeWebhookEvent(event);
    if (!normalizedEvent && hasMessagePayload) normalizedEvent = "messages";
    if (
      normalizedEvent &&
      !["connection", "messages_update", "messages", "history"].includes(normalizedEvent) &&
      (normalizeIncomingMessageType(normalizedEvent) || normalizeIncomingMessageType(pathHints.typeFromPath) || hasMessagePayload)
    ) {
      normalizedEvent = "messages";
    }

    const instanceCandidates = Array.from(
      new Set(
        [
          payload?.instanceName,
          payload?.instance_name,
          payload?.instance,
          payload?.instance_id,
          payload?.instanceId,
          payload?.token,
          data?.instanceName,
          data?.instance_name,
          data?.instance,
          data?.instance_id,
          data?.instanceId,
          data?.token,
        ]
          .map((value) => String(value || "").trim())
          .filter(Boolean),
      ),
    );

    let instance: any = null;
    let instanceIdentifier = instanceCandidates[0] || "";
    for (const candidate of instanceCandidates) {
      const resolved = await resolveInstanceByIdentifier(supabase, candidate);
      if (resolved) {
        instance = resolved;
        instanceIdentifier = candidate;
        break;
      }
    }
    console.log("[UAZAPI WEBHOOK] instance resolution:", {
      input: instanceIdentifier || null,
      candidates: instanceCandidates.slice(0, 6),
      resolved: Boolean(instance),
      instanceId: instance?.id || null,
      instanceName: instance?.instance_name || null,
      pathEventHint: pathHints.eventFromPath || null,
      pathTypeHint: pathHints.typeFromPath || null,
      normalizedEvent,
    });

    if (normalizedEvent === "connection") {
      const stateRaw = pick(data, ["state", "status", "connection", "instance.status", "instance.state"]);
      const stateText = typeof stateRaw === "string"
        ? stateRaw
        : stateRaw?.connected || stateRaw?.loggedIn ? "connected" : stateRaw?.status || "unknown";

      const connectedStates = ["open", "connected", "online"];
      const status = connectedStates.includes(String(stateText).toLowerCase()) ? "connected" : "disconnected";
      const updateData: any = { status };

      const phoneRaw = String(pick(data, ["me.id", "instance.me.id", "phone", "instance.phone"]) || "")
        .split("@")[0]
        .split(":")[0]
        .replace(/\D/g, "");
      if (status === "connected" && /^\d{10,15}$/.test(phoneRaw)) {
        updateData.numero_whatsapp = phoneRaw;
      }

      if (instance) {
        await supabase.from("whatsapp_instances").update(updateData).eq("id", instance.id);
      } else if (instanceIdentifier) {
        await supabase.from("whatsapp_instances").update(updateData).eq("instance_name", instanceIdentifier);
      }

      // Reaproveita a lógica central de conflito/migração por número
      if (status === "connected" && instance?.id) {
        supabase.functions.invoke("whatsapp-instance-manage", {
          body: {
            action: "check-status",
            instanceId: instance.id,
            instanceName: instance.instance_name,
            apiType: "uazapi",
          },
        }).catch((err) => {
          console.error("[UAZAPI WEBHOOK] erro ao reconciliar status:", err);
        });
      }

      console.log("[UAZAPI WEBHOOK] connection update:", {
        instanceIdentifier,
        resolvedInstanceId: instance?.id || null,
        status,
        phone: updateData.numero_whatsapp || null,
      });

      return new Response(JSON.stringify({ success: true, connectionUpdate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizedEvent === "messages_update") {
      const updates = asArray(data?.updates ?? data?.messages ?? data);
      console.log("[UAZAPI WEBHOOK] messages_update received:", { count: updates.length });

      for (const update of updates) {
        const messageId = pick(update, [
          "id",
          "key.id",
          "messageId",
          "messageid",
          "keyId",
          "message.id",
          "message.messageId",
          "message.messageid",
        ]);
        const statusRaw = pick(update, ["status", "ack", "update.status"]);
        if (!messageId || statusRaw === undefined) continue;

        const status = normalizeMessageStatus(statusRaw);
        const query = supabase.from("whatsapp_messages").update({ status }).eq("message_id_external", String(messageId));
        if (instance?.id) query.eq("instance_id", instance.id);
        await query;

        console.log("[UAZAPI WEBHOOK] message status updated:", {
          messageId: String(messageId),
          status,
          instanceId: instance?.id || null,
        });
      }

      return new Response(JSON.stringify({ success: true, statusUpdated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["messages", "history"].includes(normalizedEvent)) {
      console.log("[UAZAPI WEBHOOK] ignored event:", normalizedEvent || null);
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!instance) {
      console.error("[UAZAPI WEBHOOK] instance not found for message event:", {
        instanceIdentifier,
        event: normalizedEvent,
      });
      return new Response(JSON.stringify({ success: false, error: "Instance not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const importHistoryEnabled = Boolean(instance.import_history_enabled);
    const importHistoryDays = normalizeImportHistoryDays(instance.import_history_days);
    if (normalizedEvent === "history" && !importHistoryEnabled) {
      console.log("[UAZAPI WEBHOOK] history ignored by instance settings:", {
        instanceId: instance.id,
        instanceName: instance.instance_name,
        importHistoryEnabled,
        importHistoryDays,
      });
      return new Response(JSON.stringify({ success: true, ignored: true, reason: "history-disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messages = collectMessageCandidates(data);
    console.log("[UAZAPI WEBHOOK] message event parsed:", {
      event: normalizedEvent,
      candidates: messages.length,
      instanceId: instance.id,
      instanceName: instance.instance_name,
      importHistoryEnabled,
      importHistoryDays,
    });

    const results = [];
    let uazapiConfigCache: { baseUrl: string; adminToken: string } | null = null;
    let uazapiInstanceTokenCache: string | null = null;

    for (let index = 0; index < messages.length; index++) {
      const msgData = messages[index];
      try {
        const envelope = msgData?.__envelope && typeof msgData.__envelope === "object" ? msgData.__envelope : null;
        const sources = envelope ? [msgData, envelope] : [msgData];
        const isHistoryEvent = normalizedEvent === "history";
        const messageTimestamp = extractMessageTimestampFromSources(sources);
        const historyDecision = shouldSkipByHistoryPolicy({
          eventType: normalizedEvent,
          instance,
          messageTimestamp,
        });
        if (historyDecision.skip) {
          console.log("[UAZAPI WEBHOOK] message skipped by history policy:", {
            index,
            event: normalizedEvent,
            reason: historyDecision.reason,
            messageTimestamp: messageTimestamp?.toISOString() || null,
          });
          continue;
        }
        const messageTimestampIso = (messageTimestamp || new Date()).toISOString();

        const fromMe = Boolean(
          pickFromMany(sources, [
            "key.fromMe",
            "fromMe",
            "from_me",
            "isFromMe",
            "senderMe",
            "message.fromMe",
            "message.from_me",
          ]) || false,
        );
        const rawChatJid = pickFromMany(sources, [
          "remoteJid",
          "key.remoteJid",
          "chatId",
          "chatid",
          "jid",
          "message.chatid",
          "message.chatId",
          "chat.wa_chatid",
          "chat.id",
          "wa_chatid",
        ]);
        const rawFromJid = pickFromMany(sources, [
          "from",
          "message.from",
          "data.from",
          "sender",
          "message.sender",
          "data.sender",
          "sender_pn",
          "message.sender_pn",
          "sender_lid",
          "message.sender_lid",
        ]);
        const rawToJid = pickFromMany(sources, [
          "to",
          "message.to",
          "data.to",
          "recipient",
          "message.recipient",
          "data.recipient",
          "receiver",
          "message.receiver",
          "data.receiver",
        ]);

        let rawRemoteJid = fromMe
          ? (rawChatJid || rawToJid || rawFromJid)
          : (rawChatJid || rawFromJid || rawToJid);
        let groupHint = Boolean(
          pickFromMany(sources, ["isGroup", "group", "message.isGroup", "chat.wa_isGroup"]) ||
            String(rawRemoteJid || "").includes("@g.us") ||
            String(rawChatJid || "").includes("@g.us") ||
            String(rawFromJid || "").includes("@g.us") ||
            String(rawToJid || "").includes("@g.us") ||
            String(rawRemoteJid || "").includes("-"),
        );

        if (!rawRemoteJid) {
          rawRemoteJid = rawFromJid || rawToJid;
          groupHint = false;
        }

        let remoteJid = normalizeRemoteJid(rawRemoteJid, groupHint);
        const instancePhone = normalizePhone(String(instance?.numero_whatsapp || ""));
        const instanceJid = instancePhone ? normalizeRemoteJid(instancePhone) : "";

        if (fromMe && !groupHint && instanceJid && remoteJid === instanceJid) {
          const toJid = normalizeRemoteJid(rawToJid);
          if (toJid && toJid !== instanceJid) {
            remoteJid = toJid;
          }
        }

        const externalMessageId = String(
          pickFromMany(sources, [
            "key.id",
            "id",
            "messageId",
            "messageid",
            "keyId",
            "msgId",
            "message.id",
            "message.messageId",
            "message.messageid",
          ]) ||
            "",
        ).trim();
        const pushName = String(
          pickFromMany(sources, [
            "pushName",
            "notifyName",
            "senderName",
            "sender.name",
            "participantName",
            "fromName",
            "message.senderName",
            "chat.name",
          ]) || "",
        ).trim();

        console.log("[UAZAPI WEBHOOK] message candidate:", {
          index,
          remoteJid: remoteJid || null,
          fromMe,
          externalMessageId: externalMessageId || null,
          topKeys: Object.keys(msgData || {}).slice(0, 12),
        });

        if (!remoteJid) {
          console.warn("[UAZAPI WEBHOOK] skipped message: remoteJid missing", { index });
          continue;
        }
        if (remoteJid.includes("@broadcast")) {
          console.log("[UAZAPI WEBHOOK] broadcast skipped:", { remoteJid });
          continue;
        }

        if (externalMessageId) {
          const duplicateCheck = await supabase
            .from("whatsapp_messages")
            .select("id")
            .eq("instance_id", instance.id)
            .eq("message_id_external", externalMessageId)
            .maybeSingle();
          if (duplicateCheck.data) {
            console.log("[UAZAPI WEBHOOK] duplicate message skipped:", {
              externalMessageId,
              existingId: duplicateCheck.data.id,
            });
            continue;
          }
        }

        const isGroup = Boolean(pickFromMany(sources, ["isGroup", "group", "message.isGroup", "chat.wa_isGroup"])) ||
          isGroupJid(remoteJid);
        let senderPhone = "";
        let senderName = !fromMe ? pushName : "";

        if (!isGroup && remoteJid.includes("@s.whatsapp.net")) {
          senderPhone = extractPhoneFromJid(remoteJid);
        } else if (!isGroup) {
          const senderPn = normalizeRemoteJid(
            pickFromMany(sources, [
              "sender_pn",
              "message.sender_pn",
              "sender",
              "message.sender",
              "data.sender",
              "from",
              "message.from",
              "data.from",
            ]),
          );
          if (senderPn.includes("@s.whatsapp.net")) {
            senderPhone = extractPhoneFromJid(senderPn);
          }
        }

        if (!isGroup && !senderPhone && fromMe) {
          const toJid = normalizeRemoteJid(rawToJid);
          if (toJid.includes("@s.whatsapp.net")) {
            senderPhone = extractPhoneFromJid(toJid);
          }
        }

        if (isGroup) {
          const participantRaw = pickFromMany(sources, [
            "sender_pn",
            "message.sender_pn",
            "key.participant",
            "participant",
            "author",
            "sender.id",
            "from",
            "sender",
            "message.sender",
          ]);
          const participantJid = normalizeRemoteJid(participantRaw, false);
          if (participantJid && participantJid.includes("@s.whatsapp.net")) {
            senderPhone = extractPhoneFromJid(participantJid);
          }

          if (!fromMe && !senderName) {
            senderName = String(
              pickFromMany(sources, [
                "participantName",
                "key.participantName",
                "message.participantName",
                "authorName",
                "message.authorName",
                "sender.pushName",
                "sender.name",
                "message.senderName",
                "notifyName",
                "chat.participantName",
              ]) || "",
            ).trim();
          }

          if (!fromMe && !senderName && senderPhone) {
            senderName = senderPhone;
          }
        }

        const message = (msgData?.message && typeof msgData.message === "object" && !Array.isArray(msgData.message))
          ? msgData.message
          : (envelope?.message && typeof envelope.message === "object" && !Array.isArray(envelope.message))
          ? envelope.message
          : (msgData && typeof msgData === "object" && !Array.isArray(msgData))
          ? msgData
          : {};

        let content = "";
        let messageType = "text";
        let mediaUrl: string | null = null;
        let mediaMimeType: string | null = null;
        let mediaFilename: string | null = null;
        const messageContent = message?.content;

        if (message.conversation) {
          content = extractHumanText(message.conversation);
        } else if (message.extendedTextMessage) {
          content = extractHumanText(message.extendedTextMessage.text || "");
        } else if (message.content) {
          if (typeof message.content === "string") content = extractHumanText(message.content);
          else if (message.content && typeof message.content === "object") {
            content = extractHumanText(message.content) || pickTextFromMany([message.content], [
              "text",
              "conversation",
              "extendedTextMessage.text",
              "caption",
              "title",
              "description",
            ]);
          }
        } else if (message.imageMessage) {
          messageType = "image";
          content = message.imageMessage.caption || "";
          mediaMimeType = message.imageMessage.mimetype || null;
        } else if (message.videoMessage) {
          messageType = "video";
          content = message.videoMessage.caption || "";
          mediaMimeType = message.videoMessage.mimetype || null;
        } else if (message.audioMessage) {
          messageType = "audio";
          mediaMimeType = message.audioMessage.mimetype || null;
        } else if (message.documentMessage) {
          messageType = "document";
          content = message.documentMessage.caption || "";
          mediaMimeType = message.documentMessage.mimetype || null;
          mediaFilename = message.documentMessage.fileName || null;
        } else if (message.stickerMessage) {
          messageType = "sticker";
          mediaMimeType = message.stickerMessage.mimetype || null;
        } else if (message.locationMessage) {
          messageType = "location";
          const loc = message.locationMessage;
          content = `${loc.degreesLatitude}, ${loc.degreesLongitude}`;
        }

        const typeCandidates = [
          pick(message, ["mediaType"]),
          pick(message, ["messageType"]),
          pick(message, ["type"]),
          pickFromMany(sources, ["message.mediaType", "mediaType"]),
          pickFromMany(sources, ["message.messageType", "messageType"]),
          pickFromMany(sources, ["message.type", "type", "kind"]),
        ];
        for (const rawType of typeCandidates) {
          const mappedType = normalizeIncomingMessageType(rawType);
          if (mappedType) {
            messageType = mappedType;
            break;
          }
        }

        if (!content) {
          const fallbackContent = pickFromMany(
            sources,
            ["text", "body", "content", "message.text", "message.body", "message.content"],
          );
          const fallbackText = asText(fallbackContent);
          if (fallbackText) {
            content = extractHumanText(fallbackText);
          } else if (fallbackContent && typeof fallbackContent === "object") {
            content = extractHumanText(fallbackContent) || pickTextFromMany([fallbackContent], [
              "text",
              "conversation",
              "extendedTextMessage.text",
              "caption",
              "title",
              "description",
            ]);
          }
        }

        content = extractHumanText(content) || content;

        if (content === "[object Object]") content = "";

        if (messageType === "contact" && !content) {
          const contactName = String(
            pickFromMany(sources, [
              "displayName",
              "name",
              "fullName",
              "message.content.displayName",
              "message.content.name",
              "message.content.fullName",
              "content.displayName",
              "content.name",
              "content.fullName",
              "contact.displayName",
              "message.content.contact.displayName",
              "contacts.0.displayName",
              "contacts.0.name",
            ]) || "",
          ).trim();
          const vcard = String(
            pickFromMany(sources, [
              "vcard",
              "message.content.vcard",
              "content.vcard",
              "contacts.0.vcard",
              "message.content.contacts.0.vcard",
              "content.contacts.0.vcard",
            ]) || "",
          ).trim();
          const rawPhone = String(
            pickFromMany(sources, [
              "phoneNumber",
              "waid",
              "contact.phoneNumber",
              "message.content.phoneNumber",
              "message.content.waid",
              "content.phoneNumber",
              "content.waid",
              "message.content.contact.phoneNumber",
              "contacts.0.phoneNumber",
              "contacts.0.waid",
            ]) || "",
          ).trim();

          let parsedVcardPhone = "";
          if (vcard) {
            const match = vcard.match(/TEL[^:]*:([^\r\n]+)/i);
            if (match?.[1]) parsedVcardPhone = match[1].replace(/[^+\d]/g, "");
          }

          const contactPhone = rawPhone || parsedVcardPhone;
          const contactLabel = [contactName || null, contactPhone || null].filter(Boolean).join(" - ");
          content = contactLabel || vcard || "[Contato]";
        }

        mediaUrl = mediaUrl || pickFromMany(sources, [
          "mediaUrl",
          "media.url",
          "file.url",
          "data.url",
          "attachment.url",
          "message.mediaUrl",
          "message.fileUrl",
          "content.URL",
          "content.url",
          "message.content.URL",
          "message.content.url",
          "message.content.directPath",
          "content.directPath",
        ]) || null;
        mediaMimeType = mediaMimeType ||
          pickFromMany(sources, [
            "mimetype",
            "mimeType",
            "media.mimetype",
            "media.mimeType",
            "file.mimetype",
            "message.mimetype",
            "message.mimeType",
            "content.mimetype",
            "message.content.mimetype",
          ]) || null;
        mediaFilename = mediaFilename ||
          pickFromMany(sources, [
            "fileName",
            "filename",
            "media.fileName",
            "file.name",
            "documentName",
            "message.fileName",
            "message.filename",
            "content.fileName",
            "message.content.fileName",
          ]) || null;

        const hasMediaShape = hasMediaHints(sources);
        const inferredFromMimeBeforeDownload = inferMessageTypeFromMimeType(mediaMimeType);
        if (messageType === "text" && inferredFromMimeBeforeDownload && hasMediaShape) {
          messageType = inferredFromMimeBeforeDownload;
        }

        if (messageType === "text" && !content) {
          const hasContactShape = Boolean(
            pickFromMany(sources, [
              "contact",
              "contacts",
              "message.content.contact",
              "message.content.contacts",
              "content.contact",
              "content.contacts",
              "message.content.vcard",
              "content.vcard",
            ]),
          );
          if (hasContactShape) {
            messageType = "contact";
          }
        }

        const contextInfo: any = msgData?.contextInfo ||
          message?.contextInfo ||
          message?.extendedTextMessage?.contextInfo ||
          message?.imageMessage?.contextInfo ||
          message?.videoMessage?.contextInfo ||
          message?.audioMessage?.contextInfo ||
          message?.documentMessage?.contextInfo ||
          message?.stickerMessage?.contextInfo ||
          envelope?.message?.contextInfo ||
          {};

        if (!contextInfo?.stanzaId) {
          const quotedExternal = String(
            pickFromMany(sources, ["quotedMessageId", "quoted.id", "replyTo", "message.replyTo", "message.quoted"]) || "",
          ).trim();
          if (quotedExternal) {
            contextInfo.stanzaId = quotedExternal;
          }
        }

        const isMediaType = ["image", "audio", "document", "video", "sticker"].includes(messageType);
        const textWithoutContentCanBeMedia = messageType === "text" && !content && Boolean(externalMessageId);
        const mediaNeedsResolution = (isMediaType || (messageType === "text" && (hasMediaShape || textWithoutContentCanBeMedia))) && (
          !mediaUrl ||
          mediaUrl.includes("mmg.whatsapp.net") ||
          mediaUrl.includes("/v/t62.") ||
          mediaUrl.includes("mms3=true")
        );

        if (mediaNeedsResolution) {
          try {
            const { baseUrl: uazapiUrl, adminToken } = await loadUazapiConfig(supabase);
            if (uazapiUrl && adminToken) {
              const instanceToken = await resolveUazapiToken(supabase, instance, uazapiUrl, adminToken);
              const downloadIds = Array.from(
                new Set([
                  externalMessageId || "",
                  String(pick(message, ["messageid", "id"]) || "").trim(),
                ].filter(Boolean)),
              );

              for (const downloadId of downloadIds) {
                const linkResp = await uazapiRequest(uazapiUrl, "/message/download", {
                  method: "POST",
                  token: instanceToken,
                  body: { id: downloadId, return_base64: false, return_link: true },
                });

                if (linkResp.response.ok) {
                  const linkUrl = pick(linkResp.data, ["fileURL", "url", "data.fileURL", "data.url"]);
                  const linkMime = pick(linkResp.data, ["mimetype", "mimeType", "data.mimetype", "media.mimetype"]);
                  if (linkUrl) {
                    mediaUrl = String(linkUrl);
                    mediaMimeType = String(linkMime || mediaMimeType || "").trim() || mediaMimeType;
                    if (messageType === "text") {
                      const mapped = normalizeIncomingMessageType(
                        pick(linkResp.data, ["messageType", "type", "mediaType", "data.messageType", "data.type"]),
                      ) || inferMessageTypeFromMimeType(linkMime || mediaMimeType);
                      if (mapped) messageType = mapped;
                    }
                    break;
                  }
                }

                if (mediaUrl) break;

                const mediaResp = await uazapiRequest(uazapiUrl, "/message/download", {
                  method: "POST",
                  token: instanceToken,
                  body: { id: downloadId, return_base64: true, return_link: false },
                });

                if (mediaResp.response.ok) {
                  const mediaData = mediaResp.data;
                  const base64 = pick(mediaData, [
                    "base64",
                    "base64Data",
                    "data.base64",
                    "data.base64Data",
                    "media.base64",
                    "result.base64",
                  ]);
                  const mime = pick(mediaData, ["mimetype", "mimeType", "data.mimetype", "media.mimetype"]) || mediaMimeType;

                  if (base64) {
                    const base64Clean = String(base64).includes(",") ? String(base64).split(",")[1] : String(base64);
                    const buffer = base64Decode(base64Clean);
                    if (buffer.length > 0) {
                      const finalMimeType = sanitizeMimeType(String(mime || "application/octet-stream"));
                      const extMap: Record<string, string> = {
                        "image/jpeg": "jpg",
                        "image/png": "png",
                        "image/webp": "webp",
                        "video/mp4": "mp4",
                        "audio/ogg": "ogg",
                        "audio/mpeg": "mp3",
                        "application/pdf": "pdf",
                        "text/vcard": "vcf",
                      };
                      const ext = extMap[finalMimeType] || finalMimeType.split("/")[1] || "bin";
                      const fileName = `${instance.id}/${Date.now()}_${mediaFilename || `media.${ext}`}`;

                      const { data: uploadData, error: uploadError } = await supabase.storage
                        .from("whatsapp-media")
                        .upload(fileName, buffer, { contentType: finalMimeType, upsert: false });
                      if (!uploadError && uploadData) {
                        const { data: publicUrl } = supabase.storage.from("whatsapp-media").getPublicUrl(fileName);
                        mediaUrl = publicUrl.publicUrl;
                        mediaMimeType = finalMimeType;
                        if (messageType === "text") {
                          const mapped = normalizeIncomingMessageType(
                            pick(mediaData, ["messageType", "type", "mediaType", "data.messageType", "data.type"]),
                          ) || inferMessageTypeFromMimeType(finalMimeType);
                          if (mapped) messageType = mapped;
                        }
                        break;
                      }
                    }
                  }
                } else {
                  console.error("[UAZAPI WEBHOOK] media download failed:", {
                    status: mediaResp.response.status,
                    body: mediaResp.data,
                    messageId: downloadId,
                  });
                }

                if (mediaUrl) break;
              }
            }
          } catch (mediaErr) {
            console.error("[UAZAPI WEBHOOK] media processing error:", mediaErr);
          }
        }

        if (messageType === "text" && mediaMimeType) {
          const inferredAfterDownload = inferMessageTypeFromMimeType(mediaMimeType);
          if (inferredAfterDownload) messageType = inferredAfterDownload;
        }

        if (messageType === "contact" && !content) {
          const contactName = String(
            pickFromMany(sources, [
              "displayName",
              "name",
              "fullName",
              "message.content.displayName",
              "message.content.name",
              "message.content.fullName",
              "contact.displayName",
              "message.content.contact.displayName",
              "contacts.0.displayName",
              "message.content.contacts.0.displayName",
              "message.content.contacts.0.name",
            ]) || "",
          ).trim();
          const vcard = String(
            pickFromMany(sources, [
              "vcard",
              "message.content.vcard",
              "content.vcard",
              "contacts.0.vcard",
              "message.content.contacts.0.vcard",
            ]) || "",
          ).trim();
          const contactPhone = String(
            pickFromMany(sources, [
              "phoneNumber",
              "waid",
              "message.content.phoneNumber",
              "message.content.waid",
              "contact.phoneNumber",
              "message.content.contact.phoneNumber",
              "contacts.0.phoneNumber",
              "contacts.0.waid",
              "message.content.contacts.0.phoneNumber",
              "message.content.contacts.0.waid",
            ]) || "",
          ).trim();

          const contactLabel = [contactName || null, contactPhone || null].filter(Boolean).join(" - ");
          content = contactLabel || vcard || "[Contato]";
        }

        let quotedMessageId = null;
        let quotedContent = null;
        let quotedSender = null;

        if (contextInfo?.stanzaId) {
          const { data: quotedMsg } = await supabase
            .from("whatsapp_messages")
            .select("id, content, sender_name")
            .eq("instance_id", instance.id)
            .eq("message_id_external", contextInfo.stanzaId)
            .maybeSingle();

          if (quotedMsg) {
            quotedMessageId = quotedMsg.id;
            quotedContent = quotedMsg.content;
            quotedSender = quotedMsg.sender_name;
          } else {
            quotedContent = contextInfo.quotedMessage?.conversation ||
              contextInfo.quotedMessage?.extendedTextMessage?.text ||
              "[Mensagem]";
          }
        }

        const normalizedPhone = normalizePhone(senderPhone);
        console.log("[UAZAPI WEBHOOK] contact resolved:", {
          instanceId: instance.id,
          isGroup,
          senderPhone: senderPhone || null,
          normalizedPhone: normalizedPhone || null,
          senderName: senderName || null,
        });

        const contentText = typeof content === "string" ? content : String(content ?? "");

        let conversation: any;
        const { data: byJid } = await supabase
          .from("whatsapp_conversations")
          .select("*")
          .eq("instance_id", instance.id)
          .eq("remote_jid", remoteJid)
          .maybeSingle();

        let existingConversation = byJid;
        let conversationSource: "remote_jid" | "contact_phone" | "created" = "created";

        if (existingConversation) {
          conversationSource = "remote_jid";
        } else if (!isGroup && normalizedPhone) {
          const { data: byPhone } = await supabase
            .from("whatsapp_conversations")
            .select("*")
            .eq("instance_id", instance.id)
            .eq("contact_phone", normalizedPhone)
            .order("last_message_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (byPhone) {
            existingConversation = byPhone;
            conversationSource = "contact_phone";
          }
        }

        if (existingConversation) {
          conversation = existingConversation;
          const incomingTs = messageTimestamp?.getTime() ?? Date.now();
          const existingTs = conversation.last_message_at ? new Date(conversation.last_message_at).getTime() : 0;
          const isNewerThanConversation = !Number.isFinite(existingTs) || incomingTs >= existingTs;
          const updateData: any = {
            last_message_at: isNewerThanConversation ? messageTimestampIso : conversation.last_message_at,
            last_message_preview: isNewerThanConversation
              ? (contentText.substring(0, 100) || `[${messageType}]`)
              : conversation.last_message_preview,
            remote_jid: conversation.remote_jid || remoteJid,
          };

          if (!fromMe && !isHistoryEvent) {
            updateData.unread_count = (conversation.unread_count || 0) + 1;
            if (conversation.status === "finished") {
              updateData.status = "pending";
              updateData.assigned_to = null;
              updateData.finished_by = null;
            }
          }

          if (!isGroup && !fromMe && senderName && senderName !== conversation.contact_name) {
            updateData.contact_name = senderName;
          }
          if (!isGroup && normalizedPhone && normalizedPhone.match(/^55\d{10,11}$/)) {
            const savedPhone = conversation.contact_phone || "";
            if (!savedPhone.match(/^55\d{10,11}$/)) {
              updateData.contact_phone = normalizedPhone;
            }
          }

          if (!isGroup && !fromMe && !conversation.contact_photo_url) {
            try {
              if (!uazapiConfigCache) uazapiConfigCache = await loadUazapiConfig(supabase);
              if (!uazapiInstanceTokenCache) {
                uazapiInstanceTokenCache = await resolveUazapiToken(
                  supabase,
                  instance,
                  uazapiConfigCache.baseUrl,
                  uazapiConfigCache.adminToken,
                );
              }
              const photoUrl = await fetchUazapiContactPhoto(
                uazapiConfigCache.baseUrl,
                uazapiInstanceTokenCache,
                remoteJid,
                normalizedPhone || senderPhone,
              );
              if (photoUrl) updateData.contact_photo_url = photoUrl;
            } catch (photoErr) {
              console.warn("[UAZAPI WEBHOOK] failed to resolve contact photo (update):", photoErr);
            }
          }

          await supabase.from("whatsapp_conversations").update(updateData).eq("id", conversation.id);
          console.log("[UAZAPI WEBHOOK] conversation matched:", {
            source: conversationSource,
            conversationId: conversation.id,
            remoteJid,
          });
        } else {
          let contactPhotoUrl: string | null = null;
          if (!isGroup && !fromMe) {
            try {
              if (!uazapiConfigCache) uazapiConfigCache = await loadUazapiConfig(supabase);
              if (!uazapiInstanceTokenCache) {
                uazapiInstanceTokenCache = await resolveUazapiToken(
                  supabase,
                  instance,
                  uazapiConfigCache.baseUrl,
                  uazapiConfigCache.adminToken,
                );
              }
              contactPhotoUrl = await fetchUazapiContactPhoto(
                uazapiConfigCache.baseUrl,
                uazapiInstanceTokenCache,
                remoteJid,
                normalizedPhone || senderPhone,
              );
            } catch (photoErr) {
              console.warn("[UAZAPI WEBHOOK] failed to resolve contact photo (create):", photoErr);
            }
          }

          const { data: newConversation, error: convError } = await supabase
            .from("whatsapp_conversations")
            .insert({
              instance_id: instance.id,
              remote_jid: remoteJid,
              is_group: isGroup,
              contact_name: isGroup ? null : senderName || null,
              contact_phone: isGroup ? null : normalizedPhone || null,
              contact_photo_url: isGroup ? null : contactPhotoUrl,
              status: "pending",
              unread_count: fromMe || isHistoryEvent ? 0 : 1,
              last_message_at: messageTimestampIso,
              last_message_preview: contentText.substring(0, 100) || `[${messageType}]`,
            })
            .select()
            .single();

          if (convError) throw convError;
          conversation = newConversation;
          console.log("[UAZAPI WEBHOOK] conversation created:", {
            conversationId: conversation.id,
            remoteJid,
            isGroup,
          });
        }

        const safeContent = contentText || (messageType === "text" ? "" : `[${messageType}]`);
        const { data: savedMessage, error: msgError } = await supabase
          .from("whatsapp_messages")
          .insert({
            conversation_id: conversation.id,
            instance_id: instance.id,
            created_at: messageTimestampIso,
            message_id_external: externalMessageId || null,
            from_me: fromMe,
            sender_phone: senderPhone || null,
            sender_name: senderName || null,
            content: safeContent,
            message_type: messageType,
            media_url: mediaUrl,
            media_mime_type: mediaMimeType,
            media_filename: mediaFilename,
            quoted_message_id: quotedMessageId,
            quoted_content: quotedContent,
            quoted_sender: quotedSender,
            status: fromMe ? "sent" : "delivered",
          })
          .select()
          .single();

        if (msgError) throw msgError;

        console.log("[UAZAPI WEBHOOK] message inserted:", {
          messageId: savedMessage.id,
          conversationId: conversation.id,
          externalMessageId: externalMessageId || null,
          messageType,
          fromMe,
          hasMediaUrl: Boolean(mediaUrl),
        });

        results.push({ messageId: savedMessage.id, conversationId: conversation.id });
      } catch (msgErr) {
        console.error("[UAZAPI WEBHOOK] parse/map error:", {
          error: msgErr instanceof Error ? msgErr.message : String(msgErr),
          payload: JSON.stringify(msgData).substring(0, 1200),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[UAZAPI WEBHOOK] fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
