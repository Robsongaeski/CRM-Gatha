import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error('Evolution API não configurada');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar instâncias conectadas
    const { data: connectedInstances } = await supabase
      .from('whatsapp_instances')
      .select('id, instance_name')
      .eq('is_active', true)
      .eq('status', 'connected');

    if (!connectedInstances || connectedInstances.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhuma instância conectada',
        processed: 0 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const instanceIds = connectedInstances.map(i => i.id);
    const instanceMap = new Map(connectedInstances.map(i => [i.id, i.instance_name]));

    // Buscar mensagens pendentes para instâncias conectadas
    const { data: pendingMessages } = await supabase
      .from('whatsapp_message_queue')
      .select('*')
      .in('instance_id', instanceIds)
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(50);

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Nenhuma mensagem na fila',
        processed: 0 
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Processando ${pendingMessages.length} mensagens da fila`);

    let processed = 0;
    let errors = 0;

    for (const msg of pendingMessages) {
      try {
        const instanceName = instanceMap.get(msg.instance_id);
        if (!instanceName) continue;

        // Marcar como processando
        await supabase
          .from('whatsapp_message_queue')
          .update({ 
            status: 'processing',
            attempts: msg.attempts + 1 
          })
          .eq('id', msg.id);

        // Enviar via Evolution API
        let response;
        if (msg.message_type === 'text') {
          response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              number: msg.remote_jid,
              text: msg.content
            })
          });
        } else {
          const mediaPayload: any = {
            number: msg.remote_jid,
            caption: msg.content
          };

          if (msg.media_base64) {
            mediaPayload.media = msg.media_base64;
          } else if (msg.media_url) {
            mediaPayload.media = msg.media_url;
          }

          response = await fetch(`${evolutionApiUrl}/message/sendMedia/${instanceName}`, {
            method: 'POST',
            headers: {
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(mediaPayload)
          });
        }

        const result = await response.json();

        if (response.ok) {
          // Sucesso - salvar mensagem e remover da fila
          const messageIdExternal = result?.key?.id || result?.messageId;

          await supabase.from('whatsapp_messages').insert({
            conversation_id: msg.conversation_id,
            instance_id: msg.instance_id,
            message_id_external: messageIdExternal,
            from_me: true,
            content: msg.content,
            message_type: msg.message_type,
            media_url: msg.media_url,
            status: 'sent'
          });

          // Atualizar conversa
          if (msg.conversation_id) {
            await supabase
              .from('whatsapp_conversations')
              .update({
                last_message_at: new Date().toISOString(),
                last_message_preview: msg.content?.substring(0, 100) || `[${msg.message_type}]`
              })
              .eq('id', msg.conversation_id);
          }

          // Remover da fila
          await supabase
            .from('whatsapp_message_queue')
            .update({ 
              status: 'sent',
              processed_at: new Date().toISOString()
            })
            .eq('id', msg.id);

          processed++;
        } else {
          throw new Error(result.message || 'Erro ao enviar');
        }

      } catch (error: unknown) {
        console.error('Erro ao processar mensagem:', msg.id, error);
        
        await supabase
          .from('whatsapp_message_queue')
          .update({ 
            status: msg.attempts + 1 >= 3 ? 'error' : 'pending',
            error_message: error instanceof Error ? error.message : 'Erro desconhecido'
          })
          .eq('id', msg.id);

        errors++;
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed,
      errors,
      total: pendingMessages.length
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    console.error('Erro ao processar fila:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
