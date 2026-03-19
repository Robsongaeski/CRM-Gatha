import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Configuração: dias para manter mídia (padrão 7)
    let diasManter = 7;
    try {
      const body = await req.json();
      if (body?.dias) diasManter = parseInt(body.dias);
    } catch { /* sem body = usar padrão */ }

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasManter);
    const dataLimiteISO = dataLimite.toISOString();

    console.log(`Limpando mídia anterior a ${dataLimiteISO} (${diasManter} dias)`);

    // 1. Buscar mensagens com mídia antiga
    const { data: mensagens, error: fetchError } = await supabase
      .from('whatsapp_messages')
      .select('id, media_url, created_at')
      .not('media_url', 'is', null)
      .lt('created_at', dataLimiteISO)
      .limit(1000);

    if (fetchError) {
      console.error('Erro ao buscar mensagens:', fetchError);
      throw fetchError;
    }

    if (!mensagens || mensagens.length === 0) {
      console.log('Nenhuma mídia antiga encontrada');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhuma mídia antiga encontrada',
        deleted: 0 
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Encontradas ${mensagens.length} mensagens com mídia antiga`);

    // 2. Extrair paths do storage a partir das URLs
    const bucketUrl = `${supabaseUrl}/storage/v1/object/public/whatsapp-media/`;
    const filesToDelete: string[] = [];

    for (const msg of mensagens) {
      if (msg.media_url && msg.media_url.includes('whatsapp-media')) {
        // Extrair path relativo do bucket
        const urlParts = msg.media_url.split('whatsapp-media/');
        if (urlParts[1]) {
          filesToDelete.push(decodeURIComponent(urlParts[1]));
        }
      }
    }

    console.log(`${filesToDelete.length} arquivos para deletar do storage`);

    // 3. Deletar arquivos do storage em lotes de 100
    let deletedFiles = 0;
    for (let i = 0; i < filesToDelete.length; i += 100) {
      const batch = filesToDelete.slice(i, i + 100);
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from('whatsapp-media')
        .remove(batch);
      
      if (deleteError) {
        console.error(`Erro ao deletar lote ${i}:`, deleteError);
      } else {
        deletedFiles += batch.length;
        console.log(`Lote ${i}: ${batch.length} arquivos deletados`);
      }
    }

    // 4. Atualizar media_url para null nas mensagens
    const msgIds = mensagens.map(m => m.id);
    for (let i = 0; i < msgIds.length; i += 200) {
      const batch = msgIds.slice(i, i + 200);
      const { error: updateError } = await supabase
        .from('whatsapp_messages')
        .update({ media_url: null })
        .in('id', batch);
      
      if (updateError) {
        console.error(`Erro ao atualizar mensagens lote ${i}:`, updateError);
      }
    }

    const resultado = {
      success: true,
      mensagens_processadas: mensagens.length,
      arquivos_deletados: deletedFiles,
      dias_limite: diasManter,
      data_limite: dataLimiteISO,
    };

    console.log('Resultado:', JSON.stringify(resultado));

    return new Response(JSON.stringify(resultado), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Erro na limpeza:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});
