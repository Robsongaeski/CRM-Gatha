-- Historico de versoes para fluxos de automacao

CREATE TABLE IF NOT EXISTS public.automation_workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_workflow_versions_unique_version
  ON public.automation_workflow_versions (workflow_id, version_number);

CREATE INDEX IF NOT EXISTS idx_automation_workflow_versions_workflow_created
  ON public.automation_workflow_versions (workflow_id, created_at DESC);

ALTER TABLE public.automation_workflow_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "automation_workflow_versions_select" ON public.automation_workflow_versions;
CREATE POLICY "automation_workflow_versions_select"
  ON public.automation_workflow_versions
  FOR SELECT
  USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.visualizar')
  );

DROP POLICY IF EXISTS "automation_workflow_versions_insert" ON public.automation_workflow_versions;
CREATE POLICY "automation_workflow_versions_insert"
  ON public.automation_workflow_versions
  FOR INSERT
  WITH CHECK (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.criar')
  );

CREATE OR REPLACE FUNCTION public.automation_workflow_snapshot_payload(p_workflow public.automation_workflows)
RETURNS JSONB
LANGUAGE SQL
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', p_workflow.id,
    'nome', p_workflow.nome,
    'descricao', p_workflow.descricao,
    'tipo', p_workflow.tipo::text,
    'ativo', p_workflow.ativo,
    'flow_data', COALESCE(p_workflow.flow_data, '{"nodes":[],"edges":[]}'::jsonb),
    'trigger_config', COALESCE(p_workflow.trigger_config, '{}'::jsonb),
    'updated_at', p_workflow.updated_at
  );
$$;

CREATE OR REPLACE FUNCTION public.automation_workflow_versions_after_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.automation_workflow_versions (
    workflow_id,
    version_number,
    snapshot,
    created_by,
    created_at
  ) VALUES (
    NEW.id,
    1,
    public.automation_workflow_snapshot_payload(NEW),
    COALESCE(NEW.created_by, auth.uid()),
    COALESCE(NEW.created_at, now())
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.automation_workflow_versions_before_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_next_version INTEGER;
BEGIN
  IF NEW.nome IS NOT DISTINCT FROM OLD.nome
    AND NEW.descricao IS NOT DISTINCT FROM OLD.descricao
    AND NEW.tipo IS NOT DISTINCT FROM OLD.tipo
    AND NEW.ativo IS NOT DISTINCT FROM OLD.ativo
    AND NEW.flow_data IS NOT DISTINCT FROM OLD.flow_data
    AND NEW.trigger_config IS NOT DISTINCT FROM OLD.trigger_config THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
  FROM public.automation_workflow_versions
  WHERE workflow_id = OLD.id;

  INSERT INTO public.automation_workflow_versions (
    workflow_id,
    version_number,
    snapshot,
    created_by
  ) VALUES (
    OLD.id,
    v_next_version,
    public.automation_workflow_snapshot_payload(OLD),
    COALESCE(auth.uid(), NEW.created_by, OLD.created_by)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS automation_workflow_versions_after_insert ON public.automation_workflows;
CREATE TRIGGER automation_workflow_versions_after_insert
  AFTER INSERT ON public.automation_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.automation_workflow_versions_after_insert();

DROP TRIGGER IF EXISTS automation_workflow_versions_before_update ON public.automation_workflows;
CREATE TRIGGER automation_workflow_versions_before_update
  BEFORE UPDATE ON public.automation_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.automation_workflow_versions_before_update();

INSERT INTO public.automation_workflow_versions (
  workflow_id,
  version_number,
  snapshot,
  created_by,
  created_at
)
SELECT
  wf.id,
  1,
  public.automation_workflow_snapshot_payload(wf),
  wf.created_by,
  COALESCE(wf.updated_at, wf.created_at, now())
FROM public.automation_workflows wf
WHERE NOT EXISTS (
  SELECT 1
  FROM public.automation_workflow_versions v
  WHERE v.workflow_id = wf.id
);

CREATE OR REPLACE FUNCTION public.automation_restore_workflow_version(
  p_workflow_id UUID,
  p_version_id UUID
)
RETURNS public.automation_workflows
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_snapshot JSONB;
  v_restored public.automation_workflows;
BEGIN
  SELECT snapshot
    INTO v_snapshot
  FROM public.automation_workflow_versions
  WHERE id = p_version_id
    AND workflow_id = p_workflow_id;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Versao de fluxo nao encontrada';
  END IF;

  UPDATE public.automation_workflows w
  SET
    nome = COALESCE(NULLIF(v_snapshot ->> 'nome', ''), w.nome),
    descricao = CASE
      WHEN v_snapshot ? 'descricao' THEN v_snapshot ->> 'descricao'
      ELSE w.descricao
    END,
    tipo = COALESCE((v_snapshot ->> 'tipo')::public.automation_workflow_type, w.tipo),
    ativo = COALESCE((v_snapshot ->> 'ativo')::boolean, w.ativo),
    flow_data = COALESCE(v_snapshot -> 'flow_data', w.flow_data),
    trigger_config = COALESCE(v_snapshot -> 'trigger_config', w.trigger_config),
    updated_at = now()
  WHERE w.id = p_workflow_id
  RETURNING w.* INTO v_restored;

  IF v_restored.id IS NULL THEN
    RAISE EXCEPTION 'Fluxo nao encontrado para restauracao';
  END IF;

  RETURN v_restored;
END;
$$;

GRANT EXECUTE ON FUNCTION public.automation_restore_workflow_version(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.automation_restore_workflow_version(UUID, UUID) TO service_role;

COMMENT ON TABLE public.automation_workflow_versions IS
  'Historico de snapshots dos fluxos para permitir restauracao de versoes.';
