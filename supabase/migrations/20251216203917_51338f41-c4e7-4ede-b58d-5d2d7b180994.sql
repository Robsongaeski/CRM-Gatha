-- Restaurar perfil de admin para robsongaeski@gmail.com
INSERT INTO user_profiles (user_id, profile_id)
VALUES (
  '820213f9-f01e-4b3d-99df-7e44d682a67f',
  '1316f565-c0c5-421a-80fc-7f7f9532eec8'
)
ON CONFLICT (user_id, profile_id) DO NOTHING;

-- Adicionar perfil de vendedor também
INSERT INTO user_profiles (user_id, profile_id)
VALUES (
  '820213f9-f01e-4b3d-99df-7e44d682a67f',
  '9d648031-1ec7-4bcb-8283-0a4b4d5632bd'
)
ON CONFLICT (user_id, profile_id) DO NOTHING;