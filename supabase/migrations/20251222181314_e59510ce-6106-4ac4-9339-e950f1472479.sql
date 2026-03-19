-- Adicionar campos para imagem de aprovação no pedido
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS imagem_aprovacao_url TEXT,
ADD COLUMN IF NOT EXISTS imagem_aprovada BOOLEAN DEFAULT FALSE;

-- Criar bucket para imagens de aprovação se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('pedidos-aprovacao', 'pedidos-aprovacao', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket de aprovação
CREATE POLICY "Qualquer um pode ver imagens de aprovação"
ON storage.objects FOR SELECT
USING (bucket_id = 'pedidos-aprovacao');

CREATE POLICY "Usuários autenticados podem fazer upload de imagens de aprovação"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pedidos-aprovacao' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem atualizar imagens de aprovação"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pedidos-aprovacao' AND auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem deletar imagens de aprovação"
ON storage.objects FOR DELETE
USING (bucket_id = 'pedidos-aprovacao' AND auth.role() = 'authenticated');