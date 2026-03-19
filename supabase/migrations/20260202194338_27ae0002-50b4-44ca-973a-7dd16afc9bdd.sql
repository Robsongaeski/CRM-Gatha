-- Adicionar campo ativo para soft delete
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Novas permissões para gestão de leads
INSERT INTO permissions (id, modulo, acao, categoria, descricao) VALUES
('leads.atribuir', 'leads', 'atribuir', 'Prospecção', 'Atribuir leads a vendedores'),
('leads.desativar', 'leads', 'desativar', 'Prospecção', 'Desativar/reativar leads'),
('leads.excluir_lote', 'leads', 'excluir_lote', 'Prospecção', 'Excluir leads em lote')
ON CONFLICT (id) DO NOTHING;

-- Adicionar permissões ao perfil admin
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM system_profiles sp
CROSS JOIN permissions p
WHERE sp.codigo IN ('admin', 'administrador')
  AND p.id IN ('leads.atribuir', 'leads.desativar', 'leads.excluir_lote')
ON CONFLICT DO NOTHING;

-- Adicionar permissão de atribuir ao perfil vendedor (coordenador de vendas)
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, 'leads.atribuir'
FROM system_profiles sp
WHERE sp.codigo = 'vendedor'
ON CONFLICT DO NOTHING;