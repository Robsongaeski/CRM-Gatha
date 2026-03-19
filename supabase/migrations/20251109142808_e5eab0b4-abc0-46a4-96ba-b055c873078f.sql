-- ============================================================================
-- TABELA: notificacoes
-- Descrição: Armazena notificações in-app para os usuários do sistema
-- ============================================================================

-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- tipo de notificação: 'retorno_lead', 'pedido_aprovado', etc
  mensagem TEXT NOT NULL, -- mensagem da notificação
  link TEXT, -- link opcional para onde a notificação deve levar o usuário
  lida BOOLEAN NOT NULL DEFAULT false, -- se a notificação foi lida
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Comentários descritivos
COMMENT ON TABLE public.notificacoes IS 'Armazena notificações in-app para os usuários';
COMMENT ON COLUMN public.notificacoes.tipo IS 'Tipo da notificação (ex: retorno_lead, pedido_aprovado)';
COMMENT ON COLUMN public.notificacoes.mensagem IS 'Texto da mensagem exibida ao usuário';
COMMENT ON COLUMN public.notificacoes.link IS 'URL opcional para navegação ao clicar na notificação';
COMMENT ON COLUMN public.notificacoes.lida IS 'Indica se a notificação foi marcada como lida';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_id ON public.notificacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida ON public.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notificacoes_created_at ON public.notificacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notificacoes_user_lida ON public.notificacoes(user_id, lida);

-- ============================================================================
-- RLS POLICIES: notificacoes
-- ============================================================================

-- Ativar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver apenas suas próprias notificações
CREATE POLICY "Usuários veem suas notificações"
  ON public.notificacoes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Sistema pode criar notificações
CREATE POLICY "Sistema pode criar notificações"
  ON public.notificacoes
  FOR INSERT
  WITH CHECK (true);

-- Policy: Usuários podem atualizar suas próprias notificações (marcar como lida)
CREATE POLICY "Usuários atualizam suas notificações"
  ON public.notificacoes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Apenas admins podem deletar notificações
CREATE POLICY "Admins podem deletar notificações"
  ON public.notificacoes
  FOR DELETE
  USING (is_admin(auth.uid()));

-- ============================================================================
-- TRIGGER: Atualizar updated_at
-- ============================================================================

CREATE TRIGGER update_notificacoes_updated_at
  BEFORE UPDATE ON public.notificacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();