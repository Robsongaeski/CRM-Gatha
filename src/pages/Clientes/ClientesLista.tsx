import { useSegmentos } from '@/hooks/useSegmentos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions } from '@/hooks/usePermissions';
import { SegmentoBadge } from '@/components/Leads/SegmentoBadge';
import { useClientes, Cliente } from '@/hooks/useClientes';
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
  const [currentPage, setCurrentPage] = useState(1);
  const ITENS_POR_PAGINA = 15;
  const { data: segmentos = [] } = useSegmentos();

  const { data: response, isLoading, isFetching } = useClientes({
    search: search || undefined,
    segmentoId: segmentoFilter !== 'todos' ? segmentoFilter : undefined,
    page: currentPage - 1,
    pageSize: ITENS_POR_PAGINA,
  });

  const { data: clientes = [], totalCount = 0 } = response || {};

  const totalPages = Math.max(1, Math.ceil(totalCount / ITENS_POR_PAGINA));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITENS_POR_PAGINA;
  const paginatedClientes = clientes;
  const inicioItem = totalCount === 0 ? 0 : startIndex + 1;
  const fimItem = Math.min(startIndex + ITENS_POR_PAGINA, totalCount);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, segmentoFilter]);

  // Removido reset automático de página que causava saltos durante o carregamento

  const renderPagination = () => (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Mostrando {inicioItem}-{fimItem} de {totalCount} clientes
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={safeCurrentPage === 1}
        >
          Anterior
        </Button>
        <span className="text-sm text-muted-foreground">
          Pagina {safeCurrentPage} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={safeCurrentPage === totalPages}
        >
          Proxima
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Clientes</h1>
            {isFetching && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </div>
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
          {!isLoading && totalCount > 0 && (
            <div className="mt-4 border-t pt-4">
              {renderPagination()}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && totalCount === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : totalCount === 0 ? (
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
                {paginatedClientes.map((cliente) => (
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
          {!isLoading && totalCount > 0 && (
            <div className="pt-4">
              {renderPagination()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
