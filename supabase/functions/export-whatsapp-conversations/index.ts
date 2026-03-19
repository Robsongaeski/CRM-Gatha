import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check if the user is admin
    const { data: isAdmin } = await anonClient.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for data access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const url = new URL(req.url);
    const excludeInstance = url.searchParams.get("exclude") || "1806 Comercial";
    const limit = parseInt(url.searchParams.get("limit") || "100000");

    // Buscar todas as mensagens de texto (excluindo grupos)
    const { data: messages, error } = await supabase
      .from("whatsapp_messages")
      .select(`
        content,
        from_me,
        message_type,
        created_at,
        conversation:whatsapp_conversations!inner(
          id,
          contact_name,
          contact_phone,
          group_name,
          instance:whatsapp_instances(nome)
        )
      `)
      .in("message_type", ["text", "system"])
      .not("content", "is", null)
      .neq("content", "")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw error;

    // Filtrar: excluir instância específica E excluir grupos
    const filtered = messages.filter((m: any) => {
      const conv = m.conversation || {};
      const instanceName = conv.instance?.nome || "";
      const isGroup = !!conv.group_name; // Se tem group_name, é grupo
      
      return !instanceName.toLowerCase().includes(excludeInstance.toLowerCase()) && !isGroup;
    });

    // Agrupar por conversa (cliente)
    const conversationsMap = new Map<string, {
      contactName: string;
      contactPhone: string;
      instance: string;
      messages: Array<{
        date: string;
        sender: string;
        content: string;
      }>;
    }>();

    for (const m of filtered as any[]) {
      const conv = m.conversation as any;
      const convId = conv?.id || "unknown";
      const contactName = (conv?.contact_name || "Sem Nome").replace(/;/g, ",").replace(/\n/g, " ");
      const contactPhone = conv?.contact_phone || "";
      const instance = conv?.instance?.nome || "Instância Excluída";
      
      if (!conversationsMap.has(convId)) {
        conversationsMap.set(convId, {
          contactName,
          contactPhone,
          instance,
          messages: []
        });
      }
      
      const sender = m.from_me ? "ATENDIMENTO" : "CLIENTE";
      const message = (m.content || "")
        .replace(/;/g, ",")
        .replace(/\n/g, " ")
        .replace(/\r/g, "");
      const date = new Date(m.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      
      conversationsMap.get(convId)!.messages.push({
        date,
        sender,
        content: message
      });
    }

    // Gerar CSV organizado por conversa
    let csvContent = "";
    
    // Adicionar BOM para UTF-8
    csvContent += "\uFEFF";
    
    let conversationIndex = 0;
    for (const [convId, convData] of conversationsMap) {
      conversationIndex++;
      
      // Cabeçalho da conversa
      csvContent += `\n========================================\n`;
      csvContent += `CONVERSA #${conversationIndex}\n`;
      csvContent += `Cliente: ${convData.contactName}\n`;
      csvContent += `Telefone: ${convData.contactPhone}\n`;
      csvContent += `Instância: ${convData.instance}\n`;
      csvContent += `Total de mensagens: ${convData.messages.length}\n`;
      csvContent += `========================================\n\n`;
      
      // Mensagens da conversa em ordem cronológica
      for (const msg of convData.messages) {
        csvContent += `[${msg.date}] ${msg.sender}: ${msg.content}\n`;
      }
      
      csvContent += `\n`;
    }

    // Resumo no início
    const header = `EXPORTAÇÃO DE CONVERSAS WHATSAPP\n` +
      `Data de exportação: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}\n` +
      `Total de conversas: ${conversationsMap.size}\n` +
      `Total de mensagens: ${filtered.length}\n` +
      `Instância excluída: ${excludeInstance}\n` +
      `Grupos excluídos: Sim\n` +
      `\n` +
      `Legenda:\n` +
      `- CLIENTE: Mensagem enviada pelo cliente\n` +
      `- ATENDIMENTO: Mensagem enviada pela equipe\n`;

    const finalContent = header + csvContent;

    // Retornar como download
    return new Response(finalContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="whatsapp-conversas-${new Date().toISOString().split('T')[0]}.txt"`,
      },
    });

  } catch (error: any) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});