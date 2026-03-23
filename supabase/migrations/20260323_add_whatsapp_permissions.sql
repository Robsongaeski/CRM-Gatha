-- Adicionar permissões específicas para WhatsApp
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES 
  ('whatsapp.instancias.gerenciar', 'whatsapp', 'instancias_gerenciar', 'Configurar e gerenciar instâncias do WhatsApp (Conectar, Reiniciar, Excluir)', 'WhatsApp'),
  ('whatsapp.respostas_rapidas.gerenciar', 'whatsapp', 'respostas_rapidas_gerenciar', 'Criar, editar e excluir respostas rápidas do WhatsApp', 'WhatsApp')
ON CONFLICT (id) DO UPDATE SET 
  descricao = EXCLUDED.descricao,
  categoria = EXCLUDED.categoria,
  modulo = EXCLUDED.modulo,
  acao = EXCLUDED.acao;

-- Garantir que o perfil Admin tenha essas novas permissões
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM system_profiles sp
CROSS JOIN permissions p
WHERE sp.codigo = 'admin' 
AND p.id IN ('whatsapp.instancias.gerenciar', 'whatsapp.respostas_rapidas.gerenciar')
ON CONFLICT DO NOTHING;
