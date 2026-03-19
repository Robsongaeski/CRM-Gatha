import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSegmentos } from '@/hooks/useSegmentos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions } from '@/hooks/usePermissions';
import { SegmentoBadge } from '@/components/Leads/SegmentoBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ClientesLista() {
  const navigate = useNavigate();
  const { isAdmin, isVendedor } = useUserRole();
  const { can } = usePermissions();
  const podeCriar = isAdmin || isVendedor || can('clientes.criar');
  const podeEditar = isAdmin || isVendedor || can('clientes.editar');
  const [search, setSearch] = useState('');
  const [segmentoFilter, setSegmentoFilter] = useState<string>('todos');
  const { data: segmentos = [] } = useSegmentos();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes', search, segmentoFilter],
    queryFn: async () => {
      let query = supabase
        .from('clientes')
        .select(`*, segmento:segmentos(nome, cor, icone)`) as any;
      
      query = query.order('created_at', { ascending: false });
      
      // Busca por texto normal (nome, responsável, cpf, email)
      const searchLower = search.toLowerCase().trim();
      const searchDigits = search.replace(/\D/g, '');
      
      if (search && !searchDigits) {
        // Busca apenas por texto (sem dígitos)
        query = query.or(`nome_razao_social.ilike.%${search}%,responsavel.ilike.%${search}%,cpf_cnpj.ilike.%${search}%,email.ilike.%${search}%`);
      }

      if (segmentoFilter && segmentoFilter !== 'todos') {
        query = query.eq('segmento_id', segmentoFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      // Filtrar client-side para telefone (compara apenas dígitos)
      if (searchDigits) {
        return (data as any[]).filter((cliente) => {
          const telefoneDigits = cliente.telefone?.replace(/\D/g, '') || '';
          const whatsappDigits = cliente.whatsapp?.replace(/\D/g, '') || '';
          const cpfCnpjDigits = cliente.cpf_cnpj?.replace(/\D/g, '') || '';
          const nomeMatch = cliente.nome_razao_social?.toLowerCase().includes(searchLower);
          const responsavelMatch = cliente.responsavel?.toLowerCase().includes(searchLower);
          
          return telefoneDigits.includes(searchDigits) || 
                 whatsappDigits.includes(searchDigits) ||
                 cpfCnpjDigits.includes(searchDigits) ||
                 nomeMatch ||
                 responsavelMatch;
        });
      }
      
      return data as any[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes</p>
        </div>
        {podeCriar && (
          <Button onClick={() => navigate('/clientes/novo')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por responsável, empresa, CPF/CNPJ, email ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={segmentoFilter} onValueChange={setSegmentoFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os segmentos</SelectItem>
                {segmentos.map((seg) => (
                  <SelectItem key={seg.id} value={seg.id}>
                    {seg.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : clientes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Responsável / Empresa</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">
                      {cliente.responsavel && (
                        <span className="block text-primary">{cliente.responsavel}</span>
                      )}
                      <span className={cliente.responsavel ? "text-muted-foreground text-sm" : ""}>
                        {cliente.nome_razao_social}
                      </span>
                    </TableCell>
                    <TableCell>
                      {cliente.segmento ? (
                        <SegmentoBadge 
                          nome={cliente.segmento.nome}
                          cor={cliente.segmento.cor}
                          icone={cliente.segmento.icone}
                        />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{cliente.cpf_cnpj || '-'}</TableCell>
                    <TableCell>{cliente.email || '-'}</TableCell>
                    <TableCell>{cliente.telefone || '-'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/clientes/${cliente.id}`)}
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
