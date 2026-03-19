import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { sanitizeError } from '@/lib/errorHandling';
import { compressImage } from '@/lib/imageCompression';

interface FotoModeloUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  pedidoId?: string;
  itemIndex: number;
  disabled?: boolean;
}

export function FotoModeloUpload({ value, onChange, pedidoId, itemIndex, disabled = false }: FotoModeloUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, selecione uma imagem JPG, PNG ou WEBP.',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamanho (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O tamanho máximo permitido é 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Comprimir imagem antes do upload
      const compressedFile = await compressImage(file);

      // Deletar foto anterior se existir
      if (value) {
        const oldPath = value.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('pedidos-fotos-modelos')
            .remove([oldPath]);
        }
      }

      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `pedido_${pedidoId || 'temp'}_item_${itemIndex}_${timestamp}.${fileExt}`;

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

      setPreviewUrl(publicUrl);
      onChange(publicUrl);

      toast({
        title: 'Sucesso',
        description: 'Foto do modelo carregada com sucesso!',
      });
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: 'Erro no upload',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

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

      setPreviewUrl(undefined);
      onChange(undefined);

      toast({
        title: 'Foto removida',
        description: 'A foto do modelo foi removida.',
      });
    } catch (error: any) {
      console.error('Erro ao remover foto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível remover a foto.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Foto do Modelo/Estampa</label>
      
      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt="Preview do modelo"
            className="w-32 h-32 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleRemove}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 transition-colors",
            "flex flex-col items-center justify-center gap-2",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-primary/5"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Enviando foto...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Clique para adicionar foto</p>
                <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP (máx. 5MB)</p>
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
