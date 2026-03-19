import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Check, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/imageCompression';
import { useQueryClient } from '@tanstack/react-query';

interface ImagemAprovacaoUploadProps {
  pedidoId: string;
  imagemUrl?: string | null;
  imagemAprovada?: boolean;
  disabled?: boolean;
}

export function ImagemAprovacaoUpload({ 
  pedidoId, 
  imagemUrl, 
  imagemAprovada = false,
  disabled = false 
}: ImagemAprovacaoUploadProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(imagemUrl || undefined);
  const [aprovada, setAprovada] = useState(imagemAprovada);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleUpload = useCallback(async (file: File) => {
    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Por favor, selecione uma imagem JPG, PNG ou WEBP.');
      return;
    }

    // Validar tamanho (5MB)
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
            .from('pedidos-aprovacao')
            .remove([oldPath]);
        }
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `pedido_${pedidoId}_aprovacao_${timestamp}.${fileExt}`;

      // Upload para o Storage
      const { data, error } = await supabase.storage
        .from('pedidos-aprovacao')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('pedidos-aprovacao')
        .getPublicUrl(data.path);

      // Atualizar pedido no banco
      const { error: updateError } = await supabase
        .from('pedidos')
        .update({ 
          imagem_aprovacao_url: publicUrl,
          imagem_aprovada: false
        })
        .eq('id', pedidoId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      setAprovada(false);
      
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });

      toast.success('Imagem de aprovação carregada!');
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }, [pedidoId, previewUrl, queryClient]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
  };

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
            handleUpload(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste, true);
    return () => {
      document.removeEventListener('paste', handlePaste, true);
    };
  }, [isFocused, handleUpload]);

  const handleRemove = async () => {
    if (!previewUrl) return;

    try {
      // Deletar do Storage
      const path = previewUrl.split('/').pop();
      if (path) {
        await supabase.storage
          .from('pedidos-aprovacao')
          .remove([path]);
      }

      // Atualizar pedido
      const { error } = await supabase
        .from('pedidos')
        .update({ 
          imagem_aprovacao_url: null,
          imagem_aprovada: false
        })
        .eq('id', pedidoId);

      if (error) throw error;

      setPreviewUrl(undefined);
      setAprovada(false);
      
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });

      toast.success('Imagem removida');
    } catch (error: any) {
      console.error('Erro ao remover imagem:', error);
      toast.error('Não foi possível remover a imagem');
    }
  };

  const handleToggleAprovada = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ imagem_aprovada: checked })
        .eq('id', pedidoId);

      if (error) throw error;

      setAprovada(checked);
      
      queryClient.invalidateQueries({ queryKey: ['pedido', pedidoId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-kanban'] });

      toast.success(checked ? 'Imagem marcada como aprovada!' : 'Aprovação removida');
    } catch (error) {
      console.error('Erro ao atualizar aprovação:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        <h3 className="font-semibold text-sm">IMAGEM DE APROVAÇÃO</h3>
      </div>
      
      {previewUrl ? (
        <div className="space-y-3">
          <div className="relative inline-block">
            <img
              src={previewUrl}
              alt="Imagem de aprovação"
              className={cn(
                "max-w-full max-h-48 object-contain rounded-lg border-2 cursor-pointer hover:opacity-90 transition-opacity",
                aprovada ? "border-green-500" : "border-border"
              )}
              onClick={() => window.open(previewUrl, '_blank')}
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent && !parent.querySelector('.img-error-msg')) {
                  const msg = document.createElement('p');
                  msg.className = 'img-error-msg text-xs text-destructive';
                  msg.textContent = 'Erro ao carregar imagem. Tente reenviar.';
                  parent.appendChild(msg);
                }
              }}
            />
            {aprovada && (
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                <Check className="h-4 w-4" />
              </div>
            )}
            {!disabled && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemove}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Checkbox 
              id="aprovada" 
              checked={aprovada}
              onCheckedChange={handleToggleAprovada}
              disabled={disabled}
            />
            <Label 
              htmlFor="aprovada" 
              className={cn(
                "text-sm font-medium cursor-pointer",
                aprovada && "text-green-600"
              )}
            >
              Imagem Aprovada
            </Label>
          </div>
        </div>
      ) : (
        <div
          ref={containerRef}
          tabIndex={0}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "flex flex-col items-center justify-center gap-2",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-primary/5",
            isFocused && "border-primary bg-primary/5"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Enviando imagem...</p>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <Clipboard className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Clique para selecionar ou cole uma imagem (Ctrl+V)</p>
                <p className="text-xs text-muted-foreground">Dica: Tire um print e cole diretamente aqui!</p>
              </div>
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
