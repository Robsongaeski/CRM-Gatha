-- =====================================================
-- WHATSAPP MULTI-DEPARTAMENTO: RLS + PERMISSÃO
-- =====================================================

-- 1. Nova permissão para gerenciar instâncias (criar/excluir)
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('whatsapp.instancias.gerenciar', 'whatsapp', 'instancias.gerenciar', 'Criar, excluir e configurar API das instâncias WhatsApp', 'WhatsApp')
ON CONFLICT (id) DO NOTHING;

-- 2. Atribuir nova permissão ao perfil admin
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, 'whatsapp.instancias.gerenciar'
FROM public.system_profiles sp
WHERE sp.codigo IN ('admin', 'administrador')
ON CONFLICT DO NOTHING;

-- 3. Atualizar RLS de whatsapp_quick_replies para filtrar por created_by
-- Primeiro, remover policies antigas
DROP POLICY IF EXISTS "whatsapp_quick_replies_select" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "whatsapp_quick_replies_all" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "quick_replies_select_own" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "quick_replies_insert_own" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "quick_replies_update_own" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "quick_replies_delete_own" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "Usuários podem ler respostas rápidas" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "Usuários podem criar respostas rápidas" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "Usuários podem editar respostas rápidas" ON public.whatsapp_quick_replies;
DROP POLICY IF EXISTS "Usuários podem deletar respostas rápidas" ON public.whatsapp_quick_replies;

-- Garantir que RLS está habilitado
ALTER TABLE public.whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;

-- SELECT: Ver apenas próprias OU admin vê todas
CREATE POLICY "quick_replies_select_own" ON public.whatsapp_quick_replies
  FOR SELECT USING (
    created_by = auth.uid() 
    OR is_admin(auth.uid())
  );

-- INSERT: Sempre com created_by do próprio usuário
CREATE POLICY "quick_replies_insert_own" ON public.whatsapp_quick_replies
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

-- UPDATE: Apenas próprias OU admin
CREATE POLICY "quick_replies_update_own" ON public.whatsapp_quick_replies
  FOR UPDATE USING (
    created_by = auth.uid() 
    OR is_admin(auth.uid())
  );

-- DELETE: Apenas próprias OU admin
CREATE POLICY "quick_replies_delete_own" ON public.whatsapp_quick_replies
  FOR DELETE USING (
    created_by = auth.uid() 
    OR is_admin(auth.uid())
  );

-- 4. Verificar permissões criadas
SELECT id, descricao, categoria FROM public.permissions WHERE id = 'whatsapp.instancias.gerenciar';