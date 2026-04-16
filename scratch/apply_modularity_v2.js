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

async function modularizeAndFix() {
  console.log('🚀 Iniciando modularização (versão corrigida)...');

  // 1. Obter ID do Agente v2
  const { data: agentV2, error: agentError } = await supabase
    .from('whatsapp_ai_agents')
    .select('id')
    .eq('agent_key', 'comercial_v2')
    .single();

  if (agentError || !agentV2) {
    console.error('Erro ao buscar comercial_v2.', agentError);
    return;
  }
  const agentV2Id = agentV2.id;

  // 2. Limpar itens existentes para evitar duplicidade (já que o UPSERT falhou por falta de restrição unique)
  console.log('--- Limpando Itens de Conhecimento existentes para o v2 ---');
  await supabase.from('whatsapp_ai_knowledge_items').delete().eq('agent_id', agentV2Id);

  // 3. Criar Itens de Conhecimento para o v2
  console.log('--- Criando Novos Itens de Conhecimento ---');
  
  const knowledgeItems = [
    {
      agent_id: agentV2Id,
      title: 'Sobre a Gatha Confecções',
      content: `A Gatha Confecções está localizada em Pato Branco - PR. Possui produção própria e atende todo o Brasil. Trabalha com foco em qualidade, personalização e agilidade.`
    },
    {
      agent_id: agentV2Id,
      title: 'Catálogo de Produtos e Tecidos',
      content: `Camiseta Algodão: Uso casual, uniforme e marcas. Estampa em DTF ou bordado. Não usar sublimação.
Camiseta Dryfit: Uso esportivo ou ao ar livre. Alta respirabilidade, proteção UV, antiodor. Pode ser sublimada.
Camiseta Dryfit Furadinho: Máxima ventilação. Pode ser usada para times e eventos. Permite sublimação total.
Dry Poliamida Sol: Premium esportivo, super leve. Ideal para alto rendimento.
Poliviscose (PV): Leve, confortável, alta resistência e demora mais para desbotar.
Polo Piquet: Visual formal. Bordado ou DTF.
Polo Algodão: Mais confortável. Bordado ou DTF.
Conjunto Esportivo: Camiseta + shorts. Ideal para times (Sublimação total).
Corta Vento: Semi impermeável. Pode ter forro e capuz. DTF ou sublimação.
Puffer: Jaqueta grossa premium para frio intenso. Bolsos laterais e interno. Bordado.
Moletom: Capuz, sem capuz ou zíper. Cores: preto, branco, caramelo e off. DTF ou bordado.`
    },
    {
      agent_id: agentV2Id,
      title: 'Guia de Estamparia e Técnicas',
      content: `DTF: Funciona em praticamente qualquer tecido. Ideal para estampas localizadas. Sem limite de cor.
Sublimação: Ideal para tecidos claros e sintéticos (Dry Fit). Permite estampa total. Não usar em algodão escuro.
Bordado: Ideal para logos. Mais sofisticado. Não indicado para estampas grandes.`
    },
    {
      agent_id: agentV2Id,
      title: 'Tamanhos e Modelagem',
      content: `Adulto: PP ao G4.
Infantil: Disponível.
Polo: Possui modelagem diferenciada (informar apenas se solicitado).`
    },
    {
      agent_id: agentV2Id,
      title: 'Financeiro: Preços e Pagamentos',
      content: `Regra: Nunca informar preços ou prazos finais.
Condições: À vista com 3% de desconto. Parcelado em até 3x sem juros no cartão. Ou entrada de 40% e restante na entrega.`
    },
    {
      agent_id: agentV2Id,
      title: 'Logística: Processo e Prazos',
      content: `Processo: Ideia -> Arte -> Aprovação -> Produção -> Envio.
Sempre enviamos arte para aprovação. O prazo final sempre é confirmado pelo time comercial.`
    }
  ];

  const { error: kiError } = await supabase.from('whatsapp_ai_knowledge_items').insert(knowledgeItems);
  if (kiError) console.error(`Erro ao criar itens:`, kiError);
  else console.log(`✅ Itens de conhecimento criados com sucesso.`);

  // 4. Atualizar System Prompt do v2 (Reduzido)
  console.log('--- Atualizando System Prompt v2 ---');
  const reducedPrompt = `Você é a Letícia, atendente comercial da Gatha Confecções no WhatsApp.
Seu papel é fazer o primeiro atendimento, entender o cliente de forma natural, orientar com segurança e conduzir a conversa até deixar tudo pronto para o time comercial finalizar.
Você não é um robô de perguntas. Você é uma atendente experiente.

--------------------------------------------------
COMPORTAMENTO:
- Fale de forma natural, humana e direta. Seja simpática e prestativa.
- Evite linguagem técnica demais e frases prontas repetitivas.
- NÃO siga um formulário rígido. Colete informações (produto, quantidade, ideia) de forma fluida.
- Máximo 1 pergunta por mensagem. Se o cliente já informou algo, não repita a pergunta.

--------------------------------------------------
BASE DE CONHECIMENTO:
Você tem acesso a informações detalhadas sobre nossos produtos, tecidos, estampas, tamanhos e processos comerciais na sua base de conhecimento (Itens de Conhecimento). Consulte-a sempre que precisar de dados técnicos exatos.

--------------------------------------------------
TRANSFERÊNCIA PARA HUMANO:
Transfira quando:
- Cliente pedir vendedor ou preço/prazo mais de 2 vezes.
- Dados mínimos coletados (Produto + Quantidade + Ideia).
- Cliente demonstrar intenção firme de compra ou houver dúvida técnica.
Mensagem: "Perfeito, já entendi tudo aqui. Vou te encaminhar pro pessoal do comercial que já te passa tudo certinho e finaliza com você, tá bom?"`;

  const { error: updPromptError } = await supabase
    .from('whatsapp_ai_agents')
    .update({ system_prompt: reducedPrompt })
    .eq('id', agentV2Id);

  if (updPromptError) console.error('Erro ao atualizar prompt v2:', updPromptError);
  else console.log('✅ System Prompt v2 modularizado.');

  console.log('✨ Modularização concluída!');
}

modularizeAndFix();
