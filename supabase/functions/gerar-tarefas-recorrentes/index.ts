import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se hoje é dia útil (segunda a sexta)
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    
    if (diaSemana === 0 || diaSemana === 6) {
      console.log('Hoje é fim de semana. Nenhuma tarefa gerada.');
      return new Response(
        JSON.stringify({ message: 'Fim de semana - nenhuma tarefa gerada', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hojeStr = hoje.toISOString().split('T')[0];

    // Buscar tarefas recorrentes ativas que não foram geradas hoje
    const { data: tarefasRecorrentes, error: fetchError } = await supabase
      .from('tarefas')
      .select('*')
      .eq('recorrente', true)
      .eq('ativa_recorrencia', true)
      .is('excluida_em', null);

    if (fetchError) {
      console.error('Erro ao buscar tarefas recorrentes:', fetchError);
      throw fetchError;
    }

    if (!tarefasRecorrentes?.length) {
      console.log('Nenhuma tarefa recorrente ativa encontrada.');
      return new Response(
        JSON.stringify({ message: 'Nenhuma tarefa recorrente ativa', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let tarefasCriadas = 0;

    for (const tarefaOrigem of tarefasRecorrentes) {
      // Verificar se já existe uma tarefa gerada hoje para esta origem
      const { data: existente } = await supabase
        .from('tarefas')
        .select('id')
        .eq('tarefa_origem_id', tarefaOrigem.id)
        .gte('created_at', hojeStr)
        .lt('created_at', `${hojeStr}T23:59:59`)
        .maybeSingle();

      if (existente) {
        console.log(`Tarefa já gerada hoje para origem ${tarefaOrigem.id}`);
        continue;
      }

      // Criar nova instância da tarefa
      const { data: novaTarefa, error: createError } = await supabase
        .from('tarefas')
        .insert({
          titulo: tarefaOrigem.titulo,
          tipo_conteudo: tarefaOrigem.tipo_conteudo,
          descricao: tarefaOrigem.descricao,
          prioridade: tarefaOrigem.prioridade,
          data_limite: hojeStr,
          executor_id: tarefaOrigem.executor_id,
          criador_id: tarefaOrigem.criador_id,
          status: 'pendente',
          recorrente: false,
          tarefa_origem_id: tarefaOrigem.id,
        })
        .select()
        .single();

      if (createError) {
        console.error(`Erro ao criar tarefa para origem ${tarefaOrigem.id}:`, createError);
        continue;
      }

      // Se for checklist, duplicar itens
      if (tarefaOrigem.tipo_conteudo === 'checklist') {
        const { data: itens } = await supabase
          .from('tarefa_checklist_itens')
          .select('*')
          .eq('tarefa_id', tarefaOrigem.id)
          .order('ordem');

        if (itens?.length) {
          const novosItens = itens.map((item: any) => ({
            tarefa_id: novaTarefa.id,
            descricao: item.descricao,
            ordem: item.ordem,
            concluido: false,
          }));

          await supabase.from('tarefa_checklist_itens').insert(novosItens);
        }
      }

      tarefasCriadas++;
      console.log(`Tarefa criada: ${novaTarefa.id} (origem: ${tarefaOrigem.id})`);
    }

    console.log(`Total de tarefas criadas: ${tarefasCriadas}`);

    return new Response(
      JSON.stringify({ 
        message: `${tarefasCriadas} tarefa(s) gerada(s)`, 
        count: tarefasCriadas,
        date: hojeStr
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro na edge function:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
