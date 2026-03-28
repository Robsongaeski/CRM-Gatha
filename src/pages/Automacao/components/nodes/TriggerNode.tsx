import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Zap,
  ShoppingCart,
  RefreshCw,
  Truck,
  Users,
  Clock,
  FileText,
  MessageSquare,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const subtypeIcons: Record<string, React.ReactNode> = {
  order_created: <ShoppingCart className="h-4 w-4" />,
  order_status_changed: <RefreshCw className="h-4 w-4" />,
  order_shipped: <Truck className="h-4 w-4" />,
  lead_created: <Users className="h-4 w-4" />,
  lead_status_changed: <RefreshCw className="h-4 w-4" />,
  pedido_created: <FileText className="h-4 w-4" />,
  whatsapp_message: <MessageSquare className="h-4 w-4" />,
  whatsapp_new_lead: <Users className="h-4 w-4" />,
  whatsapp_inactive: <Clock className="h-4 w-4" />,
  payment_confirmed: <CreditCard className="h-4 w-4" />,
};

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  const subtype = data.subtype as string;
  const config = data.config as any;
  const icon = subtypeIcons[subtype] || <Zap className="h-4 w-4" />;

  const getConfigSummary = () => {
    if (!config) return null;
    const parts: string[] = [];

    if (config.status && config.status !== 'any') {
      parts.push(`Status: ${config.status}`);
    }
    if (subtype === 'whatsapp_inactive') {
      parts.push(`${config.inactivity_days || 3}d sem interacao`);
    }
    if (subtype === 'whatsapp_new_lead' && config.only_unassigned !== false) {
      parts.push('Somente sem atendente');
    }
    if (Array.isArray(config.instance_ids) && config.instance_ids.length > 0) {
      parts.push(`${config.instance_ids.length} instancia(s)`);
    }

    return parts.length > 0 ? parts.join(' | ') : null;
  };

  const configSummary = getConfigSummary();

  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl transition-all duration-200',
        'bg-gradient-to-b from-green-50 to-green-100/50 dark:from-green-950 dark:to-green-900/50',
        'border-2 shadow-lg',
        selected
          ? 'border-green-500 shadow-green-500/25 scale-105'
          : 'border-green-400/50 hover:border-green-400 hover:shadow-green-500/15'
      )}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-md shadow-green-500/30">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
            Gatilho
          </div>
          <div className="text-sm font-semibold text-green-900 dark:text-green-100 truncate">
            {data.label as string}
          </div>
        </div>
      </div>

      {configSummary && (
        <div className="px-4 pb-3">
          <div className="text-xs bg-green-500/10 text-green-700 dark:text-green-300 px-2 py-1 rounded-md truncate">
            {configSummary}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!w-4 !h-4 !-bottom-2 !border-2 !border-background',
          '!bg-gradient-to-b !from-green-400 !to-green-600',
          'transition-transform hover:scale-125'
        )}
      />
    </div>
  );
});

TriggerNode.displayName = 'TriggerNode';
