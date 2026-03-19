import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGradesTamanho, useDeleteGradeTamanho } from "@/hooks/useGradesTamanho";
import { Badge } from "@/components/ui/badge";
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
} from "@/components/ui/alert-dialog";

export default function GradesTamanhoLista() {
  const navigate = useNavigate();
  const { data: grades, isLoading } = useGradesTamanho();
  const deleteGrade = useDeleteGradeTamanho();

  const handleDelete = (id: string) => {
    deleteGrade.mutate(id);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Grades de Tamanhos</h1>
          <p className="text-muted-foreground">
            Gerencie as grades de tamanhos dos produtos
          </p>
        </div>
        <Button onClick={() => navigate("/admin/grades-tamanho/novo")}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Grade
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Grades Cadastradas</CardTitle>
          <CardDescription>
            Templates de grades reutilizáveis para diferentes tipos de produtos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : !grades || grades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma grade cadastrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell className="font-medium">{grade.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {grade.descricao || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={grade.ativo ? "default" : "secondary"}>
                        {grade.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => navigate(`/admin/grades-tamanho/${grade.id}`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a grade "{grade.nome}"? Esta ação
                                não pode ser desfeita e pode afetar produtos que utilizam esta grade.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(grade.id)}>
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
