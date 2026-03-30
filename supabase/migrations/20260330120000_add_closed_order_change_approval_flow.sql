-- Fluxo de alteracoes de pedidos fechados com aprovacao
-- Inclui: nova tabela de solicitacoes, RPC de aprovacao/rejeicao,
-- ajuste de aliases de permissao e hardening de is_admin.

-- 1) Reforcar verificacao de admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_profiles up
      JOIN public.system_profiles sp ON sp.id = up.profile_id
      WHERE up.user_id = _user_id
        AND sp.codigo = 'admin'
        AND sp.ativo = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _user_id
        AND lower(p.email) = 'robsongaeski@gmail.com'
    );
$$;

-- 2) Aliases de permissao para evitar inconsistencias entre frontend e RLS
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission_id text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
    WHERE up.user_id = _user_id
      AND (
        pp.permission_id = _permission_id
        OR (_permission_id = 'propostas.editar_todos' AND pp.permission_id = 'propostas.editar_todas')
        OR (_permission_id = 'propostas.editar_todas' AND pp.permission_id = 'propostas.editar_todos')
        OR (_permission_id = 'propostas.editar' AND pp.permission_id IN ('propostas.editar_todos', 'propostas.editar_todas'))
        OR (_permission_id IN ('propostas.editar_todos', 'propostas.editar_todas') AND pp.permission_id = 'propostas.editar')
        OR (_permission_id = 'pedidos.editar' AND pp.permission_id = 'pedidos.editar_todos')
        OR (_permission_id = 'pedidos.editar_todos' AND pp.permission_id = 'pedidos.editar')
        OR (_permission_id = 'pedidos.visualizar' AND pp.permission_id = 'pedidos.visualizar_todos')
        OR (_permission_id = 'pedidos.visualizar_todos' AND pp.permission_id = 'pedidos.visualizar')
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(permission_id text, permission_code text, permission_description text, category text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base_permissions AS (
    SELECT DISTINCT
      p.id AS permission_id,
      p.id AS permission_code,
      p.descricao AS permission_description,
      p.categoria AS category
    FROM public.user_profiles up
    JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
    JOIN public.permissions p ON pp.permission_id = p.id
    WHERE up.user_id = _user_id
  ),
  aliases AS (
    -- Alias legado de propostas
    SELECT
      bp.permission_id AS permission_id,
      'propostas.editar_todos'::text AS permission_code,
      bp.permission_description AS permission_description,
      bp.category AS category
    FROM base_permissions bp
    WHERE bp.permission_code = 'propostas.editar_todas'

    UNION

    -- Quem tem editar_todos/todas tambem deve passar no check de propostas.editar
    SELECT
      bp.permission_id AS permission_id,
      'propostas.editar'::text AS permission_code,
      bp.permission_description AS permission_description,
      bp.category AS category
    FROM base_permissions bp
    WHERE bp.permission_code IN ('propostas.editar_todos', 'propostas.editar_todas')

    UNION

    -- Compatibilidade entre pedidos.editar_todos e pedidos.editar
    SELECT
      bp.permission_id AS permission_id,
      'pedidos.editar'::text AS permission_code,
      bp.permission_description AS permission_description,
      bp.category AS category
    FROM base_permissions bp
    WHERE bp.permission_code = 'pedidos.editar_todos'

    UNION

    -- Compatibilidade entre pedidos.visualizar_todos e pedidos.visualizar
    SELECT
      bp.permission_id AS permission_id,
      'pedidos.visualizar'::text AS permission_code,
      bp.permission_description AS permission_description,
      bp.category AS category
    FROM base_permissions bp
    WHERE bp.permission_code = 'pedidos.visualizar_todos'
  )
  SELECT permission_id, permission_code, permission_description, category
  FROM base_permissions
  UNION
  SELECT permission_id, permission_code, permission_description, category
  FROM aliases;
$function$;

-- 3) Novas permissoes para fluxo de alteracao de pedido fechado
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria)
VALUES
  ('pedidos.alteracoes.solicitar', 'pedidos', 'alteracoes.solicitar', 'Solicitar alteracoes em pedidos fechados para aprovacao', 'Vendas'),
  ('pedidos.alteracoes.aprovar', 'pedidos', 'alteracoes.aprovar', 'Aprovar ou rejeitar alteracoes em pedidos fechados', 'Admin')
ON CONFLICT (id) DO NOTHING;

-- Admin recebe a permissao de aprovar automaticamente
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
JOIN public.permissions p ON p.id IN ('pedidos.alteracoes.aprovar')
WHERE sp.codigo = 'admin'
  AND NOT EXISTS (
    SELECT 1
    FROM public.profile_permissions pp
    WHERE pp.profile_id = sp.id
      AND pp.permission_id = p.id
  );

-- 4) Tabela de solicitacoes de alteracao de pedidos fechados
CREATE TABLE IF NOT EXISTS public.pedidos_alteracoes_pendentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  solicitado_por uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  analisado_por uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
  motivo_solicitacao text,
  observacao_solicitante text,
  observacao_aprovador text,
  dados_anteriores jsonb NOT NULL,
  dados_propostos jsonb NOT NULL,
  data_solicitacao timestamptz NOT NULL DEFAULT now(),
  data_analise timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_alt_pendentes_pedido ON public.pedidos_alteracoes_pendentes (pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_alt_pendentes_status_data ON public.pedidos_alteracoes_pendentes (status, data_solicitacao DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pedidos_alt_uma_pendente
  ON public.pedidos_alteracoes_pendentes (pedido_id)
  WHERE status = 'pendente';

DROP TRIGGER IF EXISTS update_pedidos_alteracoes_pendentes_updated_at ON public.pedidos_alteracoes_pendentes;
CREATE TRIGGER update_pedidos_alteracoes_pendentes_updated_at
  BEFORE UPDATE ON public.pedidos_alteracoes_pendentes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pedidos_alteracoes_pendentes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ver solicitacoes de alteracao de pedidos" ON public.pedidos_alteracoes_pendentes;
CREATE POLICY "Ver solicitacoes de alteracao de pedidos" ON public.pedidos_alteracoes_pendentes
FOR SELECT USING (
  solicitado_por = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.pedidos p
    WHERE p.id = pedidos_alteracoes_pendentes.pedido_id
      AND p.vendedor_id = auth.uid()
  )
  OR has_permission(auth.uid(), 'pedidos.alteracoes.aprovar')
  OR has_permission(auth.uid(), 'aprovacoes.aprovar')
  OR has_permission(auth.uid(), 'pedidos.visualizar_todos')
  OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Criar solicitacao de alteracao de pedido" ON public.pedidos_alteracoes_pendentes;
CREATE POLICY "Criar solicitacao de alteracao de pedido" ON public.pedidos_alteracoes_pendentes
FOR INSERT WITH CHECK (
  auth.uid() = solicitado_por
  AND (
    is_admin(auth.uid())
    OR has_permission(auth.uid(), 'pedidos.editar_todos')
    OR (
      has_permission(auth.uid(), 'pedidos.alteracoes.solicitar')
      AND EXISTS (
      SELECT 1
      FROM public.pedidos p
      WHERE p.id = pedidos_alteracoes_pendentes.pedido_id
        AND p.vendedor_id = auth.uid()
    )
    )
  )
);

DROP POLICY IF EXISTS "Analisar solicitacao de alteracao de pedido" ON public.pedidos_alteracoes_pendentes;
CREATE POLICY "Analisar solicitacao de alteracao de pedido" ON public.pedidos_alteracoes_pendentes
FOR UPDATE USING (
  has_permission(auth.uid(), 'pedidos.alteracoes.aprovar')
  OR has_permission(auth.uid(), 'aprovacoes.aprovar')
  OR is_admin(auth.uid())
)
WITH CHECK (
  has_permission(auth.uid(), 'pedidos.alteracoes.aprovar')
  OR has_permission(auth.uid(), 'aprovacoes.aprovar')
  OR is_admin(auth.uid())
);

-- 5) Trigger para registrar historico da solicitacao no pedidos_historico
CREATE OR REPLACE FUNCTION public.registrar_historico_solicitacao_alteracao_pedido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id uuid;
  v_descricao text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_usuario_id := COALESCE(NEW.solicitado_por, auth.uid());

    v_descricao := COALESCE(
      NEW.motivo_solicitacao,
      'Solicitacao de alteracao em pedido fechado enviada para aprovacao.'
    );

    INSERT INTO public.pedidos_historico (
      pedido_id,
      usuario_id,
      tipo_alteracao,
      campo_alterado,
      valor_anterior,
      valor_novo,
      descricao
    ) VALUES (
      NEW.pedido_id,
      v_usuario_id,
      'solicitacao_edicao',
      'pedido_fechado',
      NEW.dados_anteriores::text,
      NEW.dados_propostos::text,
      v_descricao
    );

    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'pendente' AND NEW.status IN ('aprovado', 'rejeitado') THEN
    v_usuario_id := COALESCE(NEW.analisado_por, auth.uid(), NEW.solicitado_por);

    v_descricao := CASE
      WHEN NEW.status = 'aprovado' THEN 'Solicitacao de alteracao aprovada.'
      ELSE 'Solicitacao de alteracao rejeitada.'
    END;

    IF COALESCE(NEW.observacao_aprovador, '') <> '' THEN
      v_descricao := v_descricao || ' Observacao: ' || NEW.observacao_aprovador;
    END IF;

    INSERT INTO public.pedidos_historico (
      pedido_id,
      usuario_id,
      tipo_alteracao,
      campo_alterado,
      valor_anterior,
      valor_novo,
      descricao
    ) VALUES (
      NEW.pedido_id,
      v_usuario_id,
      CASE WHEN NEW.status = 'aprovado' THEN 'edicao_aprovada' ELSE 'edicao_rejeitada' END,
      'pedido_fechado',
      NEW.dados_anteriores::text,
      NEW.dados_propostos::text,
      v_descricao
    );

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_registrar_historico_solicitacao_alteracao_pedido ON public.pedidos_alteracoes_pendentes;
CREATE TRIGGER trigger_registrar_historico_solicitacao_alteracao_pedido
AFTER INSERT OR UPDATE ON public.pedidos_alteracoes_pendentes
FOR EACH ROW
EXECUTE FUNCTION public.registrar_historico_solicitacao_alteracao_pedido();

-- 6) RPC para aprovar/rejeitar solicitacao e aplicar alteracoes (quando aprovado)
CREATE OR REPLACE FUNCTION public.processar_solicitacao_alteracao_pedido(
  p_solicitacao_id uuid,
  p_aprovar boolean,
  p_observacao text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_sol public.pedidos_alteracoes_pendentes%ROWTYPE;
  v_item jsonb;
  v_item_id uuid;
  v_item_id_raw text;
  v_processed_item_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario nao autenticado';
  END IF;

  IF NOT (
    is_admin(v_user_id)
    OR has_permission(v_user_id, 'pedidos.alteracoes.aprovar')
    OR has_permission(v_user_id, 'aprovacoes.aprovar')
  ) THEN
    RAISE EXCEPTION 'Voce nao tem permissao para analisar esta solicitacao' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_sol
  FROM public.pedidos_alteracoes_pendentes
  WHERE id = p_solicitacao_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitacao nao encontrada';
  END IF;

  IF v_sol.status <> 'pendente' THEN
    RAISE EXCEPTION 'Solicitacao ja foi analisada';
  END IF;

  IF p_aprovar THEN
    UPDATE public.pedidos
    SET
      cliente_id = CASE
        WHEN v_sol.dados_propostos ? 'cliente_id' AND COALESCE(v_sol.dados_propostos->>'cliente_id', '') <> ''
          THEN (v_sol.dados_propostos->>'cliente_id')::uuid
        ELSE cliente_id
      END,
      data_pedido = CASE
        WHEN v_sol.dados_propostos ? 'data_pedido' AND COALESCE(v_sol.dados_propostos->>'data_pedido', '') <> ''
          THEN (v_sol.dados_propostos->>'data_pedido' || 'T12:00:00')::timestamptz
        ELSE data_pedido
      END,
      data_entrega = CASE
        WHEN v_sol.dados_propostos ? 'data_entrega' AND COALESCE(v_sol.dados_propostos->>'data_entrega', '') <> ''
          THEN (v_sol.dados_propostos->>'data_entrega' || 'T12:00:00')::timestamptz
        WHEN v_sol.dados_propostos ? 'data_entrega' AND COALESCE(v_sol.dados_propostos->>'data_entrega', '') = ''
          THEN NULL
        ELSE data_entrega
      END,
      observacao = CASE
        WHEN v_sol.dados_propostos ? 'observacao' THEN NULLIF(v_sol.dados_propostos->>'observacao', '')
        ELSE observacao
      END,
      caminho_arquivos = CASE
        WHEN v_sol.dados_propostos ? 'caminho_arquivos' THEN NULLIF(v_sol.dados_propostos->>'caminho_arquivos', '')
        ELSE caminho_arquivos
      END,
      status = CASE
        WHEN v_sol.dados_propostos ? 'status' AND COALESCE(v_sol.dados_propostos->>'status', '') <> ''
          THEN (v_sol.dados_propostos->>'status')::public.status_pedido
        ELSE status
      END
    WHERE id = v_sol.pedido_id;

    FOR v_item IN
      SELECT value
      FROM jsonb_array_elements(COALESCE(v_sol.dados_propostos->'itens', '[]'::jsonb))
    LOOP
      v_item_id := NULL;
      v_item_id_raw := COALESCE(v_item->>'id', '');

      IF v_item_id_raw <> '' THEN
        SELECT pi.id
        INTO v_item_id
        FROM public.pedido_itens pi
        WHERE pi.id = v_item_id_raw::uuid
          AND pi.pedido_id = v_sol.pedido_id;
      END IF;

      IF v_item_id IS NULL THEN
        INSERT INTO public.pedido_itens (
          pedido_id,
          produto_id,
          quantidade,
          valor_unitario,
          observacoes,
          foto_modelo_url,
          tipo_estampa_id
        )
        VALUES (
          v_sol.pedido_id,
          (v_item->>'produto_id')::uuid,
          COALESCE(NULLIF(v_item->>'quantidade', '')::integer, 0),
          COALESCE(NULLIF(v_item->>'valor_unitario', '')::numeric, 0),
          NULLIF(v_item->>'observacoes', ''),
          NULLIF(v_item->>'foto_modelo_url', ''),
          NULLIF(v_item->>'tipo_estampa_id', '')::uuid
        )
        RETURNING id INTO v_item_id;
      ELSE
        UPDATE public.pedido_itens
        SET
          produto_id = CASE
            WHEN COALESCE(v_item->>'produto_id', '') <> '' THEN (v_item->>'produto_id')::uuid
            ELSE produto_id
          END,
          quantidade = COALESCE(NULLIF(v_item->>'quantidade', '')::integer, quantidade),
          valor_unitario = COALESCE(NULLIF(v_item->>'valor_unitario', '')::numeric, valor_unitario),
          observacoes = CASE WHEN v_item ? 'observacoes' THEN NULLIF(v_item->>'observacoes', '') ELSE observacoes END,
          foto_modelo_url = CASE WHEN v_item ? 'foto_modelo_url' THEN NULLIF(v_item->>'foto_modelo_url', '') ELSE foto_modelo_url END,
          tipo_estampa_id = CASE
            WHEN v_item ? 'tipo_estampa_id' THEN NULLIF(v_item->>'tipo_estampa_id', '')::uuid
            ELSE tipo_estampa_id
          END
        WHERE id = v_item_id;
      END IF;

      v_processed_item_ids := array_append(v_processed_item_ids, v_item_id);

      DELETE FROM public.pedido_item_grades WHERE pedido_item_id = v_item_id;
      INSERT INTO public.pedido_item_grades (pedido_item_id, tamanho_codigo, tamanho_nome, quantidade)
      SELECT
        v_item_id,
        g->>'codigo',
        g->>'nome',
        COALESCE(NULLIF(g->>'quantidade', '')::integer, 0)
      FROM jsonb_array_elements(COALESCE(v_item->'grades', '[]'::jsonb)) g
      WHERE COALESCE(g->>'codigo', '') <> ''
        AND COALESCE(g->>'nome', '') <> ''
        AND COALESCE(NULLIF(g->>'quantidade', '')::integer, 0) > 0;

      DELETE FROM public.pedido_item_detalhes WHERE pedido_item_id = v_item_id;
      INSERT INTO public.pedido_item_detalhes (pedido_item_id, tipo_detalhe, valor)
      SELECT
        v_item_id,
        d->>'tipo_detalhe',
        d->>'valor'
      FROM jsonb_array_elements(COALESCE(v_item->'detalhes', '[]'::jsonb)) d
      WHERE COALESCE(d->>'tipo_detalhe', '') <> ''
        AND COALESCE(d->>'valor', '') <> '';
    END LOOP;

    IF array_length(v_processed_item_ids, 1) IS NULL THEN
      DELETE FROM public.pedido_item_grades
      WHERE pedido_item_id IN (
        SELECT id FROM public.pedido_itens WHERE pedido_id = v_sol.pedido_id
      );

      DELETE FROM public.pedido_item_detalhes
      WHERE pedido_item_id IN (
        SELECT id FROM public.pedido_itens WHERE pedido_id = v_sol.pedido_id
      );

      DELETE FROM public.pedido_itens
      WHERE pedido_id = v_sol.pedido_id;
    ELSE
      DELETE FROM public.pedido_item_grades
      WHERE pedido_item_id IN (
        SELECT id
        FROM public.pedido_itens
        WHERE pedido_id = v_sol.pedido_id
          AND NOT (id = ANY(v_processed_item_ids))
      );

      DELETE FROM public.pedido_item_detalhes
      WHERE pedido_item_id IN (
        SELECT id
        FROM public.pedido_itens
        WHERE pedido_id = v_sol.pedido_id
          AND NOT (id = ANY(v_processed_item_ids))
      );

      DELETE FROM public.pedido_itens
      WHERE pedido_id = v_sol.pedido_id
        AND NOT (id = ANY(v_processed_item_ids));
    END IF;

    UPDATE public.pedidos_alteracoes_pendentes
    SET
      status = 'aprovado',
      analisado_por = v_user_id,
      observacao_aprovador = NULLIF(p_observacao, ''),
      data_analise = now()
    WHERE id = v_sol.id;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'aprovado',
      'pedido_id', v_sol.pedido_id,
      'solicitacao_id', v_sol.id
    );
  END IF;

  UPDATE public.pedidos_alteracoes_pendentes
  SET
    status = 'rejeitado',
    analisado_por = v_user_id,
    observacao_aprovador = NULLIF(p_observacao, ''),
    data_analise = now()
  WHERE id = v_sol.id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'rejeitado',
    'pedido_id', v_sol.pedido_id,
    'solicitacao_id', v_sol.id
  );
END;
$$;
