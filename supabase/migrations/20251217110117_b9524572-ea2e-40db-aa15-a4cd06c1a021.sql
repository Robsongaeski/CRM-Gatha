-- Permissões faltando para controle completo de acesso via perfis

-- Permissão para módulo Atendimento
INSERT INTO permissions (id, modulo, acao, descricao, categoria) 
VALUES ('atendimento.entrega_pedidos', 'atendimento', 'entrega_pedidos', 'Visualizar e registrar entrega de pedidos', 'Atendimento')
ON CONFLICT (id) DO NOTHING;

-- Permissões para Grades de Tamanho (Admin)
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
('admin.grades.visualizar', 'admin', 'grades_visualizar', 'Visualizar grades de tamanho', 'Administração'),
('admin.grades.gerenciar', 'admin', 'grades_gerenciar', 'Criar e editar grades de tamanho', 'Administração')
ON CONFLICT (id) DO NOTHING;

-- Permissão para dashboard PCP (se não existir)
INSERT INTO permissions (id, modulo, acao, descricao, categoria)
VALUES ('pcp.dashboard', 'pcp', 'dashboard', 'Visualizar dashboard do PCP', 'PCP')
ON CONFLICT (id) DO NOTHING;