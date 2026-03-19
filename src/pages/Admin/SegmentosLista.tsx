import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Power, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAllSegmentos, useToggleSegmento } from '@/hooks/useSegmentos';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';

export default function SegmentosLista() {
  const navigate = useNavigate();
  const { data: segmentos = [], isLoading } = useAllSegmentos();
  const toggleSegmento = useToggleSegmento();
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [segmentoToDelete, setSegmentoToDelete] = useState<string | null>(null);

  const filteredSegmentos = segmentos.filter((seg: any) => {
    const matchesSearch = seg.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive || seg.ativo;
    return matchesSearch && matchesStatus;
  });

  const handleToggle = async () => {
    if (segmentoToDelete) {
      await toggleSegmento.mutateAsync(segmentoToDelete);
      setSegmentoToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando segmentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Segmentos de Clientes</h1>
          <p className="text-muted-foreground">Gerencie os segmentos de mercado</p>
        </div>
        <Button onClick={() => navigate('/admin/segmentos/novo')}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Segmento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar segmentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={showInactive}
                onCheckedChange={setShowInactive}
                id="show-inactive"
              />
              <label htmlFor="show-inactive" className="text-sm cursor-pointer">
                Mostrar inativos
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Visualização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSegmentos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum segmento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredSegmentos.map((segmento: any) => (
                  <TableRow key={segmento.id}>
                    <TableCell className="font-medium">{segmento.nome}</TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate">
                      {segmento.descricao || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className="gap-1"
                        style={{ borderColor: segmento.cor || '#6b7280', color: segmento.cor || '#6b7280' }}
                      >
                        <span>{segmento.icone || '🏷️'}</span>
                        {segmento.nome}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={segmento.ativo ? 'default' : 'secondary'}>
                        {segmento.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/segmentos/editar/${segmento.id}`)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant={segmento.ativo ? 'destructive' : 'default'}
                          size="sm"
                          onClick={() => setSegmentoToDelete(segmento.id)}
                        >
                          <Power className="h-3 w-3 mr-1" />
                          {segmento.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!segmentoToDelete} onOpenChange={() => setSegmentoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar o status deste segmento? Segmentos inativos não aparecerão nos formulários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggle}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
