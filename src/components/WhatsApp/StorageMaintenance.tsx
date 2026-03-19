import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Trash2, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function StorageMaintenance() {
  const [days, setDays] = useState('7');
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    mensagens_processadas: number;
    arquivos_deletados: number;
    data_limite: string;
  } | null>(null);

  const handleCleanup = async () => {
    const diasNum = parseInt(days);
    if (isNaN(diasNum) || diasNum < 0) {
      toast.error('Informe um número válido de dias');
      return;
    }

    setIsCleaning(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('cleanup-whatsapp-media', {
        body: { dias: diasNum },
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
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-500">
          <Trash2 className="h-5 w-5" />
          Manutenção de Storage
        </CardTitle>
        <CardDescription>
          Remova arquivos de mídia antigos para economizar espaço no seu Supabase Storage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-900 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Esta ação é irreversível. Os arquivos de mídia (imagens, vídeos, áudios e documentos) 
            anteriores ao período selecionado serão removidos permanentemente do storage.
            As mensagens no chat continuarão existindo, mas os arquivos não poderão mais ser visualizados.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col space-y-4 sm:flex-row sm:items-end sm:space-y-0 sm:space-x-4">
          <div className="flex-1 max-w-[200px] space-y-2">
            <Label htmlFor="cleanup-days">Manter arquivos dos últimos:</Label>
            <div className="flex items-center gap-2">
              <Input
                id="cleanup-days"
                type="number"
                min="0"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
              <span className="text-sm font-medium">dias</span>
            </div>
          </div>
          <Button 
            variant="destructive" 
            onClick={handleCleanup}
            disabled={isCleaning}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isCleaning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Limpando...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Agora
              </>
            )}
          </Button>
        </div>

        {lastResult && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Resultado da última limpeza
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground italic">Arquivos removidos</p>
                <p className="text-lg font-bold">{lastResult.arquivos_deletados}</p>
              </div>
              <div>
                <p className="text-muted-foreground italic">Msgs processadas</p>
                <p className="text-lg font-bold">{lastResult.mensagens_processadas}</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Data limite: {new Date(lastResult.data_limite).toLocaleString('pt-BR')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
