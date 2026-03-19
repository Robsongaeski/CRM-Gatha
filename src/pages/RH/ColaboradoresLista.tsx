import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColaboradores } from '@/hooks/rh/useColaboradores';
import { useSetores } from '@/hooks/rh/useSetores';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Search, Users, Calendar, Briefcase, Phone, Mail, 
  Eye, Edit, UserX, Cake, Building2, Filter
} from 'lucide-react';
import { format, differenceInYears, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ColaboradoresLista() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('ativos');
  const [setorFilter, setSetorFilter] = useState<string>('');
  
  const { colaboradores, isLoading } = useColaboradores({
    ativo: statusFilter === 'todos' ? undefined : statusFilter === 'ativos',
    setor_id: setorFilter || undefined,
  });
  const { setores } = useSetores();

  const filteredColaboradores = colaboradores.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.cargo.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const calcularTempoEmpresa = (dataAdmissao: string) => {
    const anos = differenceInYears(new Date(), parseISO(dataAdmissao));
    if (anos === 0) {
      const meses = Math.floor(differenceInDays(new Date(), parseISO(dataAdmissao)) / 30);
      return `${meses} meses`;
    }
    return `${anos} ano${anos > 1 ? 's' : ''}`;
  };

  const isAniversarioProximo = (dataNascimento: string | null) => {
    if (!dataNascimento) return false;
    const hoje = new Date();
    const nascimento = parseISO(dataNascimento);
    const aniversarioEsteAno = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate());
    const diff = differenceInDays(aniversarioEsteAno, hoje);
    return diff >= 0 && diff <= 7;
  };

  const formatTipoContrato = (tipo: string) => {
    const tipos: Record<string, string> = {
      clt: 'CLT',
      pj: 'PJ',
      estagio: 'Estágio',
      temporario: 'Temporário',
      aprendiz: 'Aprendiz',
    };
    return tipos[tipo] || tipo;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Colaboradores
          </h1>
          <p className="text-muted-foreground">
            {filteredColaboradores.length} colaborador{filteredColaboradores.length !== 1 ? 'es' : ''} encontrado{filteredColaboradores.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => navigate('/rh/colaboradores/novo')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Colaborador
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cargo ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativos">Ativos</SelectItem>
                <SelectItem value="inativos">Inativos</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={setorFilter || "all"} onValueChange={(v) => setSetorFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Todos os setores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {setores.map(setor => (
                  <SelectItem key={setor.id} value={setor.id}>{setor.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filteredColaboradores.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhum colaborador encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Cargo / Setor</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColaboradores.map((colaborador) => (
                  <TableRow key={colaborador.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          {colaborador.foto_url ? (
                            <img 
                              src={colaborador.foto_url} 
                              alt={colaborador.nome}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-medium text-primary">
                              {colaborador.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {colaborador.nome}
                            {isAniversarioProximo(colaborador.data_nascimento) && (
                              <Cake className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          {colaborador.data_nascimento && (
                            <span className="text-xs text-muted-foreground">
                              {differenceInYears(new Date(), parseISO(colaborador.data_nascimento))} anos
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {colaborador.cargo}
                        </span>
                        {colaborador.setor && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {colaborador.setor.nome}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {formatTipoContrato(colaborador.tipo_contrato)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(colaborador.data_admissao), 'dd/MM/yyyy')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {calcularTempoEmpresa(colaborador.data_admissao)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {colaborador.telefone && (
                          <span className="text-xs flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {colaborador.telefone}
                          </span>
                        )}
                        {colaborador.email && (
                          <span className="text-xs flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {colaborador.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={colaborador.ativo ? 'default' : 'secondary'}>
                        {colaborador.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/rh/colaboradores/${colaborador.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/rh/colaboradores/editar/${colaborador.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
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
