-- Função para calcular tempo médio de resposta por atendente
CREATE OR REPLACE FUNCTION public.get_avg_response_time_by_user()
RETURNS TABLE(assigned_to UUID, avg_minutes NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH first_responses AS (
    -- Para cada mensagem do cliente, encontrar a primeira resposta nossa
    SELECT 
      wc.assigned_to,
      wm1.conversation_id,
      wm1.created_at as cliente_msg_time,
      MIN(wm2.created_at) as nossa_resposta_time
    FROM whatsapp_messages wm1
    JOIN whatsapp_conversations wc ON wm1.conversation_id = wc.id
    LEFT JOIN whatsapp_messages wm2 ON wm2.conversation_id = wm1.conversation_id 
      AND wm2.from_me = true 
      AND wm2.created_at > wm1.created_at
    WHERE wm1.from_me = false
      AND wc.assigned_to IS NOT NULL
    GROUP BY wc.assigned_to, wm1.conversation_id, wm1.id, wm1.created_at
  ),
  response_times AS (
    SELECT 
      assigned_to,
      EXTRACT(EPOCH FROM (nossa_resposta_time - cliente_msg_time)) / 60 as tempo_minutos
    FROM first_responses
    WHERE nossa_resposta_time IS NOT NULL
  )
  SELECT 
    rt.assigned_to,
    ROUND(AVG(rt.tempo_minutos)::numeric, 1) as avg_minutes
  FROM response_times rt
  GROUP BY rt.assigned_to;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;