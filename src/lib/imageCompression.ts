/**
 * Comprime imagens client-side usando Canvas API.
 * Redimensiona para maxSize no maior lado e comprime como JPEG.
 * Sem dependências externas.
 */
export async function compressImage(
  file: File | Blob,
  maxSize = 1200,
  quality = 0.7
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Se não é imagem, retorna sem compactar
    const type = file instanceof File ? file.type : (file as Blob).type;
    if (!type.startsWith('image/')) {
      resolve(file instanceof File ? file : new File([file], 'image.jpg', { type }));
      return;
    }

    const img = new window.Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Redimensionar se necessário
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file instanceof File ? file : new File([file], 'image.jpg', { type }));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Comprimir como JPEG (melhor compressão para fotos)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file instanceof File ? file : new File([file], 'image.jpg', { type }));
            return;
          }

          const originalName = file instanceof File ? file.name.replace(/\.[^.]+$/, '.jpg') : 'compressed.jpg';
          const compressed = new File([blob], originalName, { type: 'image/jpeg' });

          console.log(
            `[imageCompression] ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${Math.round((1 - compressed.size / file.size) * 100)}% redução)`
          );

          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Em caso de erro, retorna original
      resolve(file instanceof File ? file : new File([file], 'image.jpg', { type }));
    };

    img.src = url;
  });
}
