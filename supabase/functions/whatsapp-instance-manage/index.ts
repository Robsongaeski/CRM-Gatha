import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "create" | "connect" | "disconnect" | "delete" | "check-status" | "set-webhook" | "get-qrcode" | "restart";
  instanceId?: string;
  instanceName?: string;
  webhookUrl?: string;
  apiType?: "evolution" | "uazapi" | "cloud_api";
}

type UazCfg = { baseUrl: string; adminToken: string };
type UazCtx = { instanceId?: string; instanceName: string; token: string };
const UAZAPI_WEBHOOK_EVENTS = ["messages", "messages_update", "connection", "history"];
const UAZAPI_WEBHOOK_EXCLUDE = ["wasSentByApi"];

const pick = (obj: any, paths: string[]) => {
  for (const p of paths) {
    const v = p.split(".").reduce((a: any, k) => (a && a[k] !== undefined ? a[k] : undefined), obj);
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return null;
};

const parseJsonSafe = async (r: Response) => {
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await r.json();
    } catch {
      return {};
    }
  }
  return { raw: await r.text() };
};

const uazErr = (data: any, fallback: string) => String(pick(data, ["message", "error", "details", "response.message"]) || fallback);
const isAlreadyExistsError = (message: string) => {
  const normalized = String(message || "").toLowerCase();
  if (!normalized) return false;
  return ["already exists", "already exist", "duplicate", "duplicado", "ja existe", "jÃ¡ existe", "exists"].some((part) =>
    normalized.includes(part)
  );
};
const CONNECTED_STATES = new Set(["open", "opened", "connected", "online", "authenticated", "ready"]);
const normalizeConnectionState = (raw: any): { status: "connected" | "disconnected"; rawState: string } => {
  const rawText =
    typeof raw === "string"
      ? raw
      : raw?.connected || raw?.isConnected || raw?.loggedIn || raw?.authenticated || raw?.isOpen
        ? "connected"
        : raw?.status || raw?.state || raw?.connectionStatus || raw?.connection || "unknown";
  const normalized = String(rawText || "unknown").toLowerCase().trim();
  return {
    status: CONNECTED_STATES.has(normalized) ? "connected" : "disconnected",
    rawState: String(rawText || "unknown"),
  };
};
const uazToken = (d: any) => {
  const t = pick(d, ["token", "instance.token", "data.token", "data.instance.token"]);
  return t ? String(t) : "";
};
const uazName = (d: any, fallback: string) => String(pick(d, ["name", "instance.name", "instanceName", "data.name"]) || fallback);
const uazQr = (d: any) => {
  const q = pick(d, ["qrcode.base64", "qrcode", "base64", "instance.qrcode", "data.qrcode", "data.base64"]);
  return q ? String(q) : null;
};
const uazPair = (d: any) => {
  const p = pick(d, ["paircode", "pairingCode", "instance.paircode", "data.pairingCode"]);
  return p ? String(p) : null;
};
const uazStatus = (d: any): { status: "connected" | "disconnected"; rawState: string } => {
  const rawAny = pick(d, [
    "instance.status",
    "instance.state",
    "instance.connectionStatus",
    "status",
    "state",
    "connectionState",
    "connection",
    "connection.status",
    "data.instance.status",
    "data.instance.state",
    "data.instance.connectionStatus",
    "data.status",
    "data.state",
    "data.connectionState",
    "data.connection.status",
  ]);
  return normalizeConnectionState(rawAny);
};
const uazPhone = (d: any) => {
  const r = pick(d, [
    "phone",
    "instance.phone",
    "me.id",
    "instance.me.id",
    "instance.owner",
    "instance.ownerJid",
    "data.phone",
    "data.instance.phone",
    "data.me.id",
  ]);
  if (!r) return null;
  const p = String(r).split("@")[0].split(":")[0].replace(/\D/g, "");
  return /^\d{10,15}$/.test(p) ? p : null;
};
const normalizePhone = (value: unknown) => String(value || "").replace(/\D/g, "");
const uazWebhookBody = (url: string) => ({
  enabled: true,
  url,
  events: UAZAPI_WEBHOOK_EVENTS,
  excludeMessages: UAZAPI_WEBHOOK_EXCLUDE,
  addUrlEvents: false,
  addUrlTypesMessages: false,
});

const resolveWebhookUrl = (candidate: string | undefined, fallback: string): string => {
  const raw = String(candidate || "").trim();
  if (!raw) return fallback;
  if (/^undefined\b/i.test(raw) || /^null\b/i.test(raw)) return fallback;

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
};

async function sysMap(supabase: any, keys: string[]) {
  const { data, error } = await supabase.from("system_config").select("key, value").in("key", keys);
  if (error) throw error;
  const m: Record<string, string> = {};
  for (const row of data || []) m[row.key] = row.value || "";
  return m;
}

async function getUazCfg(supabase: any): Promise<UazCfg> {
  const m = await sysMap(supabase, ["uazapi_api_url", "uazapi_admin_token"]);
  const baseUrl = (m.uazapi_api_url || "").replace(/\/+$/, "");
  const adminToken = m.uazapi_admin_token || "";
  if (!baseUrl || !adminToken) throw new Error("UAZAPI nao configurada. Configure URL e Admin Token.");
  return { baseUrl, adminToken };
}

async function uazReq(cfg: UazCfg, path: string, opts: { method?: string; token?: string; admin?: boolean; body?: any } = {}) {
  const { method = "GET", token, admin = false, body } = opts;
  const url = new URL(`${cfg.baseUrl}${path}`);
  if (token) url.searchParams.set("token", token);
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (admin) headers.admintoken = cfg.adminToken;
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

async function persistUaz(supabase: any, where: { id?: string; instance_name?: string }, patch: Record<string, any>) {
  if (!where.id && !where.instance_name) return;
  try {
    let q = supabase.from("whatsapp_instances").update(patch);
    q = where.id ? q.eq("id", where.id) : q.eq("instance_name", where.instance_name);
    await q;
  } catch {
    // keep compatible even if columns do not exist yet
  }
}

async function tokenFromAll(cfg: UazCfg, name: string): Promise<{ token: string; extId?: string } | null> {
  const { response, data } = await uazReq(cfg, "/instance/all", { admin: true });
  if (!response.ok) return null;
  const arr = Array.isArray(data) ? data : pick(data, ["instances", "data", "results", "response"]) || [];
  const it = (arr as any[]).find((x) => String(x?.name || x?.instanceName || "").trim().toLowerCase() === name.trim().toLowerCase());
  if (!it) return null;
  const token = String(pick(it, ["token", "instance.token"]) || "");
  if (!token) return null;
  const extId = String(pick(it, ["id", "instance.id"]) || "");
  return { token, extId: extId || undefined };
}

async function resolveUazCtx(supabase: any, cfg: UazCfg, p: { instanceId?: string; instanceName?: string; requireToken?: boolean }): Promise<UazCtx> {
  const requireToken = p.requireToken !== false;
  let row: any = null;
  if (p.instanceId) {
    const { data } = await supabase.from("whatsapp_instances").select("*").eq("id", p.instanceId).maybeSingle();
    row = data;
  } else if (p.instanceName) {
    const { data } = await supabase.from("whatsapp_instances").select("*").eq("instance_name", p.instanceName).maybeSingle();
    row = data;
  }
  const instanceName = p.instanceName || row?.instance_name;
  if (!instanceName) throw new Error("instanceName e obrigatorio");

  let token = String(row?.uazapi_instance_token || "");
  if (!token) {
    const fromAll = await tokenFromAll(cfg, instanceName);
    if (fromAll?.token) {
      token = fromAll.token;
      await persistUaz(
        supabase,
        { id: p.instanceId || row?.id, instance_name: instanceName },
        { uazapi_instance_token: fromAll.token, uazapi_instance_external_id: fromAll.extId || null },
      );
    }
  }
  if (requireToken && !token) throw new Error(`Token da instancia UAZAPI nao encontrado para "${instanceName}".`);
  return { instanceId: p.instanceId || row?.id, instanceName, token };
}

async function findConnectedNumberConflict(supabase: any, currentInstanceId: string, numeroWhatsapp: string) {
  const normalized = normalizePhone(numeroWhatsapp);
  if (!currentInstanceId || !normalized) return null;

  const { data, error } = await supabase
    .from("whatsapp_instances")
    .select("id, nome, instance_name, numero_whatsapp")
    .eq("status", "connected")
    .neq("id", currentInstanceId);

  if (error) throw error;

  return (data || []).find((row: any) => normalizePhone(row.numero_whatsapp) === normalized) || null;
}

async function migrateConversationHistoryByPhone(supabase: any, currentInstanceId: string, numeroWhatsapp: string) {
  const normalized = normalizePhone(numeroWhatsapp);
  if (!currentInstanceId || !normalized) return { moved: 0, merged: 0 };

  const { data: allInstances, error: instancesError } = await supabase
    .from("whatsapp_instances")
    .select("id, numero_whatsapp");
  if (instancesError) throw instancesError;

  const sourceInstanceIds = (allInstances || [])
    .filter((inst: any) => inst.id !== currentInstanceId && normalizePhone(inst.numero_whatsapp) === normalized)
    .map((inst: any) => inst.id);

  if (sourceInstanceIds.length === 0) {
    return { moved: 0, merged: 0 };
  }

  const { data: targetConversations, error: targetError } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .eq("instance_id", currentInstanceId);
  if (targetError) throw targetError;

  const { data: sourceConversations, error: sourceError } = await supabase
    .from("whatsapp_conversations")
    .select("*")
    .in("instance_id", sourceInstanceIds);
  if (sourceError) throw sourceError;

  const targetByRemoteJid = new Map<string, any>();
  for (const conv of targetConversations || []) {
    if (conv.remote_jid) targetByRemoteJid.set(conv.remote_jid, conv);
  }

  let moved = 0;
  let merged = 0;

  for (const sourceConv of sourceConversations || []) {
    const sameRemoteJidConv = sourceConv.remote_jid ? targetByRemoteJid.get(sourceConv.remote_jid) : null;

    if (sameRemoteJidConv) {
      const targetLast = sameRemoteJidConv.last_message_at ? new Date(sameRemoteJidConv.last_message_at).getTime() : 0;
      const sourceLast = sourceConv.last_message_at ? new Date(sourceConv.last_message_at).getTime() : 0;
      const sourceIsNewer = sourceLast > targetLast;

      const mergedStatus = [sameRemoteJidConv.status, sourceConv.status].includes("in_progress")
        ? "in_progress"
        : [sameRemoteJidConv.status, sourceConv.status].includes("pending")
          ? "pending"
          : (sameRemoteJidConv.status || sourceConv.status || "pending");

      const mergedUpdate: any = {
        unread_count: Number(sameRemoteJidConv.unread_count || 0) + Number(sourceConv.unread_count || 0),
        status: mergedStatus,
        assigned_to: sameRemoteJidConv.assigned_to || sourceConv.assigned_to || null,
        finished_by: mergedStatus === "finished"
          ? (sameRemoteJidConv.finished_by || sourceConv.finished_by || null)
          : null,
        contact_name: sameRemoteJidConv.contact_name || sourceConv.contact_name || null,
        contact_phone: sameRemoteJidConv.contact_phone || sourceConv.contact_phone || null,
        contact_photo_url: sameRemoteJidConv.contact_photo_url || sourceConv.contact_photo_url || null,
        group_name: sameRemoteJidConv.group_name || sourceConv.group_name || null,
        group_photo_url: sameRemoteJidConv.group_photo_url || sourceConv.group_photo_url || null,
        cliente_id: sameRemoteJidConv.cliente_id || sourceConv.cliente_id || null,
        internal_notes: sameRemoteJidConv.internal_notes || sourceConv.internal_notes || null,
      };

      if (sourceIsNewer) {
        mergedUpdate.last_message_at = sourceConv.last_message_at || sameRemoteJidConv.last_message_at;
        mergedUpdate.last_message_preview = sourceConv.last_message_preview || sameRemoteJidConv.last_message_preview;
      }

      if (sourceConv.last_customer_message_at) {
        const targetLastCustomer = sameRemoteJidConv.last_customer_message_at
          ? new Date(sameRemoteJidConv.last_customer_message_at).getTime()
          : 0;
        const sourceLastCustomer = new Date(sourceConv.last_customer_message_at).getTime();
        if (sourceLastCustomer > targetLastCustomer) {
          mergedUpdate.last_customer_message_at = sourceConv.last_customer_message_at;
        }
      }

      await supabase.from("whatsapp_messages")
        .update({ conversation_id: sameRemoteJidConv.id, instance_id: currentInstanceId })
        .eq("conversation_id", sourceConv.id);

      await supabase.from("whatsapp_message_queue")
        .update({ conversation_id: sameRemoteJidConv.id, instance_id: currentInstanceId })
        .eq("conversation_id", sourceConv.id);

      await supabase.from("whatsapp_conversations")
        .update(mergedUpdate)
        .eq("id", sameRemoteJidConv.id);

      await supabase.from("whatsapp_conversations")
        .delete()
        .eq("id", sourceConv.id);

      merged += 1;
      continue;
    }

    await supabase.from("whatsapp_conversations")
      .update({ instance_id: currentInstanceId })
      .eq("id", sourceConv.id);

    await supabase.from("whatsapp_messages")
      .update({ instance_id: currentInstanceId })
      .eq("conversation_id", sourceConv.id);

    await supabase.from("whatsapp_message_queue")
      .update({ instance_id: currentInstanceId })
      .eq("conversation_id", sourceConv.id);

    targetByRemoteJid.set(sourceConv.remote_jid, { ...sourceConv, instance_id: currentInstanceId });
    moved += 1;
  }

  await supabase.from("whatsapp_messages")
    .update({ instance_id: currentInstanceId })
    .in("instance_id", sourceInstanceIds)
    .is("conversation_id", null);

  await supabase.from("whatsapp_message_queue")
    .update({ instance_id: currentInstanceId })
    .in("instance_id", sourceInstanceIds)
    .is("conversation_id", null);

  return { moved, merged };
}

async function enforceConnectedNumberUniqueness(
  supabase: any,
  currentInstanceId: string,
  numeroWhatsapp: string,
  currentInstanceLabel?: string,
) {
  const conflict = await findConnectedNumberConflict(supabase, currentInstanceId, numeroWhatsapp);
  if (!conflict) return;

  const conflictName = conflict.nome || conflict.instance_name || conflict.id;
  const ownName = currentInstanceLabel || currentInstanceId;
  throw new Error(
    `O número ${normalizePhone(numeroWhatsapp)} já está conectado na instância "${conflictName}". ` +
    `Desconecte "${conflictName}" para conectar "${ownName}".`,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const baseUrl = (evolutionApiUrl || "").replace(/\/+$/, "").replace(/\/manager$/i, "");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: RequestBody = await req.json();
    const { action, instanceId, instanceName, webhookUrl, apiType: bodyApiType } = body;
    let apiType = bodyApiType || "evolution";
    let result: any = {};

    if (!bodyApiType && (instanceId || instanceName)) {
      const { data } = await (instanceId
        ? supabase.from("whatsapp_instances").select("api_type").eq("id", instanceId).maybeSingle()
        : supabase.from("whatsapp_instances").select("api_type").eq("instance_name", instanceName).maybeSingle());
      if (data?.api_type) apiType = data.api_type;
    }

    if (action === "create") {
      if (!instanceName) throw new Error("instanceName e obrigatorio");
      if (apiType === "uazapi") {
        const cfg = await getUazCfg(supabase);
        const existing = await tokenFromAll(cfg, instanceName);
        if (existing?.token) {
          await persistUaz(
            supabase,
            { id: instanceId, instance_name: instanceName },
            { uazapi_instance_token: existing.token, uazapi_instance_external_id: existing.extId || null },
          );

          let statusData: any = null;
          try {
            const st = await uazReq(cfg, "/instance/status", { token: existing.token });
            statusData = st.data;
          } catch {
            // ignore and return minimal success payload
          }

          result = {
            success: true,
            reusedExistingInstance: true,
            instance: statusData?.instance || statusData || null,
            instanceName,
            instanceToken: existing.token,
            instanceExternalId: existing.extId || null,
            qrcode: uazQr(statusData),
            pairingCode: uazPair(statusData),
          };
          return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const init = await uazReq(cfg, "/instance/init", {
          method: "POST",
          admin: true,
          body: { name: instanceName, instanceName, Name: instanceName },
        });
        if (!init.response.ok) {
          const initErrorMessage = uazErr(init.data, "Erro ao criar instancia UAZAPI");
          if (!isAlreadyExistsError(initErrorMessage)) {
            throw new Error(initErrorMessage);
          }

          const found = await tokenFromAll(cfg, instanceName);
          if (!found?.token) throw new Error(initErrorMessage);

          await persistUaz(
            supabase,
            { id: instanceId, instance_name: instanceName },
            { uazapi_instance_token: found.token, uazapi_instance_external_id: found.extId || null },
          );

          let statusData: any = null;
          try {
            const st = await uazReq(cfg, "/instance/status", { token: found.token });
            statusData = st.data;
          } catch {
            // ignore and return minimal success payload
          }

          result = {
            success: true,
            reusedExistingInstance: true,
            instance: statusData?.instance || statusData || null,
            instanceName,
            instanceToken: found.token,
            instanceExternalId: found.extId || null,
            qrcode: uazQr(statusData),
            pairingCode: uazPair(statusData),
          };
          return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        let token = uazToken(init.data);
        let extId = pick(init.data, ["id", "instance.id", "data.id"]);
        if (!token) {
          const found = await tokenFromAll(cfg, instanceName);
          token = found?.token || "";
          extId = extId || found?.extId;
        }
        result = {
          success: true,
          instance: init.data?.instance || init.data,
          instanceName: uazName(init.data, instanceName),
          instanceToken: token || null,
          instanceExternalId: extId || null,
          qrcode: uazQr(init.data),
          pairingCode: uazPair(init.data),
        };
      } else {
        if (!evolutionApiUrl || !evolutionApiKey) throw new Error("Evolution API nao configurada");
        const r = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers: { apikey: evolutionApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
        });
        const d = await parseJsonSafe(r);
        if (!r.ok) throw new Error(d.response?.message?.[0] || d.message || "Erro ao criar instancia");
        result = { success: true, instance: d.instance, qrcode: d.qrcode };
      }
    } else if (action === "connect" || action === "get-qrcode" || action === "restart") {
      if (!instanceName) throw new Error("instanceName e obrigatorio");
      if (apiType === "uazapi") {
        const cfg = await getUazCfg(supabase);
        const ctx = await resolveUazCtx(supabase, cfg, { instanceId, instanceName, requireToken: true });
        if (action === "restart") {
          try {
            await uazReq(cfg, "/instance/disconnect", { method: "POST", token: ctx.token, body: {} });
          } catch {
            // ignore
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
        let qrData: any = null;
        if (action === "get-qrcode") {
          const st = await uazReq(cfg, "/instance/status", { token: ctx.token });
          qrData = st.data;
          if (!uazQr(qrData)) {
            const c = await uazReq(cfg, "/instance/connect", { method: "POST", token: ctx.token, body: {} });
            if (!c.response.ok) throw new Error(uazErr(c.data, "Erro ao conectar instancia UAZAPI"));
            qrData = c.data;
          }
        } else {
          const c = await uazReq(cfg, "/instance/connect", { method: "POST", token: ctx.token, body: {} });
          if (!c.response.ok) throw new Error(uazErr(c.data, "Erro ao conectar instancia UAZAPI"));
          qrData = c.data;
        }

        if (action === "restart") {
          const autoWebhook = `${supabaseUrl}/functions/v1/receive-whatsapp-uazapi-webhook`;
          try {
            await uazReq(cfg, "/webhook", {
              method: "POST",
              token: ctx.token,
              body: uazWebhookBody(autoWebhook),
            });
          } catch {
            // ignore
          }
          await supabase.from("whatsapp_instances").update({ status: "connecting", webhook_configured: true }).eq("id", ctx.instanceId);
        } else if (ctx.instanceId) {
          await supabase.from("whatsapp_instances").update({ status: "connecting" }).eq("id", ctx.instanceId);
        }

        result = {
          success: true,
          qrcode: uazQr(qrData),
          pairingCode: uazPair(qrData),
          state: uazStatus(qrData).rawState,
          message: action === "restart" ? "Instancia UAZAPI reiniciada. Escaneie o novo QR code." : undefined,
          rawData: qrData,
        };
      } else {
        if (!evolutionApiUrl || !evolutionApiKey) throw new Error("Evolution API nao configurada");
        if (action !== "get-qrcode") {
          try {
            await fetch(`${baseUrl}/instance/delete/${instanceName}`, { method: "DELETE", headers: { apikey: evolutionApiKey } });
          } catch {
            // ignore
          }
          await new Promise((r) => setTimeout(r, action === "restart" ? 2000 : 1000));
        }
        const url = action === "get-qrcode" ? `${baseUrl}/instance/connect/${instanceName}` : `${baseUrl}/instance/create`;
        const r = await fetch(url, {
          method: action === "get-qrcode" ? "GET" : "POST",
          headers: { apikey: evolutionApiKey, "Content-Type": "application/json" },
          body: action === "get-qrcode" ? undefined : JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
        });
        const d = await parseJsonSafe(r);
        if (!r.ok) throw new Error(d.response?.message?.[0] || d.message || "Erro na operacao da instancia");
        if (action === "restart" && instanceId) {
          await supabase.from("whatsapp_instances").update({ status: "disconnected", webhook_configured: true }).eq("id", instanceId);
        } else if (instanceId && action !== "get-qrcode") {
          await supabase.from("whatsapp_instances").update({ status: "connecting" }).eq("id", instanceId);
        }
        result = {
          success: true,
          qrcode: d.qrcode?.base64 || d.qrcode || d.base64,
          pairingCode: d.pairingCode,
          state: d.state,
          message: action === "restart" ? "Instancia recriada com sucesso. Escaneie o novo QR code." : undefined,
        };
      }
    } else if (action === "disconnect" || action === "delete") {
      if (!instanceName) throw new Error("instanceName e obrigatorio");
      if (apiType === "uazapi") {
        const cfg = await getUazCfg(supabase);
        const ctx = await resolveUazCtx(supabase, cfg, { instanceId, instanceName, requireToken: action !== "delete" });
        if (action === "disconnect") {
          if (ctx.token) await uazReq(cfg, "/instance/disconnect", { method: "POST", token: ctx.token, body: {} });
        } else if (ctx.token) {
          const del = await uazReq(cfg, "/instance", { method: "DELETE", token: ctx.token });
          if (!del.response.ok && del.response.status !== 404) throw new Error(uazErr(del.data, "Erro ao deletar instancia UAZAPI"));
        }
      } else if (evolutionApiUrl && evolutionApiKey) {
        const url = action === "disconnect" ? `${baseUrl}/instance/logout/${instanceName}` : `${baseUrl}/instance/delete/${instanceName}`;
        try {
          await fetch(url, { method: "DELETE", headers: { apikey: evolutionApiKey } });
          if (action === "disconnect") {
            await fetch(`${baseUrl}/instance/delete/${instanceName}`, { method: "DELETE", headers: { apikey: evolutionApiKey } });
          }
        } catch {
          // ignore
        }
      }
      if (action === "disconnect" && instanceId) await supabase.from("whatsapp_instances").update({ status: "disconnected" }).eq("id", instanceId);
      result = { success: true };
    } else if (action === "set-webhook") {
      if (!instanceName) throw new Error("instanceName e obrigatorio");
      if (apiType === "uazapi") {
        const cfg = await getUazCfg(supabase);
        const ctx = await resolveUazCtx(supabase, cfg, { instanceId, instanceName, requireToken: true });
        const fallbackWebhook = `${supabaseUrl}/functions/v1/receive-whatsapp-uazapi-webhook`;
        const finalWebhook = resolveWebhookUrl(webhookUrl, fallbackWebhook);
        const wr = await uazReq(cfg, "/webhook", {
          method: "POST",
          token: ctx.token,
          body: uazWebhookBody(finalWebhook),
        });
        if (!wr.response.ok) throw new Error(uazErr(wr.data, "Erro ao configurar webhook UAZAPI"));
        if (ctx.instanceId) await supabase.from("whatsapp_instances").update({ webhook_configured: true }).eq("id", ctx.instanceId);
        else await supabase.from("whatsapp_instances").update({ webhook_configured: true }).eq("instance_name", ctx.instanceName);
        result = { success: true, webhookSet: true, data: wr.data, webhookUrl: finalWebhook };
      } else {
        if (!evolutionApiUrl || !evolutionApiKey) throw new Error("Evolution API nao configurada");
        const fallbackWebhook = `${supabaseUrl}/functions/v1/receive-whatsapp-webhook`;
        const finalWebhook = resolveWebhookUrl(webhookUrl, fallbackWebhook);
        let ok = false;
        let r = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: "POST",
          headers: { apikey: evolutionApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            webhook: { enabled: true, url: finalWebhook, byEvents: false, base64: true, events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"] },
          }),
        });
        let d = await parseJsonSafe(r);
        if (r.ok) ok = true;
        if (!ok) {
          r = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
            method: "POST",
            headers: { apikey: evolutionApiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ url: finalWebhook, webhook_by_events: false, webhook_base64: true, events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE"] }),
          });
          d = await parseJsonSafe(r);
          if (r.ok) ok = true;
        }
        if (!ok) {
          const errMsg =
            String(pick(d, ["response.message.0", "response.message", "message", "error"]) || "").trim() ||
            `Falha ao configurar webhook na Evolution API para ${instanceName}.`;
          throw new Error(errMsg);
        }

        if (instanceId) await supabase.from("whatsapp_instances").update({ webhook_configured: true }).eq("id", instanceId);
        else await supabase.from("whatsapp_instances").update({ webhook_configured: true }).eq("instance_name", instanceName);
        result = { success: true, webhookSet: true, data: d, webhookUrl: finalWebhook };
      }
    } else if (action === "check-status") {
      if (instanceName) {
        if (apiType === "uazapi") {
          const cfg = await getUazCfg(supabase);
          const ctx = await resolveUazCtx(supabase, cfg, { instanceId, instanceName, requireToken: true });
          const st = await uazReq(cfg, "/instance/status", { token: ctx.token });
          if (!st.response.ok) throw new Error(uazErr(st.data, "Erro ao consultar status UAZAPI"));
          const norm = uazStatus(st.data);
          const phone = uazPhone(st.data);
          const update: any = { status: norm.status };
          if (phone) update.numero_whatsapp = phone;
          if (norm.status === "connected" && ctx.token) {
            const autoWebhook = `${supabaseUrl}/functions/v1/receive-whatsapp-uazapi-webhook`;
            try {
              const wr = await uazReq(cfg, "/webhook", {
                method: "POST",
                token: ctx.token,
                body: uazWebhookBody(autoWebhook),
              });
              if (wr.response.ok) update.webhook_configured = true;
            } catch (webhookErr) {
              console.error("[UAZAPI] erro ao auto-configurar webhook no check-status:", webhookErr);
            }
          }

          if (norm.status === "connected" && phone && ctx.instanceId) {
            try {
              await enforceConnectedNumberUniqueness(supabase, ctx.instanceId, phone, ctx.instanceName);
              await supabase.from("whatsapp_instances").update(update).eq("id", ctx.instanceId);
              await migrateConversationHistoryByPhone(supabase, ctx.instanceId, phone);
            } catch (conflictError) {
              await supabase.from("whatsapp_instances")
                .update({ status: "error", numero_whatsapp: phone })
                .eq("id", ctx.instanceId);
              throw conflictError;
            }
          } else if (ctx.instanceId) {
            await supabase.from("whatsapp_instances").update(update).eq("id", ctx.instanceId);
          } else {
            await supabase.from("whatsapp_instances").update(update).eq("instance_name", ctx.instanceName);
          }

          result = { success: true, instanceName: ctx.instanceName, status: norm.status, numeroWhatsapp: phone, rawState: norm.rawState, rawData: st.data };
        } else {
          if (!evolutionApiUrl || !evolutionApiKey) throw new Error("Evolution API nao configurada");
          const r = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers: { apikey: evolutionApiKey } });
          const d = await parseJsonSafe(r);
          const normalizedState = normalizeConnectionState(
            pick(d, [
              "instance.state",
              "instance.status",
              "instance.connectionStatus",
              "state",
              "status",
              "connectionState",
              "connection.status",
              "data.instance.state",
              "data.instance.status",
              "data.status",
              "data.state",
            ]),
          );
          const rawState = normalizedState.rawState;
          let status: "connected" | "disconnected" | "error" = normalizedState.status;
          let numeroWhatsapp: string | null = null;
          let sessionCorrupted = false;
          if (status === "connected") {
            try {
              const fr = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, { headers: { apikey: evolutionApiKey } });
              const fd = await parseJsonSafe(fr);
              const i = Array.isArray(fd) ? fd[0] : fd;
              const code = i?.disconnectionReasonCode || i?.instance?.disconnectionReasonCode;
              const reason = JSON.stringify(i?.disconnectionObject || i?.instance?.disconnectionObject || "");
              if (code === 401 || code > 0 || reason.includes("device_removed") || reason.includes("conflict")) {
                sessionCorrupted = true;
                status = "error";
              }
              const ownerJid = i?.ownerJid || i?.instance?.ownerJid;
              const owner = i?.owner || i?.instance?.owner;
              if (ownerJid) numeroWhatsapp = ownerJid.split("@")[0];
              else if (owner) numeroWhatsapp = owner.split("@")[0].split(":")[0];
              else numeroWhatsapp = i?.profileNumber || i?.instance?.profileNumber || null;
            } catch {
              // ignore
            }
          }
          const update: any = { status };
          if (numeroWhatsapp) update.numero_whatsapp = numeroWhatsapp;

          if (status === "connected" && numeroWhatsapp && instanceId) {
            try {
              await enforceConnectedNumberUniqueness(supabase, instanceId, numeroWhatsapp, instanceName);
              await supabase.from("whatsapp_instances").update(update).eq("id", instanceId);
              await migrateConversationHistoryByPhone(supabase, instanceId, numeroWhatsapp);
            } catch (conflictError) {
              await supabase.from("whatsapp_instances")
                .update({ status: "error", numero_whatsapp: numeroWhatsapp })
                .eq("id", instanceId);
              throw conflictError;
            }
          } else if (instanceId) {
            await supabase.from("whatsapp_instances").update(update).eq("id", instanceId);
          } else {
            await supabase.from("whatsapp_instances").update(update).eq("instance_name", instanceName);
          }

          result = { success: true, instanceName, status, numeroWhatsapp, sessionCorrupted, rawState: String(rawState), rawData: d };
        }
      } else {
        const { data: instances } = await supabase.from("whatsapp_instances").select("*").eq("is_active", true);
        const statuses: any[] = [];
        let cfg: UazCfg | null = null;
        for (const inst of instances || []) {
          try {
            const instApi = inst.api_type || "evolution";
            let status: "connected" | "disconnected" = "disconnected";
            let numeroWhatsapp: string | null = null;
            if (instApi === "uazapi") {
              if (!cfg) cfg = await getUazCfg(supabase);
              const ctx = await resolveUazCtx(supabase, cfg, { instanceId: inst.id, instanceName: inst.instance_name, requireToken: false });
              if (!ctx.token) throw new Error("Token da instancia UAZAPI nao encontrado");
              const st = await uazReq(cfg, "/instance/status", { token: ctx.token });
              if (!st.response.ok) throw new Error(uazErr(st.data, "Erro ao consultar status UAZAPI"));
              status = uazStatus(st.data).status;
              numeroWhatsapp = uazPhone(st.data);
            } else {
              if (!evolutionApiUrl || !evolutionApiKey) continue;
              const r = await fetch(`${baseUrl}/instance/connectionState/${inst.instance_name}`, { headers: { apikey: evolutionApiKey } });
              const d = await parseJsonSafe(r);
              status = normalizeConnectionState(
                pick(d, [
                  "instance.state",
                  "instance.status",
                  "instance.connectionStatus",
                  "state",
                  "status",
                  "connectionState",
                  "connection.status",
                  "data.instance.state",
                  "data.instance.status",
                  "data.status",
                  "data.state",
                ]),
              ).status;
              if (status === "connected") {
                try {
                  const fr = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${inst.instance_name}`, { headers: { apikey: evolutionApiKey } });
                  const fd = await parseJsonSafe(fr);
                  const i = Array.isArray(fd) ? fd[0] : fd;
                  const ownerJid = i?.ownerJid || i?.instance?.ownerJid;
                  const owner = i?.owner || i?.instance?.owner;
                  if (ownerJid) numeroWhatsapp = ownerJid.split("@")[0];
                  else if (owner) numeroWhatsapp = owner.split("@")[0].split(":")[0];
                } catch {
                  // ignore
                }
              }
            }
            const update: any = { status };
            if (numeroWhatsapp) update.numero_whatsapp = numeroWhatsapp;
            if (status === "connected" && numeroWhatsapp) {
              try {
                await enforceConnectedNumberUniqueness(supabase, inst.id, numeroWhatsapp, inst.instance_name);
                await supabase.from("whatsapp_instances").update(update).eq("id", inst.id);
                await migrateConversationHistoryByPhone(supabase, inst.id, numeroWhatsapp);
              } catch (conflictError) {
                await supabase.from("whatsapp_instances")
                  .update({ status: "error", numero_whatsapp: numeroWhatsapp })
                  .eq("id", inst.id);
                throw conflictError;
              }
            } else {
              await supabase.from("whatsapp_instances").update(update).eq("id", inst.id);
            }
            statuses.push({ id: inst.id, instance_name: inst.instance_name, status, numero_whatsapp: numeroWhatsapp });
          } catch (error: unknown) {
            await supabase.from("whatsapp_instances").update({ status: "error" }).eq("id", inst.id);
            statuses.push({ id: inst.id, instance_name: inst.instance_name, status: "error", error: error instanceof Error ? error.message : "Erro" });
          }
        }
        result = { success: true, instances: statuses };
      }
    } else {
      throw new Error(`Acao nao reconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: unknown) {
    console.error("Erro na gestao de instancia:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
