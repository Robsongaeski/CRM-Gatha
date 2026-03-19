import { Badge } from '@/components/ui/badge';

const statusConfig = {
  novo: { label: 'Novo', variant: 'default' as const, color: 'bg-blue-500/10 text-blue-600' },
  contatando: { label: 'Contatando', variant: 'secondary' as const, color: 'bg-yellow-500/10 text-yellow-600' },
  qualificado: { label: 'Qualificado', variant: 'default' as const, color: 'bg-green-500/10 text-green-600' },
  nao_qualificado: { label: 'Não Qualificado', variant: 'destructive' as const, color: 'bg-red-500/10 text-red-600' },
  convertido: { label: 'Convertido', variant: 'default' as const, color: 'bg-purple-500/10 text-purple-600' },
  perdido: { label: 'Perdido', variant: 'outline' as const, color: 'bg-gray-500/10 text-gray-600' },
};

interface LeadStatusBadgeProps {
  status: keyof typeof statusConfig;
  className?: string;
}

export function LeadStatusBadge({ status, className }: LeadStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge variant={config.variant} className={`${config.color} ${className}`}>
      {config.label}
    </Badge>
  );
}
