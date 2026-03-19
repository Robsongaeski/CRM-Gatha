-- Adicionar campo de imagem de referência do cliente na proposta
ALTER TABLE propostas 
ADD COLUMN IF NOT EXISTS imagem_referencia_url text;

-- Comentário explicativo
COMMENT ON COLUMN propostas.imagem_referencia_url IS 'URL da imagem de referência enviada pelo cliente para criação da arte';