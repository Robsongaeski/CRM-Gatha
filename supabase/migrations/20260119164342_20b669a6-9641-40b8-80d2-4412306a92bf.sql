-- Adicionar permissões de Grades para Prova ao perfil Vendedor
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM system_profiles sp
CROSS JOIN (
  SELECT id FROM permissions WHERE id IN (
    'grades_prova.visualizar',
    'grades_prova.criar',
    'grades_prova.devolver'
  )
) p
WHERE sp.codigo = 'vendedor'
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Também adicionar ao perfil Admin (garantia)
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM system_profiles sp
CROSS JOIN (
  SELECT id FROM permissions WHERE id IN (
    'grades_prova.visualizar',
    'grades_prova.criar',
    'grades_prova.devolver',
    'grades_prova.excluir'
  )
) p
WHERE sp.codigo IN ('admin', 'administrador')
ON CONFLICT (profile_id, permission_id) DO NOTHING;