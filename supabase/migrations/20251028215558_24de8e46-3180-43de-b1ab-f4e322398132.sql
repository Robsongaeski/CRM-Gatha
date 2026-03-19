-- Adicionar role de admin para o usuário robsongaeski@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('820213f9-f01e-4b3d-99df-7e44d682a67f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;