-- =====================================================
-- MÓDULO DE GESTÃO DE COLABORADORES (RH)
-- Etapa 1: Base de Dados Completa
-- =====================================================

-- 1. ENUMS
-- =====================================================

-- Tipo de contrato de trabalho
CREATE TYPE public.tipo_contrato AS ENUM ('clt', 'pj', 'estagio', 'temporario', 'aprendiz');

-- Tipo de conta bancária
CREATE TYPE public.tipo_conta_bancaria AS ENUM ('corrente', 'poupanca', 'salario');

-- Status do fechamento mensal
CREATE TYPE public.status_fechamento AS ENUM ('rascunho', 'fechado');

-- Tipo de férias
CREATE TYPE public.tipo_ferias AS ENUM ('normal', 'fracionada');

-- Status das férias
CREATE TYPE public.status_ferias AS ENUM ('agendada', 'em_gozo', 'concluida', 'cancelada');

-- Tipo de bonificação
CREATE TYPE public.tipo_bonificacao AS ENUM ('fixo', 'percentual');

-- Tipo de ocasião de mimo
CREATE TYPE public.tipo_ocasiao AS ENUM ('fixa', 'personalizada');

-- Tipo de data comemorativa
CREATE TYPE public.tipo_data_comemorativa AS ENUM ('feriado', 'evento', 'comemoracao');

-- 2. TABELAS PRINCIPAIS
-- =====================================================

-- Setores/Departamentos
CREATE TABLE public.setores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Colaboradores (tabela principal)
CREATE TABLE public.colaboradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Vínculo opcional
  
  -- Dados Pessoais
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  cpf TEXT,
  rg TEXT,
  data_nascimento DATE,
  foto_url TEXT,
  
  -- Dados Profissionais
  data_admissao DATE NOT NULL,
  data_demissao DATE,
  cargo TEXT NOT NULL,
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  salario_atual DECIMAL(12,2) DEFAULT 0,
  tipo_contrato public.tipo_contrato NOT NULL DEFAULT 'clt',
  carga_horaria INTEGER DEFAULT 44,
  
  -- Dados Bancários
  banco TEXT,
  agencia TEXT,
  conta TEXT,
  tipo_conta public.tipo_conta_bancaria DEFAULT 'corrente',
  chave_pix TEXT,
  
  -- Endereço
  endereco_cep TEXT,
  endereco_logradouro TEXT,
  endereco_numero TEXT,
  endereco_complemento TEXT,
  endereco_bairro TEXT,
  endereco_cidade TEXT,
  endereco_estado TEXT,
  
  -- Gamificação (preparação Fase 2)
  pontos_gamificacao INTEGER DEFAULT 0,
  
  -- Controle
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dependentes
CREATE TABLE public.colaborador_dependentes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  parentesco TEXT NOT NULL,
  data_nascimento DATE,
  cpf TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Histórico Salarial
CREATE TABLE public.colaborador_salarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data_reajuste DATE NOT NULL,
  valor_anterior DECIMAL(12,2) NOT NULL,
  valor_novo DECIMAL(12,2) NOT NULL,
  motivo TEXT,
  observacao TEXT,
  registrado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Férias
CREATE TABLE public.colaborador_ferias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  periodo_aquisitivo_inicio DATE NOT NULL,
  periodo_aquisitivo_fim DATE NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  dias INTEGER NOT NULL DEFAULT 30,
  tipo public.tipo_ferias NOT NULL DEFAULT 'normal',
  abono_pecuniario BOOLEAN DEFAULT false,
  status public.status_ferias NOT NULL DEFAULT 'agendada',
  observacao TEXT,
  registrado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fechamento Mensal
CREATE TABLE public.colaborador_fechamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL, -- Primeiro dia do mês
  faltas INTEGER DEFAULT 0,
  horas_extras DECIMAL(5,2) DEFAULT 0,
  valor_horas_extras DECIMAL(12,2) DEFAULT 0,
  bonificacoes DECIMAL(12,2) DEFAULT 0,
  descontos DECIMAL(12,2) DEFAULT 0,
  observacoes TEXT,
  status public.status_fechamento NOT NULL DEFAULT 'rascunho',
  fechado_por UUID REFERENCES public.profiles(id),
  data_fechamento TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(colaborador_id, mes_referencia)
);

-- Regras de Bonificação
CREATE TABLE public.regras_bonificacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  valor DECIMAL(12,2) NOT NULL,
  tipo public.tipo_bonificacao NOT NULL DEFAULT 'fixo',
  aplicavel_a TEXT DEFAULT 'todos', -- 'todos', 'setor', 'cargo'
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  cargo TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bonificações por Colaborador (histórico mensal)
CREATE TABLE public.colaborador_bonificacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  regra_id UUID REFERENCES public.regras_bonificacao(id) ON DELETE SET NULL,
  mes_referencia DATE NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  recebeu BOOLEAN NOT NULL DEFAULT true,
  justificativa TEXT,
  registrado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Ocasiões de Mimo
CREATE TABLE public.ocasioes_mimo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo public.tipo_ocasiao NOT NULL DEFAULT 'fixa',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mimos/Presentes entregues
CREATE TABLE public.colaborador_mimos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  ocasiao_id UUID REFERENCES public.ocasioes_mimo(id) ON DELETE SET NULL,
  data_entrega DATE NOT NULL,
  descricao TEXT,
  valor_estimado DECIMAL(12,2),
  ano_referencia INTEGER NOT NULL,
  observacao TEXT,
  registrado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Datas Comemorativas
CREATE TABLE public.datas_comemorativas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  tipo public.tipo_data_comemorativa NOT NULL DEFAULT 'evento',
  recorrente BOOLEAN NOT NULL DEFAULT true, -- Repete todo ano
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL, -- NULL = todos
  cargo TEXT, -- NULL = todos
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Treinamentos (preparação Fase 2)
CREATE TABLE public.colaborador_treinamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  treinamento_id UUID, -- Será referência para tabela futura
  status TEXT DEFAULT 'pendente',
  progresso_percentual INTEGER DEFAULT 0,
  data_inicio DATE,
  data_conclusao DATE,
  pontos_ganhos INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. INDEXES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_colaboradores_setor ON public.colaboradores(setor_id);
CREATE INDEX idx_colaboradores_ativo ON public.colaboradores(ativo);
CREATE INDEX idx_colaboradores_data_nascimento ON public.colaboradores(data_nascimento);
CREATE INDEX idx_colaboradores_data_admissao ON public.colaboradores(data_admissao);
CREATE INDEX idx_colaboradores_user_id ON public.colaboradores(user_id);

CREATE INDEX idx_colaborador_ferias_colaborador ON public.colaborador_ferias(colaborador_id);
CREATE INDEX idx_colaborador_ferias_periodo ON public.colaborador_ferias(periodo_aquisitivo_fim);

CREATE INDEX idx_colaborador_fechamento_mes ON public.colaborador_fechamento(mes_referencia);
CREATE INDEX idx_colaborador_bonificacao_mes ON public.colaborador_bonificacao(mes_referencia);
CREATE INDEX idx_colaborador_mimos_ano ON public.colaborador_mimos(ano_referencia);

-- 4. TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_setores_updated_at
  BEFORE UPDATE ON public.setores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colaboradores_updated_at
  BEFORE UPDATE ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colaborador_ferias_updated_at
  BEFORE UPDATE ON public.colaborador_ferias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colaborador_fechamento_updated_at
  BEFORE UPDATE ON public.colaborador_fechamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_regras_bonificacao_updated_at
  BEFORE UPDATE ON public.regras_bonificacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_colaborador_treinamentos_updated_at
  BEFORE UPDATE ON public.colaborador_treinamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. FUNÇÃO DE VERIFICAÇÃO DE PERFIL RH
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_rh(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles up
    JOIN system_profiles sp ON up.profile_id = sp.id
    WHERE up.user_id = _user_id 
      AND sp.codigo = 'rh'
      AND sp.ativo = true
  ) OR is_admin(_user_id);
$$;

-- 6. HABILITAR RLS EM TODAS AS TABELAS
-- =====================================================

ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_dependentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_salarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_ferias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_fechamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_bonificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_bonificacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocasioes_mimo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_mimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.datas_comemorativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaborador_treinamentos ENABLE ROW LEVEL SECURITY;

-- 7. POLÍTICAS RLS
-- =====================================================

-- Setores: RH e Admin podem ver/gerenciar
CREATE POLICY "rh_setores_select" ON public.setores
  FOR SELECT TO authenticated
  USING (is_rh(auth.uid()));

CREATE POLICY "rh_setores_insert" ON public.setores
  FOR INSERT TO authenticated
  WITH CHECK (is_rh(auth.uid()));

CREATE POLICY "rh_setores_update" ON public.setores
  FOR UPDATE TO authenticated
  USING (is_rh(auth.uid()));

CREATE POLICY "rh_setores_delete" ON public.setores
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- Colaboradores: RH e Admin
CREATE POLICY "rh_colaboradores_select" ON public.colaboradores
  FOR SELECT TO authenticated
  USING (is_rh(auth.uid()));

CREATE POLICY "rh_colaboradores_insert" ON public.colaboradores
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'rh.colaboradores.criar'));

CREATE POLICY "rh_colaboradores_update" ON public.colaboradores
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'rh.colaboradores.editar'));

CREATE POLICY "rh_colaboradores_delete" ON public.colaboradores
  FOR DELETE TO authenticated
  USING (has_permission(auth.uid(), 'rh.colaboradores.excluir'));

-- Dependentes: seguem regra do colaborador
CREATE POLICY "rh_dependentes_select" ON public.colaborador_dependentes
  FOR SELECT TO authenticated
  USING (is_rh(auth.uid()));

CREATE POLICY "rh_dependentes_all" ON public.colaborador_dependentes
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'rh.colaboradores.editar'));

-- Salários: dados sensíveis - permissão específica
CREATE POLICY "rh_salarios_select" ON public.colaborador_salarios
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'rh.salarios.visualizar'));

CREATE POLICY "rh_salarios_insert" ON public.colaborador_salarios
  FOR INSERT TO authenticated
  WITH CHECK (has_permission(auth.uid(), 'rh.salarios.gerenciar'));

CREATE POLICY "rh_salarios_update" ON public.colaborador_salarios
  FOR UPDATE TO authenticated
  USING (has_permission(auth.uid(), 'rh.salarios.gerenciar'));

CREATE POLICY "rh_salarios_delete" ON public.colaborador_salarios
  FOR DELETE TO authenticated
  USING (is_admin(auth.uid()));

-- Férias
CREATE POLICY "rh_ferias_select" ON public.colaborador_ferias
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'rh.ferias.visualizar'));

CREATE POLICY "rh_ferias_all" ON public.colaborador_ferias
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'rh.ferias.gerenciar'));

-- Fechamento Mensal
CREATE POLICY "rh_fechamento_select" ON public.colaborador_fechamento
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'rh.fechamento.visualizar'));

CREATE POLICY "rh_fechamento_all" ON public.colaborador_fechamento
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'rh.fechamento.gerenciar'));

-- Regras de Bonificação
CREATE POLICY "rh_regras_bonificacao_select" ON public.regras_bonificacao
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'rh.bonificacoes.visualizar'));

CREATE POLICY "rh_regras_bonificacao_all" ON public.regras_bonificacao
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'rh.bonificacoes.gerenciar'));

-- Bonificações de Colaborador
CREATE POLICY "rh_colaborador_bonificacao_select" ON public.colaborador_bonificacao
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'rh.bonificacoes.visualizar'));

CREATE POLICY "rh_colaborador_bonificacao_all" ON public.colaborador_bonificacao
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'rh.bonificacoes.gerenciar'));

-- Ocasiões de Mimo
CREATE POLICY "rh_ocasioes_mimo_select" ON public.ocasioes_mimo
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'rh.mimos.visualizar'));

CREATE POLICY "rh_ocasioes_mimo_all" ON public.ocasioes_mimo
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'rh.mimos.gerenciar'));

-- Mimos de Colaborador
CREATE POLICY "rh_mimos_select" ON public.colaborador_mimos
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'rh.mimos.visualizar'));

CREATE POLICY "rh_mimos_all" ON public.colaborador_mimos
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'rh.mimos.gerenciar'));

-- Datas Comemorativas
CREATE POLICY "rh_datas_comemorativas_select" ON public.datas_comemorativas
  FOR SELECT TO authenticated
  USING (has_permission(auth.uid(), 'rh.calendario.visualizar'));

CREATE POLICY "rh_datas_comemorativas_all" ON public.datas_comemorativas
  FOR ALL TO authenticated
  USING (has_permission(auth.uid(), 'rh.calendario.gerenciar'));

-- Treinamentos (Fase 2)
CREATE POLICY "rh_treinamentos_select" ON public.colaborador_treinamentos
  FOR SELECT TO authenticated
  USING (is_rh(auth.uid()));

CREATE POLICY "rh_treinamentos_all" ON public.colaborador_treinamentos
  FOR ALL TO authenticated
  USING (is_rh(auth.uid()));

-- 8. CRIAR PERFIL RH E PERMISSÕES
-- =====================================================

-- Inserir perfil RH
INSERT INTO public.system_profiles (nome, codigo, descricao, ativo, is_system)
VALUES ('RH', 'rh', 'Perfil para gestão de recursos humanos e colaboradores', true, true)
ON CONFLICT DO NOTHING;

-- Inserir permissões do módulo RH
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('rh.colaboradores.visualizar', 'rh', 'colaboradores.visualizar', 'Ver lista de colaboradores', 'RH'),
  ('rh.colaboradores.criar', 'rh', 'colaboradores.criar', 'Cadastrar novos colaboradores', 'RH'),
  ('rh.colaboradores.editar', 'rh', 'colaboradores.editar', 'Editar dados de colaboradores', 'RH'),
  ('rh.colaboradores.excluir', 'rh', 'colaboradores.excluir', 'Excluir/desativar colaboradores', 'RH'),
  ('rh.salarios.visualizar', 'rh', 'salarios.visualizar', 'Ver histórico salarial', 'RH'),
  ('rh.salarios.gerenciar', 'rh', 'salarios.gerenciar', 'Registrar reajustes salariais', 'RH'),
  ('rh.ferias.visualizar', 'rh', 'ferias.visualizar', 'Ver férias e vencimentos', 'RH'),
  ('rh.ferias.gerenciar', 'rh', 'ferias.gerenciar', 'Lançar e editar férias', 'RH'),
  ('rh.fechamento.visualizar', 'rh', 'fechamento.visualizar', 'Ver fechamentos mensais', 'RH'),
  ('rh.fechamento.gerenciar', 'rh', 'fechamento.gerenciar', 'Criar e editar fechamentos', 'RH'),
  ('rh.bonificacoes.visualizar', 'rh', 'bonificacoes.visualizar', 'Ver regras e histórico de bonificações', 'RH'),
  ('rh.bonificacoes.gerenciar', 'rh', 'bonificacoes.gerenciar', 'Configurar regras de bonificação', 'RH'),
  ('rh.mimos.visualizar', 'rh', 'mimos.visualizar', 'Ver controle de mimos', 'RH'),
  ('rh.mimos.gerenciar', 'rh', 'mimos.gerenciar', 'Registrar entregas de mimos', 'RH'),
  ('rh.relatorios.visualizar', 'rh', 'relatorios.visualizar', 'Ver relatórios gerenciais', 'RH'),
  ('rh.calendario.visualizar', 'rh', 'calendario.visualizar', 'Ver calendário corporativo', 'RH'),
  ('rh.calendario.gerenciar', 'rh', 'calendario.gerenciar', 'Gerenciar datas comemorativas', 'RH')
ON CONFLICT (id) DO NOTHING;

-- Vincular todas as permissões ao perfil RH
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo = 'rh'
  AND p.categoria = 'RH'
ON CONFLICT DO NOTHING;

-- Vincular permissões RH ao perfil Admin também
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo IN ('admin', 'administrador')
  AND p.categoria = 'RH'
ON CONFLICT DO NOTHING;

-- 9. DADOS INICIAIS
-- =====================================================

-- Ocasiões fixas de mimo
INSERT INTO public.ocasioes_mimo (nome, tipo) VALUES
  ('Aniversário Pessoal', 'fixa'),
  ('Aniversário de Empresa', 'fixa'),
  ('Natal', 'fixa'),
  ('Dia das Mães', 'fixa'),
  ('Dia dos Pais', 'fixa'),
  ('Páscoa', 'fixa')
ON CONFLICT DO NOTHING;

-- Setores iniciais exemplo
INSERT INTO public.setores (nome, descricao) VALUES
  ('Administrativo', 'Setor administrativo e financeiro'),
  ('Comercial', 'Setor de vendas e atendimento'),
  ('Produção', 'Setor de produção e operações'),
  ('TI', 'Tecnologia da informação'),
  ('Marketing', 'Marketing e comunicação')
ON CONFLICT DO NOTHING;