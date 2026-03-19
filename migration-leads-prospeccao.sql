-- =====================================================
-- MIGRATION: SISTEMA DE PROSPECÇÃO COM SEGMENTAÇÃO
-- =====================================================

-- 1. CRIAR TABELA DE SEGMENTOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.segmentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  cor VARCHAR(7), -- Hex color (#FF5733)
  icone VARCHAR(50), -- Nome do ícone Lucide
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir segmentos padrão
INSERT INTO public.segmentos (nome, descricao, cor, icone) VALUES
  ('Academias', 'Academias e estúdios de fitness', '#10b981', 'Dumbbell'),
  ('Mercados', 'Supermercados e minimercados', '#3b82f6', 'ShoppingCart'),
  ('Oficinas', 'Oficinas mecânicas e autopeças', '#f59e0b', 'Wrench'),
  ('Restaurantes', 'Restaurantes e lanchonetes', '#ef4444', 'UtensilsCrossed'),
  ('Escritórios', 'Escritórios e empresas de serviços', '#8b5cf6', 'Building2'),
  ('Escolas', 'Escolas e instituições de ensino', '#06b6d4', 'GraduationCap'),
  ('Salões', 'Salões de beleza e estética', '#ec4899', 'Scissors'),
  ('Clínicas', 'Clínicas e consultórios médicos', '#14b8a6', 'Stethoscope'),
  ('Hotéis', 'Hotéis e pousadas', '#f97316', 'Hotel'),
  ('Outros', 'Outros segmentos', '#6b7280', 'Briefcase')
ON CONFLICT (nome) DO NOTHING;

-- RLS para segmentos
ALTER TABLE public.segmentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem visualizar segmentos"
  ON public.segmentos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Apenas admins gerenciam segmentos"
  ON public.segmentos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
      JOIN public.permissions p ON pp.permission_id = p.id
      WHERE up.user_id = auth.uid()
      AND p.id = 'segmentos.gerenciar'
    )
  );

-- 2. CRIAR TABELA DE LEADS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefone VARCHAR(20),
  whatsapp VARCHAR(20),
  cpf_cnpj VARCHAR(20),
  endereco TEXT,
  segmento_id UUID REFERENCES public.segmentos(id),
  
  -- Status do lead
  status VARCHAR(50) DEFAULT 'novo' CHECK (status IN (
    'novo',
    'contatando',
    'qualificado',
    'nao_qualificado',
    'convertido',
    'perdido'
  )),
  
  -- Atribuição
  vendedor_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  
  -- Cliente gerado (quando convertido)
  cliente_id UUID REFERENCES public.clientes(id),
  data_conversao TIMESTAMPTZ,
  
  -- Observações e retorno
  observacao TEXT,
  origem VARCHAR(100),
  data_retorno TIMESTAMPTZ,
  lembrete_enviado BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT leads_cliente_id_unique UNIQUE (cliente_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_vendedor ON public.leads(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_leads_segmento ON public.leads(segmento_id);
CREATE INDEX IF NOT EXISTS idx_leads_data_retorno ON public.leads(data_retorno) WHERE data_retorno IS NOT NULL;

-- RLS para leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedores veem seus leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (
    vendedor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
      JOIN public.permissions p ON pp.permission_id = p.id
      WHERE up.user_id = auth.uid()
      AND p.id IN ('leads.visualizar_todos', 'usuarios.visualizar')
    )
  );

CREATE POLICY "Vendedores criam leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
      JOIN public.permissions p ON pp.permission_id = p.id
      WHERE up.user_id = auth.uid()
      AND p.id = 'leads.criar'
    )
  );

CREATE POLICY "Vendedores editam seus leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (
    vendedor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
      JOIN public.permissions p ON pp.permission_id = p.id
      WHERE up.user_id = auth.uid()
      AND p.id = 'leads.editar_todos'
    )
  );

CREATE POLICY "Admins excluem leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
      JOIN public.permissions p ON pp.permission_id = p.id
      WHERE up.user_id = auth.uid()
      AND p.id = 'leads.excluir'
    )
  );

-- 3. CRIAR TABELA DE INTERAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.leads_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  
  -- Tipo de interação
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN (
    'ligacao',
    'whatsapp',
    'email',
    'reuniao',
    'outro'
  )),
  
  -- Resultado da interação
  resultado VARCHAR(50) CHECK (resultado IN (
    'sem_resposta',
    'retornar',
    'interessado',
    'nao_interessado',
    'agendado',
    'convertido'
  )),
  
  -- Detalhes
  descricao TEXT NOT NULL,
  proxima_acao TEXT,
  data_proxima_acao TIMESTAMPTZ,
  
  -- Criação
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_interacoes_lead ON public.leads_interacoes(lead_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_data ON public.leads_interacoes(created_at DESC);

-- RLS para interações
ALTER TABLE public.leads_interacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visualizar interações dos próprios leads"
  ON public.leads_interacoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND (
        l.vendedor_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_profiles up
          JOIN public.profile_permissions pp ON up.profile_id = pp.profile_id
          JOIN public.permissions p ON pp.permission_id = p.id
          WHERE up.user_id = auth.uid()
          AND p.id = 'leads.visualizar_todos'
        )
      )
    )
  );

CREATE POLICY "Criar interações nos próprios leads"
  ON public.leads_interacoes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = lead_id
      AND l.vendedor_id = auth.uid()
    )
  );

-- 4. ADICIONAR SEGMENTO À TABELA CLIENTES
-- =====================================================
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS segmento_id UUID REFERENCES public.segmentos(id);

CREATE INDEX IF NOT EXISTS idx_clientes_segmento ON public.clientes(segmento_id);

-- 5. CRIAR PERMISSÕES RBAC
-- =====================================================
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('leads.visualizar', 'leads', 'visualizar', 'Visualizar próprios leads', 'Prospecção'),
  ('leads.visualizar_todos', 'leads', 'visualizar_todos', 'Visualizar todos os leads da empresa', 'Prospecção'),
  ('leads.criar', 'leads', 'criar', 'Criar novos leads manualmente', 'Prospecção'),
  ('leads.importar', 'leads', 'importar', 'Importar lista de leads via CSV', 'Prospecção'),
  ('leads.editar', 'leads', 'editar', 'Editar próprios leads', 'Prospecção'),
  ('leads.editar_todos', 'leads', 'editar_todos', 'Editar leads de outros vendedores', 'Prospecção'),
  ('leads.converter', 'leads', 'converter', 'Converter leads em clientes', 'Prospecção'),
  ('leads.excluir', 'leads', 'excluir', 'Excluir leads', 'Prospecção'),
  ('leads.registrar_contato', 'leads', 'registrar_contato', 'Registrar interações com leads', 'Prospecção'),
  ('segmentos.visualizar', 'segmentos', 'visualizar', 'Visualizar segmentos', 'Cadastros'),
  ('segmentos.gerenciar', 'segmentos', 'gerenciar', 'Criar e editar segmentos', 'Cadastros')
ON CONFLICT (id) DO NOTHING;

-- Atribuir permissões ao perfil Administrador
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT 
  sp.id,
  p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo = 'administrador'
AND (p.id LIKE 'leads.%' OR p.id LIKE 'segmentos.%')
ON CONFLICT DO NOTHING;

-- Atribuir permissões ao perfil Vendedor
INSERT INTO public.profile_permissions (profile_id, permission_id)
SELECT 
  sp.id,
  p.id
FROM public.system_profiles sp
CROSS JOIN public.permissions p
WHERE sp.codigo = 'vendedor'
AND p.id IN (
  'leads.visualizar',
  'leads.criar',
  'leads.editar',
  'leads.importar',
  'leads.converter',
  'leads.registrar_contato',
  'segmentos.visualizar'
)
ON CONFLICT DO NOTHING;

-- 6. TRIGGER PARA UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_segmentos_updated_at BEFORE UPDATE ON public.segmentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
