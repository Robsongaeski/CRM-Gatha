import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useMotivos, useDeleteMotivo } from '@/hooks/useMotivosTrocaDevolucao';

export default function MotivosLista() {
  const { data: motivos, isLoading } = useMotivos();
  const deleteMutation = useDeleteMotivo();

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Função para parsear o tipo armazenado para array (sem duplicatas)
  const parseStoredTipo = (tipo: string): string[] => {
    if (tipo === 'ambos') return ['troca', 'devolucao'];
    if (tipo.startsWith('[')) {
      try {
        const parsed = JSON.parse(tipo) as string[];
        // Normalizar para lowercase e remover duplicatas
        const normalized = parsed.map(t => t.toLowerCase());
        return [...new Set(normalized)];
      } catch {
        return [tipo.toLowerCase()];
      }
    }
    return [tipo.toLowerCase()];
  };

  const getTipoBadges = (tipo: string) => {
    const tipos = parseStoredTipo(tipo);
    
    return (
      <div className="flex flex-wrap gap-1">
        {tipos.map((t) => {
          const tipoLower = t.toLowerCase();
          switch (tipoLower) {
            case 'troca':
              return <Badge key={tipoLower} variant="outline" className="bg-blue-50 text-blue-700">Troca</Badge>;
            case 'devolução':
            case 'devolucao':
              return <Badge key="devolucao" variant="outline" className="bg-purple-50 text-purple-700">Devolução</Badge>;
            case 'problema':
              return <Badge key={tipoLower} variant="outline" className="bg-orange-50 text-orange-700">Problema</Badge>;
            default:
              return <Badge key={tipoLower} variant="outline">{t}</Badge>;
          }
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/ecommerce/suporte">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Motivos de Troca/Devolução</h1>
            <p className="text-muted-foreground">Gerencie os motivos disponíveis</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/ecommerce/suporte/motivos/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Motivo
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Motivos</CardTitle>
          <CardDescription>Motivos cadastrados para trocas e devoluções</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : !motivos?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum motivo cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {motivos.map((motivo) => (
                  <TableRow key={motivo.id}>
                    <TableCell>{motivo.ordem}</TableCell>
                    <TableCell className="font-medium">{motivo.nome}</TableCell>
                    <TableCell>{getTipoBadges(motivo.tipo)}</TableCell>
                    <TableCell>
                      <Badge variant={motivo.ativo ? 'default' : 'secondary'}>
                        {motivo.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/ecommerce/suporte/motivos/${motivo.id}/editar`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir motivo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O motivo "{motivo.nome}" será excluído permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(motivo.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
