import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Send, Mail, Bell, RefreshCw, Tag, User, Webhook, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

const subtypeIcons: Record<string, React.ReactNode> = {
  send_whatsapp: <MessageSquare className="h-4 w-4" />,
  send_email: <Mail className="h-4 w-4" />,
  create_notification: <Bell className="h-4 w-4" />,
  update_status: <RefreshCw className="h-4 w-4" />,
  add_tag: <Tag className="h-4 w-4" />,
  assign_to_user: <User className="h-4 w-4" />,
  call_webhook: <Webhook className="h-4 w-4" />,
};

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  const subtype = data.subtype as string;
  const config = data.config as any;
  const icon = subtypeIcons[subtype] || <Send className="h-4 w-4" />;
  
  // Get config summary - suporta múltiplos formatos
  const getConfigSummary = () => {
    if (!config) return null;
    if (subtype === 'send_whatsapp') {
      // Suporta message único ou messages array (randômico)
      if (config.message) {
        return config.message.substring(0, 40) + (config.message.length > 40 ? '...' : '');
      }
      if (config.randomMessages && Array.isArray(config.messages) && config.messages.length > 0) {
        return `🎲 ${config.messages.length} mensagens aleatórias`;
      }
    }
    if (subtype === 'send_email' && config.subject) {
      return config.subject.substring(0, 40) + (config.subject.length > 40 ? '...' : '');
    }
    if (subtype === 'call_webhook' && config.webhookUrl) {
      return config.webhookUrl.substring(0, 35) + '...';
    }
    if (subtype === 'update_status') {
      const status = config.newStatus || config.status;
      if (status) return `→ ${status}`;
    }
    if (subtype === 'add_tag') {
      const tagName = config.tag_name || config.tag;
      if (tagName) return `🏷️ ${tagName}`;
    }
    if (subtype === 'remove_tag') {
      const tagName = config.tag_name || config.tag;
      if (tagName) return `❌ ${tagName}`;
    }
    return null;
  };
  
  const configSummary = getConfigSummary();
  
  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl transition-all duration-200',
        'bg-gradient-to-b from-blue-50 to-blue-100/50 dark:from-blue-950 dark:to-blue-900/50',
        'border-2 shadow-lg',
        selected 
          ? 'border-blue-500 shadow-blue-500/25 scale-105' 
          : 'border-blue-400/50 hover:border-blue-400 hover:shadow-blue-500/15'
      )}
    >
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          '!w-4 !h-4 !-top-2 !border-2 !border-background',
          '!bg-gradient-to-b !from-blue-400 !to-blue-600',
          'transition-transform hover:scale-125'
        )}
      />
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Ação
          </div>
          <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 truncate">
            {data.label as string}
          </div>
        </div>
      </div>
      
      {/* Config summary */}
      {configSummary && (
        <div className="px-4 pb-3">
          <div className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md truncate font-mono">
            {configSummary}
          </div>
        </div>
      )}
      
      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!w-4 !h-4 !-bottom-2 !border-2 !border-background',
          '!bg-gradient-to-b !from-blue-400 !to-blue-600',
          'transition-transform hover:scale-125'
        )}
      />
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
