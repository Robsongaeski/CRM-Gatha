-- Migration: Adicionar suporte para fotos de modelos/estampas em pedido_itens
-- Execute este script no SQL Editor do Lovable Cloud

-- 1. Adicionar coluna para URL da foto do modelo/estampa
ALTER TABLE public.pedido_itens 
ADD COLUMN IF NOT EXISTS foto_modelo_url TEXT;

-- 2. Criar bucket no Storage para fotos de modelos
INSERT INTO storage.buckets (id, name, public)
VALUES ('pedidos-fotos-modelos', 'pedidos-fotos-modelos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage
-- Usuários autenticados podem fazer upload
CREATE POLICY "Usuários autenticados podem fazer upload de fotos de modelos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pedidos-fotos-modelos'
    AND auth.uid() IS NOT NULL
  );

-- Todos podem visualizar (bucket público)
CREATE POLICY "Todos podem visualizar fotos de modelos"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pedidos-fotos-modelos');

-- Usuários autenticados podem deletar suas fotos
CREATE POLICY "Usuários autenticados podem deletar fotos de modelos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pedidos-fotos-modelos'
    AND auth.uid() IS NOT NULL
  );
