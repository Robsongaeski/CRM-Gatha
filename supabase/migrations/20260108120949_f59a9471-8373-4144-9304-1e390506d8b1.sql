-- Adicionar campo mostrar_botao para controlar quais respostas aparecem nos botões de acesso rápido
ALTER TABLE whatsapp_quick_replies ADD COLUMN mostrar_botao boolean NOT NULL DEFAULT true;

-- Comentário para documentar o campo
COMMENT ON COLUMN whatsapp_quick_replies.mostrar_botao IS 'Define se a resposta aparece nos botões de acesso rápido na tela de atendimento';