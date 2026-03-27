import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const pick = (obj: any, paths: string[]) => {
  for (const path of paths) {
    const value = path.split(".").reduce((acc: any, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
};

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
  const baseUrl = (map["uazapi_api_url"] || "").replace(/\/+$/, "");
  const adminToken = map["uazapi_admin_token"] || "";
  if (!baseUrl || !adminToken) throw new Error("UAZAPI nao configurada.");
  return { baseUrl, adminToken };
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
  if (adminToken) headers["admintoken"] = adminToken;
  if (token) {
    headers["token"] = token;
    headers["Authorization"] = `Bearer ${token}`;
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
    // Keep compatibility if migration not applied yet.
  }
}

async function resolveUazapiToken(supabase: any, instance: any, baseUrl: string, adminToken: string): Promise<string> {
  const currentToken = String(instance?.uazapi_instance_token || "");
  if (currentToken) return currentToken;

  const allResp = await uazapiRequest(baseUrl, "/instance/all", { adminToken });
  if (!allResp.response.ok) throw new Error("Nao foi possivel listar instancias UAZAPI.");

  const instances = Array.isArray(allResp.data)
    ? allResp.data
    : pick(allResp.data, ["instances", "data", "results", "response"]) || [];

  const found = (instances as any[]).find((item) =>
    String(item?.name || item?.instanceName || item?.instance_name || "").trim().toLowerCase() ===
    String(instance.instance_name || "").trim().toLowerCase()
  );
  const token = String(pick(found, ["token", "instance.token"]) || "");
  if (!token) throw new Error(`Token UAZAPI nao encontrado para ${instance.instance_name}.`);

  await persistUazapiToken(supabase, instance.id, token, String(pick(found, ["id", "instance.id"]) || ""));
  return token;
}

function normalizePhoneFromJid(remoteJid: string): string {
  if (remoteJid.includes("@g.us")) return remoteJid;
  return remoteJid.replace(/@.*$/, "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const evolutionApiUrlRaw = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const evolutionApiUrl = (evolutionApiUrlRaw || "").replace(/\/+$/, "").replace(/\/manager$/, "");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data: connectedInstances } = await supabase
      .from("whatsapp_instances")
      .select("id, instance_name, api_type, uazapi_instance_token")
      .eq("is_active", true)
      .eq("status", "connected");

    if (!connectedInstances || connectedInstances.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Nenhuma instancia conectada", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const instanceIds = connectedInstances.map((i) => i.id);
    const instanceMap = new Map(connectedInstances.map((i) => [i.id, i]));
    const hasUazapi = connectedInstances.some((i) => (i.api_type || "evolution") === "uazapi");
    const uazCfg = hasUazapi ? await loadUazapiConfig(supabase) : null;

    const { data: pendingMessages } = await supabase
      .from("whatsapp_message_queue")
      .select("*")
      .in("instance_id", instanceIds)
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Nenhuma mensagem na fila", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let errors = 0;

    for (const msg of pendingMessages) {
      try {
        const instance = instanceMap.get(msg.instance_id);
        if (!instance) continue;
        const apiType = instance.api_type || "evolution";

        await supabase
          .from("whatsapp_message_queue")
          .update({ status: "processing", attempts: msg.attempts + 1 })
          .eq("id", msg.id);

        let response: Response;
        let result: any = {};

        if (apiType === "uazapi") {
          if (!uazCfg) throw new Error("UAZAPI nao configurada.");
          const token = await resolveUazapiToken(supabase, instance, uazCfg.baseUrl, uazCfg.adminToken);
          const number = normalizePhoneFromJid(msg.remote_jid);

          if (msg.message_type === "text") {
            const sent = await uazapiRequest(uazCfg.baseUrl, "/send/text", {
              method: "POST",
              token,
              body: { number, phone: number, text: msg.content, message: msg.content },
            });
            response = sent.response;
            result = sent.data;
          } else {
            const mediaPayload: any = {
              number,
              phone: number,
              type: msg.message_type || "image",
              caption: msg.content || "",
            };
            if (msg.media_base64) {
              mediaPayload.media = msg.media_base64;
              mediaPayload.base64 = msg.media_base64;
            } else if (msg.media_url) {
              mediaPayload.media = msg.media_url;
              mediaPayload.url = msg.media_url;
            }
            const sent = await uazapiRequest(uazCfg.baseUrl, "/send/media", {
              method: "POST",
              token,
              body: mediaPayload,
            });
            response = sent.response;
            result = sent.data;
          }
        } else {
          if (!evolutionApiUrl || !evolutionApiKey) throw new Error("Evolution API nao configurada");
          if (msg.message_type === "text") {
            response = await fetch(`${evolutionApiUrl}/message/sendText/${instance.instance_name}`, {
              method: "POST",
              headers: { apikey: evolutionApiKey, "Content-Type": "application/json" },
              body: JSON.stringify({ number: msg.remote_jid, text: msg.content }),
            });
          } else {
            const mediaPayload: any = { number: msg.remote_jid, caption: msg.content };
            if (msg.media_base64) mediaPayload.media = msg.media_base64;
            else if (msg.media_url) mediaPayload.media = msg.media_url;
            response = await fetch(`${evolutionApiUrl}/message/sendMedia/${instance.instance_name}`, {
              method: "POST",
              headers: { apikey: evolutionApiKey, "Content-Type": "application/json" },
              body: JSON.stringify(mediaPayload),
            });
          }
          result = await parseJsonSafe(response);
        }

        if (response.ok) {
          const messageIdExternal = pick(result, ["key.id", "messageId", "id"]);
          await supabase.from("whatsapp_messages").insert({
            conversation_id: msg.conversation_id,
            instance_id: msg.instance_id,
            message_id_external: messageIdExternal,
            from_me: true,
            content: msg.content,
            message_type: msg.message_type,
            media_url: msg.media_url,
            status: "sent",
          });

          if (msg.conversation_id) {
            await supabase
              .from("whatsapp_conversations")
              .update({
                last_message_at: new Date().toISOString(),
                last_message_preview: msg.content?.substring(0, 100) || `[${msg.message_type}]`,
              })
              .eq("id", msg.conversation_id);
          }

          await supabase
            .from("whatsapp_message_queue")
            .update({ status: "sent", processed_at: new Date().toISOString() })
            .eq("id", msg.id);

          processed++;
        } else {
          throw new Error(String(pick(result, ["message", "error"]) || "Erro ao enviar"));
        }
      } catch (error: unknown) {
        await supabase
          .from("whatsapp_message_queue")
          .update({
            status: msg.attempts + 1 >= 3 ? "error" : "pending",
            error_message: error instanceof Error ? error.message : "Erro desconhecido",
          })
          .eq("id", msg.id);
        errors++;
      }
    }

    return new Response(JSON.stringify({ success: true, processed, errors, total: pendingMessages.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Erro ao processar fila:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
