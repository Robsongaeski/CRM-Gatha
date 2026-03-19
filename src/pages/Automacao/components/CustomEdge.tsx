import React, { useState } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, useReactFlow } from '@xyflow/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const edgeColors = {
  yes: { stroke: '#22c55e', label: 'Sim' },
  no: { stroke: '#ef4444', label: 'Não' },
  default: { stroke: 'hsl(var(--primary))', label: '' },
};

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  sourceHandleId,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { setEdges } = useReactFlow();
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeType = sourceHandleId === 'yes' ? 'yes' : sourceHandleId === 'no' ? 'no' : 'default';
  const { stroke, label } = edgeColors[edgeType];

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  // Calcular posição do botão de delete (no meio da edge)
  const deleteButtonX = labelX;
  const deleteButtonY = labelY;

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        style={{
          stroke: 'transparent',
          strokeWidth: 20,
          fill: 'none',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <path
        id={id}
        style={{
          ...style,
          stroke,
          strokeWidth: isHovered ? 3 : 2,
        }}
        className="react-flow__edge-path transition-all duration-200"
        d={edgePath}
        markerEnd={markerEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      {/* Arrow marker */}
      <path
        d={edgePath}
        style={{
          stroke: 'none',
          fill: 'none',
        }}
        markerEnd={`url(#arrow-${edgeType})`}
      />
      
      <EdgeLabelRenderer>
        {/* Delete button - appears on hover */}
        {isHovered && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${deleteButtonX}px,${deleteButtonY - (label ? 20 : 0)}px)`,
              pointerEvents: 'all',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <button
              onClick={handleDelete}
              className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md transition-all duration-150 hover:scale-110"
              title="Excluir conexão"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        
        {/* Label for condition edges */}
        {label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-medium shadow-sm',
              edgeType === 'yes' && 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
              edgeType === 'no' && 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {label}
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

// SVG markers for arrows
export function EdgeMarkerDefs() {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
      <defs>
        <marker
          id="arrow-yes"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#22c55e" />
        </marker>
        <marker
          id="arrow-no"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
        </marker>
        <marker
          id="arrow-default"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
        </marker>
      </defs>
    </svg>
  );
}
