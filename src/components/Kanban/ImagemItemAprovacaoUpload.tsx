import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompression';
import { useQueryClient } from '@tanstack/react-query';

interface ImagemItemAprovacaoUploadProps {
  itemId: string;
  pedidoId: string;
  imagemUrl?: string | null;
  produtoNome?: string;
  disabled?: boolean;
}

export function ImagemItemAprovacaoUpload({ 
  itemId,
  pedidoId,
  imagemUrl, 
  produtoNome = 'Produto',
  disabled = false 
}: ImagemItemAprovacaoUploadProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(imagemUrl || undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Sync previewUrl with prop changes
  useEffect(() => {
    setPreviewUrl(imagemUrl || undefined);
  }, [imagemUrl]);

  const handleUpload = useCallback(async (file: File, targetItemId: string) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Por favor, selecione uma imagem JPG, PNG ou WEBP.');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('O tamanho máximo permitido é 5MB.');
      return;
    }

    setUploading(true);

    try {
      // Comprimir imagem antes do upload
      const compressedFile = await compressImage(file);

      // Deletar imagem anterior se existir
      if (previewUrl) {
        const oldPath = previewUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('pedidos-fotos-modelos')
            .remove([oldPath]);
        }
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `item_${targetItemId}_aprovacao_${timestamp}.${fileExt}`;

      // Upload para o Storage
      const { data, error } = await supabase.storage
        .from('pedidos-fotos-modelos')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('pedidos-fotos-modelos')
        .getPublicUrl(data.path);

      // Atualizar pedido_itens no banco
      const { error: updateError } = await supabase
        .from('pedido_itens')
        .update({ foto_modelo_url: publicUrl })
        .eq('id', targetItemId);

      if (updateError) throw updateError;

      // Verificar se o update foi realmente aplicado (RLS pode bloquear silenciosamente)
      const { data: itemAtualizado, error: verifyError } = await supabase
        .from('pedido_itens')
        .select('foto_modelo_url')
        .eq('id', targetItemId)
        .single();

      if (verifyError) {
        console.error('Erro ao verificar atualização:', verifyError);
      }

      // Se a URL não foi salva, limpar arquivo órfão e reportar erro
      if (!itemAtualizado?.foto_modelo_url || itemAtualizado.foto_modelo_url !== publicUrl) {
        // Limpar arquivo órfão do storage
        await supabase.storage.from('pedidos-fotos-modelos').remove([fileName]);
        throw new Error('Sem permissão para atualizar este item. Contate um administrador.');
      }

      setPreviewUrl(publicUrl);
      
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });

      toast.success(`Imagem do item "${produtoNome}" carregada!`);
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error(sanitizeError(error));
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [previewUrl, pedidoId, produtoNome, queryClient]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file, itemId);
    }
  }, [handleUpload, itemId]);

  // Handle paste events only when this specific component is focused
  useEffect(() => {
    if (!isFocused) return;

    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          event.stopPropagation();
          const file = item.getAsFile();
          if (file) {
            // Use itemId directly from closure - it's stable because effect re-runs when itemId changes
            handleUpload(file, itemId);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste, true);
    return () => {
      document.removeEventListener('paste', handlePaste, true);
    };
  }, [isFocused, handleUpload, itemId]);

  const handleRemove = async () => {
    if (!previewUrl) return;

    try {
      // Deletar do Storage
      const path = previewUrl.split('/').pop();
      if (path) {
        await supabase.storage
          .from('pedidos-fotos-modelos')
          .remove([path]);
      }

      // Atualizar pedido_itens
      const { error } = await supabase
        .from('pedido_itens')
        .update({ foto_modelo_url: null })
        .eq('id', itemId);

      if (error) throw error;

      setPreviewUrl(undefined);
      
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });

      toast.success('Imagem removida');
    } catch (error: any) {
      console.error('Erro ao remover imagem:', error);
      toast.error('Não foi possível remover a imagem');
    }
  };

  return (
    <div className="w-20 flex-shrink-0">
      {previewUrl ? (
        <div className="relative group">
          <div className="w-20 h-20 rounded border border-border overflow-hidden">
            <img 
              src={previewUrl} 
              alt={`Foto ${produtoNome}`}
              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => window.open(previewUrl, '_blank')}
            />
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          tabIndex={0}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "w-20 h-20 border-2 border-dashed rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
            "flex flex-col items-center justify-center gap-1",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-primary/5",
            isFocused && "border-primary bg-primary/5"
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <>
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground text-center px-1">
                {isFocused ? 'Cole (Ctrl+V)' : 'Adicionar foto'}
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={uploading || disabled}
      />
    </div>
  );
}
