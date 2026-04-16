-- TRIGGER: Limpeza Automática de Retornos Pendentes
-- Este gatilho garante que, ao enviar uma mensagem manual ou automática (from_me = true), 
-- o status de "Retorno" da conversa seja limpo imediatamente no banco de dados.

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_outbound_message_followup()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a mensagem for enviada pelo sistema/atendente (from_me = true)
  -- e não for uma mensagem puramente de sistema/log (message_type != 'system')
  IF NEW.from_me = true AND NEW.message_type != 'system' THEN
    UPDATE public.whatsapp_conversations
    SET 
      needs_followup = false,
      followup_reason = null,
      followup_color = null,
      followup_flagged_at = null
    WHERE id = NEW.conversation_id
      AND needs_followup = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger se já existir para evitar duplicidade
DROP TRIGGER IF EXISTS tr_clear_followup_on_message ON public.whatsapp_messages;

-- Ativar o trigger após a inserção de qualquer mensagem enviada
CREATE TRIGGER tr_clear_followup_on_message
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_outbound_message_followup();

COMMIT;
