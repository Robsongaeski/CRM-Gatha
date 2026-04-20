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

    // Configuração do body
    const body = await req.json().catch(() => ({}));
    const diasManter = body?.dias !== undefined ? parseInt(body.dias) : 7;
    const instanceIds = body?.instanceIds || [];
    const messageTypes = body?.messageTypes || [];
    const minSizeMB = body?.minSizeMB || 0;
    const minSizeBytes = minSizeMB * 1024 * 1024;

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasManter);
    const dataLimiteISO = dataLimite.toISOString();

    console.log(`[Cleanup] Iniciando limpeza anterior a ${dataLimiteISO}`);
    console.log(`[Cleanup] Filtros: Instâncias=${instanceIds.length}, Tipos=${messageTypes.length}, TamanhoMin=${minSizeMB}MB`);

    // 1. Buscar mensagens com mídias que atendam aos critérios básicos (data, instância, tipo)
    let query = supabase
      .from('whatsapp_messages')
      .select('id, media_url, message_type, created_at')
      .not('media_url', 'is', null)
      .lt('created_at', dataLimiteISO);

    if (instanceIds.length > 0) {
      query = query.in('instance_id', instanceIds);
    }
    if (messageTypes.length > 0) {
      query = query.in('message_type', messageTypes);
    }

    const { data: mensagens, error: fetchError } = await query.limit(2000);

    if (fetchError) throw fetchError;

    if (!mensagens || mensagens.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhuma mídia encontrada com os filtros selecionados',
        arquivos_deletados: 0,
        mensagens_processadas: 0,
        data_limite: dataLimiteISO
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[Cleanup] Encontradas ${mensagens.length} mensagens para verificar.`);

    // 2. Extrair paths e validar tamanho se necessário
    const filesToDelete: string[] = [];
    const messagesToUpdate: string[] = [];
    let checkedCount = 0;

    for (const msg of mensagens) {
      if (!msg.media_url || !msg.media_url.includes('whatsapp-media')) continue;
      
      const urlParts = msg.media_url.split('whatsapp-media/');
      if (!urlParts[1]) continue;
      const relativePath = decodeURIComponent(urlParts[1]);

      // Verificar tamanho se filtro estiver ativo
      if (minSizeBytes > 0) {
        try {
          const response = await fetch(msg.media_url, { method: 'HEAD' });
          const contentLength = response.headers.get('content-length');
          const size = contentLength ? parseInt(contentLength) : 0;
          
          if (size < minSizeBytes) {
            continue; // Arquivo menor que o mínimo, ignora
          }
        } catch (e) {
          console.error(`[Cleanup] Erro ao checar tamanho de ${relativePath}:`, e);
          // Em caso de erro na checagem, mantemos ou pulamos? Vamos pular por segurança.
          continue;
        }
      }

      filesToDelete.push(relativePath);
      messagesToUpdate.push(msg.id);
      checkedCount++;
    }

    console.log(`[Cleanup] ${filesToDelete.length} arquivos passaram nos filtros de tamanho/path.`);

    // 3. Deletar arquivos do storage em lotes de 100
    let deletedFiles = 0;
    for (let i = 0; i < filesToDelete.length; i += 100) {
      const batch = filesToDelete.slice(i, i + 100);
      const { error: deleteError } = await supabase.storage
        .from('whatsapp-media')
        .remove(batch);
      
      if (deleteError) {
        console.error(`[Cleanup] Erro ao deletar storage lote ${i}:`, deleteError);
      } else {
        deletedFiles += batch.length;
      }
    }

    // 4. Atualizar mensagens para null em lotes de 200
    let updatedMsgs = 0;
    for (let i = 0; i < messagesToUpdate.length; i += 200) {
      const batch = messagesToUpdate.slice(i, i + 200);
      const { error: updateError } = await supabase
        .from('whatsapp_messages')
        .update({ media_url: null })
        .in('id', batch);
      
      if (updateError) {
        console.error(`[Cleanup] Erro ao atualizar mensagens lote ${i}:`, updateError);
      } else {
        updatedMsgs += batch.length;
      }
    }

    const resultado = {
      success: true,
      mensagens_processadas: updatedMsgs,
      arquivos_deletados: deletedFiles,
      data_limite: dataLimiteISO,
    };

    return new Response(JSON.stringify(resultado), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('[Cleanup] Erro fatal:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500 
    });
  }
});
