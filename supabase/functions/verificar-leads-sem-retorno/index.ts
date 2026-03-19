import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Lead {
  id: string;
  nome: string;
  vendedor_id: string;
  ultima_interacao?: string;
  created_at: string;
  vendedor?: {
    nome: string;
    email: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calcular data limite (20 dias atrás)
    const hoje = new Date();
    const limite20Dias = new Date(hoje);
    limite20Dias.setDate(limite20Dias.getDate() - 20);

    console.log("Verificando leads sem interação há mais de 20 dias desde:", limite20Dias.toISOString());

    // Buscar leads ativos sem retorno definido e sem interação há 20+ dias
    // que ainda não receberam lembrete de inatividade
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(`
        *,
        vendedor:profiles!leads_vendedor_id_fkey(nome, email)
      `)
      .eq("ativo", true)
      .is("data_retorno", null) // Sem data de retorno definida
      .in("status", ["novo", "contatando", "qualificado"])
      .or(`ultima_interacao.is.null,ultima_interacao.lt.${limite20Dias.toISOString()}`)
      .eq("lembrete_inatividade_enviado", false);

    if (leadsError) {
      console.error("Erro ao buscar leads:", leadsError);
      throw leadsError;
    }

    console.log(`Encontrados ${leads?.length || 0} leads sem interação há mais de 20 dias`);

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhum lead sem interação encontrado",
          processados: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificacoesCreated = 0;

    // Processar cada lead
    for (const lead of leads as Lead[]) {
      if (!lead.vendedor_id) {
        console.log(`Lead ${lead.nome} (${lead.id}) não tem vendedor atribuído, pulando...`);
        continue;
      }

      console.log(`Processando lead: ${lead.nome} (${lead.id})`);

      // Criar notificação no sistema
      try {
        const diasSemContato = lead.ultima_interacao 
          ? Math.floor((hoje.getTime() - new Date(lead.ultima_interacao).getTime()) / (1000 * 60 * 60 * 24))
          : Math.floor((hoje.getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

        const { error: notifError } = await supabase
          .from("notificacoes")
          .insert({
            user_id: lead.vendedor_id,
            tipo: "lead_sem_retorno",
            mensagem: `Lead "${lead.nome}" está há ${diasSemContato} dias sem contato. Entre em contato!`,
            link: `/leads/${lead.id}`,
            lida: false,
          });

        if (notifError) {
          console.error("Erro ao criar notificação:", notifError);
        } else {
          notificacoesCreated++;
        }
      } catch (error) {
        console.error("Erro ao criar notificação:", error);
      }

      // Marcar lembrete de inatividade como enviado
      try {
        const { error: updateError } = await supabase
          .from("leads")
          .update({ lembrete_inatividade_enviado: true })
          .eq("id", lead.id);

        if (updateError) {
          console.error("Erro ao atualizar lead:", updateError);
        }
      } catch (error) {
        console.error("Erro ao marcar lembrete como enviado:", error);
      }
    }

    console.log(`Processamento concluído: ${notificacoesCreated} notificações criadas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lembretes de inatividade processados com sucesso",
        processados: leads.length,
        notificacoesCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Erro geral:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
