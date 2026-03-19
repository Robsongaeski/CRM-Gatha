import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, Pencil, Trash2, Copy } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ProdutosLista() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRole();
  const { can } = usePermissions();
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [produtoToDelete, setProdutoToDelete] = useState<string | null>(null);

  // Permissões de produtos
  const podeCriar = isAdmin || can('produtos.criar');
  const podeEditar = isAdmin || can('produtos.editar');
  const podeExcluir = isAdmin || can('produtos.excluir');

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos', search],
    queryFn: async () => {
      let query = supabase.from('produtos').select('*').order('created_at', { ascending: false });
      
      if (search) {
        query = query.or(`nome.ilike.%${search}%,tipo.ilike.%${search}%,codigo.ilike.%${search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (produtoId: string) => {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', produtoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto excluído com sucesso!');
      setDeleteDialogOpen(false);
      setProdutoToDelete(null);
    },
    onError: (error: any) => {
      toast.error(sanitizeError(error));
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (produtoId: string) => {
      // 1. Buscar produto original com suas faixas de preço
      const { data: produtoOriginal, error: produtoError } = await supabase
        .from('produtos')
        .select('*, faixas_preco_produto(*)')
        .eq('id', produtoId)
        .single();
      
      if (produtoError) throw produtoError;

      // 2. Criar novo produto (sem ID, para gerar um novo)
      const { data: novoProduto, error: insertError } = await supabase
        .from('produtos')
        .insert([{
          codigo: (produtoOriginal as any).codigo ? `${(produtoOriginal as any).codigo}-COPIA` : null,
          nome: `${produtoOriginal.nome} (Cópia)`,
          tipo: produtoOriginal.tipo,
          observacoes_padrao: produtoOriginal.observacoes_padrao,
          valor_base: produtoOriginal.valor_base,
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Copiar faixas de preço (se existirem)
      if (produtoOriginal.faixas_preco_produto && produtoOriginal.faixas_preco_produto.length > 0) {
        const faixasParaCopiar = produtoOriginal.faixas_preco_produto.map((faixa: any) => ({
          produto_id: novoProduto.id,
          quantidade_minima: faixa.quantidade_minima,
          quantidade_maxima: faixa.quantidade_maxima,
          preco_minimo: faixa.preco_minimo,
          preco_maximo: faixa.preco_maximo,
          ordem: faixa.ordem,
          ativo: faixa.ativo,
        }));

        const { error: faixasError } = await supabase
          .from('faixas_preco_produto')
          .insert(faixasParaCopiar);

        if (faixasError) throw faixasError;
      }

      return novoProduto;
    },
    onSuccess: (novoProduto) => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto duplicado com sucesso!');
      navigate(`/produtos/editar/${novoProduto.id}`);
    },
    onError: (error: any) => {
      toast.error(sanitizeError(error));
    },
  });

  const handleDeleteClick = (produtoId: string) => {
    setProdutoToDelete(produtoId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (produtoToDelete) {
      deleteMutation.mutate(produtoToDelete);
    }
  };

  const handleDuplicateClick = (produtoId: string) => {
    duplicateMutation.mutate(produtoId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
        </div>
        {podeCriar && (
          <Button onClick={() => navigate('/produtos/novo')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Produto
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou tipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : produtos.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor Base</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtos.map((produto) => (
                  <TableRow key={produto.id}>
                    <TableCell className="font-mono text-sm">{(produto as any).codigo || '-'}</TableCell>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>{produto.tipo || '-'}</TableCell>
                    <TableCell>
                      R$ {Number(produto.valor_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {podeEditar && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/produtos/editar/${produto.id}`)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                        )}
                        {podeCriar && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicateClick(produto.id)}
                            disabled={duplicateMutation.isPending}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            Duplicar
                          </Button>
                        )}
                        {podeExcluir && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(produto.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                            Excluir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
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
