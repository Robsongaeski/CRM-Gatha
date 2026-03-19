import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
// Resend será importado dinamicamente para evitar erros de bundle

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Lead {
  id: string;
  nome: string;
  data_retorno: string;
  vendedor_id: string;
  telefone?: string;
  whatsapp?: string;
  observacao?: string;
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar leads com retorno agendado para hoje e lembrete não enviado
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    console.log("Verificando retornos entre:", hoje.toISOString(), "e", amanha.toISOString());

    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select(`
        *,
        vendedor:profiles!leads_vendedor_id_fkey(nome, email)
      `)
      .gte("data_retorno", hoje.toISOString())
      .lt("data_retorno", amanha.toISOString())
      .eq("lembrete_enviado", false)
      .in("status", ["novo", "contatando", "qualificado"]);

    if (leadsError) {
      console.error("Erro ao buscar leads:", leadsError);
      throw leadsError;
    }

    console.log(`Encontrados ${leads?.length || 0} leads com retorno agendado`);

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhum lead com retorno agendado para hoje",
          processados: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let emailsEnviados = 0;
    let notificacoesCreated = 0;

    // Processar cada lead
    for (const lead of leads as Lead[]) {
      console.log(`Processando lead: ${lead.nome} (${lead.id})`);

      // Criar notificação no sistema
      try {
        const dataRetorno = new Date(lead.data_retorno);
        const dataFormatada = dataRetorno.toLocaleDateString("pt-BR");

        const { error: notifError } = await supabase
          .from("notificacoes")
          .insert({
            user_id: lead.vendedor_id,
            tipo: "retorno_lead",
            mensagem: `📅 Retorno agendado para hoje (${dataFormatada}): ${lead.nome}`,
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

      // Enviar email se Resend estiver configurado
      if (resendApiKey && lead.vendedor?.email) {
        try {
          // Import dinâmico do Resend
          const { Resend } = await import("https://esm.sh/resend@4.0.0");
          const resend = new Resend(resendApiKey);
          
          const dataRetorno = new Date(lead.data_retorno);
          const dataFormatada = dataRetorno.toLocaleDateString("pt-BR");

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">🔔 Lembrete de Retorno</h2>
              <p>Olá <strong>${lead.vendedor.nome}</strong>,</p>
              <p>Você tem um retorno agendado para hoje:</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Lead:</strong> ${lead.nome}</p>
                <p><strong>Data:</strong> ${dataFormatada}</p>
                ${lead.telefone ? `<p><strong>Telefone:</strong> ${lead.telefone}</p>` : ""}
                ${lead.whatsapp ? `<p><strong>WhatsApp:</strong> ${lead.whatsapp}</p>` : ""}
                ${lead.observacao ? `<p><strong>Observação:</strong> ${lead.observacao}</p>` : ""}
              </div>
              <p>Acesse o sistema para mais detalhes.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Este é um email automático. Não responda.
              </p>
            </div>
          `;

          await resend.emails.send({
            from: "Sistema CRM <onboarding@resend.dev>",
            to: [lead.vendedor.email],
            subject: `🔔 Retorno agendado hoje: ${lead.nome}`,
            html: emailHtml,
          });

          emailsEnviados++;
          console.log(`Email enviado para ${lead.vendedor.email}`);
        } catch (emailError) {
          console.error("Erro ao enviar email:", emailError);
        }
      }

      // Marcar lembrete como enviado
      try {
        const { error: updateError } = await supabase
          .from("leads")
          .update({ lembrete_enviado: true })
          .eq("id", lead.id);

        if (updateError) {
          console.error("Erro ao atualizar lead:", updateError);
        }
      } catch (error) {
        console.error("Erro ao marcar lembrete como enviado:", error);
      }
    }

    console.log(`Processamento concluído: ${emailsEnviados} emails enviados, ${notificacoesCreated} notificações criadas`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Lembretes processados com sucesso",
        processados: leads.length,
        emailsEnviados,
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
