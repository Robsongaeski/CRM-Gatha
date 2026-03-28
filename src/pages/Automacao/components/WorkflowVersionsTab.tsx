import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRestoreWorkflowVersion, useWorkflowVersions } from '@/hooks/useAutomationWorkflows';
import { Loader2, RotateCcw, History } from 'lucide-react';

interface WorkflowVersionsTabProps {
  workflowId: string;
  onRestored?: () => void;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

export function WorkflowVersionsTab({ workflowId, onRestored }: WorkflowVersionsTabProps) {
  const versionsQuery = useWorkflowVersions(workflowId);
  const restoreVersion = useRestoreWorkflowVersion();

  const versions = versionsQuery.data || [];

  const handleRestore = async (versionId: string, versionNumber: number) => {
    const confirmed = window.confirm(
      `Restaurar para a versao ${versionNumber}? O estado atual sera salvo no historico.`
    );

    if (!confirmed) return;

    await restoreVersion.mutateAsync({ workflowId, versionId });
    onRestored?.();
  };

  if (versionsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Carregando versoes...
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <History className="h-6 w-6 mx-auto mb-2 opacity-70" />
        Nenhuma versao encontrada ainda.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => {
        const snapshotName = version.snapshot?.nome || 'Fluxo sem nome';
        const editorName = version.profiles?.nome || 'Sistema';

        return (
          <div key={version.id} className="rounded-lg border bg-card p-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary">Versao {version.version_number}</Badge>
                <span className="text-sm text-muted-foreground">{formatDate(version.created_at)}</span>
              </div>
              <p className="font-medium truncate">{snapshotName}</p>
              <p className="text-sm text-muted-foreground">Alterado por {editorName}</p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRestore(version.id, version.version_number)}
              disabled={restoreVersion.isPending}
            >
              {restoreVersion.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-2" />
              )}
              Restaurar
            </Button>
          </div>
        );
      })}
    </div>
  );
}
