import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const hoje = new Date()
    const cincosDiasAtras = new Date(hoje)
    cincosDiasAtras.setDate(cincosDiasAtras.getDate() - 5)

    let notificacoesCriadas = 0

    // 1. Propostas pendentes há mais de 5 dias sem atualização
    const { data: propostasPendentes } = await supabase
      .from('propostas')
      .select('id, vendedor_id, updated_at, created_at, clientes(nome_razao_social)')
      .in('status', ['pendente', 'follow_up'])
      .lt('updated_at', cincosDiasAtras.toISOString())

    if (propostasPendentes && propostasPendentes.length > 0) {
      for (const proposta of propostasPendentes) {
        const diasPendente = Math.floor(
          (hoje.getTime() - new Date(proposta.updated_at).getTime()) / (1000 * 60 * 60 * 24)
        )
        const clienteNome = (proposta as any).clientes?.nome_razao_social || 'Cliente'

        // Verificar se já existe notificação recente (últimas 24h) para esta proposta
        const { data: notifExistente } = await supabase
          .from('notificacoes')
          .select('id')
          .eq('user_id', proposta.vendedor_id)
          .eq('tipo', 'proposta_pendente')
          .like('link', `%${proposta.id}%`)
          .gte('created_at', new Date(hoje.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1)

        if (!notifExistente || notifExistente.length === 0) {
          await supabase.from('notificacoes').insert({
            user_id: proposta.vendedor_id,
            tipo: 'proposta_pendente',
            mensagem: `Proposta para ${clienteNome} está pendente há ${diasPendente} dias. Retome contato!`,
            link: `/propostas/${proposta.id}`,
            lida: false,
          })
          notificacoesCriadas++
        }
      }
    }

    // 2. Grades de prova vencidas
    const hojeStr = hoje.toISOString().split('T')[0]
    const { data: gradesVencidas } = await supabase
      .from('emprestimos_grade_prova')
      .select('id, numero_emprestimo, vendedor_id, data_prevista_devolucao, clientes(nome_razao_social)')
      .eq('status', 'emprestado')
      .lt('data_prevista_devolucao', hojeStr)

    if (gradesVencidas && gradesVencidas.length > 0) {
      for (const grade of gradesVencidas) {
        const diasVencido = Math.floor(
          (hoje.getTime() - new Date(grade.data_prevista_devolucao).getTime()) / (1000 * 60 * 60 * 24)
        )
        const clienteNome = (grade as any).clientes?.nome_razao_social || 'Cliente'

        // Verificar se já existe notificação recente (últimas 24h)
        const { data: notifExistente } = await supabase
          .from('notificacoes')
          .select('id')
          .eq('user_id', grade.vendedor_id)
          .eq('tipo', 'grade_vencida')
          .like('mensagem', `%#${grade.numero_emprestimo}%`)
          .gte('created_at', new Date(hoje.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .limit(1)

        if (!notifExistente || notifExistente.length === 0) {
          await supabase.from('notificacoes').insert({
            user_id: grade.vendedor_id,
            tipo: 'grade_vencida',
            mensagem: `Grade de prova #${grade.numero_emprestimo} para ${clienteNome} está vencida há ${diasVencido} dias!`,
            link: '/vendas/grades-prova',
            lida: false,
          })
          notificacoesCriadas++
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        propostas_verificadas: propostasPendentes?.length || 0,
        grades_verificadas: gradesVencidas?.length || 0,
        notificacoes_criadas: notificacoesCriadas,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
