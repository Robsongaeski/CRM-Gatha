import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wrench, Printer, AlertCircle, KanbanSquare, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

export default function CadastrosHub() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  const cadastros = [
    {
      title: 'Máquinas e Tipos de Estampa',
      description: 'Gerenciar máquinas de impressão e tipos de estampa',
      icon: Printer,
      path: '/pcp/cadastros/maquinas-estampas',
    },
    {
      title: 'Tipos e Categorias de Falha',
      description: 'Configurar tipos de falhas e suas categorias',
      icon: AlertCircle,
      path: '/pcp/cadastros/falhas',
    },
    {
      title: 'Etapas de Produção',
      description: 'Configurar as colunas do Kanban de produção',
      icon: KanbanSquare,
      path: '/pcp/cadastros/etapas',
    },
    {
      title: 'Categorias E-commerce',
      description: 'Mapear códigos de produtos às categorias para relatórios',
      icon: ShoppingCart,
      path: '/pcp/cadastros/categorias-ecommerce',
      adminOnly: true,
    },
  ];

  const filteredCadastros = cadastros.filter(c => !c.adminOnly || isAdmin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cadastros PCP</h1>
        <p className="text-muted-foreground">
          Configurações e cadastros do módulo de produção
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredCadastros.map((cadastro) => (
          <Card key={cadastro.path} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(cadastro.path)}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <cadastro.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{cadastro.title}</CardTitle>
              </div>
              <CardDescription>{cadastro.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                Acessar
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}
