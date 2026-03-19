import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Plus, Edit, Search } from 'lucide-react';
import { useCategoriasFalha } from '@/hooks/pcp/useCategoriasFalha';
import { useTiposFalha } from '@/hooks/pcp/useTiposFalha';

export default function FalhasLista() {
  const { categorias, isLoading: loadingCategorias, createCategoria, updateCategoria } = useCategoriasFalha();
  const { tipos, isLoading: loadingTipos, createTipo, updateTipo } = useTiposFalha();
  
  const [searchCategoria, setSearchCategoria] = useState('');
  const [searchTipo, setSearchTipo] = useState('');
  const [categoriaDialog, setCategoriaDialog] = useState(false);
  const [tipoDialog, setTipoDialog] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<any>(null);
  const [editingTipo, setEditingTipo] = useState<any>(null);

  const filteredCategorias = categorias.filter(c => 
    c.nome_categoria.toLowerCase().includes(searchCategoria.toLowerCase())
  );

  const filteredTipos = tipos.filter(t => 
    t.nome_falha.toLowerCase().includes(searchTipo.toLowerCase())
  );

  const handleSaveCategoria = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nome_categoria: formData.get('nome_categoria') as string,
      descricao: formData.get('descricao') as string || null,
      ativa: formData.get('ativa') === 'on',
    };

    if (editingCategoria) {
      await updateCategoria({ id: editingCategoria.id, ...data });
    } else {
      await createCategoria(data);
    }
    
    setCategoriaDialog(false);
    setEditingCategoria(null);
  };

  const handleSaveTipo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      nome_falha: formData.get('nome_falha') as string,
      categoria_falha_id: formData.get('categoria_falha_id') as string,
      descricao: formData.get('descricao') as string || null,
      ativa: formData.get('ativa') === 'on',
    };

    if (editingTipo) {
      await updateTipo({ id: editingTipo.id, ...data });
    } else {
      await createTipo(data);
    }
    
    setTipoDialog(false);
    setEditingTipo(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tipos e Categorias de Falha</h1>
        <p className="text-muted-foreground">
          Gerenciar categorias e tipos de falhas de produção
        </p>
      </div>

      {/* Categorias de Falha */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Categorias de Falha
              </CardTitle>
              <CardDescription>
                Categorias principais para organização de falhas
              </CardDescription>
            </div>
            <Dialog open={categoriaDialog} onOpenChange={setCategoriaDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingCategoria(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSaveCategoria}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados da categoria de falha
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome_categoria">Nome da Categoria *</Label>
                      <Input
                        id="nome_categoria"
                        name="nome_categoria"
                        placeholder="Ex: Costura, Estampa, Estria"
                        defaultValue={editingCategoria?.nome_categoria}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        name="descricao"
                        defaultValue={editingCategoria?.descricao}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ativa"
                        name="ativa"
                        defaultChecked={editingCategoria?.ativa ?? true}
                      />
                      <Label htmlFor="ativa">Ativa</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Salvar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar categoria..."
                value={searchCategoria}
                onChange={(e) => setSearchCategoria(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCategorias ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : filteredCategorias.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma categoria encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategorias.map((categoria) => (
                  <TableRow key={categoria.id}>
                    <TableCell className="font-medium">{categoria.nome_categoria}</TableCell>
                    <TableCell>{categoria.descricao || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={categoria.ativa ? 'default' : 'secondary'}>
                        {categoria.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingCategoria(categoria);
                          setCategoriaDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tipos de Falha */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tipos de Falha</CardTitle>
              <CardDescription>
                Tipos específicos de falhas por categoria
              </CardDescription>
            </div>
            <Dialog open={tipoDialog} onOpenChange={setTipoDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingTipo(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Tipo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSaveTipo}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingTipo ? 'Editar Tipo de Falha' : 'Novo Tipo de Falha'}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados do tipo de falha
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoria_falha_id">Categoria *</Label>
                      <Select
                        name="categoria_falha_id"
                        defaultValue={editingTipo?.categoria_falha_id}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.filter(c => c.ativa).map((categoria) => (
                            <SelectItem key={categoria.id} value={categoria.id}>
                              {categoria.nome_categoria}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nome_falha">Nome da Falha *</Label>
                      <Input
                        id="nome_falha"
                        name="nome_falha"
                        placeholder="Ex: Costura aberta, Mancha de tinta"
                        defaultValue={editingTipo?.nome_falha}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        name="descricao"
                        defaultValue={editingTipo?.descricao}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ativa"
                        name="ativa"
                        defaultChecked={editingTipo?.ativa ?? true}
                      />
                      <Label htmlFor="ativa">Ativa</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Salvar</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tipo..."
                value={searchTipo}
                onChange={(e) => setSearchTipo(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Falha</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingTipos ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : filteredTipos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum tipo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredTipos.map((tipo) => (
                  <TableRow key={tipo.id}>
                    <TableCell className="font-medium">{tipo.nome_falha}</TableCell>
                    <TableCell>{tipo.categoria?.nome_categoria}</TableCell>
                    <TableCell>
                      <Badge variant={tipo.ativa ? 'default' : 'secondary'}>
                        {tipo.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTipo(tipo);
                          setTipoDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
