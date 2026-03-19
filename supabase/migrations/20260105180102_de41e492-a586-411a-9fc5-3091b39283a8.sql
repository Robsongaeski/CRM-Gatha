-- Adicionar permissões do módulo E-commerce
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
  -- Dashboard E-commerce
  ('ecommerce.dashboard.visualizar', 'ecommerce', 'dashboard.visualizar', 'Visualizar dashboard do E-commerce', 'E-commerce'),
  
  -- Pedidos E-commerce (da WBuy)
  ('ecommerce.pedidos.visualizar', 'ecommerce', 'pedidos.visualizar', 'Visualizar pedidos do e-commerce', 'E-commerce'),
  
  -- Envios
  ('ecommerce.envios.visualizar', 'ecommerce', 'envios.visualizar', 'Visualizar envios e despachos', 'E-commerce'),
  ('ecommerce.envios.despachar', 'ecommerce', 'envios.despachar', 'Registrar despacho de pedidos', 'E-commerce'),
  ('ecommerce.envios.relatorios', 'ecommerce', 'envios.relatorios', 'Visualizar relatórios de envios', 'E-commerce'),
  
  -- Suporte (Trocas, Devoluções, Extravios, Problemas)
  ('ecommerce.suporte.visualizar', 'ecommerce', 'suporte.visualizar', 'Visualizar dashboard de suporte', 'E-commerce'),
  ('ecommerce.suporte.trocas', 'ecommerce', 'suporte.trocas', 'Gerenciar trocas de produtos', 'E-commerce'),
  ('ecommerce.suporte.devolucoes', 'ecommerce', 'suporte.devolucoes', 'Gerenciar devoluções de produtos', 'E-commerce'),
  ('ecommerce.suporte.extravios', 'ecommerce', 'suporte.extravios', 'Gerenciar extravios e roubos', 'E-commerce'),
  ('ecommerce.suporte.problemas', 'ecommerce', 'suporte.problemas', 'Gerenciar problemas de pedidos', 'E-commerce'),
  ('ecommerce.suporte.motivos', 'ecommerce', 'suporte.motivos', 'Configurar motivos de troca/devolução', 'E-commerce'),
  ('ecommerce.suporte.relatorios', 'ecommerce', 'suporte.relatorios', 'Visualizar relatórios de suporte', 'E-commerce')
ON CONFLICT (id) DO NOTHING;

-- Atribuir permissões de E-commerce ao perfil Admin
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM system_profiles sp
CROSS JOIN permissions p
WHERE sp.codigo = 'admin'
  AND p.modulo = 'ecommerce'
  AND NOT EXISTS (
    SELECT 1 FROM profile_permissions pp 
    WHERE pp.profile_id = sp.id AND pp.permission_id = p.id
  );

-- Atribuir permissões de E-commerce ao perfil Atendente (suporte e envios)
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM system_profiles sp
CROSS JOIN permissions p
WHERE sp.codigo = 'atendente'
  AND p.id IN (
    'ecommerce.dashboard.visualizar',
    'ecommerce.pedidos.visualizar',
    'ecommerce.envios.visualizar',
    'ecommerce.envios.despachar',
    'ecommerce.envios.relatorios',
    'ecommerce.suporte.visualizar',
    'ecommerce.suporte.trocas',
    'ecommerce.suporte.devolucoes',
    'ecommerce.suporte.extravios',
    'ecommerce.suporte.problemas',
    'ecommerce.suporte.relatorios'
  )
  AND NOT EXISTS (
    SELECT 1 FROM profile_permissions pp 
    WHERE pp.profile_id = sp.id AND pp.permission_id = p.id
  );