import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Carregar variáveis do .env.local
const envContent = fs.readFileSync('supabase/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) env[key.trim()] = value.join('=').trim();
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function applyMigrations() {
  console.log('🚀 Iniciando aplicação das migrações via Supabase-JS...');

  // 1. Obter o ID do agente v1
  const { data: agentV1, error: agentError } = await supabase
    .from('whatsapp_ai_agents')
    .select('id')
    .eq('agent_key', 'comercial_v1')
    .single();

  if (agentError || !agentV1) {
    console.error('Erro ao buscar comercial_v1:', agentError);
    return;
  }
  const agentV1Id = agentV1.id;

  // --- Otimizando comercial_v1 ---
  
  // Remover catálogo dinâmico
  const { error: delError } = await supabase
    .from('whatsapp_ai_knowledge_items')
    .delete()
    .eq('agent_id', agentV1Id)
    .eq('title', 'Catalogo de Produtos do Modulo Vendas');
  
  if (delError) console.error('Erro ao deletar catálogo dinâmico:', delError);
  else console.log('✅ Catálogo dinâmico removido (se existia).');

  // Atualizar Guia de Produtos Estático
  const staticGuideContent = `Categorias de Produtos:
- Uniformes Empresariais: Camisas Gola Polo, Camisetas Algodão/PV, Calças e Bermudas Brim.
- Linha Esportiva: Camisetas Dry Fit, Conjuntos de Time, Shorts e Agasalhos.
- Inverno: Moletons (com capuz, sem capuz, canguru), Jaquetas e Puffer.
- Acessórios/Especiais: Canecas, Sacochilas, Body Bebê e Vestidos Sublimados.

Guia de Tecidos:
- Algodão: Ideal para conforto e uso casual.
- Poliviscose (PV): Alta durabilidade, não desbota fácil, ótimo custo-beneficio.
- Dry Fit (Liso ou Furadinho): Esportivo, leve e respirável.
- Dry Sol: Tecnologia com proteção solar e resistência.
- Piquet: Tecido clássico para camisas polo.

Tipos de Personalização:
- Silk Screen: Ideal para grandes quantidades.
- Bordado: Proporciona um acabamento sofisticado e durável.
- DTF: Estampas coloridas com alta definição em qualquer tecido.
- Sublimação: Permite artes complexas e total no Dry Fit/Poliéster.`;

  const { error: updGuideError } = await supabase
    .from('whatsapp_ai_knowledge_items')
    .update({ content: staticGuideContent })
    .eq('agent_id', agentV1Id)
    .eq('title', 'Guia de Produtos, Tecidos e Personalizacao');

  if (updGuideError) console.error('Erro ao atualizar guia estático:', updGuideError);
  else console.log('✅ Guia de produtos estático atualizado.');

  // Atualizar Metadata do v1
  const { error: updMetaError } = await supabase
    .from('whatsapp_ai_agents')
    .update({ 
      metadata: {
        features: {
          humanize_style: true,
          auto_sanitize: true,
          use_llm_triage: true
        },
        triage: {
          enabled: true,
          required_fields: ["produto", "quantidade", "personalizacao"]
        }
      }
    })
    .eq('id', agentV1Id);

  if (updMetaError) console.error('Erro ao atualizar metadata v1:', updMetaError);
  else console.log('✅ Metadata do comercial_v1 atualizado.');

  // 2. Criar Agente Comercial 2.0
  console.log('--- Criando comercial_v2 ---');
  
  const promptV2 = fs.readFileSync('supabase/migrations/20260416143500_create_comercial_v2_agent.sql', 'utf8')
    .match(/\$\$(.*)\$\$/s)[1]; // Extrai o prompt do SQL que já criei

  const { error: insError } = await supabase
    .from('whatsapp_ai_agents')
    .upsert({
      agent_key: 'comercial_v2',
      name: 'IA Comercial 2.0 (Letícia)',
      description: 'Versão humanizada do atendimento comercial para triagem e SDR.',
      provider: 'openai',
      model: 'gpt-4o-mini',
      system_prompt: promptV2.trim(),
      temperature: 0.7,
      max_output_tokens: 500,
      metadata: {
        features: {
          humanize_style: true,
          auto_sanitize: true,
          use_llm_triage: true
        },
        triage: {
          enabled: true,
          required_fields: ["produto", "quantidade", "ideia"]
        }
      },
      is_active: true
    }, { onConflict: 'agent_key' });

  if (insError) console.error('Erro ao criar/atualizar comercial_v2:', insError);
  else console.log('✅ Agente comercial_v2 (2.0) criado/atualizado com sucesso.');

  console.log('✨ Todas as operações concluídas!');
}

applyMigrations();
