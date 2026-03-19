-- Criação do sistema de grades de tamanhos

-- 1. Tabela de templates de grades (reutilizáveis)
CREATE TABLE grades_tamanho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de itens/tamanhos de cada grade
CREATE TABLE grade_tamanho_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_id UUID NOT NULL REFERENCES grades_tamanho(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL,
  nome VARCHAR(50) NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(grade_id, codigo)
);

-- 3. Adicionar coluna em produtos para vincular à grade
ALTER TABLE produtos 
ADD COLUMN grade_tamanho_id UUID REFERENCES grades_tamanho(id);

-- 4. Tabela de quantidades por tamanho nos itens do pedido
CREATE TABLE pedido_item_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_item_id UUID NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
  tamanho_codigo VARCHAR(20) NOT NULL,
  tamanho_nome VARCHAR(50) NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pedido_item_id, tamanho_codigo)
);

-- RLS para grades_tamanho
ALTER TABLE grades_tamanho ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver grades"
ON grades_tamanho FOR SELECT
USING (true);

CREATE POLICY "Admins gerenciam grades"
ON grades_tamanho FOR ALL
USING (is_admin(auth.uid()));

-- RLS para grade_tamanho_itens
ALTER TABLE grade_tamanho_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver itens da grade"
ON grade_tamanho_itens FOR SELECT
USING (true);

CREATE POLICY "Admins gerenciam itens"
ON grade_tamanho_itens FOR ALL
USING (is_admin(auth.uid()));

-- RLS para pedido_item_grades (segue mesma lógica de pedido_itens)
ALTER TABLE pedido_item_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver grades do item"
ON pedido_item_grades FOR SELECT
USING (EXISTS (
  SELECT 1 FROM pedido_itens pi
  JOIN pedidos p ON pi.pedido_id = p.id
  WHERE pi.id = pedido_item_grades.pedido_item_id
    AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()) OR is_atendente(auth.uid()))
));

CREATE POLICY "Inserir grades"
ON pedido_item_grades FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM pedido_itens pi
  JOIN pedidos p ON pi.pedido_id = p.id
  WHERE pi.id = pedido_item_grades.pedido_item_id
    AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()))
));

CREATE POLICY "Atualizar grades"
ON pedido_item_grades FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM pedido_itens pi
  JOIN pedidos p ON pi.pedido_id = p.id
  WHERE pi.id = pedido_item_grades.pedido_item_id
    AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()))
));

CREATE POLICY "Deletar grades"
ON pedido_item_grades FOR DELETE
USING (EXISTS (
  SELECT 1 FROM pedido_itens pi
  JOIN pedidos p ON pi.pedido_id = p.id
  WHERE pi.id = pedido_item_grades.pedido_item_id
    AND (p.vendedor_id = auth.uid() OR is_admin(auth.uid()))
));

-- Inserir grades padrão
INSERT INTO grades_tamanho (id, nome, descricao) VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'Adulto Padrão', 'Tamanhos PP ao EXGG'),
  ('b2222222-2222-2222-2222-222222222222', 'Numérica Calças', 'Tamanhos 36 ao 48');

-- Tamanhos da grade Adulto Padrão
INSERT INTO grade_tamanho_itens (grade_id, codigo, nome, ordem) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'PP', 'PP', 1),
  ('a1111111-1111-1111-1111-111111111111', 'P', 'P', 2),
  ('a1111111-1111-1111-1111-111111111111', 'M', 'M', 3),
  ('a1111111-1111-1111-1111-111111111111', 'G', 'G', 4),
  ('a1111111-1111-1111-1111-111111111111', 'GG', 'GG', 5),
  ('a1111111-1111-1111-1111-111111111111', 'EXG', 'EXG', 6),
  ('a1111111-1111-1111-1111-111111111111', 'EXGG', 'EXGG', 7);

-- Tamanhos da grade Numérica
INSERT INTO grade_tamanho_itens (grade_id, codigo, nome, ordem) VALUES
  ('b2222222-2222-2222-2222-222222222222', '36', '36', 1),
  ('b2222222-2222-2222-2222-222222222222', '38', '38', 2),
  ('b2222222-2222-2222-2222-222222222222', '40', '40', 3),
  ('b2222222-2222-2222-2222-222222222222', '42', '42', 4),
  ('b2222222-2222-2222-2222-222222222222', '44', '44', 5),
  ('b2222222-2222-2222-2222-222222222222', '46', '46', 6),
  ('b2222222-2222-2222-2222-222222222222', '48', '48', 7);

-- Trigger para atualizar updated_at em grades_tamanho
CREATE TRIGGER update_grades_tamanho_updated_at
BEFORE UPDATE ON grades_tamanho
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();