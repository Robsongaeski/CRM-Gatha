-- =====================================================
-- ADICIONAR NOVAS PERMISSÕES GRANULARES AO SISTEMA RBAC
-- =====================================================
-- Este script adiciona APENAS a permissão 'propostas.editar_todas'
-- e garante que perfis admin têm 'produtos.gerenciar_faixas'

-- 1. Adicionar APENAS a permissão que NÃO existe
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('propostas.editar_todas', 'propostas', 'editar_todas', 'Editar propostas de outros vendedores', 'Vendas')
ON CONFLICT (id) DO NOTHING;

-- 2. Adicionar permissão ao perfil Administrador
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'propostas.editar_todas'
FROM public.system_profiles sp
WHERE sp.codigo IN ('admin', 'administrador')
ON CONFLICT DO NOTHING;

-- 3. Adicionar permissão ao perfil Vendedor
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'propostas.editar_todas'
FROM public.system_profiles sp
WHERE sp.codigo = 'vendedor'
ON CONFLICT DO NOTHING;

-- 4. Garantir que perfis admin têm a permissão de gerenciar faixas (que já existe)
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'produtos.gerenciar_faixas'
FROM public.system_profiles sp
WHERE sp.codigo IN ('admin', 'administrador')
ON CONFLICT DO NOTHING;

-- 5. Verificar permissões
SELECT id, descricao, categoria
FROM public.permissions
WHERE id IN ('propostas.editar_todas', 'produtos.gerenciar_faixas', 'pedidos.adicionar_observacao')
ORDER BY categoria, id;
