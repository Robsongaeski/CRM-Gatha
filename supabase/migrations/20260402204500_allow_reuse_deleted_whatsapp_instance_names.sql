-- Permitir recriar instancia com mesmo nome apos exclusao logica (is_active=false).
-- Antes: UNIQUE global em instance_name bloqueava reutilizacao.
-- Agora: unicidade apenas entre registros ativos.

ALTER TABLE public.whatsapp_instances
  DROP CONSTRAINT IF EXISTS whatsapp_instances_instance_name_key;

DROP INDEX IF EXISTS public.whatsapp_instances_instance_name_active_key;

CREATE UNIQUE INDEX whatsapp_instances_instance_name_active_key
  ON public.whatsapp_instances (instance_name)
  WHERE is_active = true;