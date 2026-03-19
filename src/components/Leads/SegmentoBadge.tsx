import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';

interface SegmentoBadgeProps {
  nome: string;
  cor?: string;
  icone?: string;
  className?: string;
}

export function SegmentoBadge({ nome, cor, icone, className }: SegmentoBadgeProps) {
  const IconComponent = icone && (Icons as any)[icone] ? (Icons as any)[icone] : Icons.Tag;
  
  return (
    <Badge 
      variant="outline" 
      className={`gap-1 ${className}`}
      style={{ borderColor: cor || '#6b7280', color: cor || '#6b7280' }}
    >
      <IconComponent className="h-3 w-3" />
      {nome}
    </Badge>
  );
}
