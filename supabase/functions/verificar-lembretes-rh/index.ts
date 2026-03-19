import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Colaborador {
  id: string;
  nome: string;
  data_nascimento: string | null;
  data_admissao: string;
}

interface UsuarioRH {
  user_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth() + 1;
    
    // Calculate dates for comparisons
    const em4Dias = new Date(hoje);
    em4Dias.setDate(diaHoje + 4);
    const dia4Dias = em4Dias.getDate();
    const mes4Dias = em4Dias.getMonth() + 1;
    
    const em90Dias = new Date(hoje);
    em90Dias.setDate(diaHoje + 90);

    // Get active colaboradores
    const { data: colaboradores, error: colabError } = await supabase
      .from("colaboradores")
      .select("id, nome, data_nascimento, data_admissao")
      .eq("ativo", true);

    if (colabError) throw colabError;

    // Get users with RH profile
    const { data: usuariosRH, error: rhError } = await supabase
      .from("user_profiles")
      .select(`
        user_id,
        profile:system_profiles!inner(codigo)
      `)
      .eq("profile.codigo", "rh");

    if (rhError) throw rhError;

    const rhUserIds = usuariosRH?.map((u: any) => u.user_id) || [];

    // Also get admin users
    const { data: admins, error: adminError } = await supabase
      .from("user_profiles")
      .select(`
        user_id,
        profile:system_profiles!inner(codigo)
      `)
      .in("profile.codigo", ["admin", "administrador"]);

    if (adminError) throw adminError;

    const adminUserIds = admins?.map((u: any) => u.user_id) || [];
    const destinatarios = [...new Set([...rhUserIds, ...adminUserIds])];

    if (destinatarios.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum usuário RH/Admin encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notificacoesParaCriar: any[] = [];

    for (const colab of colaboradores || []) {
      // Check birthday in 4 days
      if (colab.data_nascimento) {
        const nascimento = new Date(colab.data_nascimento);
        const diaNasc = nascimento.getDate();
        const mesNasc = nascimento.getMonth() + 1;

        if (diaNasc === dia4Dias && mesNasc === mes4Dias) {
          for (const userId of destinatarios) {
            notificacoesParaCriar.push({
              user_id: userId,
              tipo: "rh_aniversario",
              mensagem: `🎂 Aniversário em 4 dias: ${colab.nome}`,
              link: `/rh/colaboradores`,
            });
          }
        }
      }

      // Check company anniversary in 4 days
      if (colab.data_admissao) {
        const admissao = new Date(colab.data_admissao);
        const diaAdm = admissao.getDate();
        const mesAdm = admissao.getMonth() + 1;
        const anoAdm = admissao.getFullYear();
        const anosEmpresa = hoje.getFullYear() - anoAdm;

        if (diaAdm === dia4Dias && mesAdm === mes4Dias && anosEmpresa >= 1) {
          for (const userId of destinatarios) {
            notificacoesParaCriar.push({
              user_id: userId,
              tipo: "rh_tempo_empresa",
              mensagem: `🏢 ${colab.nome} completa ${anosEmpresa} anos de empresa em 4 dias`,
              link: `/rh/colaboradores`,
            });
          }
        }

        // Check vacation expiring in 90 days
        // Vacation expires 1 year after acquisition period (11 months after 12 months of work)
        const proximoVencimento = new Date(admissao);
        proximoVencimento.setFullYear(hoje.getFullYear());
        proximoVencimento.setMonth(proximoVencimento.getMonth() + 11); // 12 + 11 = 23 months = vacation deadline

        if (proximoVencimento <= em90Dias && proximoVencimento > hoje) {
          const diasParaVencer = Math.ceil((proximoVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
          
          // Only notify once per period (check if notification already exists today)
          for (const userId of destinatarios) {
            notificacoesParaCriar.push({
              user_id: userId,
              tipo: "rh_ferias_vencendo",
              mensagem: `⚠️ Férias de ${colab.nome} vencem em ${diasParaVencer} dias`,
              link: `/rh/ferias`,
            });
          }
        }
      }
    }

    // Get commemorative dates in 4 days
    const { data: datasProximas, error: datasError } = await supabase
      .from("datas_comemorativas")
      .select("*")
      .eq("ativo", true);

    if (!datasError && datasProximas) {
      for (const data of datasProximas) {
        const dataEvento = new Date(data.data);
        let diaEvento = dataEvento.getDate();
        let mesEvento = dataEvento.getMonth() + 1;

        // For recurring events, check against current year
        if (data.recorrente) {
          if (diaEvento === dia4Dias && mesEvento === mes4Dias) {
            for (const userId of destinatarios) {
              notificacoesParaCriar.push({
                user_id: userId,
                tipo: "rh_data_comemorativa",
                mensagem: `📅 ${data.nome} em 4 dias`,
                link: `/rh/calendario`,
              });
            }
          }
        }
      }
    }

    // Insert notifications (avoiding duplicates by checking today's notifications)
    if (notificacoesParaCriar.length > 0) {
      // Get today's date range for deduplication
      const inicioHoje = new Date(hoje);
      inicioHoje.setHours(0, 0, 0, 0);
      const fimHoje = new Date(hoje);
      fimHoje.setHours(23, 59, 59, 999);

      const { data: existentes } = await supabase
        .from("notificacoes")
        .select("user_id, tipo, mensagem")
        .gte("created_at", inicioHoje.toISOString())
        .lte("created_at", fimHoje.toISOString());

      const existentesSet = new Set(
        existentes?.map((n) => `${n.user_id}-${n.tipo}-${n.mensagem}`) || []
      );

      const novas = notificacoesParaCriar.filter(
        (n) => !existentesSet.has(`${n.user_id}-${n.tipo}-${n.mensagem}`)
      );

      if (novas.length > 0) {
        const { error: insertError } = await supabase
          .from("notificacoes")
          .insert(novas);

        if (insertError) throw insertError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `${novas.length} notificações criadas (${notificacoesParaCriar.length - novas.length} duplicadas ignoradas)`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Nenhuma notificação para criar" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
