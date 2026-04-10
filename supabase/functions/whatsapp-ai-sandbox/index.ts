import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProviderName = "openai" | "gemini";

function asString(value: unknown): string {
  return String(value ?? "").trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractFirstJsonObject(text: string): string | null {
  const source = String(text || "");
  const start = source.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return null;
}

function parseDecisionText(text: string): Record<string, unknown> {
  const raw = asString(text);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const extracted = extractFirstJsonObject(raw);
    if (!extracted) return {};
    try {
      return JSON.parse(extracted);
    } catch {
      return {};
    }
  }
}

function normalizeDecision(raw: Record<string, unknown>, threshold: number): any {
  const actionRaw = asString(raw.action).toLowerCase();
  const action = actionRaw === "reply" || actionRaw === "handoff" || actionRaw === "ignore"
    ? actionRaw
    : "handoff";

  const confidence = clamp(toNumber(raw.confidence, 0), 0, 1);
  const replyText = asString(raw.reply_text);

  return {
    action,
    reply_text: replyText,
    confidence,
    intent: asString(raw.intent) || "unknown",
    handoff_reason: asString(raw.handoff_reason) || "no_reason",
  };
}

function extractOpenAiText(payload: Record<string, unknown>): string {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  for (const choice of choices) {
    const msg = (choice as any)?.message;
    if (msg && typeof msg.content === "string") return msg.content;
  }
  return "";
}

function extractGeminiText(payload: Record<string, unknown>): string {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    const parts = (candidate as any)?.content?.parts || [];
    for (const part of parts) {
      if (typeof part?.text === "string") return part.text;
    }
  }
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { 
      system_prompt: rawSystemPrompt, 
      user_message, 
      temperature = 0.4, 
      model = "gpt-4o-mini", 
      provider = "openai",
      confidence_threshold = 0.7
    } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let openAiKey = Deno.env.get("OPENAI_API_KEY") || "";
    let geminiKey = Deno.env.get("GEMINI_API_KEY") || "";

    try {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", ["openai_api_key", "gemini_api_key"]);

      const keyMap: Record<string, string> = {};
      for (const row of data || []) {
        if (row.key) keyMap[row.key] = String(row.value).trim();
      }
      if (keyMap.openai_api_key) openAiKey = keyMap.openai_api_key;
      if (keyMap.gemini_api_key) geminiKey = keyMap.gemini_api_key;
    } catch (err) {
      console.error("Erro ao buscar keys do DB:", err);
    }

    if (provider === "openai" && !openAiKey) {
      return new Response(JSON.stringify({ success: false, error: "OpenAI API Key não configurada no sistema." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (provider === "gemini" && !geminiKey) {
      return new Response(JSON.stringify({ success: false, error: "Gemini API Key não configurada no sistema." }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Injetar instruções de decisão JSON para que o simulador funcione como a produção
    const system_prompt = [
      "Voce e um agente de atendimento no WhatsApp.",
      "Responda sempre em portugues do Brasil.",
      "Retorne estritamente JSON com os campos:",
      "action (reply|handoff|ignore), reply_text, confidence (0..1), intent, handoff_reason, handoff_mode (round_robin|specific_user), handoff_user_id.",
      "Nao inclua markdown, texto fora do JSON ou comentarios.",
      rawSystemPrompt || "",
    ].filter(Boolean).join("\n\n");

    let text = "";
    let rawResult: any = {};

    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          messages: [
            { role: "system", content: system_prompt },
            { role: "user", content: user_message }
          ],
          response_format: { type: "json_object" }
        }),
      });
      rawResult = await response.json();
      
      if (rawResult.error) {
         return new Response(JSON.stringify({ success: false, error: rawResult.error.message || "Erro OpenAI", raw: rawResult }), {
           status: 200,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      }
      
      text = extractOpenAiText(rawResult);
    } else {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system_prompt }] },
          contents: [{ role: "user", parts: [{ text: user_message }] }],
          generationConfig: { temperature, responseMimeType: "application/json" },
        }),
      });
      rawResult = await response.json();
      
      if (rawResult.error) {
         return new Response(JSON.stringify({ success: false, error: rawResult.error.message || "Erro Gemini", raw: rawResult }), {
           status: 200,
           headers: { ...corsHeaders, "Content-Type": "application/json" },
         });
      }
      
      text = extractGeminiText(rawResult);
    }

    const parsed = parseDecisionText(text);
    const decision = normalizeDecision(parsed, confidence_threshold);

    return new Response(JSON.stringify({
      success: true,
      text,
      decision,
      raw: rawResult
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
