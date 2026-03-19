
-- Adicionar role admin na tabela user_roles para o usuário master
INSERT INTO user_roles (user_id, role)
VALUES ('820213f9-f01e-4b3d-99df-7e44d682a67f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
