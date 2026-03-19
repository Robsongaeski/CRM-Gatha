-- Adicionar colunas para melhor visualização de logs
ALTER TABLE automation_execution_logs 
ADD COLUMN IF NOT EXISTS node_label VARCHAR(255);

ALTER TABLE automation_execution_logs 
ADD COLUMN IF NOT EXISTS condition_result VARCHAR(50);

-- Adicionar índices para performance nas queries de histórico
CREATE INDEX IF NOT EXISTS idx_execution_logs_execution_id ON automation_execution_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON automation_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_started_at ON automation_workflow_executions(started_at DESC);