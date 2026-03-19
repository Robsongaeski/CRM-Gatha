import { Card, CardContent } from '@/components/ui/card';
import { Truck, Package, DollarSign, FileText } from 'lucide-react';

export function AtendenteWelcome({ nome }: { nome?: string }) {
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="pt-6">
        <h2 className="text-2xl font-bold mb-2">Bem-vindo, {nome}! 👋</h2>
        <p className="text-muted-foreground mb-4">Você está no perfil de Atendente</p>
        
        <div className="space-y-2 text-sm">
          <p className="font-semibold">Suas permissões incluem:</p>
          <ul className="space-y-1 ml-4">
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <span>Gerenciar entregas de pedidos</span>
            </li>
            <li className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span>Alterar status (exceto cancelamento)</span>
            </li>
            <li className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span>Registrar pagamentos</span>
            </li>
            <li className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Adicionar observações</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
