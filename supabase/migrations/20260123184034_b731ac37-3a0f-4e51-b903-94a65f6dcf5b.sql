-- Tabela para atalhos rápidos personalizados por usuário
CREATE TABLE public.user_quick_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, url)
);

-- Índice para performance
CREATE INDEX idx_user_quick_access_user_id ON public.user_quick_access(user_id);

-- Habilitar RLS
ALTER TABLE public.user_quick_access ENABLE ROW LEVEL SECURITY;

-- Política: usuário só pode ver/gerenciar seus próprios atalhos
CREATE POLICY "Users can view own shortcuts"
ON public.user_quick_access
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shortcuts"
ON public.user_quick_access
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shortcuts"
ON public.user_quick_access
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shortcuts"
ON public.user_quick_access
FOR DELETE
USING (auth.uid() = user_id);