-- Campo de desconto geral para propostas e flag de aprovacao administrativa
ALTER TABLE public.propostas
ADD COLUMN IF NOT EXISTS desconto_percentual numeric(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS desconto_aguardando_aprovacao boolean DEFAULT false;

UPDATE public.propostas
SET
  desconto_percentual = COALESCE(desconto_percentual, 0),
  desconto_aguardando_aprovacao = COALESCE(desconto_aguardando_aprovacao, false)
WHERE
  desconto_percentual IS NULL
  OR desconto_aguardando_aprovacao IS NULL;

ALTER TABLE public.propostas
ALTER COLUMN desconto_percentual SET DEFAULT 0,
ALTER COLUMN desconto_percentual SET NOT NULL,
ALTER COLUMN desconto_aguardando_aprovacao SET DEFAULT false,
ALTER COLUMN desconto_aguardando_aprovacao SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'propostas_desconto_percentual_check'
      AND conrelid = 'public.propostas'::regclass
  ) THEN
    ALTER TABLE public.propostas
    ADD CONSTRAINT propostas_desconto_percentual_check
    CHECK (desconto_percentual >= 0 AND desconto_percentual <= 100);
  END IF;
END $$;

-- Atualiza trigger de historico para registrar alteracoes de desconto
CREATE OR REPLACE FUNCTION public.registrar_historico_proposta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
BEGIN
  v_usuario_id := COALESCE(auth.uid(), NEW.vendedor_id, OLD.vendedor_id);
  
  IF (TG_OP = 'UPDATE') THEN
    -- Etapa de aprovacao alterada
    IF OLD.etapa_aprovacao_id IS DISTINCT FROM NEW.etapa_aprovacao_id THEN
      INSERT INTO public.propostas_historico (
        proposta_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'movimentacao', 'etapa_aprovacao_id',
        OLD.etapa_aprovacao_id::TEXT, NEW.etapa_aprovacao_id::TEXT,
        'Proposta movida entre etapas de aprovacao'
      );
    END IF;
    
    -- Status alterado
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.propostas_historico (
        proposta_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'status', 'status',
        OLD.status::TEXT, NEW.status::TEXT,
        'Status alterado de "' || OLD.status || '" para "' || NEW.status || '"'
      );
    END IF;
    
    -- Imagem de aprovacao adicionada/alterada
    IF OLD.imagem_aprovacao_url IS DISTINCT FROM NEW.imagem_aprovacao_url THEN
      INSERT INTO public.propostas_historico (
        proposta_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'imagem_aprovacao_url',
        COALESCE(OLD.imagem_aprovacao_url, ''), 
        COALESCE(NEW.imagem_aprovacao_url, ''),
        CASE 
          WHEN OLD.imagem_aprovacao_url IS NULL THEN 'Imagem de aprovacao adicionada'
          ELSE 'Imagem de aprovacao atualizada'
        END
      );
    END IF;

    -- Desconto percentual alterado
    IF OLD.desconto_percentual IS DISTINCT FROM NEW.desconto_percentual THEN
      INSERT INTO public.propostas_historico (
        proposta_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'desconto_percentual',
        COALESCE(OLD.desconto_percentual, 0)::TEXT,
        COALESCE(NEW.desconto_percentual, 0)::TEXT,
        'Desconto geral alterado'
      );
    END IF;

    -- Status de aprovacao do desconto alterado
    IF OLD.desconto_aguardando_aprovacao IS DISTINCT FROM NEW.desconto_aguardando_aprovacao THEN
      INSERT INTO public.propostas_historico (
        proposta_id, usuario_id, tipo_alteracao, campo_alterado,
        valor_anterior, valor_novo, descricao
      ) VALUES (
        NEW.id, v_usuario_id, 'edicao', 'desconto_aguardando_aprovacao',
        COALESCE(OLD.desconto_aguardando_aprovacao, false)::TEXT,
        COALESCE(NEW.desconto_aguardando_aprovacao, false)::TEXT,
        CASE
          WHEN NEW.desconto_aguardando_aprovacao THEN 'Desconto marcado para aprovacao administrativa'
          ELSE 'Aprovacao de desconto concluida'
        END
      );
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;
