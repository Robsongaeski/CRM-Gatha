import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Power, PowerOff, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useRegrasComissao,
  useFaixasRegraComissao,
  useCreateRegraComissao,
  useUpdateRegraComissao,
  useToggleRegraComissao,
  useDeleteRegraComissao,
  type RegraComissaoFormData,
} from '@/hooks/useRegrasComissao';
import { toast } from '@/hooks/use-toast';

export default function RegrasComissao() {
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>('todos');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [regraDetalhes, setRegraDetalhes] = useState<string | null>(null);
  const [regraParaEditar, setRegraParaEditar] = useState<string | null>(null);

  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores-comissao-list'],
    queryFn: async () => {
      // Buscar vendedores do sistema novo (user_profiles + system_profiles)
      const { data: newProfiles } = await supabase
        .from('user_profiles')
        .select('user_id, system_profiles!inner(codigo)')
        .eq('system_profiles.codigo', 'vendedor')
        .eq('system_profiles.ativo', true);

      // Buscar vendedores do sistema legado (user_roles)
      const { data: legacyRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'vendedor');

      // Combinar IDs únicos
      const ids = new Set<string>();
      newProfiles?.forEach(p => ids.add(p.user_id));
      legacyRoles?.forEach(r => ids.add(r.user_id));

      if (ids.size === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nome, ativo')
        .in('id', Array.from(ids))
        .eq('ativo', true)
        .order('nome');

      return profiles?.map(p => ({ id: p.id, nome: p.nome })) || [];
    },
  });

  const { data: regras = [], isLoading } = useRegrasComissao(
    vendedorSelecionado !== 'todos' ? vendedorSelecionado : undefined
  );

  const toggleRegra = useToggleRegraComissao();
  const deleteRegra = useDeleteRegraComissao();
  const createRegra = useCreateRegraComissao();

  const handleToggleRegra = (regraId: string, ativo: boolean, vendedorId: string) => {
    toggleRegra.mutate({ regraId, ativo: !ativo, vendedorId });
  };

  const handleDeleteRegra = (regraId: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra?')) {
      deleteRegra.mutate(regraId);
    }
  };

  const handleDuplicarRegra = async (regra: any) => {
    // Buscar faixas da regra original
    const { data: faixas } = await supabase
      .from('faixas_comissao_vendedor')
      .select('ordem, valor_minimo, valor_maximo, percentual, descricao')
      .eq('regra_id', regra.id)
      .order('ordem');

    const formData: RegraComissaoFormData = {
      vendedor_id: regra.vendedor_id,
      nome_regra: `${regra.nome_regra} (Cópia)`,
      data_inicio: new Date().toISOString().split('T')[0],
      data_fim: undefined,
      observacao: regra.observacao || undefined,
      faixas: faixas?.map(f => ({
        ordem: f.ordem,
        valor_minimo: f.valor_minimo,
        valor_maximo: f.valor_maximo ?? undefined,
        percentual: f.percentual,
        descricao: f.descricao ?? undefined,
      })) || [],
    };

    createRegra.mutate(formData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Regras de Comissão</h1>
          <p className="text-muted-foreground">Gerencie as regras de comissão personalizadas por vendedor</p>
        </div>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Nova Regra de Comissão</DialogTitle>
            </DialogHeader>
            <FormularioRegraComissao onSuccess={() => setDialogAberto(false)} vendedores={vendedores} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Regras Cadastradas</CardTitle>
            <Select value={vendedorSelecionado} onValueChange={setVendedorSelecionado}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Vendedores</SelectItem>
                {vendedores.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : regras.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma regra cadastrada</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Nome da Regra</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regras.map((regra: any) => (
                  <TableRow key={regra.id}>
                    <TableCell className="font-medium">{regra.profiles?.nome}</TableCell>
                    <TableCell>{regra.nome_regra}</TableCell>
                    <TableCell>
                      {format(new Date(regra.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                      {' - '}
                      {regra.data_fim ? format(new Date(regra.data_fim), 'dd/MM/yyyy', { locale: ptBR }) : 'Indeterminado'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={regra.ativo ? 'default' : 'secondary'}>
                        {regra.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRegraParaEditar(regra.id)}
                        title="Editar regra"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicarRegra(regra)}
                        title="Duplicar regra"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleRegra(regra.id, regra.ativo, regra.vendedor_id)}
                        title={regra.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {regra.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRegra(regra.id)}
                        title="Excluir regra"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {regraDetalhes && (
        <Dialog open={!!regraDetalhes} onOpenChange={() => setRegraDetalhes(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalhes da Regra</DialogTitle>
            </DialogHeader>
            <DetalhesRegra regraId={regraDetalhes} />
          </DialogContent>
        </Dialog>
      )}

      {regraParaEditar && (
        <Dialog open={!!regraParaEditar} onOpenChange={() => setRegraParaEditar(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar Regra de Comissão</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-amber-600 mb-4">
              ⚠️ Atenção: A edição de regras pode afetar comissões já geradas. Use com cuidado.
            </p>
            <FormularioEditarRegra 
              regraId={regraParaEditar} 
              onSuccess={() => setRegraParaEditar(null)} 
              vendedores={vendedores} 
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function FormularioRegraComissao({ 
  onSuccess, 
  vendedores 
}: { 
  onSuccess: () => void;
  vendedores: { id: string; nome: string }[];
}) {
  const [formData, setFormData] = useState<RegraComissaoFormData>({
    vendedor_id: '',
    nome_regra: '',
    data_inicio: new Date().toISOString().split('T')[0],
    faixas: [
      { ordem: 1, valor_minimo: 0, valor_maximo: 59000, percentual: 3, descricao: 'Faixa Bronze' },
      { ordem: 2, valor_minimo: 59000.01, valor_maximo: 99999.99, percentual: 4, descricao: 'Faixa Prata' },
      { ordem: 3, valor_minimo: 100000, percentual: 5, descricao: 'Faixa Ouro' },
    ],
  });

  const createRegra = useCreateRegraComissao();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendedor_id) {
      toast({ title: 'Erro', description: 'Selecione um vendedor', variant: 'destructive' });
      return;
    }
    createRegra.mutate(formData, { onSuccess });
  };

  const adicionarFaixa = () => {
    const novaOrdem = formData.faixas.length + 1;
    setFormData({
      ...formData,
      faixas: [...formData.faixas, { ordem: novaOrdem, valor_minimo: 0, percentual: 0 }],
    });
  };

  const removerFaixa = (index: number) => {
    setFormData({
      ...formData,
      faixas: formData.faixas.filter((_, i) => i !== index),
    });
  };

  const atualizarFaixa = (index: number, campo: string, valor: any) => {
    const novasFaixas = [...formData.faixas];
    novasFaixas[index] = { ...novasFaixas[index], [campo]: valor };
    setFormData({ ...formData, faixas: novasFaixas });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Vendedor</Label>
          <Select value={formData.vendedor_id} onValueChange={(v) => setFormData({ ...formData, vendedor_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o vendedor" />
            </SelectTrigger>
            <SelectContent>
              {vendedores.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Nome da Regra</Label>
          <Input
            value={formData.nome_regra}
            onChange={(e) => setFormData({ ...formData, nome_regra: e.target.value })}
            placeholder="Ex: Regra 2025"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data Início</Label>
            <Input
              type="date"
              value={formData.data_inicio}
              onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Data Fim (Opcional)</Label>
            <Input
              type="date"
              value={formData.data_fim || ''}
              onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>Observação</Label>
          <Textarea
            value={formData.observacao || ''}
            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
            placeholder="Observações sobre esta regra"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Faixas de Comissão</h3>
          <Button type="button" variant="outline" size="sm" onClick={adicionarFaixa}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Faixa
          </Button>
        </div>

        <div className="space-y-3">
          {formData.faixas.map((faixa, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Faixa {faixa.ordem}</h4>
                {formData.faixas.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removerFaixa(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor Mínimo</Label>
                  <Input
                    type="number"
                    value={faixa.valor_minimo}
                    onChange={(e) => atualizarFaixa(index, 'valor_minimo', Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <Label>Valor Máximo</Label>
                  <Input
                    type="number"
                    value={faixa.valor_maximo || ''}
                    onChange={(e) => atualizarFaixa(index, 'valor_maximo', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Deixe vazio para sem limite"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Percentual (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={faixa.percentual}
                    onChange={(e) => atualizarFaixa(index, 'percentual', Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={faixa.descricao || ''}
                    onChange={(e) => atualizarFaixa(index, 'descricao', e.target.value)}
                    placeholder="Ex: Faixa Bronze"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={createRegra.isPending}>
          {createRegra.isPending ? 'Salvando...' : 'Salvar Regra'}
        </Button>
      </div>
    </form>
  );
}

function FormularioEditarRegra({ 
  regraId, 
  onSuccess, 
  vendedores 
}: { 
  regraId: string;
  onSuccess: () => void;
  vendedores: { id: string; nome: string }[];
}) {
  const { data: regra, isLoading: loadingRegra } = useQuery({
    queryKey: ['regra-detalhe', regraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_comissao_vendedor')
        .select('*')
        .eq('id', regraId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: faixasExistentes = [], isLoading: loadingFaixas } = useFaixasRegraComissao(regraId);
  const updateRegra = useUpdateRegraComissao();

  const [formData, setFormData] = useState<RegraComissaoFormData>({
    vendedor_id: '',
    nome_regra: '',
    data_inicio: '',
    faixas: [],
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // Carregar dados da regra quando disponíveis
  useEffect(() => {
    if (regra && faixasExistentes.length > 0 && !isInitialized) {
      setFormData({
        vendedor_id: regra.vendedor_id,
        nome_regra: regra.nome_regra,
        data_inicio: regra.data_inicio,
        data_fim: regra.data_fim || undefined,
        observacao: regra.observacao || undefined,
        faixas: faixasExistentes.map(f => ({
          ordem: f.ordem,
          valor_minimo: f.valor_minimo,
          valor_maximo: f.valor_maximo,
          percentual: f.percentual,
          descricao: f.descricao,
        })),
      });
      setIsInitialized(true);
    }
  }, [regra, faixasExistentes, isInitialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateRegra.mutate({ regraId, data: formData }, { onSuccess });
  };

  const adicionarFaixa = () => {
    const novaOrdem = formData.faixas.length + 1;
    setFormData({
      ...formData,
      faixas: [...formData.faixas, { ordem: novaOrdem, valor_minimo: 0, percentual: 0 }],
    });
  };

  const removerFaixa = (index: number) => {
    setFormData({
      ...formData,
      faixas: formData.faixas.filter((_, i) => i !== index),
    });
  };

  const atualizarFaixa = (index: number, campo: string, valor: any) => {
    const novasFaixas = [...formData.faixas];
    novasFaixas[index] = { ...novasFaixas[index], [campo]: valor };
    setFormData({ ...formData, faixas: novasFaixas });
  };

  if (loadingRegra || loadingFaixas || !isInitialized) {
    return <p className="text-center py-8">Carregando...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label>Vendedor</Label>
          <Select value={formData.vendedor_id} onValueChange={(v) => setFormData({ ...formData, vendedor_id: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o vendedor" />
            </SelectTrigger>
            <SelectContent>
              {vendedores.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Nome da Regra</Label>
          <Input
            value={formData.nome_regra}
            onChange={(e) => setFormData({ ...formData, nome_regra: e.target.value })}
            placeholder="Ex: Regra 2025"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Data Início</Label>
            <Input
              type="date"
              value={formData.data_inicio}
              onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Data Fim (Opcional)</Label>
            <Input
              type="date"
              value={formData.data_fim || ''}
              onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label>Observação</Label>
          <Textarea
            value={formData.observacao || ''}
            onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
            placeholder="Observações sobre esta regra"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Faixas de Comissão</h3>
          <Button type="button" variant="outline" size="sm" onClick={adicionarFaixa}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Faixa
          </Button>
        </div>

        <div className="space-y-3">
          {formData.faixas.map((faixa, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Faixa {faixa.ordem}</h4>
                {formData.faixas.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removerFaixa(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Valor Mínimo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={faixa.valor_minimo}
                    onChange={(e) => atualizarFaixa(index, 'valor_minimo', Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <Label>Valor Máximo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={faixa.valor_maximo || ''}
                    onChange={(e) => atualizarFaixa(index, 'valor_maximo', e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Deixe vazio para sem limite"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Percentual (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={faixa.percentual}
                    onChange={(e) => atualizarFaixa(index, 'percentual', Number(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Input
                    value={faixa.descricao || ''}
                    onChange={(e) => atualizarFaixa(index, 'descricao', e.target.value)}
                    placeholder="Ex: Faixa Bronze"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={updateRegra.isPending}>
          {updateRegra.isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
}

function DetalhesRegra({ regraId }: { regraId: string }) {
  const { data: faixas = [] } = useFaixasRegraComissao(regraId);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Faixas de Comissão</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ordem</TableHead>
            <TableHead>Valor Mínimo</TableHead>
            <TableHead>Valor Máximo</TableHead>
            <TableHead>Percentual</TableHead>
            <TableHead>Descrição</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faixas.map((faixa) => (
            <TableRow key={faixa.id}>
              <TableCell>{faixa.ordem}</TableCell>
              <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faixa.valor_minimo)}</TableCell>
              <TableCell>{faixa.valor_maximo ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(faixa.valor_maximo) : 'Sem limite'}</TableCell>
              <TableCell>{faixa.percentual}%</TableCell>
              <TableCell>{faixa.descricao}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
