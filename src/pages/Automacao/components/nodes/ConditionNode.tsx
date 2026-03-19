import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ConditionNode = memo(({ data, selected }: NodeProps) => {
  const config = data.config as any;
  
  const subtype = data.subtype as string;
  
  // Get config summary - suporta condições especiais
  const getConfigSummary = () => {
    if (!config) return null;
    
    // Condições especiais
    if (subtype === 'exit_condition' && config.exitOnStatus) {
      const statuses = Array.isArray(config.exitOnStatus) ? config.exitOnStatus : [config.exitOnStatus];
      return `Sai se: ${statuses.slice(0, 2).join(', ')}${statuses.length > 2 ? '...' : ''}`;
    }
    if (subtype === 'wait_for_status' && config.targetStatus) {
      return `Aguarda: ${config.targetStatus}`;
    }
    if (subtype === 'wait_for_stage' && config.targetStage) {
      return `Aguarda etapa: ${config.targetStage}`;
    }
    if (subtype === 'time_condition') {
      return `${config.startTime || '08:00'} - ${config.endTime || '18:00'}`;
    }
    if (subtype === 'field_contains' && config.field) {
      return `${config.field} contém "${config.value || ''}"`;
    }
    
    // Condição padrão
    if (!config.field) return null;
    const operator = config.operator || 'equals';
    const operatorLabels: Record<string, string> = {
      equals: '=',
      not_equals: '≠',
      contains: '∋',
      greater: '>',
      less: '<',
      is_empty: 'vazio',
      is_not_empty: '!vazio',
    };
    return `${config.field} ${operatorLabels[operator] || operator} ${config.value || ''}`;
  };
  
  const configSummary = getConfigSummary();
  
  return (
    <div
      className={cn(
        'min-w-[200px] rounded-xl transition-all duration-200',
        'bg-gradient-to-b from-amber-50 to-amber-100/50 dark:from-amber-950 dark:to-amber-900/50',
        'border-2 shadow-lg',
        selected 
          ? 'border-amber-500 shadow-amber-500/25 scale-105' 
          : 'border-amber-400/50 hover:border-amber-400 hover:shadow-amber-500/15'
      )}
    >
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          '!w-4 !h-4 !-top-2 !border-2 !border-background',
          '!bg-gradient-to-b !from-amber-400 !to-amber-600',
          'transition-transform hover:scale-125'
        )}
      />
      
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-amber-500/30">
          <GitBranch className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Condição
          </div>
          <div className="text-sm font-semibold text-amber-900 dark:text-amber-100 truncate">
            {data.label as string}
          </div>
        </div>
      </div>
      
      {/* Config summary */}
      {configSummary && (
        <div className="px-4 pb-2">
          <div className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-md truncate font-mono">
            {configSummary}
          </div>
        </div>
      )}
      
      {/* Yes/No labels */}
      <div className="flex justify-between px-4 pb-3 text-xs">
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <Check className="h-3 w-3" />
          <span className="font-medium">Sim</span>
        </div>
        <div className="flex items-center gap-1 text-red-500 dark:text-red-400">
          <X className="h-3 w-3" />
          <span className="font-medium">Não</span>
        </div>
      </div>
      
      {/* Source handles for Yes/No */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: '25%' }}
        className={cn(
          '!w-4 !h-4 !-bottom-2 !border-2 !border-background',
          '!bg-gradient-to-b !from-green-400 !to-green-600',
          'transition-transform hover:scale-125'
        )}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: '75%' }}
        className={cn(
          '!w-4 !h-4 !-bottom-2 !border-2 !border-background',
          '!bg-gradient-to-b !from-red-400 !to-red-600',
          'transition-transform hover:scale-125'
        )}
      />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';
