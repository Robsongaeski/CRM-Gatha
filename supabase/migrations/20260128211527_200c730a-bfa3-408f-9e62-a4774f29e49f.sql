-- =====================================================
-- ADICIONAR PERMISSÕES WHATSAPP COMO MÓDULO INDEPENDENTE
-- =====================================================
-- Este script cria permissões específicas do módulo WhatsApp
-- separadas do E-commerce para acesso multi-departamental

-- 1. Inserir novas permissões do módulo WhatsApp
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('whatsapp.visualizar', 'whatsapp', 'visualizar', 'Acesso básico ao módulo WhatsApp', 'WhatsApp'),
  ('whatsapp.atender', 'whatsapp', 'atender', 'Atender conversas via WhatsApp', 'WhatsApp'),
  ('whatsapp.dashboard', 'whatsapp', 'dashboard', 'Visualizar métricas e relatórios do WhatsApp', 'WhatsApp'),
  ('whatsapp.configurar', 'whatsapp', 'configurar', 'Gerenciar instâncias e configurações do WhatsApp', 'WhatsApp')
ON CONFLICT (id) DO NOTHING;

-- 2. Atribuir TODAS as permissões ao perfil Administrador
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN (
  SELECT 'whatsapp.visualizar' as id UNION ALL
  SELECT 'whatsapp.atender' UNION ALL
  SELECT 'whatsapp.dashboard' UNION ALL
  SELECT 'whatsapp.configurar'
) p
WHERE sp.codigo IN ('admin', 'administrador')
ON CONFLICT DO NOTHING;

-- 3. Atribuir permissões relevantes ao perfil Atendente (todas menos configurar)
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN (
  SELECT 'whatsapp.visualizar' as id UNION ALL
  SELECT 'whatsapp.atender' UNION ALL
  SELECT 'whatsapp.dashboard'
) p
WHERE sp.codigo = 'atendente'
ON CONFLICT DO NOTHING;

-- 4. Atribuir permissões relevantes ao perfil E-commerce (todas)
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN (
  SELECT 'whatsapp.visualizar' as id UNION ALL
  SELECT 'whatsapp.atender' UNION ALL
  SELECT 'whatsapp.dashboard' UNION ALL
  SELECT 'whatsapp.configurar'
) p
WHERE sp.codigo = 'ecommerce'
ON CONFLICT DO NOTHING;

-- 5. Verificar permissões criadas
SELECT id, descricao, categoria
FROM public.permissions
WHERE modulo = 'whatsapp'
ORDER BY id;