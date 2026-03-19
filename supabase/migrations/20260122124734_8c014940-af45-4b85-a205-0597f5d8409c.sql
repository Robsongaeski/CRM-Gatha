-- =====================================================
-- TABELA DE CARRINHOS ABANDONADOS E PERMISSÕES
-- =====================================================

-- 1. Criar tabela de carrinhos abandonados
CREATE TABLE public.abandoned_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT NOT NULL,
  store_id UUID REFERENCES public.ecommerce_stores(id),
  store_code TEXT NOT NULL,
  
  -- Dados do cliente
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  customer_document TEXT,
  
  -- Dados do carrinho
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  recovery_url TEXT,
  
  -- Controle
  status TEXT NOT NULL DEFAULT 'abandoned',
  recovered_order_id UUID REFERENCES public.orders(id),
  abandoned_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Evitar duplicatas
  CONSTRAINT abandoned_carts_external_store_unique UNIQUE(external_id, store_code),
  CONSTRAINT abandoned_carts_status_check CHECK (status IN ('abandoned', 'recovered', 'expired'))
);

-- 2. Índices para performance
CREATE INDEX idx_abandoned_carts_email ON public.abandoned_carts(customer_email);
CREATE INDEX idx_abandoned_carts_phone ON public.abandoned_carts(customer_phone);
CREATE INDEX idx_abandoned_carts_status ON public.abandoned_carts(status);
CREATE INDEX idx_abandoned_carts_store ON public.abandoned_carts(store_code);
CREATE INDEX idx_abandoned_carts_abandoned_at ON public.abandoned_carts(abandoned_at DESC);

-- 3. Habilitar RLS
ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS
CREATE POLICY "Usuários autenticados podem visualizar carrinhos abandonados"
ON public.abandoned_carts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role pode inserir carrinhos abandonados"
ON public.abandoned_carts
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service role pode atualizar carrinhos abandonados"
ON public.abandoned_carts
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Trigger para atualizar updated_at
CREATE TRIGGER update_abandoned_carts_updated_at
BEFORE UPDATE ON public.abandoned_carts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Adicionar novas permissões RBAC
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('ecommerce.carrinhos.visualizar', 'ecommerce', 'visualizar', 'Visualizar carrinhos abandonados', 'Ecommerce'),
  ('ecommerce.carrinhos.gerenciar', 'ecommerce', 'gerenciar', 'Gerenciar carrinhos abandonados', 'Ecommerce')
ON CONFLICT (id) DO NOTHING;

-- 7. Atribuir permissões ao perfil Admin
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo IN ('admin', 'administrador')
AND p.id IN ('ecommerce.carrinhos.visualizar', 'ecommerce.carrinhos.gerenciar')
ON CONFLICT DO NOTHING;

-- 8. Atribuir permissões ao perfil Atendente (se existir)
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'ecommerce.carrinhos.visualizar'
FROM public.system_profiles sp
WHERE sp.codigo = 'atendente'
ON CONFLICT DO NOTHING;