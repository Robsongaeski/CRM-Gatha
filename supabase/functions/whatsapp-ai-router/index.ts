import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

type ProviderName = "openai" | "gemini";

type AgentConfig = {
  id: string;
  agent_key: string;
  name: string;
  provider: ProviderName;
  model: string;
  fallback_provider: ProviderName | null;
  fallback_model: string | null;
  system_prompt: string;
  temperature: number;
  max_output_tokens: number;
  max_context_messages: number;
  confidence_threshold: number;
  max_auto_replies: number;
  handoff_mode: "round_robin" | "specific_user";
  handoff_user_id: string | null;
  eligible_user_ids: string[];
  pricing_input_usd_per_1m: number | null;
  pricing_output_usd_per_1m: number | null;
  fallback_pricing_input_usd_per_1m: number | null;
  fallback_pricing_output_usd_per_1m: number | null;
  metadata: {
    features?: {
      humanize_style?: boolean;
      auto_sanitize?: boolean;
      use_llm_triage?: boolean;
    };
    triage?: {
      enabled?: boolean;
      required_fields?: string[];
    };
  };
};

type ConversationInfo = {
  id: string;
  instance_id: string;
  remote_jid: string;
  is_group: boolean | null;
  status: string | null;
  assigned_to: string | null;
  contact_name: string | null;
};

type LlmUsage = {
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
};

type LlmResult = {
  provider: ProviderName;
  model: string;
  text: string;
  raw: Record<string, unknown>;
  usage: LlmUsage;
};

type AiDecision = {
  action: "reply" | "handoff" | "ignore";
  reply_text: string;
  confidence: number;
  intent: string;
  handoff_reason: string;
  handoff_mode: "round_robin" | "specific_user";
  handoff_user_id: string | null;
};

function asString(value: unknown): string {
  return String(value ?? "").trim();
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = asString(value).toLowerCase();
  return ["1", "true", "yes", "sim"].includes(normalized);
}

function looksLikeUuid(value: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(asString(value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Math.floor(ms))));
}

function toEpochMs(value: unknown): number | null {
  const parsed = Date.parse(asString(value));
  return Number.isFinite(parsed) ? parsed : null;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

type InboundMarker = {
  id: string | null;
  externalId: string | null;
  createdAtMs: number | null;
};

async function fetchLatestInboundMarker(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
): Promise<InboundMarker> {
  const { data: latestInbound } = await supabase
    .from("whatsapp_messages")
    .select("id, message_id_external, created_at")
    .eq("conversation_id", conversationId)
    .eq("from_me", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    id: latestInbound && looksLikeUuid((latestInbound as Record<string, unknown>).id)
      ? asString((latestInbound as Record<string, unknown>).id)
      : null,
    externalId: latestInbound ? asString((latestInbound as Record<string, unknown>).message_id_external) || null : null,
    createdAtMs: latestInbound ? toEpochMs((latestInbound as Record<string, unknown>).created_at) : null,
  };
}

function buildBurstIncomingText(
  incomingText: string,
  recentMessagesDesc: Array<Record<string, unknown>>,
  windowMs = 35_000,
  maxParts = 3,
): string {
  const parts: string[] = [];
  let newestCustomerMs: number | null = null;

  for (const msg of recentMessagesDesc) {
    if ((msg as Record<string, unknown>).from_me === true) {
      if (parts.length > 0) break;
      continue;
    }

    const createdAtMs = toEpochMs((msg as Record<string, unknown>).created_at);
    if (newestCustomerMs === null && createdAtMs !== null) newestCustomerMs = createdAtMs;
    if (newestCustomerMs !== null && createdAtMs !== null && (newestCustomerMs - createdAtMs) > windowMs) {
      break;
    }

    const messageType = asString((msg as Record<string, unknown>).message_type).toLowerCase();
    if (messageType && messageType !== "text") continue;

    const content = asString((msg as Record<string, unknown>).content);
    if (!content) continue;

    const duplicated = parts.some((p) => normalizePtText(p) === normalizePtText(content));
    if (!duplicated) parts.push(content);
    if (parts.length >= maxParts) break;
  }

  if (!parts.length) return asString(incomingText);
  return parts.reverse().join("\n");
}

function computeHumanDelayMs(replyText: string): number {
  const length = asString(replyText).length;
  const base = 3_000 + Math.min(900, length * 5);
  const jitter = Math.floor(Math.random() * 900);
  return clamp(base + jitter, 3_000, 5_000);
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

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  return null;
}

function normalizeDecision(raw: Record<string, unknown>, threshold: number): AiDecision {
  const actionRaw = asString(raw.action).toLowerCase();
  const action = actionRaw === "reply" || actionRaw === "handoff" || actionRaw === "ignore"
    ? (actionRaw as AiDecision["action"])
    : "handoff";

  const confidence = clamp(toNumber(raw.confidence, 0), 0, 1);
  const replyText = asString(raw.reply_text);
  const handoffModeRaw = asString(raw.handoff_mode).toLowerCase();
  const handoffMode = handoffModeRaw === "specific_user" ? "specific_user" : "round_robin";
  const handoffUserId = looksLikeUuid(raw.handoff_user_id) ? asString(raw.handoff_user_id) : null;

  const decision: AiDecision = {
    action,
    reply_text: replyText,
    confidence,
    intent: asString(raw.intent) || "unknown",
    handoff_reason: asString(raw.handoff_reason) || "no_reason",
    handoff_mode: handoffMode,
    handoff_user_id: handoffUserId,
  };

  if (decision.action === "reply" && !decision.reply_text) {
    return {
      ...decision,
      action: "handoff",
      handoff_reason: "empty_reply",
      confidence: 0,
    };
  }

  if (decision.action === "reply" && decision.confidence < threshold) {
    return {
      ...decision,
      action: "handoff",
      handoff_reason: decision.handoff_reason || "low_confidence",
    };
  }

  return decision;
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

function hasDecisionShape(raw: Record<string, unknown>): boolean {
  if (!raw || typeof raw !== "object") return false;
  const action = asString(raw.action).toLowerCase();
  if (action === "reply" || action === "handoff" || action === "ignore") return true;
  if (typeof raw.reply_text === "string" && asString(raw.reply_text)) return true;
  if (typeof raw.handoff_reason === "string" && asString(raw.handoff_reason)) return true;
  if (raw.confidence !== undefined && raw.confidence !== null && asString(raw.confidence) !== "") return true;
  return false;
}

function estimateCostUsd(
  usage: LlmUsage,
  inputRatePer1M: number | null,
  outputRatePer1M: number | null,
): number | null {
  if (!usage) return null;
  if (inputRatePer1M === null || outputRatePer1M === null) return null;

  const prompt = Number(usage.prompt_tokens || 0);
  const completion = Number(usage.completion_tokens || 0);
  if (!Number.isFinite(prompt) || !Number.isFinite(completion)) return null;

  const inputCost = (prompt / 1_000_000) * inputRatePer1M;
  const outputCost = (completion / 1_000_000) * outputRatePer1M;
  return Number((inputCost + outputCost).toFixed(6));
}

function extractOpenAiText(payload: Record<string, unknown>): string {
  const direct = payload.output_text;
  if (typeof direct === "string" && direct.trim()) return direct;
  if (direct && typeof direct === "object") {
    const value = (direct as Record<string, unknown>).value;
    if (typeof value === "string" && value.trim()) return value;
  }

  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const itemRecord = item as Record<string, unknown>;
    if (typeof itemRecord.content === "string" && itemRecord.content.trim()) {
      return itemRecord.content;
    }

    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as Array<Record<string, unknown>>)
      : [];
    for (const part of content) {
      const text = part?.text;
      if (typeof text === "string" && text.trim()) {
        return text;
      }
      if (text && typeof text === "object") {
        const textValue = (text as Record<string, unknown>).value;
        if (typeof textValue === "string" && textValue.trim()) {
          return textValue;
        }
      }
      if (Array.isArray(text)) {
        const joined = text
          .map((segment) => {
            if (typeof segment === "string") return segment;
            if (segment && typeof segment === "object") {
              const value = (segment as Record<string, unknown>).value;
              if (typeof value === "string") return value;
            }
            return "";
          })
          .join("")
          .trim();
        if (joined) return joined;
      }

      const outputText = part?.output_text;
      if (typeof outputText === "string" && outputText.trim()) {
        return outputText;
      }

      const refusal = part?.refusal;
      if (typeof refusal === "string" && refusal.trim()) {
        return refusal;
      }

      const args = part?.arguments;
      if (typeof args === "string" && args.trim()) {
        return args;
      }

      if (part?.json && typeof part.json === "object") {
        try {
          return JSON.stringify(part.json);
        } catch {
          // ignore
        }
      }
    }
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  for (const choice of choices) {
    if (!choice || typeof choice !== "object") continue;
    const msg = (choice as Record<string, unknown>).message;
    if (msg && typeof msg === "object") {
      const content = (msg as Record<string, unknown>).content;
      if (typeof content === "string" && content.trim()) return content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (typeof part === "string" && part.trim()) return part;
          if (part && typeof part === "object") {
            const partText = (part as Record<string, unknown>).text;
            if (typeof partText === "string" && partText.trim()) return partText;
            if (partText && typeof partText === "object") {
              const value = (partText as Record<string, unknown>).value;
              if (typeof value === "string" && value.trim()) return value;
            }
          }
        }
      }
    }
  }

  return "";
}

function normalizePtText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function containsAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function pickStableVariant(source: string, variants: string[]): string {
  if (!variants.length) return "";
  const normalized = String(source || "");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % variants.length;
  return variants[index];
}

type HeuristicMessage = {
  from_me?: boolean | null;
  message_type?: string | null;
  content?: string | null;
};

function extractFirstName(rawName: string): string {
  const cleaned = String(rawName || "")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const first = cleaned.split(" ")[0] || "";
  if (!first) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function openingFingerprint(text: string): string {
  return normalizePtText(text)
    .split(" ")
    .filter(Boolean)
    .slice(0, 1)
    .join(" ");
}

function pickVariantAvoidingRepetition(seed: string, variants: string[], recentAssistantText: string): string {
  if (!variants.length) return "";
  const base = pickStableVariant(seed, variants);
  if (!recentAssistantText) return base;

  const lastFingerprint = openingFingerprint(recentAssistantText);
  const baseIndex = Math.max(0, variants.indexOf(base));

  for (let i = 0; i < variants.length; i++) {
    const candidate = variants[(baseIndex + i) % variants.length];
    if (openingFingerprint(candidate) !== lastFingerprint) {
      return candidate;
    }
  }

  return base;
}

function getRecentAssistantText(messages: HeuristicMessage[] = []): string {
  for (const msg of messages) {
    if (!msg?.from_me) continue;
    if (msg.message_type && msg.message_type !== "text") continue;
    const content = asString(msg.content);
    if (content) return content;
  }
  return "";
}

function getRecentClientText(messages: HeuristicMessage[] = []): string {
  const parts: string[] = [];
  for (const msg of messages) {
    if (msg?.from_me) continue;
    if (msg.message_type && msg.message_type !== "text") continue;
    const content = asString(msg.content);
    if (content) parts.push(content);
    if (parts.length >= 8) break;
  }
  return normalizePtText(parts.reverse().join(" "));
}

type TriageSignals = {
  productKnown: boolean;
  quantityKnown: boolean;
  stampKnown: boolean;
  minimumComplete: boolean;
};

function inferTriageSignals(incomingText: string, recentMessages: HeuristicMessage[] = []): TriageSignals {
  const allText = normalizePtText(`${getRecentClientText(recentMessages)} ${asString(incomingText)}`.trim());
  const productKnown = containsAny(allText, [
    "camiseta", "camisa", "uniforme", "polo", "blusa", "jaqueta", "colete", "regata", "moletom",
    "caneca", "short", "calca", "sacola", "sacochila", "vestido",
  ]);
  const quantityKnown = /\b\d{1,4}\b/.test(allText) || containsAny(allText, [
    "unidade", "unidades", "quantidade", "peca", "pecas", "duas", "tres", "quatro", "cinco", "dez",
  ]);
  const stampKnown = containsAny(allText, [
    "estampa", "logo", "logotipo", "arte", "personaliz", "silk", "bordad", "sem estampa", "sem logo", "liso",
  ]);

  return {
    productKnown,
    quantityKnown,
    stampKnown,
    minimumComplete: productKnown && quantityKnown && stampKnown,
  };
}

function customerAskedHumanExplicitly(text: string): boolean {
  const normalized = normalizePtText(text);
  return containsAny(normalized, [
    "atendente", "vendedor", "humano", "falar com alguem", "falar com uma pessoa", "me transfere", "transferir",
  ]);
}

function buildCollectBeforeHandoffReply(
  contactName: string | null | undefined,
  missingProduct: boolean,
  missingQuantity: boolean,
  missingStamp: boolean,
): string {
  const firstName = extractFirstName(asString(contactName));

  if (missingProduct && missingQuantity && missingStamp) {
    return `${firstName ? `Oi, ${firstName}! ` : ""}Ja estou montando seu orcamento. Me fala o produto, a quantidade aproximada e se vai ter estampa/logo.`;
  }
  if (missingProduct && missingQuantity) {
    return "Perfeito. Me ajuda com dois pontos: produto e quantidade aproximada.";
  }
  if (missingProduct) {
    return "Perfeito. Me diz qual produto voce quer para eu seguir com seu orcamento.";
  }
  if (missingQuantity && missingStamp) {
    return "Perfeito, me diz a quantidade aproximada e se vai ter estampa/logo.";
  }
  if (missingQuantity) {
    return "Perfeito, me passa a quantidade aproximada para eu fechar essa parte.";
  }
  if (missingStamp) {
    return "Perfeito. Me diz se vai ter estampa/logo (frente e/ou costas).";
  }

  return "Perfeito! Ja estou com os dados e vou montar seu orcamento pra te passar certinho.";
}

function buildHeuristicDecisionFromIncoming(
  incomingText: string,
  contactName?: string,
  recentMessages: HeuristicMessage[] = [],
): Record<string, unknown> {
  const raw = asString(incomingText);
  const text = normalizePtText(raw);
  const firstName = extractFirstName(asString(contactName));
  const recentAssistantText = getRecentAssistantText(recentMessages);
  const recentClientText = getRecentClientText(recentMessages);

  const asksHuman = containsAny(text, [
    "atendente", "vendedor", "humano", "pessoa", "falar com alguem", "falar com uma pessoa",
  ]);
  const asksPriceOrQuote = containsAny(text, [
    "orcamento", "orçamento", "preco", "preço", "valor", "quanto", "custa", "prazo", "entrega",
  ]);
  const mentionsProduct = containsAny(text, [
    "camiseta", "camisa", "uniforme", "polo", "blusa", "jaqueta", "colete", "regata", "moletom",
    "caneca", "short", "calca", "calça", "sacola", "sacochila", "vestido",
  ]);
  const productAlreadyKnown = mentionsProduct || containsAny(recentClientText, [
    "camiseta", "camisa", "uniforme", "polo", "blusa", "jaqueta", "colete", "regata", "moletom",
    "caneca", "short", "calca", "sacola", "sacochila", "vestido",
  ]);
  const asksMinimumQuantity = containsAny(text, [
    "quantidade minima", "qtd minima", "pedido minimo", "minimo de",
  ]);
  const mentionsStamp = containsAny(text, [
    "estampa", "logo", "logotipo", "arte", "personaliz", "silk", "bordad",
  ]);
  const hasQuantity = /\b\d{1,4}\b/.test(text) || containsAny(text, [
    "unidade", "unidades", "quantidade", "peca", "peça", "pecas", "peças",
    "duas", "tres", "três", "quatro", "cinco", "dez",
  ]);
  const isGreeting = containsAny(text, [
    "oi", "ola", "olá", "bom dia", "boa tarde", "boa noite", "tudo bem",
  ]);

  if (asksHuman) {
    const variants = [
      "Claro! Ja peguei seu pedido e vou seguir com voce por aqui para montar tudo certinho.",
      "Combinado! Ja estou cuidando disso e te passo os proximos detalhes.",
      "Perfeito, pode deixar comigo. Ja vou organizar seu orcamento agora.",
    ];
    return {
      action: "handoff",
      reply_text: pickVariantAvoidingRepetition(raw, variants, recentAssistantText),
      confidence: 0.95,
      intent: "human_requested",
      handoff_reason: "human_requested",
      handoff_mode: "round_robin",
      handoff_user_id: null,
    };
  }

  if (mentionsProduct && hasQuantity && mentionsStamp) {
    const variants = [
      "Otimo, com essas informacoes ja consigo montar seu orcamento e te passar tudo certinho.",
      "Perfeito, ja temos os dados principais. Agora vou fechar os valores e prazo para voce.",
      "Excelente! Ja vou preparar seu orcamento completo e te retorno na sequencia.",
    ];
    return {
      action: "handoff",
      reply_text: pickVariantAvoidingRepetition(raw, variants, recentAssistantText),
      confidence: 0.9,
      intent: "triage_ready",
      handoff_reason: "triage_ready",
      handoff_mode: "round_robin",
      handoff_user_id: null,
    };
  }

  if (productAlreadyKnown && asksMinimumQuantity && !hasQuantity) {
    const variants = [
      "Boa pergunta. A quantidade minima pode variar por modelo e personalizacao.",
      "Me diz quantas unidades voce imagina e se vai ter estampa/logo para eu validar certinho.",
      "Se quiser, me passa produto + quantidade que eu ja monto seu cenario aqui.",
    ];
    return {
      action: "reply",
      reply_text: pickVariantAvoidingRepetition(raw, variants, recentAssistantText),
      confidence: 0.9,
      intent: "minimum_quantity_question",
      handoff_reason: "collecting_quantity_for_quote",
      handoff_mode: "round_robin",
      handoff_user_id: null,
    };
  }

  if (asksPriceOrQuote && productAlreadyKnown && !hasQuantity) {
    const variants = [
      "Claro, como o produto ja esta definido, me confirma a quantidade aproximada e se vai ter estampa/logo.",
      "Perfeito, me passa so a quantidade aproximada e se tera personalizacao para eu adiantar seu atendimento.",
      "Combinado! Agora so preciso da quantidade e se vai ter estampa para deixar tudo certinho.",
    ];
    return {
      action: "reply",
      reply_text: pickVariantAvoidingRepetition(raw, variants, recentAssistantText),
      confidence: 0.88,
      intent: "quote_collecting_quantity",
      handoff_reason: "collecting_quote_data",
      handoff_mode: "round_robin",
      handoff_user_id: null,
    };
  }
  if (asksPriceOrQuote && !(mentionsProduct && hasQuantity)) {
    const variants = [
      `${firstName ? `Oi, ${firstName}! ` : ""}Claro, eu adianto o atendimento para voce. Me confirma qual produto voce quer e a quantidade aproximada.`,
      `${firstName ? `${firstName}, ` : ""}consigo te ajudar por aqui no inicio. Me diz qual produto e quantas unidades voce imagina.`,
      `Combinado! Para montar direitinho, me fala qual produto voce quer e a quantidade aproximada.`,
    ];
    return {
      action: "reply",
      reply_text: pickVariantAvoidingRepetition(raw, variants, recentAssistantText),
      confidence: 0.86,
      intent: "quote_collecting_data",
      handoff_reason: "collecting_quote_data",
      handoff_mode: "round_robin",
      handoff_user_id: null,
    };
  }

  if (mentionsProduct && !hasQuantity) {
    const variants = [
      "Legal! Para esse produto, me diz a quantidade aproximada e se vai ter estampa/logo.",
      "Show! Me passa a quantidade aproximada e se voce ja tem logo/arte para estampa.",
      "Entendi! Me confirma quantas unidades voce precisa e se vai personalizar com estampa.",
      "Boa! Agora preciso da quantidade e se vai ter estampa para eu adiantar seu atendimento.",
    ];
    return {
      action: "reply",
      reply_text: pickVariantAvoidingRepetition(raw, variants, recentAssistantText),
      confidence: 0.88,
      intent: "product_with_missing_quantity",
      handoff_reason: "collecting_quantity",
      handoff_mode: "round_robin",
      handoff_user_id: null,
    };
  }

  if (hasQuantity && productAlreadyKnown && !mentionsStamp) {
    const variants = [
      "Perfeito! Agora so preciso confirmar se vai ter estampa/logo para eu adiantar seu atendimento.",
      "Otimo, com a quantidade anotada, me diz se vai ter personalizacao (estampa/logo).",
      "Show, quantidade registrada. Vai ter estampa/logo nessa peca?",
    ];
    return {
      action: "reply",
      reply_text: pickVariantAvoidingRepetition(raw, variants, recentAssistantText),
      confidence: 0.88,
      intent: "quantity_collected_missing_stamp",
      handoff_reason: "collecting_stamp",
      handoff_mode: "round_robin",
      handoff_user_id: null,
    };
  }
  if (hasQuantity && !mentionsProduct && !productAlreadyKnown) {
    const variants = [
      "Claro, e qual produto voce quer orcar? Se tiver estampa/logo, pode me adiantar tambem.",
      "Otimo! Agora me conta qual produto voce quer e se vai ter personalizacao.",
      "Boa! Com essa quantidade, so preciso confirmar o produto e se vai estampa.",
    ];
    return {
      action: "reply",
      reply_text: pickVariantAvoidingRepetition(raw, variants, recentAssistantText),
      confidence: 0.86,
      intent: "quantity_with_missing_product",
      handoff_reason: "collecting_product",
      handoff_mode: "round_robin",
      handoff_user_id: null,
    };
  }

  if (isGreeting) {
    const variants = [
      `${firstName ? `Oi, ${firstName}! ` : "Oi! "}Tudo bem? Claro, ja vamos fazer para voce. Me conta quais produtos voce gostaria e a quantidade aproximada.`,
      `${firstName ? `${firstName}, ` : ""}oi! Tudo certo? Posso te ajudar aqui no comeco. Qual produto voce quer e quantas unidades voce precisa?`,
      `${firstName ? `Boa noite, ${firstName}! ` : "Boa noite! "}Te ajudo por aqui no pre-atendimento. Qual produto voce quer e a quantidade aproximada?`,
      `${firstName ? `Ola, ${firstName}! ` : "Ola! "}Pode deixar comigo no inicio do atendimento. Me diz o produto e a quantidade para eu adiantar.`,
    ];
    return {
      action: "reply",
      reply_text: pickVariantAvoidingRepetition(raw, variants, recentAssistantText),
      confidence: 0.84,
      intent: "greeting",
      handoff_reason: "collecting_initial_info",
      handoff_mode: "round_robin",
      handoff_user_id: null,
    };
  }

  const variants = [
    "Claro, para eu adiantar seu atendimento, me diz qual produto voce precisa, a quantidade aproximada e se vai ter estampa/logo.",
    "Combinado! Me passa produto, quantidade e se vai ter personalizacao para eu deixar tudo certinho.",
    "Pode contar comigo. Me confirma produto, quantidade e estampa/logo para eu organizar seu atendimento.",
  ];
  return {
    action: "reply",
    reply_text: pickVariantAvoidingRepetition(raw, variants, recentAssistantText),
    confidence: 0.82,
    intent: "safe_default_reply",
    handoff_reason: "parser_fallback_contextual",
    handoff_mode: "round_robin",
    handoff_user_id: null,
  };
}

function extractOpenAiUsage(payload: Record<string, unknown>): LlmUsage {
  const usageRaw = (payload.usage || {}) as Record<string, unknown>;
  return {
    prompt_tokens: Number.isFinite(Number(usageRaw.input_tokens))
      ? Number(usageRaw.input_tokens)
      : (Number.isFinite(Number(usageRaw.prompt_tokens)) ? Number(usageRaw.prompt_tokens) : null),
    completion_tokens: Number.isFinite(Number(usageRaw.output_tokens))
      ? Number(usageRaw.output_tokens)
      : (Number.isFinite(Number(usageRaw.completion_tokens)) ? Number(usageRaw.completion_tokens) : null),
    total_tokens: Number.isFinite(Number(usageRaw.total_tokens)) ? Number(usageRaw.total_tokens) : null,
  };
}

async function callOpenAiModel(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
}): Promise<LlmResult> {
  const modelName = asString(params.model).toLowerCase();
  const isGpt5Family = modelName.startsWith("gpt-5");
  const effectiveMaxOutputTokens = isGpt5Family
    ? Math.max(params.maxOutputTokens, 420)
    : params.maxOutputTokens;

  const doRequest = async (includeTemperature: boolean, includeReasoning: boolean) => {
    const body: Record<string, unknown> = {
      model: params.model,
      max_output_tokens: effectiveMaxOutputTokens,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: params.systemPrompt,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: params.userPrompt,
            },
          ],
        },
      ],
    };

    if (includeTemperature) {
      body.temperature = params.temperature;
    }

    if (includeReasoning && isGpt5Family) {
      body.reasoning = { effort: "minimal" };
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const raw = await response.json().catch(() => ({}));
    return { response, raw };
  };

  const isUnsupportedParamError = (raw: Record<string, unknown>): boolean => {
    const errObj = (raw?.error || {}) as Record<string, unknown>;
    const errParam = asString(errObj.param).toLowerCase();
    const errMessage = asString(errObj.message).toLowerCase();
    return Boolean(
      errParam === "temperature" ||
      errParam === "reasoning" ||
      (errMessage.includes("unsupported parameter") && (
        errMessage.includes("temperature") ||
        errMessage.includes("reasoning")
      )),
    );
  };

  const attempts = isGpt5Family
    ? [
      { includeTemperature: true, includeReasoning: true },
      { includeTemperature: false, includeReasoning: true },
      { includeTemperature: true, includeReasoning: false },
      { includeTemperature: false, includeReasoning: false },
    ]
    : [
      { includeTemperature: true, includeReasoning: false },
      { includeTemperature: false, includeReasoning: false },
    ];

  let lastRaw: Record<string, unknown> = {};

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    const result = await doRequest(attempt.includeTemperature, attempt.includeReasoning);
    lastRaw = result.raw;

    if (result.response.ok) {
      const text = extractOpenAiText(result.raw);
      // If response came back with empty text, try a compatibility strategy before giving up.
      if (text || i === attempts.length - 1) {
        return {
          provider: "openai",
          model: params.model,
          text,
          raw: result.raw,
          usage: extractOpenAiUsage(result.raw),
        };
      }
      continue;
    }

    if (!isUnsupportedParamError(result.raw)) {
      throw new Error(`OpenAI request failed: ${JSON.stringify(result.raw)}`);
    }
  }

  throw new Error(`OpenAI request failed: ${JSON.stringify(lastRaw)}`);
}

function extractGeminiText(payload: Record<string, unknown>): string {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const content = (candidate as Record<string, unknown>).content;
    if (!content || typeof content !== "object") continue;
    const parts = Array.isArray((content as Record<string, unknown>).parts)
      ? ((content as Record<string, unknown>).parts as Array<Record<string, unknown>>)
      : [];
    for (const part of parts) {
      const text = part?.text;
      if (typeof text === "string" && text.trim()) return text;
    }
  }

  return "";
}

function extractGeminiUsage(payload: Record<string, unknown>): LlmUsage {
  const usage = (payload.usageMetadata || {}) as Record<string, unknown>;
  const prompt = Number(usage.promptTokenCount);
  const completion = Number(usage.candidatesTokenCount);
  const total = Number(usage.totalTokenCount);

  return {
    prompt_tokens: Number.isFinite(prompt) ? prompt : null,
    completion_tokens: Number.isFinite(completion) ? completion : null,
    total_tokens: Number.isFinite(total) ? total : null,
  };
}

async function callGeminiModel(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
}): Promise<LlmResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent?key=${encodeURIComponent(params.apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: params.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: params.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: params.maxOutputTokens,
        responseMimeType: "application/json",
      },
    }),
  });

  const raw = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Gemini request failed: ${JSON.stringify(raw)}`);
  }

  return {
    provider: "gemini",
    model: params.model,
    text: extractGeminiText(raw),
    raw,
    usage: extractGeminiUsage(raw),
  };
}

async function callProvider(params: {
  provider: ProviderName;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxOutputTokens: number;
  openAiApiKey: string;
  geminiApiKey: string;
}): Promise<LlmResult> {
  if (params.provider === "openai") {
    if (!params.openAiApiKey) throw new Error("OPENAI_API_KEY not configured");
    return callOpenAiModel({
      apiKey: params.openAiApiKey,
      model: params.model,
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      temperature: params.temperature,
      maxOutputTokens: params.maxOutputTokens,
    });
  }

  if (!params.geminiApiKey) throw new Error("GEMINI_API_KEY not configured");
  return callGeminiModel({
    apiKey: params.geminiApiKey,
    model: params.model,
    systemPrompt: params.systemPrompt,
    userPrompt: params.userPrompt,
    temperature: params.temperature,
    maxOutputTokens: params.maxOutputTokens,
  });
}

function sanitizeReplyText(input: string, features?: Record<string, any>): string {
  let normalized = String(input || "").trim();
  if (!normalized) return "";

  if (features?.auto_sanitize) {
    normalized = normalized
      .replace(/[—–]/g, ", ")
      .replace(/\s+/g, " ")
      .replace(/\b[sS][oó]\s+para\s+confirmar:?\s*/g, "Antes de seguir, um detalhe: ")
      .replace(/\b(?:recebi|vi)\s+(?:seu|sua)\s+(?:audio|áudio|foto|imagem|arquivo|documento)\b[^.?!]*[.?!]?\s*/gi, "");
  }

  return normalized.slice(0, 1200).trim();
}

function buildKnowledgeSection(items: Array<{ title: string | null; content: string }>): string {
  if (!items.length) return "";
  const lines = items.map((item, index) => {
    const prefix = item.title ? `${index + 1}. ${item.title}:` : `${index + 1}.`;
    return `${prefix} ${item.content}`.trim();
  });
  return lines.join("\n");
}

function buildConversationSection(messages: Array<Record<string, unknown>>): string {
  if (!messages.length) return "(sem historico)";

  return messages
    .map((msg) => {
      const side = msg.from_me === true ? "AGENTE" : "CLIENTE";
      const type = asString(msg.message_type) || "text";
      const body = asString(msg.content) || `[${type}]`;
      return `${side}: ${body}`;
    })
    .join("\n");
}

async function loadAiProviderKeysFromSystemConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<{ openAiApiKey: string; geminiApiKey: string }> {
  try {
    const { data, error } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["openai_api_key", "gemini_api_key"]);

    if (error) throw error;

    const keyMap: Record<string, string> = {};
    for (const row of data || []) {
      const key = asString((row as Record<string, unknown>).key);
      const value = asString((row as Record<string, unknown>).value);
      if (key) keyMap[key] = value;
    }

    return {
      openAiApiKey: asString(keyMap.openai_api_key),
      geminiApiKey: asString(keyMap.gemini_api_key),
    };
  } catch {
    return { openAiApiKey: "", geminiApiKey: "" };
  }
}

async function pickHandoffUser(params: {
  supabase: ReturnType<typeof createClient>;
  instanceId: string;
  workflowId: string;
  preferredMode: "round_robin" | "specific_user";
  preferredUserId: string | null;
  configuredEligibleUserIds: string[];
}): Promise<string | null> {
  const { supabase, instanceId, workflowId, preferredMode, preferredUserId } = params;

  const { data: instanceUsers, error: instanceUsersError } = await supabase
    .from("whatsapp_instance_users")
    .select("user_id")
    .eq("instance_id", instanceId);

  if (instanceUsersError) throw instanceUsersError;

  const allowedUserIds = new Set(
    (instanceUsers || [])
      .map((row: Record<string, unknown>) => asString(row.user_id))
      .filter((id) => looksLikeUuid(id)),
  );

  if (allowedUserIds.size === 0) return null;

  if (preferredMode === "specific_user" && preferredUserId && allowedUserIds.has(preferredUserId)) {
    return preferredUserId;
  }

  let eligible = (params.configuredEligibleUserIds || []).filter((id) => allowedUserIds.has(id));
  if (!eligible.length) eligible = Array.from(allowedUserIds);

  if (!eligible.length) return null;

  if (workflowId) {
    try {
      const { data: picked, error: rpcError } = await supabase.rpc("automation_pick_round_robin_user", {
        p_workflow_id: workflowId,
        p_instance_id: instanceId,
        p_user_ids: eligible,
      });

      if (!rpcError) {
        const pickedId = asString(picked);
        if (pickedId && eligible.includes(pickedId)) return pickedId;
      }
    } catch {
      // fallback to first eligible user
    }
  }

  return eligible[0] || null;
}

async function insertSystemMessage(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  instanceId: string,
  content: string,
): Promise<void> {
  await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversationId,
      instance_id: instanceId,
      from_me: true,
      message_type: "system",
      content,
      status: "delivered",
    });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const webhookSecret = asString(Deno.env.get("WHATSAPP_AI_WEBHOOK_SECRET"));
  const envOpenAiApiKey = asString(Deno.env.get("OPENAI_API_KEY"));
  const envGeminiApiKey = asString(Deno.env.get("GEMINI_API_KEY"));

  const requestSecret = asString(req.headers.get("x-webhook-secret"));
  if (webhookSecret && requestSecret !== webhookSecret) {
    return new Response(JSON.stringify({ success: false, error: "Unauthorized webhook secret" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let conversationId = "";
  let instanceId = "";
  let agentKey = "";

  try {
    const systemKeys = await loadAiProviderKeysFromSystemConfig(supabase);
    const openAiApiKey = systemKeys.openAiApiKey || envOpenAiApiKey;
    const geminiApiKey = systemKeys.geminiApiKey || envGeminiApiKey;

    const url = new URL(req.url);
    const bodyRaw = await req.text();
    const body = bodyRaw ? JSON.parse(bodyRaw) : {};

    conversationId = asString(body.conversation_id || body.entity_id);
    instanceId = asString(body.instance_id);

    agentKey = asString(url.searchParams.get("agent_key") || body.agent_key || body.agentKey);
    const workflowId = asString(body.workflow_id);

    const fromMe = toBoolean(body.from_me);
    const incomingTextRaw = asString(body.message_text || body.content || body.body);
    let incomingText = incomingTextRaw;
    const triggerMessageId = looksLikeUuid(body.inbound_message_id)
      ? asString(body.inbound_message_id)
      : (looksLikeUuid(body.message_id) ? asString(body.message_id) : null);
    const triggerMessageExternalId = asString(
      body.inbound_message_external_id || body.message_id_external || body.external_message_id,
    ) || null;

    if (!conversationId) {
      return new Response(JSON.stringify({ success: true, skipped: "missing_conversation_id" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("whatsapp_conversations")
      .select("id, instance_id, remote_jid, is_group, status, assigned_to, contact_name")
      .eq("id", conversationId)
      .single();

    if (conversationError || !conversation) {
      return new Response(JSON.stringify({ success: true, skipped: "conversation_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conversationInfo = conversation as ConversationInfo;
    instanceId = asString(instanceId || conversationInfo.instance_id);

    if (fromMe) {
      return new Response(JSON.stringify({ success: true, skipped: "outbound_message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (conversationInfo.is_group === true) {
      return new Response(JSON.stringify({ success: true, skipped: "group_conversation" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!agentKey) {
      return new Response(JSON.stringify({ success: true, skipped: "missing_agent_key" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dedupSeed = triggerMessageExternalId || triggerMessageId || "";
    let dedupKey: string | null = null;
    if (dedupSeed) {
      dedupKey = `wa-ai:${instanceId}:${await sha256Hex(dedupSeed)}`;
      const dedupPayload: Record<string, unknown> = {
        instance_id: instanceId,
        conversation_id: conversationId,
        dedup_key: dedupKey,
        message_id_external: triggerMessageExternalId,
        source: "whatsapp-ai-router",
      };
      if (triggerMessageId) {
        dedupPayload.message_id = triggerMessageId;
      }

      const { error: dedupError } = await supabase.from("whatsapp_ai_inbound_dedup").insert(dedupPayload);
      if (dedupError) {
        if (dedupError.code === "23505") {
          return new Response(JSON.stringify({ success: true, skipped: "duplicate_message" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw dedupError;
      }
    }

    const { data: agent, error: agentError } = await supabase
      .from("whatsapp_ai_agents")
      .select(`
        id,
        agent_key,
        name,
        provider,
        model,
        fallback_provider,
        fallback_model,
        system_prompt,
        temperature,
        max_output_tokens,
        max_context_messages,
        confidence_threshold,
        max_auto_replies,
        handoff_mode,
        handoff_user_id,
        eligible_user_ids,
        pricing_input_usd_per_1m,
        pricing_output_usd_per_1m,
        fallback_pricing_input_usd_per_1m,
        fallback_pricing_output_usd_per_1m
      `)
      .eq("agent_key", agentKey)
      .eq("is_active", true)
      .single();

    if (agentError || !agent) {
      return new Response(JSON.stringify({ success: true, skipped: "agent_not_found", agent_key: agentKey }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = agent as AgentConfig;

    if (conversationInfo.assigned_to && conversationInfo.status === "in_progress") {
      await supabase.from("whatsapp_ai_runs").insert({
        conversation_id: conversationId,
        instance_id: instanceId,
        agent_id: cfg.id,
        agent_key: cfg.agent_key,
        trigger_message_id: triggerMessageId,
        trigger_message_external_id: triggerMessageExternalId,
        input_excerpt: incomingText.slice(0, 500),
        decision_action: "skipped",
        decision_payload: { skipped: "already_assigned_to_human" },
        status: "skipped",
      });

      return new Response(JSON.stringify({ success: true, skipped: "already_assigned_to_human" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inboundDebounceMs = 3_000;
    await sleep(inboundDebounceMs);

    const latestInboundAfterDebounce = await fetchLatestInboundMarker(supabase, conversationId);
    const hasNewerInboundMessage =
      (triggerMessageId && latestInboundAfterDebounce.id && latestInboundAfterDebounce.id !== triggerMessageId) ||
      (!triggerMessageId && triggerMessageExternalId && latestInboundAfterDebounce.externalId &&
        latestInboundAfterDebounce.externalId !== triggerMessageExternalId);

    if (hasNewerInboundMessage) {
      await supabase.from("whatsapp_ai_runs").insert({
        conversation_id: conversationId,
        instance_id: instanceId,
        agent_id: cfg.id,
        agent_key: cfg.agent_key,
        trigger_message_id: triggerMessageId,
        trigger_message_external_id: triggerMessageExternalId,
        input_excerpt: incomingTextRaw.slice(0, 500),
        decision_action: "skipped",
        decision_payload: { skipped: "newer_inbound_message_pending" },
        status: "skipped",
      });

      return new Response(JSON.stringify({ success: true, skipped: "newer_inbound_message_pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: recentMessages } = await supabase
      .from("whatsapp_messages")
      .select("id, from_me, content, message_type, sender_name, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(clamp(cfg.max_context_messages || 12, 1, 50));

    incomingText = buildBurstIncomingText(incomingTextRaw, (recentMessages || []) as Array<Record<string, unknown>>);

    let maxRepliesReached = false;
    if (cfg.max_auto_replies >= 0) {
      const { data: recentRuns } = await supabase
        .from("whatsapp_ai_runs")
        .select("decision_action, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(80);

      let consecutiveReplies = 0;
      for (const run of recentRuns || []) {
        const action = asString((run as Record<string, unknown>).decision_action);
        if (action === "reply") {
          consecutiveReplies += 1;
          continue;
        }
        // Any non-reply action resets the streak (handoff/ignore/error/skipped/etc).
        break;
      }

      maxRepliesReached = consecutiveReplies >= cfg.max_auto_replies;
    }

    const { data: knowledgeItems } = await supabase
      .from("whatsapp_ai_knowledge_items")
      .select("title, content")
      .eq("agent_id", cfg.id)
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .limit(40);

    const conversationHistory = buildConversationSection([...(recentMessages || [])].reverse());
    const knowledgeSection = buildKnowledgeSection((knowledgeItems || []) as Array<{ title: string | null; content: string }>);

    const metadata = cfg.metadata || {};
    const features = metadata.features || {};
    
    // Injeta instruções de estilo baseado no metadata (desrobotização global)
    const agentSpecificStyleLines = features.humanize_style
      ? [
          "Estilo de atendimento humanizado:",
          "- Não use travessão (— ou –). Use vírgulas.",
          "- Evite repetir frases de confirmação mecânicas.",
          "- Não diga que recebeu áudio/foto/imagem; vá direto para a próxima resposta útil.",
          "- Fale naturalmente como uma pessoa real, evite termos como 'entendido', 'anotado' em excesso.",
          "- Use tom acolhedor e profissional.",
        ].join("\n")
      : "";

    const systemPrompt = [
      "Voce e um agente de atendimento inicial no WhatsApp.",
      "Responda sempre em portugues do Brasil.",
      "Nunca invente informacoes. Se houver duvida ou risco, encaminhe para humano.",
      "Se o cliente pedir humano, encaminhe para humano.",
      "Retorne estritamente JSON com os campos:",
      "action (reply|handoff|ignore), reply_text, confidence (0..1), intent, handoff_reason, handoff_mode (round_robin|specific_user), handoff_user_id.",
      "Nao inclua markdown, texto fora do JSON ou comentarios.",
      agentSpecificStyleLines,
      cfg.system_prompt || "",
      knowledgeSection ? `Base de conhecimento:\n${knowledgeSection}` : "",
    ].filter(Boolean).join("\n\n");

    const userPrompt = [
      `Conversation ID: ${conversationId}`,
      `Contato: ${asString(conversationInfo.contact_name) || "Cliente"}`,
      `Mensagem recebida: ${incomingText || "(vazio)"}`,
      `Historico recente:\n${conversationHistory}`,
      "Tarefa: decidir a proxima acao de atendimento inicial.",
    ].join("\n\n");

    let llmResult: LlmResult | null = null;
    let fallbackUsed = false;
    let llmError: string | null = null;

    try {
      llmResult = await callProvider({
        provider: cfg.provider,
        model: cfg.model,
        systemPrompt,
        userPrompt,
        temperature: clamp(toNumber(cfg.temperature, 0.2), 0, 2),
        maxOutputTokens: clamp(toNumber(cfg.max_output_tokens, 350), 32, 4096),
        openAiApiKey,
        geminiApiKey,
      });
    } catch (primaryErr) {
      llmError = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      if (cfg.fallback_provider && cfg.fallback_model) {
        llmResult = await callProvider({
          provider: cfg.fallback_provider,
          model: cfg.fallback_model,
          systemPrompt,
          userPrompt,
          temperature: clamp(toNumber(cfg.temperature, 0.2), 0, 2),
          maxOutputTokens: clamp(toNumber(cfg.max_output_tokens, 350), 32, 4096),
          openAiApiKey,
          geminiApiKey,
        });
        fallbackUsed = true;
      } else {
        throw primaryErr;
      }
    }

    if (!llmResult) {
      throw new Error("LLM did not return result");
    }

    const llmTextRaw = asString(llmResult.text);
    let parsedDecision = parseDecisionText(llmTextRaw);
    let parserFallbackUsed = false;

    if (!hasDecisionShape(parsedDecision)) {
      const looksJsonLike = llmTextRaw.includes("{") || llmTextRaw.includes("}");
      const safeFreeformReply = sanitizeReplyText(llmTextRaw);

      if (safeFreeformReply && !looksJsonLike) {
        parsedDecision = {
          action: "reply",
          reply_text: safeFreeformReply,
          confidence: 0.9,
          intent: "freeform_reply_fallback",
          handoff_reason: "parser_fallback_reply",
          handoff_mode: "round_robin",
          handoff_user_id: null,
        };
        parserFallbackUsed = true;
      } else {
        parsedDecision = buildHeuristicDecisionFromIncoming(
          incomingText,
          conversationInfo.contact_name || "Cliente",
          (recentMessages || []) as HeuristicMessage[],
        );
        parserFallbackUsed = true;
      }
    }

    let decision = normalizeDecision(parsedDecision, cfg.confidence_threshold || 0.7);

    const triage = metadata.triage || {};
    const triageSignals = inferTriageSignals(incomingText, (recentMessages || []) as HeuristicMessage[]);
    const customerRequestedHuman = customerAskedHumanExplicitly(incomingText);
    
    // Decisão final de triagem: Só intercepta se o metadata permitir e a triagem estiver incompleta
    if (
      decision.action === "handoff" &&
      triage.enabled &&
      !customerRequestedHuman &&
      !triageSignals.minimumComplete &&
      decision.handoff_reason !== "human_requested"
    ) {
      decision = {
        ...decision,
        action: "reply",
        intent: "pre_handoff_collection",
        reply_text: buildCollectBeforeHandoffReply(
          conversationInfo.contact_name,
          !triageSignals.productKnown,
          !triageSignals.quantityKnown,
          !triageSignals.stampKnown,
        ),
      };
    }

    if (maxRepliesReached && decision.action === "reply") {
      decision = {
        ...decision,
        action: "handoff",
        handoff_reason: "max_auto_replies_reached",
      };
    }

    const { data: latestConversation } = await supabase
      .from("whatsapp_conversations")
      .select("id, assigned_to, status")
      .eq("id", conversationId)
      .single();

    if (latestConversation?.assigned_to && latestConversation?.status === "in_progress") {
      decision = {
        ...decision,
        action: "ignore",
        handoff_reason: "human_took_over",
      };
    }

    let replyMessageId: string | null = null;
    let handoffUserId: string | null = null;

    if (decision.action === "reply") {
      const safeReply = sanitizeReplyText(decision.reply_text, features);
      if (!safeReply) {
        decision = {
          ...decision,
          action: "handoff",
          handoff_reason: "empty_reply_after_sanitize",
        };
      } else {
        await sleep(computeHumanDelayMs(safeReply));

        const latestInboundBeforeSend = await fetchLatestInboundMarker(supabase, conversationId);
        const newerInboundArrived =
          (triggerMessageId && latestInboundBeforeSend.id && latestInboundBeforeSend.id !== triggerMessageId) ||
          (!triggerMessageId && triggerMessageExternalId && latestInboundBeforeSend.externalId &&
            latestInboundBeforeSend.externalId !== triggerMessageExternalId);

        if (newerInboundArrived) {
          decision = {
            ...decision,
            action: "ignore",
            handoff_reason: "newer_inbound_message_pending",
          };
        } else {
        const sendResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            instanceId,
            remoteJid: conversationInfo.remote_jid,
            content: safeReply,
            messageType: "text",
            conversationId,
            senderName: "IA",
            keepUnread: true,
          }),
        });

        const sendPayload = await sendResponse.json().catch(() => ({}));
        if (!sendResponse.ok || sendPayload?.success === false) {
          decision = {
            ...decision,
            action: "handoff",
            handoff_reason: "send_whatsapp_failed",
          };
        } else {
          replyMessageId = looksLikeUuid(sendPayload?.messageId) ? asString(sendPayload.messageId) : null;
        }
        }
      }
    }

    if (decision.action === "handoff") {
      const preferredSpecificUserId = decision.handoff_mode === "specific_user"
        ? (decision.handoff_user_id || cfg.handoff_user_id || null)
        : (cfg.handoff_mode === "specific_user" ? (cfg.handoff_user_id || null) : null);

      const selectedUserId = await pickHandoffUser({
        supabase,
        instanceId,
        workflowId,
        preferredMode: decision.handoff_mode === "specific_user" || cfg.handoff_mode === "specific_user"
          ? "specific_user"
          : "round_robin",
        preferredUserId: preferredSpecificUserId,
        configuredEligibleUserIds: Array.isArray(cfg.eligible_user_ids)
          ? cfg.eligible_user_ids.filter((id) => looksLikeUuid(id))
          : [],
      });

      if (selectedUserId) {
        const { data: currentConversation } = await supabase
          .from("whatsapp_conversations")
          .select("assigned_to, status")
          .eq("id", conversationId)
          .single();

        if (!currentConversation?.assigned_to || currentConversation?.assigned_to === selectedUserId || currentConversation?.status !== "in_progress") {
          await supabase
            .from("whatsapp_conversations")
            .update({ assigned_to: selectedUserId, status: "in_progress" })
            .eq("id", conversationId);

          const { data: assignedProfile } = await supabase
            .from("profiles")
            .select("nome")
            .eq("id", selectedUserId)
            .maybeSingle();

          const assignedName = asString(assignedProfile?.nome) || "atendente";
          await insertSystemMessage(
            supabase,
            conversationId,
            instanceId,
            `Atendimento transferido automaticamente para ${assignedName}.`,
          );

          handoffUserId = selectedUserId;
        }
      }
    }

    const latencyMs = Date.now() - startedAt;
    const pricingInput = fallbackUsed
      ? cfg.fallback_pricing_input_usd_per_1m
      : cfg.pricing_input_usd_per_1m;
    const pricingOutput = fallbackUsed
      ? cfg.fallback_pricing_output_usd_per_1m
      : cfg.pricing_output_usd_per_1m;

    const estimatedCost = estimateCostUsd(llmResult.usage, pricingInput, pricingOutput);

    await supabase.from("whatsapp_ai_runs").insert({
      conversation_id: conversationId,
      instance_id: instanceId,
      agent_id: cfg.id,
      agent_key: cfg.agent_key,
      provider: llmResult.provider,
      model: llmResult.model,
      trigger_message_id: triggerMessageId,
      trigger_message_external_id: triggerMessageExternalId,
      input_excerpt: incomingText.slice(0, 500),
      decision_action: decision.action,
      decision_payload: {
        decision,
        parsed_decision: parsedDecision,
        fallback_used: fallbackUsed,
        parser_fallback_used: parserFallbackUsed,
        llm_text_preview: llmTextRaw.slice(0, 500),
      },
      reply_message_id: replyMessageId,
      handoff_user_id: handoffUserId,
      handoff_reason: decision.handoff_reason,
      latency_ms: latencyMs,
      prompt_tokens: llmResult.usage.prompt_tokens,
      completion_tokens: llmResult.usage.completion_tokens,
      total_tokens: llmResult.usage.total_tokens,
      estimated_cost_usd: estimatedCost,
      status: decision.action === "ignore"
        ? "skipped"
        : (fallbackUsed ? "fallback_success" : "success"),
      error_message: llmError,
    });

    return new Response(
      JSON.stringify({
        success: true,
        action: decision.action,
        handoff_user_id: handoffUserId,
        reply_message_id: replyMessageId,
        fallback_used: fallbackUsed,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[WHATSAPP AI ROUTER] error:", error);

    if (conversationId && instanceId) {
      try {
        await supabase.from("whatsapp_ai_runs").insert({
          conversation_id: conversationId,
          instance_id: instanceId,
          agent_key: agentKey || null,
          decision_action: "error",
          status: "error",
          error_message: errorMessage,
        });
      } catch (insertErr) {
        console.error("[WHATSAPP AI ROUTER] failed to persist error run:", insertErr);
      }
    }

    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});







