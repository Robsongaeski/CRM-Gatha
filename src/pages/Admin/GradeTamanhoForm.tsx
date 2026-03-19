import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import {
  useGradeTamanho,
  useGradeTamanhoItens,
  useCreateGradeTamanho,
  useUpdateGradeTamanho,
  useCreateGradeTamanhoItem,
  useDeleteGradeTamanhoItem,
} from "@/hooks/useGradesTamanho";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
});

const itemSchema = z.object({
  codigo: z.string().min(1, "Código é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  ordem: z.number().min(0, "Ordem deve ser positiva"),
});

type FormData = z.infer<typeof formSchema>;
type ItemFormData = z.infer<typeof itemSchema>;

export default function GradeTamanhoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const { data: grade, isLoading } = useGradeTamanho(id);
  const { data: itens } = useGradeTamanhoItens(id);
  const createGrade = useCreateGradeTamanho();
  const updateGrade = useUpdateGradeTamanho(id || "");
  const createItem = useCreateGradeTamanhoItem();
  const deleteItem = useDeleteGradeTamanhoItem();

  const [showItemForm, setShowItemForm] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      descricao: "",
    },
  });

  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      codigo: "",
      nome: "",
      ordem: 0,
    },
  });

  useEffect(() => {
    if (grade) {
      form.reset({
        nome: grade.nome,
        descricao: grade.descricao || "",
      });
    }
  }, [grade, form]);

  const onSubmit = async (data: FormData) => {
    try {
      if (isEditing) {
        await updateGrade.mutateAsync({
          nome: data.nome,
          descricao: data.descricao,
        });
      } else {
        const novaGrade = await createGrade.mutateAsync({
          nome: data.nome,
          descricao: data.descricao,
        });
        navigate(`/admin/grades-tamanho/${novaGrade.id}`);
      }
    } catch (error) {
      console.error("Erro ao salvar grade:", error);
    }
  };

  const onItemSubmit = async (data: ItemFormData) => {
    if (!id) return;

    try {
      await createItem.mutateAsync({
        grade_id: id,
        codigo: data.codigo,
        nome: data.nome,
        ordem: data.ordem,
      });
      itemForm.reset();
      setShowItemForm(false);
    } catch (error) {
      console.error("Erro ao adicionar tamanho:", error);
    }
  };

  const handleDeleteItem = (itemId: string) => {
    if (!id) return;
    deleteItem.mutate({ id: itemId, gradeId: id });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/grades-tamanho")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? "Editar Grade" : "Nova Grade"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? "Edite as informações da grade" : "Crie uma nova grade de tamanhos"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Grade</CardTitle>
          <CardDescription>Defina o nome e descrição da grade</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Grade</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Adulto Padrão" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Tamanhos PP ao EXGG"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="submit" disabled={createGrade.isPending || updateGrade.isPending}>
                  {isEditing ? "Salvar Alterações" : "Criar Grade"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/grades-tamanho")}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isEditing && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Tamanhos da Grade</CardTitle>
                <CardDescription>Adicione os tamanhos disponíveis nesta grade</CardDescription>
              </div>
              {!showItemForm && (
                <Button onClick={() => setShowItemForm(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Tamanho
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {showItemForm && (
              <Card className="mb-4 p-4">
                <Form {...itemForm}>
                  <form onSubmit={itemForm.handleSubmit(onItemSubmit)} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={itemForm.control}
                        name="codigo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código</FormLabel>
                            <FormControl>
                              <Input placeholder="P" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="nome"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="Pequeno" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={itemForm.control}
                        name="ordem"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ordem</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={createItem.isPending}>
                        Adicionar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowItemForm(false);
                          itemForm.reset();
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </Card>
            )}

            {!itens || itens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum tamanho cadastrado. Clique em "Adicionar Tamanho" para começar.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.ordem}</TableCell>
                      <TableCell className="font-mono font-semibold">{item.codigo}</TableCell>
                      <TableCell>{item.nome}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
