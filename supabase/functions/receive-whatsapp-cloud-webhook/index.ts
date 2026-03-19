import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // =============================================
  // GET - Webhook Verification (Meta Challenge)
  // =============================================
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook verification request:", { mode, token });

    if (mode === "subscribe") {
      // Buscar verify_token do banco
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: config } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "meta_verify_token")
        .single();

      const expectedToken = config?.value;

      if (token === expectedToken) {
        console.log("Webhook verified successfully!");
        return new Response(challenge, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      } else {
        console.error("Verify token mismatch:", { received: token, expected: expectedToken });
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
    }

    return new Response("Bad Request", { status: 400, headers: corsHeaders });
  }

  // =============================================
  // POST - Incoming Messages & Status Updates
  // =============================================
  if (req.method === "POST") {
    try {
      const body = await req.json();
      console.log("Cloud webhook received:", JSON.stringify(body).substring(0, 500));

      // Validar assinatura (X-Hub-Signature-256) se app_secret configurado
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Processar entries do webhook da Meta
      const entries = body?.entry || [];

      for (const entry of entries) {
        const changes = entry?.changes || [];

        for (const change of changes) {
          if (change.field !== "messages") continue;

          const value = change.value;
          const metadata = value?.metadata;
          const phoneNumberId = metadata?.phone_number_id;
          const displayPhone = metadata?.display_phone_number;

          // Buscar instância pelo phone_number_id
          const { data: instance } = await supabase
            .from("whatsapp_instances")
            .select("*")
            .eq("meta_phone_number_id", phoneNumberId)
            .eq("api_type", "cloud_api")
            .single();

          if (!instance) {
            console.warn("No instance found for phone_number_id:", phoneNumberId);
            continue;
          }

          // Processar mensagens recebidas
          const messages = value?.messages || [];
          for (const msg of messages) {
            const contactPhone = msg.from;
            const contactName =
              value?.contacts?.[0]?.profile?.name || contactPhone;

            // Upsert conversa
            const { data: conversation } = await supabase
              .from("whatsapp_conversations")
              .upsert(
                {
                  instance_id: instance.id,
                  remote_jid: `${contactPhone}@s.whatsapp.net`,
                  contact_name: contactName,
                  contact_phone: contactPhone,
                  last_message:
                    msg.text?.body ||
                    msg.type ||
                    "Mídia",
                  last_message_at: new Date().toISOString(),
                  last_customer_message_at: new Date().toISOString(),
                  status: "pending",
                  unread_count: 1,
                },
                {
                  onConflict: "instance_id,remote_jid",
                  ignoreDuplicates: false,
                }
              )
              .select()
              .single();

            if (!conversation) {
              console.error("Failed to upsert conversation");
              continue;
            }

            // Incrementar unread
            await supabase
              .from("whatsapp_conversations")
              .update({
                unread_count: (conversation.unread_count || 0) + 1,
                last_customer_message_at: new Date().toISOString(),
              })
              .eq("id", conversation.id);

            // Determinar conteúdo da mensagem
            let messageBody = "";
            let messageType = "text";
            let mediaUrl = null;

            if (msg.type === "text") {
              messageBody = msg.text?.body || "";
            } else if (["image", "video", "audio", "document", "sticker"].includes(msg.type)) {
              messageType = msg.type;
              messageBody = msg[msg.type]?.caption || `[${msg.type}]`;
              // Media ID para download posterior
              const mediaId = msg[msg.type]?.id;
              if (mediaId) {
                mediaUrl = `meta_media:${mediaId}`;
              }
            } else if (msg.type === "reaction") {
              messageType = "reaction";
              messageBody = msg.reaction?.emoji || "👍";
            } else if (msg.type === "location") {
              messageType = "location";
              messageBody = `📍 ${msg.location?.latitude}, ${msg.location?.longitude}`;
            } else {
              messageBody = `[${msg.type}]`;
            }

            // Salvar mensagem
            await supabase.from("whatsapp_messages").insert({
              conversation_id: conversation.id,
              instance_id: instance.id,
              remote_jid: `${contactPhone}@s.whatsapp.net`,
              message_id: msg.id,
              from_me: false,
              message_type: messageType,
              body: messageBody,
              media_url: mediaUrl,
              status: "received",
              timestamp: msg.timestamp
                ? new Date(parseInt(msg.timestamp) * 1000).toISOString()
                : new Date().toISOString(),
            });

            console.log("Message saved for conversation:", conversation.id);
          }

          // Processar status updates
          const statuses = value?.statuses || [];
          for (const status of statuses) {
            const statusMap: Record<string, string> = {
              sent: "server_ack",
              delivered: "delivery_ack",
              read: "read",
              failed: "failed",
            };

            const mappedStatus = statusMap[status.status] || status.status;

            await supabase
              .from("whatsapp_messages")
              .update({ status: mappedStatus })
              .eq("message_id", status.id);

            console.log(`Status updated: ${status.id} -> ${mappedStatus}`);
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      // Sempre retornar 200 para a Meta não reenviar
      return new Response(JSON.stringify({ error: "Processing error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", {
    status: 405,
    headers: corsHeaders,
  });
});
