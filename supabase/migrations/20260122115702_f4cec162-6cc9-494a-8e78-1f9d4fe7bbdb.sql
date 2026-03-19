-- =====================================================
-- SUPORTE MULTI-LOJA PARA E-COMMERCE
-- =====================================================

-- 1. Criar tabela de lojas e-commerce
CREATE TABLE IF NOT EXISTS public.ecommerce_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,           -- 'update', 'cloze'
  nome TEXT NOT NULL,                     -- 'Update', 'Cloze'
  plataforma TEXT DEFAULT 'wbuy',         -- Para futuras integrações
  cor TEXT DEFAULT '#3B82F6',             -- Cor para identificação visual
  icone TEXT,                             -- Ícone opcional
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adicionar colunas na tabela orders para identificar a loja
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.ecommerce_stores(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_code TEXT;

-- 3. Inserir lojas iniciais
INSERT INTO public.ecommerce_stores (codigo, nome, cor) VALUES
  ('update', 'Update', '#3B82F6'),
  ('cloze', 'Cloze', '#10B981')
ON CONFLICT (codigo) DO NOTHING;

-- 4. Atualizar pedidos existentes como vindos da loja Update
UPDATE public.orders 
SET store_code = 'update', 
    store_id = (SELECT id FROM public.ecommerce_stores WHERE codigo = 'update')
WHERE store_code IS NULL;

-- 5. Habilitar RLS na tabela ecommerce_stores
ALTER TABLE public.ecommerce_stores ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para ecommerce_stores
CREATE POLICY "Usuários autenticados podem visualizar lojas ativas"
ON public.ecommerce_stores
FOR SELECT
TO authenticated
USING (ativo = true);

CREATE POLICY "Admins podem gerenciar lojas"
ON public.ecommerce_stores
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    JOIN public.system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = auth.uid() AND sp.codigo = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    JOIN public.system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = auth.uid() AND sp.codigo = 'admin'
  )
);

-- 7. Adicionar permissões RBAC para gerenciamento de lojas
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('ecommerce.lojas.visualizar', 'ecommerce', 'lojas_visualizar', 'Visualizar lojas e-commerce e webhooks', 'Ecommerce'),
  ('ecommerce.lojas.gerenciar', 'ecommerce', 'lojas_gerenciar', 'Gerenciar lojas e-commerce (criar, editar, desativar)', 'Ecommerce')
ON CONFLICT (id) DO NOTHING;

-- 8. Atribuir permissões ao perfil Admin
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo IN ('admin', 'administrador')
AND p.id IN ('ecommerce.lojas.visualizar', 'ecommerce.lojas.gerenciar')
ON CONFLICT DO NOTHING;

-- 9. Criar índice para busca por store_code
CREATE INDEX IF NOT EXISTS idx_orders_store_code ON public.orders(store_code);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);

-- 10. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_ecommerce_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ecommerce_stores_updated_at ON public.ecommerce_stores;
CREATE TRIGGER update_ecommerce_stores_updated_at
  BEFORE UPDATE ON public.ecommerce_stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ecommerce_stores_updated_at();