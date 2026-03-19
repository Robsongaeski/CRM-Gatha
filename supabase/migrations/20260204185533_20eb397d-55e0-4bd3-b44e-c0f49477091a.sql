-- Adicionar permissão que faltava para visualizar todos
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES 
  ('grades_prova.visualizar_todos', 'grades_prova', 'visualizar_todos', 'Visualizar grades de prova de todos os vendedores', 'Vendas'),
  ('grades_prova.editar_todos', 'grades_prova', 'editar_todos', 'Editar/dar baixa em grades de todos os vendedores', 'Vendas')
ON CONFLICT (id) DO NOTHING;

-- Dar permissões de visualizar_todos e devolver para todos os vendedores
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM system_profiles sp
CROSS JOIN permissions p
WHERE sp.codigo = 'vendedor' 
AND p.id IN ('grades_prova.visualizar', 'grades_prova.visualizar_todos', 'grades_prova.criar', 'grades_prova.devolver')
ON CONFLICT DO NOTHING;

-- Dar todas as permissões de grades_prova para admin
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM system_profiles sp
CROSS JOIN permissions p
WHERE sp.codigo = 'admin' 
AND p.id LIKE 'grades_prova.%'
ON CONFLICT DO NOTHING;

-- Dar permissões para atendente
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM system_profiles sp
CROSS JOIN permissions p
WHERE sp.codigo = 'atendente' 
AND p.id IN ('grades_prova.visualizar', 'grades_prova.visualizar_todos', 'grades_prova.criar', 'grades_prova.devolver', 'grades_prova.editar_todos')
ON CONFLICT DO NOTHING;