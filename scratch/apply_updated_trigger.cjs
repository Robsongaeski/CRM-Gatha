const fs = require('fs');

async function apply() {
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

  const sql = fs.readFileSync('supabase/migrations/20260416153000_automation_whatsapp_followup_trigger.sql', 'utf8');
  
  const res = await fetch(rpcUrl, { 
    method: 'POST', 
    headers, 
    body: JSON.stringify({ sql_query: sql }) 
  });
  const result = await res.text();
  console.log('Resultado da aplicação:', result);
}

apply().catch(console.error);
