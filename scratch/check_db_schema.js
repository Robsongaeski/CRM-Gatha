const fs = require('fs');

async function checkSchema() {
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

  async function runQuery(sql) {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ sql_query: sql })
    });
    return res.json();
  }

  console.log('--- Colunas da tabela leads ---');
  const leadsCols = await runQuery("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leads' AND table_schema = 'public'");
  console.log(JSON.stringify(leadsCols, null, 2));

  console.log('--- Exemplo de dados com retorno hoje ---');
  const today = new Date().toISOString().split('T')[0];
  const query = `
    SELECT id, cliente_id, contact_name, needs_followup, last_message_at 
    FROM whatsapp_conversations 
    WHERE needs_followup = true 
    LIMIT 10
  `;
  const conversations = await runQuery(query);
  console.log(JSON.stringify(conversations, null, 2));
}

checkSchema().catch(console.error);
