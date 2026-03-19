import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Edit, FileText, Package } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, parseDateString } from '@/lib/formatters';
import { format } from 'date-fns';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions } from '@/hooks/usePermissions';

export default function ClienteDetalhes() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isAdmin, isVendedor } = useUserRole();
  const { can } = usePermissions();
  
  // Permissão para editar cliente
  const podeEditar = isAdmin || isVendedor || can('clientes.editar');

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: propostas = [] } = useQuery({
    queryKey: ['propostas-cliente', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('propostas')
        .select('*, vendedor:profiles!vendedor_id(nome)')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: pedidos = [] } = useQuery({
    queryKey: ['pedidos-cliente', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('pedidos')
        .select('*, vendedor:profiles!vendedor_id(nome)')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <p className="text-center py-8">Carregando...</p>;
  }

  if (!cliente) {
    return <p className="text-center py-8">Cliente não encontrado</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => navigate('/clientes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        {podeEditar && (
          <Button onClick={() => navigate(`/clientes/editar/${id}`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{cliente.nome_razao_social}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">CPF/CNPJ</p>
              <p>{cliente.cpf_cnpj || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Telefone</p>
              <p>{cliente.telefone || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{cliente.email || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">WhatsApp</p>
              <p>{cliente.whatsapp || '-'}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Endereço</p>
            <p>{cliente.endereco || '-'}</p>
          </div>

          {cliente.observacao && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Observações</p>
              <p className="whitespace-pre-wrap">{cliente.observacao}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Propostas ({propostas.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {propostas.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhuma proposta encontrada para este cliente.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {propostas.map((proposta: any) => (
                  <TableRow key={proposta.id}>
                    <TableCell>
                      {format(new Date(proposta.created_at), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{proposta.vendedor?.nome || '-'}</TableCell>
                    <TableCell>{formatCurrency(proposta.valor_total)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          proposta.status === 'ganha'
                            ? 'default'
                            : proposta.status === 'perdida'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {proposta.status === 'ganha'
                          ? 'Ganha'
                          : proposta.status === 'perdida'
                          ? 'Perdida'
                          : proposta.status === 'pendente'
                          ? 'Pendente'
                          : 'Em Negociação'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/propostas/${proposta.id}`)}
                      >
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pedidos ({pedidos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pedidos.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhum pedido encontrado para este cliente.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido: any) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">#{pedido.numero_pedido}</TableCell>
                    <TableCell>
                      {format(parseDateString(pedido.data_pedido) || new Date(), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>{pedido.vendedor?.nome || '-'}</TableCell>
                    <TableCell>{formatCurrency(pedido.valor_total)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pedido.status_pagamento === 'quitado'
                            ? 'default'
                            : pedido.status_pagamento === 'parcial'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {pedido.status_pagamento === 'quitado'
                          ? 'Quitado'
                          : pedido.status_pagamento === 'parcial'
                          ? 'Parcial'
                          : 'Aguardando'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          pedido.status === 'entregue'
                            ? 'default'
                            : pedido.status === 'cancelado'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {pedido.status === 'em_producao'
                          ? 'Em Produção'
                          : pedido.status === 'aguardando_entrega'
                          ? 'Aguardando Entrega'
                          : pedido.status === 'entregue'
                          ? 'Entregue'
                          : 'Cancelado'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/pedidos/${pedido.id}`)}
                      >
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
