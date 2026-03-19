-- =============================================
-- MÓDULO DE AUTOMAÇÃO DE FLUXOS
-- =============================================

-- Tipo enum para status de execução
CREATE TYPE automation_execution_status AS ENUM ('pending', 'running', 'completed', 'failed', 'paused', 'cancelled');

-- Tipo enum para tipo de workflow
CREATE TYPE automation_workflow_type AS ENUM ('ecommerce', 'leads', 'whatsapp', 'comercial', 'geral');

-- Tipo enum para tipo de nó
CREATE TYPE automation_node_type AS ENUM ('trigger', 'condition', 'action', 'control');

-- =============================================
-- Tabela principal de workflows
-- =============================================
CREATE TABLE public.automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  tipo automation_workflow_type NOT NULL DEFAULT 'geral',
  ativo BOOLEAN NOT NULL DEFAULT false,
  flow_data JSONB, -- Estrutura visual do React Flow (nodes + edges)
  trigger_config JSONB, -- Configuração do gatilho principal
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- Tabela de nós do workflow (para queries mais eficientes)
-- =============================================
CREATE TABLE public.automation_workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  node_id VARCHAR(100) NOT NULL, -- ID do nó no React Flow
  node_type automation_node_type NOT NULL,
  node_subtype VARCHAR(100) NOT NULL, -- Ex: order_created, send_whatsapp, delay
  config JSONB DEFAULT '{}', -- Configurações específicas do nó
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(workflow_id, node_id)
);

-- =============================================
-- Tabela de execuções de workflow
-- =============================================
CREATE TABLE public.automation_workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  trigger_entity VARCHAR(50) NOT NULL, -- order, lead, pedido, conversation
  trigger_entity_id UUID NOT NULL,
  trigger_data JSONB, -- Dados do gatilho que iniciou
  status automation_execution_status NOT NULL DEFAULT 'pending',
  current_node_id VARCHAR(100),
  execution_path JSONB DEFAULT '[]', -- Array de nós executados
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- Tabela de ações agendadas (delays, schedules)
-- =============================================
CREATE TABLE public.automation_scheduled_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES automation_workflow_executions(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES automation_workflows(id) ON DELETE CASCADE,
  node_id VARCHAR(100) NOT NULL,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, executed, cancelled, failed
  payload JSONB,
  executed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- Tabela de logs de execução (detalhado)
-- =============================================
CREATE TABLE public.automation_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES automation_workflow_executions(id) ON DELETE CASCADE,
  node_id VARCHAR(100),
  node_type VARCHAR(50),
  action VARCHAR(100),
  status VARCHAR(20), -- success, error, skipped
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- Tabela de templates de mensagem para automação
-- =============================================
CREATE TABLE public.automation_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- whatsapp, email
  assunto VARCHAR(500), -- Para emails
  conteudo TEXT NOT NULL,
  variaveis JSONB DEFAULT '[]', -- Lista de variáveis disponíveis
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- Índices para performance
-- =============================================
CREATE INDEX idx_automation_workflows_ativo ON automation_workflows(ativo);
CREATE INDEX idx_automation_workflows_tipo ON automation_workflows(tipo);
CREATE INDEX idx_automation_workflow_nodes_workflow ON automation_workflow_nodes(workflow_id);
CREATE INDEX idx_automation_workflow_nodes_type ON automation_workflow_nodes(node_type, node_subtype);
CREATE INDEX idx_automation_executions_workflow ON automation_workflow_executions(workflow_id);
CREATE INDEX idx_automation_executions_status ON automation_workflow_executions(status);
CREATE INDEX idx_automation_executions_entity ON automation_workflow_executions(trigger_entity, trigger_entity_id);
CREATE INDEX idx_automation_scheduled_pending ON automation_scheduled_actions(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_automation_logs_execution ON automation_execution_logs(execution_id);

-- =============================================
-- Triggers para updated_at
-- =============================================
CREATE TRIGGER update_automation_workflows_updated_at
  BEFORE UPDATE ON automation_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_templates_updated_at
  BEFORE UPDATE ON automation_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_scheduled_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_message_templates ENABLE ROW LEVEL SECURITY;

-- Políticas para workflows (admin ou quem tem permissão)
CREATE POLICY "automation_workflows_select" ON automation_workflows
  FOR SELECT USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.visualizar')
  );

CREATE POLICY "automation_workflows_insert" ON automation_workflows
  FOR INSERT WITH CHECK (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.criar')
  );

CREATE POLICY "automation_workflows_update" ON automation_workflows
  FOR UPDATE USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.criar')
  );

CREATE POLICY "automation_workflows_delete" ON automation_workflows
  FOR DELETE USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.excluir')
  );

-- Políticas para nodes (seguem o workflow)
CREATE POLICY "automation_nodes_select" ON automation_workflow_nodes
  FOR SELECT USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.visualizar')
  );

CREATE POLICY "automation_nodes_all" ON automation_workflow_nodes
  FOR ALL USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.criar')
  );

-- Políticas para executions
CREATE POLICY "automation_executions_select" ON automation_workflow_executions
  FOR SELECT USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.visualizar')
  );

CREATE POLICY "automation_executions_insert" ON automation_workflow_executions
  FOR INSERT WITH CHECK (true); -- Edge functions podem inserir

CREATE POLICY "automation_executions_update" ON automation_workflow_executions
  FOR UPDATE USING (true); -- Edge functions podem atualizar

-- Políticas para scheduled actions
CREATE POLICY "automation_scheduled_select" ON automation_scheduled_actions
  FOR SELECT USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.visualizar')
  );

CREATE POLICY "automation_scheduled_all" ON automation_scheduled_actions
  FOR ALL USING (true); -- Edge functions

-- Políticas para logs
CREATE POLICY "automation_logs_select" ON automation_execution_logs
  FOR SELECT USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.visualizar')
  );

CREATE POLICY "automation_logs_insert" ON automation_execution_logs
  FOR INSERT WITH CHECK (true); -- Edge functions

-- Políticas para templates
CREATE POLICY "automation_templates_select" ON automation_message_templates
  FOR SELECT USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.visualizar')
  );

CREATE POLICY "automation_templates_all" ON automation_message_templates
  FOR ALL USING (
    is_admin(auth.uid()) OR has_permission(auth.uid(), 'automacao.criar')
  );

-- =============================================
-- Permissões RBAC
-- =============================================
INSERT INTO permissions (id, modulo, acao, descricao, categoria) VALUES
  ('automacao.visualizar', 'automacao', 'visualizar', 'Visualizar fluxos de automação', 'Automação'),
  ('automacao.criar', 'automacao', 'criar', 'Criar e editar fluxos de automação', 'Automação'),
  ('automacao.ativar', 'automacao', 'ativar', 'Ativar e desativar fluxos', 'Automação'),
  ('automacao.executar', 'automacao', 'executar', 'Executar fluxos manualmente', 'Automação'),
  ('automacao.excluir', 'automacao', 'excluir', 'Excluir fluxos de automação', 'Automação')
ON CONFLICT (id) DO NOTHING;

-- Adicionar permissões ao perfil Admin
INSERT INTO profile_permissions (profile_id, permission_id)
SELECT sp.id, p.id
FROM system_profiles sp
CROSS JOIN (
  SELECT id FROM permissions WHERE modulo = 'automacao'
) p
WHERE sp.codigo IN ('admin', 'administrador')
ON CONFLICT (profile_id, permission_id) DO NOTHING;