-- Adicionar campos whatsapp e ativo à tabela profiles
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Atualizar usuários existentes para ativo
UPDATE profiles SET ativo = TRUE WHERE ativo IS NULL;

-- Criar índice para melhorar performance de consultas por status
CREATE INDEX IF NOT EXISTS idx_profiles_ativo ON profiles(ativo);