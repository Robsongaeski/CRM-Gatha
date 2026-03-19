-- Adicionar campo ultima_interacao e lembrete_inatividade_enviado na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ultima_interacao TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lembrete_inatividade_enviado BOOLEAN DEFAULT FALSE;

-- Comentários explicativos
COMMENT ON COLUMN leads.ultima_interacao IS 'Data/hora da última interação registrada com este lead';
COMMENT ON COLUMN leads.lembrete_inatividade_enviado IS 'Flag indicando se o lembrete de 20 dias sem contato foi enviado';