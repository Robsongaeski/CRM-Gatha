
-- Restaurar acesso admin para o usuário master
INSERT INTO user_profiles (user_id, profile_id)
SELECT 
  '820213f9-f01e-4b3d-99df-7e44d682a67f',
  '1316f565-c0c5-421a-80fc-7f7f9532eec8'
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE user_id = '820213f9-f01e-4b3d-99df-7e44d682a67f' 
  AND profile_id = '1316f565-c0c5-421a-80fc-7f7f9532eec8'
);
