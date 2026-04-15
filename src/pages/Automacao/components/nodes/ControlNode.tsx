import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, Calendar, Split, StopCircle, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

const subtypeIcons: Record<string, React.ReactNode> = {
  delay: <Clock className="h-4 w-4" />,
  schedule: <Calendar className="h-4 w-4" />,
  business_hours_handoff: <Clock className="h-4 w-4" />,
  split_ab: <Split className="h-4 w-4" />,
  limit_rate: <Gauge className="h-4 w-4" />,
  stop_flow: <StopCircle className="h-4 w-4" />,
};

export const ControlNode = memo(({ data, selected }: NodeProps) => {
  const subtype = data.subtype as string;
  const config = data.config as any;
  const icon = subtypeIcons[subtype] || <Clock className="h-4 w-4" />;
  const isStopNode = subtype === 'stop_flow';
  
  // Get config summary - suporta ambos formatos: delay/delayUnit e amount/unit
  const getConfigSummary = () => {
    if (!config) return null;
    if (subtype === 'delay') {
      const delayValue = config.delay || config.amount;
      const delayUnit = config.delayUnit || config.unit;
      if (delayValue) {
        const unitLabels: Record<string, string> = {
          minutes: 'min',
          hours: 'h',
          days: 'd',
        };
        return `Aguardar ${delayValue} ${unitLabels[delayUnit] || 'min'}`;
      }
    }
    if (subtype === 'schedule' && config.time) {
      return `Às ${config.time}`;
    }
    if (subtype === 'split_ab') {
      return `${config.splitPercentage || 50}% / ${100 - (config.splitPercentage || 50)}%`;
    }
    if (subtype === 'limit_rate' && config.limit) {
      return `Máx ${config.limit}/${config.period || 'hour'}`;
    }
    if (subtype === 'business_hours_handoff') {
      const enabled = config.enabled !== false;
      const limit = Math.max(1, Number(config.limit_per_run || config.handoff_limit || 80) || 80);
      return `${enabled ? 'Ativo' : 'Inativo'} • Limite ${limit}`;
    }
    return null;
  };
  
  const configSummary = getConfigSummary();
  
  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl transition-all duration-200',
        'bg-gradient-to-b from-purple-50 to-purple-100/50 dark:from-purple-950 dark:to-purple-900/50',
        'border-2 shadow-lg',
        selected 
          ? 'border-purple-500 shadow-purple-500/25 scale-105' 
          : 'border-purple-400/50 hover:border-purple-400 hover:shadow-purple-500/15'
      )}
    >
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          '!w-4 !h-4 !-top-2 !border-2 !border-background',
          '!bg-gradient-to-b !from-purple-400 !to-purple-600',
          'transition-transform hover:scale-125'
        )}
      />
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Controle
          </div>
          <div className="text-sm font-semibold text-purple-900 dark:text-purple-100 truncate">
            {data.label as string}
          </div>
        </div>
      </div>
      
      {/* Config summary */}
      {configSummary && (
        <div className="px-4 pb-3">
          <div className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md truncate font-medium">
            {configSummary}
          </div>
        </div>
      )}
      
      {/* Source handle (except for stop node) */}
      {!isStopNode && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={cn(
            '!w-4 !h-4 !-bottom-2 !border-2 !border-background',
            '!bg-gradient-to-b !from-purple-400 !to-purple-600',
            'transition-transform hover:scale-125'
          )}
        />
      )}
    </div>
  );
});

ControlNode.displayName = 'ControlNode';
