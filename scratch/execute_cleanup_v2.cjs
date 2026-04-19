const fs = require('fs');

async function execute() {
  const envText = fs.readFileSync('supabase/.env.local', 'utf8');
  const env = Object.fromEntries(
    envText.split('\n')
      .filter(l => l.includes('='))
      .map(l => {
        const [k, ...v] = l.split('=');
        return [k.trim(), v.join('=').trim().replace(/^"(.*)"$/, '$1')];
      })
  );

  const rpcUrl = `${env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  const headers = {
    'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json'
  };

  const sql = `
    DO $$ 
    BEGIN
      -- 1. Limpar Retornos Pendentes em whatsapp_conversations que tiveram mensagem de saída hoje
      UPDATE public.whatsapp_conversations
      SET 
        needs_followup = false,
        followup_reason = null,
        followup_color = null,
        followup_flagged_at = null
      WHERE needs_followup = true
      AND id IN (
        SELECT conversation_id 
        FROM public.whatsapp_messages 
        WHERE from_me = true 
        AND created_at >= CURRENT_DATE
      );

      -- 2. Limpar data_retorno em leads que já tiveram interação hoje (via cliente_id)
      UPDATE public.leads
      SET data_retorno = NULL
      WHERE data_retorno IS NOT NULL
      AND data_retorno <= CURRENT_DATE + interval '1 day'
      AND cliente_id IN (
        SELECT cliente_id 
        FROM public.whatsapp_conversations
        WHERE id IN (
          SELECT conversation_id 
          FROM public.whatsapp_messages 
          WHERE from_me = true 
          AND created_at >= CURRENT_DATE
        )
      );
    END $$;
  `;
  
  const res = await fetch(rpcUrl, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify({ sql_query: sql }) 
  });
  const result = await res.text();
  console.log('Resultado da limpeza:', result);
}

execute().catch(console.error);
