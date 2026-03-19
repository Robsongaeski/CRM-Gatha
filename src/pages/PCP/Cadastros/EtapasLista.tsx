import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { KanbanSquare, Plus, Edit, ArrowUp, ArrowDown } from 'lucide-react';
import { useEtapasProducao } from '@/hooks/pcp/useEtapasProducao';

export default function EtapasLista() {
  const { etapas, isLoading, createEtapa, updateEtapa } = useEtapasProducao();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // Ordenar etapas por ordem para exibição
  const sortedEtapas = [...etapas].sort((a, b) => a.ordem - b.ordem);

  const handleMoveUp = async (etapa: any) => {
    const currentIndex = sortedEtapas.findIndex(e => e.id === etapa.id);
    if (currentIndex <= 0) return;
    
    const previousEtapa = sortedEtapas[currentIndex - 1];
    const tempOrdem = -99999; // Valor temporário para evitar conflito de unique constraint
    
    // Trocar as ordens usando valor temporário
    const originalOrdem = etapa.ordem;
    await updateEtapa({ id: etapa.id, ordem: tempOrdem });
    await updateEtapa({ id: previousEtapa.id, ordem: originalOrdem });
    await updateEtapa({ id: etapa.id, ordem: previousEtapa.ordem });
  };

  const handleMoveDown = async (etapa: any) => {
    const currentIndex = sortedEtapas.findIndex(e => e.id === etapa.id);
    if (currentIndex >= sortedEtapas.length - 1) return;
    
    const nextEtapa = sortedEtapas[currentIndex + 1];
    const tempOrdem = -99999; // Valor temporário para evitar conflito de unique constraint
    
    // Trocar as ordens usando valor temporário
    const originalOrdem = etapa.ordem;
    await updateEtapa({ id: etapa.id, ordem: tempOrdem });
    await updateEtapa({ id: nextEtapa.id, ordem: originalOrdem });
    await updateEtapa({ id: etapa.id, ordem: nextEtapa.ordem });
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data = {
      nome_etapa: formData.get('nome_etapa') as string,
      ordem: parseInt(formData.get('ordem') as string),
      tipo_etapa: formData.get('tipo_etapa') as string,
      cor_hex: formData.get('cor_hex') as string,
      ativa: formData.get('ativa') === 'on',
    };

    if (editing) {
      await updateEtapa({ id: editing.id, ...data });
    } else {
      await createEtapa(data);
    }
    
    setDialog(false);
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Etapas de Produção</h1>
        <p className="text-muted-foreground">
          Configurar as colunas do Kanban de produção
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <KanbanSquare className="h-5 w-5" />
                Etapas do Kanban
              </CardTitle>
              <CardDescription>
                Defina as etapas que aparecerão no board de produção
              </CardDescription>
            </div>
            <Dialog open={dialog} onOpenChange={setDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditing(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Etapa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleSave}>
                  <DialogHeader>
                    <DialogTitle>
                      {editing ? 'Editar Etapa' : 'Nova Etapa'}
                    </DialogTitle>
                    <DialogDescription>
                      Preencha os dados da etapa de produção
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome_etapa">Nome da Etapa *</Label>
                      <Input
                        id="nome_etapa"
                        name="nome_etapa"
                        placeholder="Ex: Em Impressão"
                        defaultValue={editing?.nome_etapa}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ordem">Ordem *</Label>
                      <Input
                        id="ordem"
                        name="ordem"
                        type="number"
                        defaultValue={editing?.ordem || (etapas.length + 1)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Define a posição da coluna da esquerda para a direita
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo_etapa">Tipo da Etapa *</Label>
                      <Select
                        name="tipo_etapa"
                        defaultValue={editing?.tipo_etapa || 'intermediaria'}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="aprovacao_arte">Aprovação Arte</SelectItem>
                          <SelectItem value="inicial">Inicial</SelectItem>
                          <SelectItem value="intermediaria">Intermediária</SelectItem>
                          <SelectItem value="final">Final</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cor_hex">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="cor_hex"
                          name="cor_hex"
                          type="color"
                          defaultValue={editing?.cor_hex || '#6366f1'}
                          className="w-20 h-10"
                        />
                        <Input
                          defaultValue={editing?.cor_hex || '#6366f1'}
                          className="flex-1"
                          readOnly
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="ativa"
                        name="ativa"
                        defaultChecked={editing?.ativa ?? true}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Ordem</TableHead>
                <TableHead>Nome da Etapa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">Carregando...</TableCell>
                </TableRow>
              ) : sortedEtapas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhuma etapa encontrada
                  </TableCell>
                </TableRow>
              ) : (
                sortedEtapas.map((etapa, index) => (
                  <TableRow key={etapa.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium w-8">{etapa.ordem}</span>
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveUp(etapa)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveDown(etapa)}
                            disabled={index === sortedEtapas.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{etapa.nome_etapa}</TableCell>
                    <TableCell className="capitalize">{etapa.tipo_etapa?.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: etapa.cor_hex || '#6366f1' }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {etapa.cor_hex}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={etapa.ativa ? 'default' : 'secondary'}>
                        {etapa.ativa ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(etapa);
                          setDialog(true);
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
