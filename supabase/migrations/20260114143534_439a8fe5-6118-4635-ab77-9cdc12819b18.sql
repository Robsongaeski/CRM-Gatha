-- Criar enum para status do empréstimo
CREATE TYPE public.status_emprestimo_grade AS ENUM (
  'emprestado',
  'devolvido',
  'devolvido_parcial',
  'nao_devolvido'
);

-- Criar tabela principal de empréstimos de grade para prova
CREATE TABLE public.emprestimos_grade_prova (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_emprestimo SERIAL NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  vendedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  data_emprestimo TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_prevista_devolucao DATE NOT NULL,
  data_devolucao TIMESTAMP WITH TIME ZONE,
  status public.status_emprestimo_grade NOT NULL DEFAULT 'emprestado',
  observacao_saida TEXT,
  observacao_devolucao TEXT,
  devolvido_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela de itens do empréstimo
CREATE TABLE public.emprestimo_grade_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emprestimo_id UUID NOT NULL REFERENCES public.emprestimos_grade_prova(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  quantidade_devolvida INTEGER DEFAULT 0,
  tamanhos TEXT,
  problema_devolucao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.emprestimos_grade_prova ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emprestimo_grade_itens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para emprestimos_grade_prova
CREATE POLICY "Admins podem ver todos os empréstimos"
ON public.emprestimos_grade_prova
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Vendedores podem ver seus próprios empréstimos"
ON public.emprestimos_grade_prova
FOR SELECT
USING (
  public.is_vendedor(auth.uid()) AND vendedor_id = auth.uid()
);

CREATE POLICY "Atendentes podem ver todos os empréstimos"
ON public.emprestimos_grade_prova
FOR SELECT
USING (public.is_atendente(auth.uid()));

CREATE POLICY "PCP pode ver todos os empréstimos"
ON public.emprestimos_grade_prova
FOR SELECT
USING (public.is_pcp(auth.uid()));

CREATE POLICY "Admins podem inserir empréstimos"
ON public.emprestimos_grade_prova
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Vendedores podem inserir seus empréstimos"
ON public.emprestimos_grade_prova
FOR INSERT
WITH CHECK (
  public.is_vendedor(auth.uid()) AND vendedor_id = auth.uid()
);

CREATE POLICY "Atendentes podem inserir empréstimos"
ON public.emprestimos_grade_prova
FOR INSERT
WITH CHECK (public.is_atendente(auth.uid()));

CREATE POLICY "Admins podem atualizar empréstimos"
ON public.emprestimos_grade_prova
FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Vendedores podem atualizar seus empréstimos"
ON public.emprestimos_grade_prova
FOR UPDATE
USING (
  public.is_vendedor(auth.uid()) AND vendedor_id = auth.uid()
);

CREATE POLICY "Atendentes podem atualizar empréstimos"
ON public.emprestimos_grade_prova
FOR UPDATE
USING (public.is_atendente(auth.uid()));

CREATE POLICY "Apenas admins podem excluir empréstimos"
ON public.emprestimos_grade_prova
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Políticas RLS para emprestimo_grade_itens (herda acesso do pai)
CREATE POLICY "Usuários podem ver itens dos empréstimos que podem ver"
ON public.emprestimo_grade_itens
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.emprestimos_grade_prova e
    WHERE e.id = emprestimo_id
    AND (
      public.is_admin(auth.uid())
      OR public.is_atendente(auth.uid())
      OR public.is_pcp(auth.uid())
      OR (public.is_vendedor(auth.uid()) AND e.vendedor_id = auth.uid())
    )
  )
);

CREATE POLICY "Usuários podem inserir itens nos empréstimos que criaram"
ON public.emprestimo_grade_itens
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.emprestimos_grade_prova e
    WHERE e.id = emprestimo_id
    AND (
      public.is_admin(auth.uid())
      OR public.is_atendente(auth.uid())
      OR (public.is_vendedor(auth.uid()) AND e.vendedor_id = auth.uid())
    )
  )
);

CREATE POLICY "Usuários podem atualizar itens dos empréstimos que podem editar"
ON public.emprestimo_grade_itens
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.emprestimos_grade_prova e
    WHERE e.id = emprestimo_id
    AND (
      public.is_admin(auth.uid())
      OR public.is_atendente(auth.uid())
      OR (public.is_vendedor(auth.uid()) AND e.vendedor_id = auth.uid())
    )
  )
);

CREATE POLICY "Apenas admins podem excluir itens"
ON public.emprestimo_grade_itens
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_emprestimos_grade_prova_updated_at
BEFORE UPDATE ON public.emprestimos_grade_prova
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_emprestimos_grade_cliente ON public.emprestimos_grade_prova(cliente_id);
CREATE INDEX idx_emprestimos_grade_vendedor ON public.emprestimos_grade_prova(vendedor_id);
CREATE INDEX idx_emprestimos_grade_status ON public.emprestimos_grade_prova(status);
CREATE INDEX idx_emprestimos_grade_data_prevista ON public.emprestimos_grade_prova(data_prevista_devolucao);
CREATE INDEX idx_emprestimo_itens_emprestimo ON public.emprestimo_grade_itens(emprestimo_id);

-- Adicionar permissões RBAC
INSERT INTO public.permissions (id, modulo, acao, descricao, categoria) VALUES
  ('grades_prova.visualizar', 'grades_prova', 'visualizar', 'Visualizar empréstimos de grade para prova', 'Vendas'),
  ('grades_prova.criar', 'grades_prova', 'criar', 'Criar novos empréstimos de grade', 'Vendas'),
  ('grades_prova.devolver', 'grades_prova', 'devolver', 'Registrar devolução de empréstimos', 'Vendas'),
  ('grades_prova.excluir', 'grades_prova', 'excluir', 'Excluir empréstimos de grade', 'Vendas')
ON CONFLICT (id) DO NOTHING;