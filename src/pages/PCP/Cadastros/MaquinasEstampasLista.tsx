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
import { Printer, Plus, Edit, Search } from 'lucide-react';
import { useMaquinasImpressao } from '@/hooks/pcp/useMaquinasImpressao';
import { useTiposEstampa } from '@/hooks/pcp/useTiposEstampa';

export default function MaquinasEstampasLista() {
  const { maquinas, isLoading: loadingMaquinas, createMaquina, updateMaquina } = useMaquinasImpressao();
  const { tipos, isLoading: loadingTipos, createTipo, updateTipo } = useTiposEstampa();
  
  const [searchMaquina, setSearchMaquina] = useState('');
  const [searchTipo, setSearchTipo] = useState('');
  const [maquinaDialog, setMaquinaDialog] = useState(false);
  const [tipoDialog, setTipoDialog] = useState(false);
  const [editingMaquina, setEditingMaquina] = useState<any>(null);
  const [editingTipo, setEditingTipo] = useState<any>(null);

  const filteredMaquinas = maquinas.filter(m => 
    m.nome_maquina.toLowerCase().includes(searchMaquina.toLowerCase())
  );

  const filteredTipos = tipos.filter(t => 
    t.nome_tipo_estampa.toLowerCase().includes(searchTipo.toLowerCase())
  );

  const handleSaveMaquina = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      nome_maquina: formData.get('nome_maquina') as string,
      tecnologia: formData.get('tecnologia') as string || null,
      descricao: formData.get('descricao') as string || null,
      ativo: formData.get('ativo') === 'on',
    };

    if (editingMaquina) {
      await updateMaquina({ id: editingMaquina.id, ...data });
    } else {
      await createMaquina(data);
    }
    
    setMaquinaDialog(false);
    setEditingMaquina(null);
  };

  const handleSaveTipo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const maquinaPadraoId = formData.get('maquina_padrao_id') as string | null;
    
    const data = {
      nome_tipo_estampa: formData.get('nome_tipo_estampa') as string,
      maquina_padrao_id: maquinaPadraoId && maquinaPadraoId.trim() !== '' ? maquinaPadraoId : null,
      ativo: formData.get('ativo') === 'on',
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
        <h1 className="text-3xl font-bold tracking-tight">Máquinas e Tipos de Estampa</h1>
        <p className="text-muted-foreground">
          Gerenciar máquinas de impressão e tipos de estampa
        </p>
      </div>

      {/* Máquinas de Impressão */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Máquinas de Impressão
              </CardTitle>
              <CardDescription>
                Cadastro de máquinas disponíveis para impressão
              </CardDescription>
            </div>
            <Dialog open={maquinaDialog} onOpenChange={setMaquinaDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingMaquina(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Máquina
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSaveMaquina}>
                  <DialogHeader>
                    <DialogTitle>
                      {editingMaquina ? 'Editar Máquina' : 'Nova Máquina'}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados da máquina de impressão
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome_maquina">Nome da Máquina *</Label>
                      <Input
                        id="nome_maquina"
                        name="nome_maquina"
                        defaultValue={editingMaquina?.nome_maquina}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tecnologia">Tecnologia</Label>
                      <Input
                        id="tecnologia"
                        name="tecnologia"
                        placeholder="Ex: Sublimação, DTF, Silk"
                        defaultValue={editingMaquina?.tecnologia}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="descricao">Descrição</Label>
                      <Textarea
                        id="descricao"
                        name="descricao"
                        defaultValue={editingMaquina?.descricao}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ativo"
                        name="ativo"
                        defaultChecked={editingMaquina?.ativo ?? true}
                      />
                      <Label htmlFor="ativo">Ativa</Label>
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
                placeholder="Buscar máquina..."
                value={searchMaquina}
                onChange={(e) => setSearchMaquina(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Máquina</TableHead>
                <TableHead>Tecnologia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingMaquinas ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : filteredMaquinas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhuma máquina encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredMaquinas.map((maquina) => (
                  <TableRow key={maquina.id}>
                    <TableCell className="font-medium">{maquina.nome_maquina}</TableCell>
                    <TableCell>{maquina.tecnologia || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={maquina.ativo ? 'default' : 'secondary'}>
                        {maquina.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingMaquina(maquina);
                          setMaquinaDialog(true);
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

      {/* Tipos de Estampa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tipos de Estampa</CardTitle>
              <CardDescription>
                Cadastro de tipos de estampa e suas máquinas padrão
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
                      {editingTipo ? 'Editar Tipo de Estampa' : 'Novo Tipo de Estampa'}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados do tipo de estampa
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome_tipo_estampa">Nome do Tipo *</Label>
                      <Input
                        id="nome_tipo_estampa"
                        name="nome_tipo_estampa"
                        defaultValue={editingTipo?.nome_tipo_estampa}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maquina_padrao_id">Máquina Padrão (Opcional)</Label>
                      <Select
                        name="maquina_padrao_id"
                        defaultValue={editingTipo?.maquina_padrao_id || undefined}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma máquina (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {maquinas.filter(m => m.ativo).map((maquina) => (
                            <SelectItem key={maquina.id} value={maquina.id}>
                              {maquina.nome_maquina}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ativo"
                        name="ativo"
                        defaultChecked={editingTipo?.ativo ?? true}
                      />
                      <Label htmlFor="ativo">Ativo</Label>
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
                <TableHead>Tipo de Estampa</TableHead>
                <TableHead>Máquina Padrão</TableHead>
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
                    <TableCell className="font-medium">{tipo.nome_tipo_estampa}</TableCell>
                    <TableCell>{tipo.maquina_padrao?.nome_maquina || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={tipo.ativo ? 'default' : 'secondary'}>
                        {tipo.ativo ? 'Ativo' : 'Inativo'}
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
