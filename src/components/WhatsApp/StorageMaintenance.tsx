import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Loader2, CheckCircle2, Filter, HardDrive, Image as ImageIcon, Video, Headset, FileText, Sticker, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const MEDIA_TYPES = [
  { id: 'image', label: 'Imagens', icon: ImageIcon },
  { id: 'video', label: 'Vídeos', icon: Video },
  { id: 'audio', label: 'Áudios (Arquivos)', icon: Headset },
  { id: 'voice', label: 'Áudios de Voz', icon: Mic },
  { id: 'document', label: 'Documentos', icon: FileText },
  { id: 'sticker', label: 'Stickers (Figurinhas)', icon: Sticker },
];

export default function StorageMaintenance() {
  const [days, setDays] = useState('7');
  const [minSizeMB, setMinSizeMB] = useState('0');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['image', 'video', 'audio', 'voice', 'document', 'sticker']);
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    mensagens_processadas: number;
    arquivos_deletados: number;
    data_limite: string;
  } | null>(null);

  // Buscar instâncias para o filtro
  const { data: instances = [] } = useQuery({
    queryKey: ['whatsapp-instances-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('id, nome, numero_whatsapp')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const toggleType = (typeId: string) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) 
        ? prev.filter(t => t !== typeId) 
        : [...prev, typeId]
    );
  };

  const toggleInstance = (instanceId: string) => {
    setSelectedInstances(prev => 
      prev.includes(instanceId) 
        ? prev.filter(i => i !== instanceId) 
        : [...prev, instanceId]
    );
  };

  const handleCleanup = async () => {
    const diasNum = parseInt(days);
    if (isNaN(diasNum) || diasNum < 0) {
      toast.error('Informe um número válido de dias');
      return;
    }

    if (selectedTypes.length === 0) {
      toast.error('Selecione ao menos um tipo de arquivo');
      return;
    }

    setIsCleaning(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('cleanup-whatsapp-media', {
        body: { 
          dias: diasNum,
          instanceIds: selectedInstances,
          messageTypes: selectedTypes,
          minSizeMB: parseFloat(minSizeMB) || 0
        },
      });

      if (error) throw error;

      setLastResult(data);
      toast.success('Limpeza concluída com sucesso!');
    } catch (error: any) {
      console.error('Erro na limpeza:', error);
      toast.error('Erro ao executar limpeza: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Card className="border-amber-200 dark:border-amber-900 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
          <Trash2 className="h-5 w-5" />
          Manutenção de Storage
        </CardTitle>
        <CardDescription>
          Remova arquivos de mídia antigos com filtros granulares de instância, tipo e tamanho.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Esta ação é irreversível. As mensagens continuarão no chat, mas as mídias deletadas não poderão mais ser baixadas ou visualizadas.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Coluna 1: Data e Tamanho */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Período e Tamanho
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cleanup-days" className="text-xs text-muted-foreground">Anteriores a (dias):</Label>
                  <Input
                    id="cleanup-days"
                    type="number"
                    min="0"
                    value={days}
                    onChange={(e) => setDays(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min-size" className="text-xs text-muted-foreground">Maiores que (MB):</Label>
                  <Input
                    id="min-size"
                    type="number"
                    min="0"
                    value={minSizeMB}
                    onChange={(e) => setMinSizeMB(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Tipos de Arquivos
              </Label>
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                {MEDIA_TYPES.map((type) => (
                  <div key={type.id} className="flex items-center space-x-2 p-1 hover:bg-white/50 rounded transition-colors">
                    <Checkbox 
                      id={`type-${type.id}`} 
                      checked={selectedTypes.includes(type.id)}
                      onCheckedChange={() => toggleType(type.id)}
                    />
                    <Label htmlFor={`type-${type.id}`} className="text-sm font-normal cursor-pointer flex items-center gap-1.5 flex-1">
                      <type.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna 2: Instâncias */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Instâncias (opcional)
            </Label>
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <ScrollArea className="h-[140px] bg-muted/10">
                {instances.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma instância encontrada</div>
                ) : (
                  <div className="p-2 space-y-1">
                    {instances.map((instance) => (
                      <div 
                        key={instance.id} 
                        className="flex items-center space-x-2 p-1.5 hover:bg-muted/50 rounded transition-colors"
                      >
                        <Checkbox 
                          id={`inst-${instance.id}`} 
                          checked={selectedInstances.includes(instance.id)}
                          onCheckedChange={() => toggleInstance(instance.id)}
                        />
                        <Label htmlFor={`inst-${instance.id}`} className="text-xs font-normal cursor-pointer truncate">
                          {instance.nome} {instance.numero_whatsapp && `(${instance.numero_whatsapp})`}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-2 bg-muted/30 border-t border-border/50 text-[10px] text-muted-foreground text-center">
                Se nenhuma for selecionada, limpará de TODAS
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            variant="destructive" 
            onClick={handleCleanup}
            disabled={isCleaning}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white min-w-[160px]"
          >
            {isCleaning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Executar Limpeza
              </>
            )}
          </Button>
        </div>

        {lastResult && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-3">
              <CheckCircle2 className="h-4 w-4" />
              Limpeza concluída!
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-2 rounded bg-white/50 dark:bg-black/20 border border-green-100 dark:border-green-900">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Arquivos Deletados</p>
                <p className="text-xl font-bold">{lastResult.arquivos_deletados}</p>
              </div>
              <div className="p-2 rounded bg-white/50 dark:bg-black/20 border border-green-100 dark:border-green-900">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Mensagens Limpas</p>
                <p className="text-xl font-bold">{lastResult.mensagens_processadas}</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 text-center italic">
              Arquivos anteriores a {new Date(lastResult.data_limite).toLocaleString('pt-BR')} removidos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

