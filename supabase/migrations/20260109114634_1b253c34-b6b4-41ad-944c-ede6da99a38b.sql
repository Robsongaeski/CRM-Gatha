-- Adicionar coluna para guardar quem finalizou o atendimento
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS finished_by uuid REFERENCES public.profiles(id);

-- Trigger para remover atribuição quando cliente envia msg após finalizado
CREATE OR REPLACE FUNCTION public.whatsapp_reopen_conversation()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a mensagem não é do atendente (from_me = false)
  IF NEW.from_me = false THEN
    -- Verificar se a conversa está finalizada
    UPDATE public.whatsapp_conversations
    SET 
      status = 'pending',
      assigned_to = NULL,
      finished_by = NULL
    WHERE id = NEW.conversation_id
      AND status = 'finished';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trg_whatsapp_reopen_conversation ON public.whatsapp_messages;

-- Criar trigger
CREATE TRIGGER trg_whatsapp_reopen_conversation
AFTER INSERT ON public.whatsapp_messages
FOR EACH ROW
EXECUTE FUNCTION public.whatsapp_reopen_conversation();