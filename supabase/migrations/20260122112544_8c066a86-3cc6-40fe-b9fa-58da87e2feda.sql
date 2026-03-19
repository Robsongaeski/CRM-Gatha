-- Adicionar permissões para Grades de Tamanho
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('grades_tamanho.visualizar', 'grades_tamanho', 'visualizar', 'Visualizar grades de tamanho', 'Cadastros'),
  ('grades_tamanho.criar', 'grades_tamanho', 'criar', 'Criar grades de tamanho', 'Cadastros'),
  ('grades_tamanho.editar', 'grades_tamanho', 'editar', 'Editar grades de tamanho', 'Cadastros'),
  ('grades_tamanho.excluir', 'grades_tamanho', 'excluir', 'Excluir grades de tamanho', 'Cadastros')
ON CONFLICT (id) DO NOTHING;

-- Atribuir permissões de Produtos ao perfil Vendedor
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT 
  (SELECT id FROM public.system_profiles WHERE codigo = 'vendedor'),
  id
FROM public.permissions
WHERE id IN (
  'produtos.visualizar',
  'segmentos.visualizar',
  'grades_tamanho.visualizar'
)
ON CONFLICT (profile_id, permission_id) DO NOTHING;

-- Admin já tem todas as permissões (incluindo criar/editar/excluir)