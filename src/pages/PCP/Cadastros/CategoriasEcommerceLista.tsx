import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, GripVertical, ArrowLeft, FlaskConical, Check, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useTodasCategoriasEcommerce,
  useCriarCategoriaEcommerce,
  useAtualizarCategoriaEcommerce,
  useExcluirCategoriaEcommerce,
  classificarProdutoPorCodigo,
  CategoriaEcommerce,
} from '@/hooks/pcp/useCategoriasEcommerce';
import { useUserRole } from '@/hooks/useUserRole';

interface SortableRowProps {
  categoria: CategoriaEcommerce;
  onEdit: (cat: CategoriaEcommerce) => void;
  onDelete: (cat: CategoriaEcommerce) => void;
}

function SortableRow({ categoria, onEdit, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: categoria.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: isDragging ? 'hsl(var(--muted))' : undefined,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={!categoria.ativo ? 'opacity-50' : ''}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span>{categoria.ordem}</span>
        </div>
      </TableCell>
      <TableCell className="font-medium">{categoria.nome}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {categoria.codigos?.map((codigo) => (
            <Badge key={codigo} variant="outline">
              {codigo}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {categoria.ativo ? (
          <Check className="h-4 w-4 text-green-600 mx-auto" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground mx-auto" />
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(categoria)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(categoria)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function CategoriasEcommerceLista() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { data: categorias = [], isLoading } = useTodasCategoriasEcommerce();
  const criarCategoria = useCriarCategoriaEcommerce();
  const atualizarCategoria = useAtualizarCategoriaEcommerce();
  const excluirCategoria = useExcluirCategoriaEcommerce();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<CategoriaEcommerce | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [categoriaToDelete, setCategoriaToDelete] = useState<CategoriaEcommerce | null>(null);
  
  // Form state
  const [nome, setNome] = useState('');
  const [codigos, setCodigos] = useState<string[]>([]);
  const [novoCodigo, setNovoCodigo] = useState('');
  const [ordem, setOrdem] = useState(0);
  const [ativo, setAtivo] = useState(true);

  // Teste de classificação
  const [testeInput, setTesteInput] = useState('');
  const [testeResultado, setTesteResultado] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const resetForm = () => {
    setNome('');
    setCodigos([]);
    setNovoCodigo('');
    setOrdem(categorias.length);
    setAtivo(true);
    setEditingCategoria(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setOrdem(categorias.length + 1);
    setDialogOpen(true);
  };

  const openEditDialog = (cat: CategoriaEcommerce) => {
    setEditingCategoria(cat);
    setNome(cat.nome);
    setCodigos(cat.codigos || []);
    setOrdem(cat.ordem);
    setAtivo(cat.ativo);
    setDialogOpen(true);
  };

  const handleAddCodigo = () => {
    if (novoCodigo.trim() && !codigos.includes(novoCodigo.trim().toUpperCase())) {
      setCodigos([...codigos, novoCodigo.trim().toUpperCase()]);
      setNovoCodigo('');
    }
  };

  const handleRemoveCodigo = (codigo: string) => {
    setCodigos(codigos.filter(c => c !== codigo));
  };

  const handleSave = async () => {
    if (!nome.trim() || codigos.length === 0) return;

    try {
      if (editingCategoria) {
        await atualizarCategoria.mutateAsync({
          id: editingCategoria.id,
          nome: nome.trim(),
          codigos,
          ordem,
          ativo,
        });
      } else {
        await criarCategoria.mutateAsync({
          nome: nome.trim(),
          codigos,
          ordem,
          ativo,
        });
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleDelete = async () => {
    if (!categoriaToDelete) return;
    try {
      await excluirCategoria.mutateAsync(categoriaToDelete.id);
      setDeleteConfirmOpen(false);
      setCategoriaToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const handleTestar = () => {
    if (!testeInput.trim()) {
      setTesteResultado(null);
      return;
    }
    const resultado = classificarProdutoPorCodigo(testeInput.trim(), categorias);
    setTesteResultado(resultado.categoria);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = categorias.findIndex((cat) => cat.id === active.id);
    const newIndex = categorias.findIndex((cat) => cat.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categorias, oldIndex, newIndex);
    
    // Atualizar ordens no banco - cada um com nova ordem sequencial
    const updates = reordered.map((cat, index) => ({
      id: cat.id,
      ordem: index + 1,
    }));

    // Atualizar cada categoria com sua nova ordem
    for (const update of updates) {
      await atualizarCategoria.mutateAsync(update);
    }
  };

  if (!isAdmin) {
    return (
      <div className="container py-6">
        <div className="text-center text-muted-foreground">
          Você não tem permissão para acessar esta página.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/pcp/cadastros')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Categorias de Produtos E-commerce</h1>
            <p className="text-muted-foreground">
              Mapeie prefixos de códigos às categorias para classificação automática
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Card de teste */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Testar Classificação</CardTitle>
          </div>
          <CardDescription>
            Digite um código de produto para ver qual categoria seria atribuída
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Ex: CSC-PERSO-G-SabaCancao"
              value={testeInput}
              onChange={(e) => setTesteInput(e.target.value)}
              className="max-w-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleTestar()}
            />
            <Button variant="secondary" onClick={handleTestar}>
              Testar
            </Button>
            {testeResultado && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-muted-foreground">Resultado:</span>
                <Badge variant={testeResultado === 'Outros' ? 'secondary' : 'default'}>
                  {testeResultado}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Ordem</TableHead>
              <TableHead>Nome da Categoria</TableHead>
              <TableHead>Códigos/Prefixos</TableHead>
              <TableHead className="w-24 text-center">Ativo</TableHead>
              <TableHead className="w-24 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : categorias.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma categoria cadastrada
                </TableCell>
              </TableRow>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={categorias.map((cat) => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {categorias.map((cat) => (
                    <SortableRow
                      key={cat.id}
                      categoria={cat}
                      onEdit={openEditDialog}
                      onDelete={(cat) => {
                        setCategoriaToDelete(cat);
                        setDeleteConfirmOpen(true);
                      }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategoria ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              Defina os prefixos de código que identificam produtos desta categoria
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Categoria</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Samba Canção"
              />
            </div>

            <div className="space-y-2">
              <Label>Códigos/Prefixos</Label>
              <div className="flex gap-2">
                <Input
                  value={novoCodigo}
                  onChange={(e) => setNovoCodigo(e.target.value)}
                  placeholder="Ex: CSC"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCodigo())}
                />
                <Button type="button" variant="secondary" onClick={handleAddCodigo}>
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {codigos.map((codigo) => (
                  <Badge
                    key={codigo}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleRemoveCodigo(codigo)}
                  >
                    {codigo} ×
                  </Badge>
                ))}
              </div>
              {codigos.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Adicione ao menos um prefixo de código
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ordem">Ordem de Prioridade</Label>
                <Input
                  id="ordem"
                  type="number"
                  min="1"
                  value={ordem}
                  onChange={(e) => setOrdem(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>Ativo</Label>
                <div className="flex items-center h-10">
                  <Switch checked={ativo} onCheckedChange={setAtivo} />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!nome.trim() || codigos.length === 0 || criarCategoria.isPending || atualizarCategoria.isPending}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{categoriaToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
