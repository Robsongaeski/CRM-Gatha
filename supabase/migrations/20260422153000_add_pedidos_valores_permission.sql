INSERT INTO public.permissions (id, modulo, acao, descricao, categoria)
VALUES (
  'pedidos.valores.visualizar',
  'pedidos',
  'valores.visualizar',
  'Visualizar valores e resumos financeiros dos pedidos',
  'Pedidos'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'pedidos.valores.visualizar'
FROM public.system_profiles sp
WHERE sp.codigo IN ('admin', 'gerente', 'vendedor')
  AND NOT EXISTS (
    SELECT 1
    FROM public.profile_permissions pp
    WHERE pp.profile_id = sp.id
      AND pp.permission_id = 'pedidos.valores.visualizar'
  );
