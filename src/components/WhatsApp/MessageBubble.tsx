import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, CheckCheck, X, Clock, AlertTriangle, Download, FileIcon, Reply, Forward, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
interface Message {
  id: string;
  direction: 'incoming' | 'outgoing';
  type: string;
  content: string | null;
  sender_phone?: string | null;
  media_url: string | null;
  media_mimetype: string | null;
  status: string | null;
  created_at: string;
  quoted_message?: {
    content: string;
  } | null;
}

// Regex para detectar URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

// Função para renderizar texto com links clicáveis
const renderTextWithLinks = (text: string) => {
  const parts = text.split(URL_REGEX);
  
  return parts.map((part, index) => {
    if (URL_REGEX.test(part)) {
      // Reset do regex pois é global
      URL_REGEX.lastIndex = 0;
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#027eb5] hover:underline break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

interface MessageBubbleProps {
  message: Message;
  instanceName?: string;
  senderName?: string;
  isGroup?: boolean;
  onReply?: (message: Message) => void;
  onForward?: (message: Message) => void;
}

export default function MessageBubble({ message, senderName, isGroup = false, onReply, onForward }: MessageBubbleProps) {
  const isOutgoing = message.direction === 'outgoing';
  const isSystemMessage = message.type === 'system';
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const incomingGroupSender = !isOutgoing && isGroup
    ? (senderName?.trim() || message.sender_phone || null)
    : null;

  // Renderizar mensagem de sistema (interna, não visível ao cliente)
  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-3">
        <div className="bg-[#e7f3ff] text-[#3b5998] text-xs px-4 py-2 rounded-lg max-w-[85%] text-center shadow-sm border border-[#d0e3f7]">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <span className="text-[10px] text-[#667781] mt-1 block">
            {format(new Date(message.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    );
  }
  const handleImageClick = (url: string) => {
    setModalImageUrl(url);
    setImageModalOpen(true);
  };

  const renderMedia = () => {
    const mimetype = message.media_mimetype || '';

    // Se tem URL de mídia
    if (message.media_url) {
      if (message.type === 'sticker') {
        return (
          <img
            src={message.media_url}
            alt="Sticker"
            className="max-w-[180px] rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
            onClick={() => handleImageClick(message.media_url!)}
          />
        );
      }

      if (mimetype.startsWith('image/') || message.type === 'image') {
        return (
          <img
            src={message.media_url}
            alt="Imagem"
            className="max-w-[300px] rounded-lg mb-1 cursor-pointer hover:opacity-90 transition-opacity"
            loading="lazy"
            onClick={() => handleImageClick(message.media_url!)}
          />
        );
      }

      if (mimetype.startsWith('video/') || message.type === 'video') {
        return (
          <video
            src={message.media_url}
            controls
            className="max-w-[300px] rounded-lg mb-1"
          />
        );
      }

      if (mimetype.startsWith('audio/') || message.type === 'audio') {
        return <audio src={message.media_url} controls className="max-w-[250px]" />;
      }

      // Document or other file - extract filename from URL or content
      const getFileName = () => {
        // Try to get filename from content (usually contains the original filename)
        if (message.content && !message.content.includes('http')) {
          return message.content;
        }
        // Try to extract from URL
        try {
          const url = new URL(message.media_url!);
          const pathParts = url.pathname.split('/');
          const filename = pathParts[pathParts.length - 1];
          if (filename && filename.length > 0) {
            return decodeURIComponent(filename);
          }
        } catch {
          // ignore
        }
        return 'Arquivo';
      };

      const fileName = getFileName();
      const fileExtension = fileName.split('.').pop()?.toUpperCase() || 'FILE';
      
      // Get file size hint from mimetype if available
      const getFileTypeLabel = () => {
        if (mimetype.includes('pdf')) return 'PDF';
        if (mimetype.includes('word') || mimetype.includes('document')) return 'DOC';
        if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'XLS';
        if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'PPT';
        return fileExtension;
      };

      return (
        <a
          href={message.media_url}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-[#f0f2f5] hover:bg-[#e4e6e9] rounded-lg p-3 mb-1 transition-colors min-w-[200px]"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-[#8696a0] rounded flex items-center justify-center">
            <FileIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#111b21] truncate" title={fileName}>
              {fileName}
            </p>
            <p className="text-xs text-[#667781]">{getFileTypeLabel()}</p>
          </div>
          <div className="flex-shrink-0">
            <Download className="h-5 w-5 text-[#8696a0]" />
          </div>
        </a>
      );
    }

    // Fallback: mídia sem URL (falha no download)
    if (message.type === 'image' && !message.media_url) {
      return (
        <div className="bg-[#f0f2f5] rounded-lg p-4 mb-1 text-center">
          <span className="text-2xl">📷</span>
          <p className="text-xs text-[#667781] mt-1">Imagem não disponível</p>
        </div>
      );
    }

    if (message.type === 'video' && !message.media_url) {
      return (
        <div className="bg-[#f0f2f5] rounded-lg p-4 mb-1 text-center">
          <span className="text-2xl">🎥</span>
          <p className="text-xs text-[#667781] mt-1">Vídeo não disponível</p>
        </div>
      );
    }

    if (message.type === 'audio' && !message.media_url) {
      return (
        <div className="bg-[#f0f2f5] rounded-lg p-4 mb-1 text-center">
          <span className="text-2xl">🎵</span>
          <p className="text-xs text-[#667781] mt-1">Áudio não disponível</p>
        </div>
      );
    }

    if (message.type === 'document' && !message.media_url) {
      return (
        <div className="bg-[#f0f2f5] rounded-lg p-4 mb-1 text-center">
          <span className="text-2xl">📄</span>
          <p className="text-xs text-[#667781] mt-1">Documento não disponível</p>
        </div>
      );
    }

    if (message.type === 'sticker' && !message.media_url) {
      return (
        <div className="bg-[#f0f2f5] rounded-lg p-4 mb-1 text-center">
          <span className="text-2xl">🏷️</span>
          <p className="text-xs text-[#667781] mt-1">Sticker</p>
        </div>
      );
    }

    if (message.type === 'contact') {
      return (
        <div className="bg-[#f0f2f5] rounded-lg p-3 mb-1">
          <p className="text-xs font-medium text-[#54656f] mb-1">Contato</p>
          <p className="text-sm text-[#111b21] break-words whitespace-pre-wrap">
            {message.content || '[Contato]'}
          </p>
        </div>
      );
    }

    return null;
  };

  const renderStatus = () => {
    if (!isOutgoing) return null;

    const status = message.status?.toLowerCase();

    switch (status) {
      case 'queued':
        // Mensagem na fila (instância offline)
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Aguardando instância reconectar</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case 'pending':
      case 'sending':
        // Relógio ou check único cinza claro para mensagem pendente
        return <Clock className="h-3.5 w-3.5 text-[#8696a0]/60" />;
      case 'sent':
      case 'server_ack':
        return <Check className="h-3.5 w-3.5 text-[#8696a0]" />;
      case 'delivered':
      case 'delivery_ack':
        return <CheckCheck className="h-3.5 w-3.5 text-[#8696a0]" />;
      case 'read':
      case 'read_ack':
      case 'played':
        return <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />;
      case 'error':
      case 'failed':
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <X className="h-3.5 w-3.5 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Erro ao enviar mensagem</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        // Se não tem status definido, mostra check pendente
        return <Check className="h-3.5 w-3.5 text-[#8696a0]/60" />;
    }
  };

  return (
    <>
      <div className={cn('flex mb-0.5 group', isOutgoing ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'max-w-[65%] rounded-[7.5px] px-2 py-1 shadow-sm relative',
            isOutgoing
              ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-[0px]'
              : 'bg-white text-[#111b21] rounded-tl-[0px]'
          )}
        >
          {/* Tail do balão usando SVG puro estilo WhatsApp */}
          <div className={cn(
            'absolute top-0 w-[8px] h-[13px]',
            isOutgoing ? '-right-[8px] text-[#d9fdd3]' : '-left-[8px] text-white scale-x-[-1]'
          )}>
            <svg viewBox="0 0 8 13" width="8" height="13" className="fill-current">
              <path d="M5.188 1H0v11.156C0 12.156 1.188 13 2.188 13c3.812 0 5.812-4 5.812-4V1H5.188z" />
            </svg>
          </div>
          
          {isOutgoing && senderName && (
            <div className="text-[10px] font-medium text-[#5e6c76] mb-1 leading-tight flex items-center gap-1">
              👤 {senderName}
            </div>
          )}
          {incomingGroupSender && (
            <div className="text-[11px] font-semibold text-[#5e6c76] mb-1 leading-tight">
              {incomingGroupSender}
            </div>
          )}
          {/* Removido o nome da instância para mensagens recebidas conforme solicitado */}
          {message.quoted_message && (
            <div className="text-xs mb-1 p-2 rounded bg-[#d1f4cc] border-l-4 border-[#06cf9c]">
              <p className="text-[#667781] line-clamp-2">{message.quoted_message.content}</p>
            </div>
          )}
          {renderMedia()}
          {message.content && message.type !== 'contact' && (
            <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[19px] inline-block float-left">
              {renderTextWithLinks(message.content)}
              <span className="inline-block w-[60px] h-[1px]" />
            </p>
          )}
          <div className="float-right flex items-center justify-end gap-1 mt-[2px] ml-2 absolute bottom-1 right-2">
            <span className="text-[11px] text-[#667781] leading-[15px]">
              {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
            </span>
            {renderStatus()}
          </div>
          <div className="clear-both" />

          {/* Botões de ação (Responder/Encaminhar) - Aparecem no hover do container pai */}
          <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-inherit rounded-bl-lg pl-1 pb-1 z-10">
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="p-1.5 hover:bg-black/5 rounded-full text-[#667781] transition-colors"
                title="Responder"
              >
                <Reply className="h-4 w-4" />
              </button>
            )}
            {onForward && (
              <button
                onClick={() => onForward(message)}
                className="p-1.5 hover:bg-black/5 rounded-full text-[#667781] transition-colors"
                title="Encaminhar"
              >
                <Forward className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal para imagem ampliada */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-black/90 border-none">
          <button
            onClick={() => setImageModalOpen(false)}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          {modalImageUrl && (
            <img
              src={modalImageUrl}
              alt="Imagem ampliada"
              className="w-full h-full object-contain max-h-[85vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
