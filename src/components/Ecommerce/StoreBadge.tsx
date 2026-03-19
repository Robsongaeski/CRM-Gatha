import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Store } from 'lucide-react';

interface StoreBadgeProps {
  storeCode: string | null | undefined;
  storeName?: string;
  storeColor?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

// Cores padrão para lojas conhecidas
const defaultStoreColors: Record<string, { name: string; color: string }> = {
  'update': { name: 'Update', color: '#3B82F6' },
  'cloze': { name: 'Cloze', color: '#10B981' },
};

export function StoreBadge({ 
  storeCode, 
  storeName, 
  storeColor, 
  showIcon = false,
  size = 'sm'
}: StoreBadgeProps) {
  const code = storeCode || 'update';
  const defaultInfo = defaultStoreColors[code] || { name: code, color: '#6B7280' };
  
  const name = storeName || defaultInfo.name;
  const color = storeColor || defaultInfo.color;
  
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-2.5 py-1';

  return (
    <Badge 
      variant="outline"
      className={`${sizeClasses} font-medium border`}
      style={{ 
        backgroundColor: `${color}15`,
        borderColor: `${color}40`,
        color: color
      }}
    >
      {showIcon && <Store className="h-3 w-3 mr-1" />}
      {name}
    </Badge>
  );
}

// Componente para usar com dados de lojas carregados
interface StoreBadgeWithDataProps {
  storeCode: string | null | undefined;
  stores?: Array<{ codigo: string; nome: string; cor: string }>;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function StoreBadgeWithData({ 
  storeCode, 
  stores = [],
  showIcon = false,
  size = 'sm'
}: StoreBadgeWithDataProps) {
  const store = stores.find(s => s.codigo === storeCode);
  
  return (
    <StoreBadge
      storeCode={storeCode}
      storeName={store?.nome}
      storeColor={store?.cor}
      showIcon={showIcon}
      size={size}
    />
  );
}
