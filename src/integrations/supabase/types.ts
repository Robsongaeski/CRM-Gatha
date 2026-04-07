export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      abandoned_carts: {
        Row: {
          abandoned_at: string
          created_at: string
          customer_document: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          external_id: string
          id: string
          items: Json
          recovered_order_id: string | null
          recovery_url: string | null
          status: string
          store_code: string
          store_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          abandoned_at: string
          created_at?: string
          customer_document?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          external_id: string
          id?: string
          items?: Json
          recovered_order_id?: string | null
          recovery_url?: string | null
          status?: string
          store_code: string
          store_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          abandoned_at?: string
          created_at?: string
          customer_document?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          external_id?: string
          id?: string
          items?: Json
          recovered_order_id?: string | null
          recovery_url?: string | null
          status?: string
          store_code?: string
          store_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_recovered_order_id_fkey"
            columns: ["recovered_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_execution_logs: {
        Row: {
          action: string | null
          condition_result: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          id: string
          input_data: Json | null
          node_id: string | null
          node_label: string | null
          node_type: string | null
          output_data: Json | null
          status: string | null
        }
        Insert: {
          action?: string | null
          condition_result?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          node_id?: string | null
          node_label?: string | null
          node_type?: string | null
          output_data?: Json | null
          status?: string | null
        }
        Update: {
          action?: string | null
          condition_result?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          node_id?: string | null
          node_label?: string | null
          node_type?: string | null
          output_data?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_execution_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "automation_workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_message_templates: {
        Row: {
          assunto: string | null
          ativo: boolean | null
          conteudo: string
          created_at: string | null
          created_by: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string | null
          variaveis: Json | null
        }
        Insert: {
          assunto?: string | null
          ativo?: boolean | null
          conteudo: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string | null
          variaveis?: Json | null
        }
        Update: {
          assunto?: string | null
          ativo?: boolean | null
          conteudo?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string | null
          variaveis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_message_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_scheduled_actions: {
        Row: {
          created_at: string | null
          error_message: string | null
          executed_at: string | null
          execution_id: string
          id: string
          node_id: string
          payload: Json | null
          scheduled_for: string
          status: string
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_id: string
          id?: string
          node_id: string
          payload?: Json | null
          scheduled_for: string
          status?: string
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          executed_at?: string | null
          execution_id?: string
          id?: string
          node_id?: string
          payload?: Json | null
          scheduled_for?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_scheduled_actions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "automation_workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_scheduled_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflow_executions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_node_id: string | null
          error_message: string | null
          execution_path: Json | null
          id: string
          started_at: string | null
          status: Database["public"]["Enums"]["automation_execution_status"]
          trigger_data: Json | null
          trigger_entity: string
          trigger_entity_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          execution_path?: Json | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["automation_execution_status"]
          trigger_data?: Json | null
          trigger_entity: string
          trigger_entity_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_node_id?: string | null
          error_message?: string | null
          execution_path?: Json | null
          id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["automation_execution_status"]
          trigger_data?: Json | null
          trigger_entity?: string
          trigger_entity_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflow_nodes: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          node_id: string
          node_subtype: string
          node_type: Database["public"]["Enums"]["automation_node_type"]
          position_x: number | null
          position_y: number | null
          workflow_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          node_id: string
          node_subtype: string
          node_type: Database["public"]["Enums"]["automation_node_type"]
          position_x?: number | null
          position_y?: number | null
          workflow_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          node_id?: string
          node_subtype?: string
          node_type?: Database["public"]["Enums"]["automation_node_type"]
          position_x?: number | null
          position_y?: number | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          ativo: boolean
          created_at: string | null
          created_by: string | null
          descricao: string | null
          flow_data: Json | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["automation_workflow_type"]
          trigger_config: Json | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          flow_data?: Json | null
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["automation_workflow_type"]
          trigger_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          flow_data?: Json | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["automation_workflow_type"]
          trigger_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categoria_falha: {
        Row: {
          ativa: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome_categoria: string
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_categoria: string
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_categoria?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      categoria_produto_ecommerce: {
        Row: {
          ativo: boolean | null
          codigos: string[]
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigos?: string[]
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigos?: string[]
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cpf_cnpj: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          endereco: string | null
          id: string
          nome_razao_social: string
          observacao: string | null
          responsavel: string | null
          segmento_id: string | null
          telefone: string | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome_razao_social: string
          observacao?: string | null
          responsavel?: string | null
          segmento_id?: string | null
          telefone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome_razao_social?: string
          observacao?: string | null
          responsavel?: string | null
          segmento_id?: string | null
          telefone?: string | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_bonificacao: {
        Row: {
          colaborador_id: string
          created_at: string
          id: string
          justificativa: string | null
          mes_referencia: string
          recebeu: boolean
          registrado_por: string | null
          regra_id: string | null
          valor: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          id?: string
          justificativa?: string | null
          mes_referencia: string
          recebeu?: boolean
          registrado_por?: string | null
          regra_id?: string | null
          valor: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          id?: string
          justificativa?: string | null
          mes_referencia?: string
          recebeu?: boolean
          registrado_por?: string | null
          regra_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_bonificacao_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_bonificacao_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_bonificacao_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "regras_bonificacao"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_dependentes: {
        Row: {
          colaborador_id: string
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          id: string
          nome: string
          parentesco: string
        }
        Insert: {
          colaborador_id: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          id?: string
          nome: string
          parentesco: string
        }
        Update: {
          colaborador_id?: string
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          id?: string
          nome?: string
          parentesco?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_dependentes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_fechamento: {
        Row: {
          bonificacoes: number | null
          colaborador_id: string
          created_at: string
          data_fechamento: string | null
          descontos: number | null
          faltas: number | null
          fechado_por: string | null
          horas_extras: number | null
          id: string
          mes_referencia: string
          observacoes: string | null
          status: Database["public"]["Enums"]["status_fechamento"]
          updated_at: string
          valor_horas_extras: number | null
        }
        Insert: {
          bonificacoes?: number | null
          colaborador_id: string
          created_at?: string
          data_fechamento?: string | null
          descontos?: number | null
          faltas?: number | null
          fechado_por?: string | null
          horas_extras?: number | null
          id?: string
          mes_referencia: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_fechamento"]
          updated_at?: string
          valor_horas_extras?: number | null
        }
        Update: {
          bonificacoes?: number | null
          colaborador_id?: string
          created_at?: string
          data_fechamento?: string | null
          descontos?: number | null
          faltas?: number | null
          fechado_por?: string | null
          horas_extras?: number | null
          id?: string
          mes_referencia?: string
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_fechamento"]
          updated_at?: string
          valor_horas_extras?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_fechamento_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_fechamento_fechado_por_fkey"
            columns: ["fechado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_ferias: {
        Row: {
          abono_pecuniario: boolean | null
          colaborador_id: string
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          dias: number
          id: string
          observacao: string | null
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          registrado_por: string | null
          status: Database["public"]["Enums"]["status_ferias"]
          tipo: Database["public"]["Enums"]["tipo_ferias"]
          updated_at: string
        }
        Insert: {
          abono_pecuniario?: boolean | null
          colaborador_id: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          dias?: number
          id?: string
          observacao?: string | null
          periodo_aquisitivo_fim: string
          periodo_aquisitivo_inicio: string
          registrado_por?: string | null
          status?: Database["public"]["Enums"]["status_ferias"]
          tipo?: Database["public"]["Enums"]["tipo_ferias"]
          updated_at?: string
        }
        Update: {
          abono_pecuniario?: boolean | null
          colaborador_id?: string
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          dias?: number
          id?: string
          observacao?: string | null
          periodo_aquisitivo_fim?: string
          periodo_aquisitivo_inicio?: string
          registrado_por?: string | null
          status?: Database["public"]["Enums"]["status_ferias"]
          tipo?: Database["public"]["Enums"]["tipo_ferias"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_ferias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_ferias_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_mimos: {
        Row: {
          ano_referencia: number
          colaborador_id: string
          created_at: string
          data_entrega: string
          descricao: string | null
          id: string
          observacao: string | null
          ocasiao_id: string | null
          registrado_por: string | null
          valor_estimado: number | null
        }
        Insert: {
          ano_referencia: number
          colaborador_id: string
          created_at?: string
          data_entrega: string
          descricao?: string | null
          id?: string
          observacao?: string | null
          ocasiao_id?: string | null
          registrado_por?: string | null
          valor_estimado?: number | null
        }
        Update: {
          ano_referencia?: number
          colaborador_id?: string
          created_at?: string
          data_entrega?: string
          descricao?: string | null
          id?: string
          observacao?: string | null
          ocasiao_id?: string | null
          registrado_por?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_mimos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_mimos_ocasiao_id_fkey"
            columns: ["ocasiao_id"]
            isOneToOne: false
            referencedRelation: "ocasioes_mimo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_mimos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_salarios: {
        Row: {
          colaborador_id: string
          created_at: string
          data_reajuste: string
          id: string
          motivo: string | null
          observacao: string | null
          registrado_por: string | null
          valor_anterior: number
          valor_novo: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_reajuste: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          registrado_por?: string | null
          valor_anterior: number
          valor_novo: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_reajuste?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          registrado_por?: string | null
          valor_anterior?: number
          valor_novo?: number
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_salarios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_salarios_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_treinamentos: {
        Row: {
          colaborador_id: string
          created_at: string
          data_conclusao: string | null
          data_inicio: string | null
          id: string
          pontos_ganhos: number | null
          progresso_percentual: number | null
          status: string | null
          treinamento_id: string | null
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          id?: string
          pontos_ganhos?: number | null
          progresso_percentual?: number | null
          status?: string | null
          treinamento_id?: string | null
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          id?: string
          pontos_ganhos?: number | null
          progresso_percentual?: number | null
          status?: string | null
          treinamento_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_treinamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string | null
          carga_horaria: number | null
          cargo: string
          chave_pix: string | null
          conta: string | null
          cpf: string | null
          created_at: string
          data_admissao: string
          data_demissao: string | null
          data_nascimento: string | null
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_logradouro: string | null
          endereco_numero: string | null
          foto_url: string | null
          id: string
          nome: string
          observacoes: string | null
          pontos_gamificacao: number | null
          rg: string | null
          salario_atual: number | null
          setor_id: string | null
          telefone: string | null
          tipo_conta: Database["public"]["Enums"]["tipo_conta_bancaria"] | null
          tipo_contrato: Database["public"]["Enums"]["tipo_contrato"]
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          carga_horaria?: number | null
          cargo: string
          chave_pix?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao: string
          data_demissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          pontos_gamificacao?: number | null
          rg?: string | null
          salario_atual?: number | null
          setor_id?: string | null
          telefone?: string | null
          tipo_conta?: Database["public"]["Enums"]["tipo_conta_bancaria"] | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          carga_horaria?: number | null
          cargo?: string
          chave_pix?: string | null
          conta?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string
          data_demissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_logradouro?: string | null
          endereco_numero?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          pontos_gamificacao?: number | null
          rg?: string | null
          salario_atual?: number | null
          setor_id?: string | null
          telefone?: string | null
          tipo_conta?: Database["public"]["Enums"]["tipo_conta_bancaria"] | null
          tipo_contrato?: Database["public"]["Enums"]["tipo_contrato"]
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaboradores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes: {
        Row: {
          created_at: string | null
          data_geracao: string | null
          data_pagamento: string | null
          id: string
          mes_competencia: string
          observacao: string | null
          pagamento_id: string | null
          pedido_id: string
          percentual_comissao: number
          regra_id: string | null
          status: string
          tipo_comissao: string | null
          updated_at: string | null
          valor_comissao: number
          valor_pago: number | null
          valor_pedido: number
          vendedor_id: string
        }
        Insert: {
          created_at?: string | null
          data_geracao?: string | null
          data_pagamento?: string | null
          id?: string
          mes_competencia: string
          observacao?: string | null
          pagamento_id?: string | null
          pedido_id: string
          percentual_comissao: number
          regra_id?: string | null
          status?: string
          tipo_comissao?: string | null
          updated_at?: string | null
          valor_comissao: number
          valor_pago?: number | null
          valor_pedido: number
          vendedor_id: string
        }
        Update: {
          created_at?: string | null
          data_geracao?: string | null
          data_pagamento?: string | null
          id?: string
          mes_competencia?: string
          observacao?: string | null
          pagamento_id?: string | null
          pedido_id?: string
          percentual_comissao?: number
          regra_id?: string | null
          status?: string
          tipo_comissao?: string | null
          updated_at?: string | null
          valor_comissao?: number
          valor_pago?: number | null
          valor_pedido?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "regras_comissao_vendedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comissoes_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      datas_comemorativas: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          data: string
          id: string
          nome: string
          recorrente: boolean
          setor_id: string | null
          tipo: Database["public"]["Enums"]["tipo_data_comemorativa"]
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data: string
          id?: string
          nome: string
          recorrente?: boolean
          setor_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_data_comemorativa"]
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data?: string
          id?: string
          nome?: string
          recorrente?: boolean
          setor_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_data_comemorativa"]
        }
        Relationships: [
          {
            foreignKeyName: "datas_comemorativas_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      devolucoes: {
        Row: {
          comprovante_url: string | null
          created_at: string | null
          created_by: string
          data_pedido_original: string | null
          email_cliente: string | null
          id: string
          motivo_id: string | null
          motivo_outro: string | null
          nome_cliente: string
          numero_pedido: string
          observacao: string | null
          telefone_cliente: string | null
          transportadora: string | null
          updated_at: string | null
          valor_pedido: number | null
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string | null
          created_by: string
          data_pedido_original?: string | null
          email_cliente?: string | null
          id?: string
          motivo_id?: string | null
          motivo_outro?: string | null
          nome_cliente: string
          numero_pedido: string
          observacao?: string | null
          telefone_cliente?: string | null
          transportadora?: string | null
          updated_at?: string | null
          valor_pedido?: number | null
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string | null
          created_by?: string
          data_pedido_original?: string | null
          email_cliente?: string | null
          id?: string
          motivo_id?: string | null
          motivo_outro?: string | null
          nome_cliente?: string
          numero_pedido?: string
          observacao?: string | null
          telefone_cliente?: string | null
          transportadora?: string | null
          updated_at?: string | null
          valor_pedido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "devolucoes_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "motivos_troca_devolucao"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_stores: {
        Row: {
          ativo: boolean | null
          codigo: string
          cor: string | null
          created_at: string | null
          icone: string | null
          id: string
          nome: string
          plataforma: string | null
          updated_at: string | null
          wbuy_api_password: string | null
          wbuy_api_user: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome: string
          plataforma?: string | null
          updated_at?: string | null
          wbuy_api_password?: string | null
          wbuy_api_user?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          cor?: string | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome?: string
          plataforma?: string | null
          updated_at?: string | null
          wbuy_api_password?: string | null
          wbuy_api_user?: string | null
        }
        Relationships: []
      }
      emprestimo_grade_itens: {
        Row: {
          created_at: string
          descricao: string
          emprestimo_id: string
          id: string
          problema_devolucao: string | null
          quantidade: number
          quantidade_devolvida: number | null
          tamanhos: string | null
        }
        Insert: {
          created_at?: string
          descricao: string
          emprestimo_id: string
          id?: string
          problema_devolucao?: string | null
          quantidade?: number
          quantidade_devolvida?: number | null
          tamanhos?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string
          emprestimo_id?: string
          id?: string
          problema_devolucao?: string | null
          quantidade?: number
          quantidade_devolvida?: number | null
          tamanhos?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emprestimo_grade_itens_emprestimo_id_fkey"
            columns: ["emprestimo_id"]
            isOneToOne: false
            referencedRelation: "emprestimos_grade_prova"
            referencedColumns: ["id"]
          },
        ]
      }
      emprestimos_grade_prova: {
        Row: {
          cliente_id: string
          created_at: string
          data_devolucao: string | null
          data_emprestimo: string
          data_prevista_devolucao: string
          devolvido_por: string | null
          id: string
          numero_emprestimo: number
          observacao_devolucao: string | null
          observacao_saida: string | null
          status: Database["public"]["Enums"]["status_emprestimo_grade"]
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_devolucao?: string | null
          data_emprestimo?: string
          data_prevista_devolucao: string
          devolvido_por?: string | null
          id?: string
          numero_emprestimo?: number
          observacao_devolucao?: string | null
          observacao_saida?: string | null
          status?: Database["public"]["Enums"]["status_emprestimo_grade"]
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_devolucao?: string | null
          data_emprestimo?: string
          data_prevista_devolucao?: string
          devolvido_por?: string | null
          id?: string
          numero_emprestimo?: number
          observacao_devolucao?: string | null
          observacao_saida?: string | null
          status?: Database["public"]["Enums"]["status_emprestimo_grade"]
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emprestimos_grade_prova_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprestimos_grade_prova_devolvido_por_fkey"
            columns: ["devolvido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emprestimos_grade_prova_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      envios_log: {
        Row: {
          acao: string
          chave_nfe_lida: string | null
          created_at: string
          id: string
          order_id: string
          status_anterior: Database["public"]["Enums"]["status_envio"] | null
          status_novo: Database["public"]["Enums"]["status_envio"]
          usuario_id: string
        }
        Insert: {
          acao: string
          chave_nfe_lida?: string | null
          created_at?: string
          id?: string
          order_id: string
          status_anterior?: Database["public"]["Enums"]["status_envio"] | null
          status_novo: Database["public"]["Enums"]["status_envio"]
          usuario_id: string
        }
        Update: {
          acao?: string
          chave_nfe_lida?: string | null
          created_at?: string
          id?: string
          order_id?: string
          status_anterior?: Database["public"]["Enums"]["status_envio"] | null
          status_novo?: Database["public"]["Enums"]["status_envio"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "envios_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      etapa_producao: {
        Row: {
          ativa: boolean | null
          cor_hex: string | null
          created_at: string | null
          id: string
          nome_etapa: string
          ordem: number
          tipo_etapa: string | null
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          cor_hex?: string | null
          created_at?: string | null
          id?: string
          nome_etapa: string
          ordem: number
          tipo_etapa?: string | null
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          cor_hex?: string | null
          created_at?: string | null
          id?: string
          nome_etapa?: string
          ordem?: number
          tipo_etapa?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expedicao_registro: {
        Row: {
          codigo_rastreio: string | null
          created_at: string | null
          criado_manual: boolean | null
          data_envio_real: string | null
          data_lancamento: string | null
          data_pedido_mais_atrasado: string | null
          data_pedidos_enviados: string | null
          data_prevista_envio: string | null
          descricao: string | null
          descricao_motivo: string | null
          id: string
          motivo_atraso: string | null
          observacoes: string | null
          origem: string | null
          pedido_id: string | null
          quantidade_pedidos_enviados: number | null
          quantidade_pedidos_pendentes: number | null
          registrado_por: string
          tipo_lancamento: string | null
          transportadora: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_rastreio?: string | null
          created_at?: string | null
          criado_manual?: boolean | null
          data_envio_real?: string | null
          data_lancamento?: string | null
          data_pedido_mais_atrasado?: string | null
          data_pedidos_enviados?: string | null
          data_prevista_envio?: string | null
          descricao?: string | null
          descricao_motivo?: string | null
          id?: string
          motivo_atraso?: string | null
          observacoes?: string | null
          origem?: string | null
          pedido_id?: string | null
          quantidade_pedidos_enviados?: number | null
          quantidade_pedidos_pendentes?: number | null
          registrado_por: string
          tipo_lancamento?: string | null
          transportadora?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_rastreio?: string | null
          created_at?: string | null
          criado_manual?: boolean | null
          data_envio_real?: string | null
          data_lancamento?: string | null
          data_pedido_mais_atrasado?: string | null
          data_pedidos_enviados?: string | null
          data_prevista_envio?: string | null
          descricao?: string | null
          descricao_motivo?: string | null
          id?: string
          motivo_atraso?: string | null
          observacoes?: string | null
          origem?: string | null
          pedido_id?: string | null
          quantidade_pedidos_enviados?: number | null
          quantidade_pedidos_pendentes?: number | null
          registrado_por?: string
          tipo_lancamento?: string | null
          transportadora?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expedicao_registro_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      extravios: {
        Row: {
          chave_nf: string | null
          created_at: string | null
          created_by: string
          data_pedido_original: string | null
          data_resolucao: string | null
          email_cliente: string | null
          id: string
          motivo_negacao: string | null
          nome_cliente: string
          numero_chamado: string | null
          numero_nf: string | null
          numero_pedido: string
          numero_rastreio: string | null
          observacao: string | null
          problema_origem_id: string | null
          solicitado_ressarcimento: boolean | null
          status_ressarcimento:
            | Database["public"]["Enums"]["status_ressarcimento"]
            | null
          telefone_cliente: string | null
          transportadora: string | null
          updated_at: string | null
          valor_pedido: number | null
          valor_ressarcimento: number | null
        }
        Insert: {
          chave_nf?: string | null
          created_at?: string | null
          created_by: string
          data_pedido_original?: string | null
          data_resolucao?: string | null
          email_cliente?: string | null
          id?: string
          motivo_negacao?: string | null
          nome_cliente: string
          numero_chamado?: string | null
          numero_nf?: string | null
          numero_pedido: string
          numero_rastreio?: string | null
          observacao?: string | null
          problema_origem_id?: string | null
          solicitado_ressarcimento?: boolean | null
          status_ressarcimento?:
            | Database["public"]["Enums"]["status_ressarcimento"]
            | null
          telefone_cliente?: string | null
          transportadora?: string | null
          updated_at?: string | null
          valor_pedido?: number | null
          valor_ressarcimento?: number | null
        }
        Update: {
          chave_nf?: string | null
          created_at?: string | null
          created_by?: string
          data_pedido_original?: string | null
          data_resolucao?: string | null
          email_cliente?: string | null
          id?: string
          motivo_negacao?: string | null
          nome_cliente?: string
          numero_chamado?: string | null
          numero_nf?: string | null
          numero_pedido?: string
          numero_rastreio?: string | null
          observacao?: string | null
          problema_origem_id?: string | null
          solicitado_ressarcimento?: boolean | null
          status_ressarcimento?:
            | Database["public"]["Enums"]["status_ressarcimento"]
            | null
          telefone_cliente?: string | null
          transportadora?: string | null
          updated_at?: string | null
          valor_pedido?: number | null
          valor_ressarcimento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extravios_problema_origem_id_fkey"
            columns: ["problema_origem_id"]
            isOneToOne: false
            referencedRelation: "problemas_pedido"
            referencedColumns: ["id"]
          },
        ]
      }
      faixas_comissao: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          ordem: number
          percentual: number
          updated_at: string | null
          valor_maximo: number | null
          valor_minimo: number
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          ordem: number
          percentual: number
          updated_at?: string | null
          valor_maximo?: number | null
          valor_minimo: number
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          ordem?: number
          percentual?: number
          updated_at?: string | null
          valor_maximo?: number | null
          valor_minimo?: number
        }
        Relationships: []
      }
      faixas_comissao_vendedor: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          ordem: number
          percentual: number
          regra_id: string
          valor_maximo: number | null
          valor_minimo: number
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          ordem: number
          percentual: number
          regra_id: string
          valor_maximo?: number | null
          valor_minimo: number
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          ordem?: number
          percentual?: number
          regra_id?: string
          valor_maximo?: number | null
          valor_minimo?: number
        }
        Relationships: [
          {
            foreignKeyName: "faixas_comissao_vendedor_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "regras_comissao_vendedor"
            referencedColumns: ["id"]
          },
        ]
      }
      faixas_preco_produto: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          ordem: number
          preco_maximo: number
          preco_minimo: number
          produto_id: string
          quantidade_maxima: number | null
          quantidade_minima: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          ordem?: number
          preco_maximo: number
          preco_minimo: number
          produto_id: string
          quantidade_maxima?: number | null
          quantidade_minima: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          ordem?: number
          preco_maximo?: number
          preco_minimo?: number
          produto_id?: string
          quantidade_maxima?: number | null
          quantidade_minima?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faixas_preco_produto_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      falha_producao: {
        Row: {
          categoria_falha_id: string
          created_at: string | null
          data_falha: string
          data_resolucao: string | null
          id: string
          item_pedido_id: string | null
          observacoes: string | null
          origem: string | null
          pedido_id: string | null
          precisa_reimpressao: boolean | null
          quantidade: number
          registrado_por: string
          resolvido: boolean | null
          tipo_falha_id: string
          updated_at: string | null
        }
        Insert: {
          categoria_falha_id: string
          created_at?: string | null
          data_falha?: string
          data_resolucao?: string | null
          id?: string
          item_pedido_id?: string | null
          observacoes?: string | null
          origem?: string | null
          pedido_id?: string | null
          precisa_reimpressao?: boolean | null
          quantidade: number
          registrado_por: string
          resolvido?: boolean | null
          tipo_falha_id: string
          updated_at?: string | null
        }
        Update: {
          categoria_falha_id?: string
          created_at?: string | null
          data_falha?: string
          data_resolucao?: string | null
          id?: string
          item_pedido_id?: string | null
          observacoes?: string | null
          origem?: string | null
          pedido_id?: string | null
          precisa_reimpressao?: boolean | null
          quantidade?: number
          registrado_por?: string
          resolvido?: boolean | null
          tipo_falha_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "falha_producao_categoria_falha_id_fkey"
            columns: ["categoria_falha_id"]
            isOneToOne: false
            referencedRelation: "categoria_falha"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "falha_producao_item_pedido_id_fkey"
            columns: ["item_pedido_id"]
            isOneToOne: false
            referencedRelation: "pedido_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "falha_producao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "falha_producao_tipo_falha_id_fkey"
            columns: ["tipo_falha_id"]
            isOneToOne: false
            referencedRelation: "tipo_falha"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_tamanho_itens: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          grade_id: string
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          grade_id: string
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          grade_id?: string
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_tamanho_itens_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades_tamanho"
            referencedColumns: ["id"]
          },
        ]
      }
      grades_tamanho: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      impressao_pedido: {
        Row: {
          created_at: string | null
          data_impressao: string
          descricao_livre: string | null
          id: string
          item_pedido_id: string | null
          maquina_impressao_id: string | null
          marcado_como_impresso: boolean | null
          observacoes: string | null
          operador_id: string
          pedido_id: string | null
          quantidade: number
          tipo_estampa_id: string
          tipo_registro: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_impressao?: string
          descricao_livre?: string | null
          id?: string
          item_pedido_id?: string | null
          maquina_impressao_id?: string | null
          marcado_como_impresso?: boolean | null
          observacoes?: string | null
          operador_id: string
          pedido_id?: string | null
          quantidade: number
          tipo_estampa_id: string
          tipo_registro?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_impressao?: string
          descricao_livre?: string | null
          id?: string
          item_pedido_id?: string | null
          maquina_impressao_id?: string | null
          marcado_como_impresso?: boolean | null
          observacoes?: string | null
          operador_id?: string
          pedido_id?: string | null
          quantidade?: number
          tipo_estampa_id?: string
          tipo_registro?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impressao_pedido_item_pedido_id_fkey"
            columns: ["item_pedido_id"]
            isOneToOne: false
            referencedRelation: "pedido_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impressao_pedido_maquina_impressao_id_fkey"
            columns: ["maquina_impressao_id"]
            isOneToOne: false
            referencedRelation: "maquina_impressao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impressao_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impressao_pedido_tipo_estampa_id_fkey"
            columns: ["tipo_estampa_id"]
            isOneToOne: false
            referencedRelation: "tipo_estampa"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ativo: boolean | null
          cliente_id: string | null
          cpf_cnpj: string | null
          created_at: string | null
          created_by: string | null
          data_conversao: string | null
          data_retorno: string | null
          email: string | null
          endereco: string | null
          id: string
          lembrete_enviado: boolean | null
          lembrete_inatividade_enviado: boolean | null
          nome: string
          observacao: string | null
          origem: string | null
          segmento_id: string | null
          status: string | null
          telefone: string | null
          ultima_interacao: string | null
          updated_at: string | null
          vendedor_id: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean | null
          cliente_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conversao?: string | null
          data_retorno?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          lembrete_enviado?: boolean | null
          lembrete_inatividade_enviado?: boolean | null
          nome: string
          observacao?: string | null
          origem?: string | null
          segmento_id?: string | null
          status?: string | null
          telefone?: string | null
          ultima_interacao?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean | null
          cliente_id?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          created_by?: string | null
          data_conversao?: string | null
          data_retorno?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          lembrete_enviado?: boolean | null
          lembrete_inatividade_enviado?: boolean | null
          nome?: string
          observacao?: string | null
          origem?: string | null
          segmento_id?: string | null
          status?: string | null
          telefone?: string | null
          ultima_interacao?: string | null
          updated_at?: string | null
          vendedor_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_interacoes: {
        Row: {
          created_at: string | null
          created_by: string
          data_proxima_acao: string | null
          descricao: string
          id: string
          lead_id: string
          proxima_acao: string | null
          resultado: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          data_proxima_acao?: string | null
          descricao: string
          id?: string
          lead_id: string
          proxima_acao?: string | null
          resultado?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          data_proxima_acao?: string | null
          descricao?: string
          id?: string
          lead_id?: string
          proxima_acao?: string | null
          resultado?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_interacoes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      maquina_impressao: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome_maquina: string
          tecnologia: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_maquina: string
          tecnologia?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_maquina?: string
          tecnologia?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      motivos_troca_devolucao: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          ordem: number | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      movimento_etapa_producao: {
        Row: {
          created_at: string | null
          data_hora_movimento: string | null
          etapa_anterior_id: string | null
          etapa_nova_id: string
          id: string
          observacao: string | null
          pedido_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          data_hora_movimento?: string | null
          etapa_anterior_id?: string | null
          etapa_nova_id: string
          id?: string
          observacao?: string | null
          pedido_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          data_hora_movimento?: string | null
          etapa_anterior_id?: string | null
          etapa_nova_id?: string
          id?: string
          observacao?: string | null
          pedido_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimento_etapa_producao_etapa_anterior_id_fkey"
            columns: ["etapa_anterior_id"]
            isOneToOne: false
            referencedRelation: "etapa_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimento_etapa_producao_etapa_nova_id_fkey"
            columns: ["etapa_nova_id"]
            isOneToOne: false
            referencedRelation: "etapa_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimento_etapa_producao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimento_etapa_proposta: {
        Row: {
          created_at: string | null
          data_hora_movimento: string | null
          etapa_anterior_id: string | null
          etapa_nova_id: string
          id: string
          observacao: string | null
          proposta_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          data_hora_movimento?: string | null
          etapa_anterior_id?: string | null
          etapa_nova_id: string
          id?: string
          observacao?: string | null
          proposta_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          data_hora_movimento?: string | null
          etapa_anterior_id?: string | null
          etapa_nova_id?: string
          id?: string
          observacao?: string | null
          proposta_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimento_etapa_proposta_etapa_anterior_id_fkey"
            columns: ["etapa_anterior_id"]
            isOneToOne: false
            referencedRelation: "etapa_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimento_etapa_proposta_etapa_nova_id_fkey"
            columns: ["etapa_nova_id"]
            isOneToOne: false
            referencedRelation: "etapa_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimento_etapa_proposta_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string
          tipo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem: string
          tipo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string
          tipo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ocasioes_mimo: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_ocasiao"]
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["tipo_ocasiao"]
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_ocasiao"]
        }
        Relationships: []
      }
      orders: {
        Row: {
          carrier: string | null
          chave_nfe: string | null
          coupon_code: string | null
          created_at: string
          customer_document: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          data_despacho: string | null
          delivery_estimate: string | null
          despachado_por: string | null
          discount: number | null
          enriched_at: string | null
          external_id: string | null
          id: string
          items: Json
          nfe_number: string | null
          nfe_series: string | null
          observacao_atraso: string | null
          observations: string | null
          order_date: string | null
          order_number: string
          payment_installments: number | null
          payment_method: string | null
          pix_key: string | null
          shipping_address: string | null
          shipping_cost: number | null
          status: Database["public"]["Enums"]["order_status"]
          status_envio: Database["public"]["Enums"]["status_envio"] | null
          store_code: string | null
          store_id: string | null
          subtotal: number | null
          tipo_atraso_manual: string | null
          total: number
          tracking_code: string | null
          updated_at: string
          wbuy_customer_id: string | null
          wbuy_status_code: number | null
        }
        Insert: {
          carrier?: string | null
          chave_nfe?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_document?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          data_despacho?: string | null
          delivery_estimate?: string | null
          despachado_por?: string | null
          discount?: number | null
          enriched_at?: string | null
          external_id?: string | null
          id?: string
          items?: Json
          nfe_number?: string | null
          nfe_series?: string | null
          observacao_atraso?: string | null
          observations?: string | null
          order_date?: string | null
          order_number: string
          payment_installments?: number | null
          payment_method?: string | null
          pix_key?: string | null
          shipping_address?: string | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          status_envio?: Database["public"]["Enums"]["status_envio"] | null
          store_code?: string | null
          store_id?: string | null
          subtotal?: number | null
          tipo_atraso_manual?: string | null
          total?: number
          tracking_code?: string | null
          updated_at?: string
          wbuy_customer_id?: string | null
          wbuy_status_code?: number | null
        }
        Update: {
          carrier?: string | null
          chave_nfe?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_document?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          data_despacho?: string | null
          delivery_estimate?: string | null
          despachado_por?: string | null
          discount?: number | null
          enriched_at?: string | null
          external_id?: string | null
          id?: string
          items?: Json
          nfe_number?: string | null
          nfe_series?: string | null
          observacao_atraso?: string | null
          observations?: string | null
          order_date?: string | null
          order_number?: string
          payment_installments?: number | null
          payment_method?: string | null
          pix_key?: string | null
          shipping_address?: string | null
          shipping_cost?: number | null
          status?: Database["public"]["Enums"]["order_status"]
          status_envio?: Database["public"]["Enums"]["status_envio"] | null
          store_code?: string | null
          store_id?: string | null
          subtotal?: number | null
          tipo_atraso_manual?: string | null
          total?: number
          tracking_code?: string | null
          updated_at?: string
          wbuy_customer_id?: string | null
          wbuy_status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      orders_status_history: {
        Row: {
          data_alteracao: string | null
          id: string
          order_id: string
          status_anterior: string | null
          status_novo: string
          wbuy_status_code_anterior: number | null
          wbuy_status_code_novo: number
        }
        Insert: {
          data_alteracao?: string | null
          id?: string
          order_id: string
          status_anterior?: string | null
          status_novo: string
          wbuy_status_code_anterior?: number | null
          wbuy_status_code_novo: number
        }
        Update: {
          data_alteracao?: string | null
          id?: string
          order_id?: string
          status_anterior?: string | null
          status_novo?: string
          wbuy_status_code_anterior?: number | null
          wbuy_status_code_novo?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          aprovado_por: string | null
          comprovante_url: string | null
          created_at: string | null
          criado_por: string
          data_aprovacao: string | null
          data_estorno: string | null
          data_pagamento: string
          data_vencimento_boleto: string | null
          estornado: boolean | null
          estornado_por: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          motivo_estorno: string | null
          motivo_rejeicao: string | null
          observacao: string | null
          pedido_id: string
          status: string
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          aprovado_por?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          criado_por: string
          data_aprovacao?: string | null
          data_estorno?: string | null
          data_pagamento?: string
          data_vencimento_boleto?: string | null
          estornado?: boolean | null
          estornado_por?: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          motivo_estorno?: string | null
          motivo_rejeicao?: string | null
          observacao?: string | null
          pedido_id: string
          status?: string
          tipo: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          aprovado_por?: string | null
          comprovante_url?: string | null
          created_at?: string | null
          criado_por?: string
          data_aprovacao?: string | null
          data_estorno?: string | null
          data_pagamento?: string
          data_vencimento_boleto?: string | null
          estornado?: boolean | null
          estornado_por?: string | null
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          motivo_estorno?: string | null
          motivo_rejeicao?: string | null
          observacao?: string | null
          pedido_id?: string
          status?: string
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_item_detalhes: {
        Row: {
          created_at: string | null
          id: string
          pedido_item_id: string
          tipo_detalhe: string
          valor: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pedido_item_id: string
          tipo_detalhe: string
          valor: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pedido_item_id?: string
          tipo_detalhe?: string
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_item_detalhes_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "pedido_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_item_grades: {
        Row: {
          created_at: string | null
          id: string
          pedido_item_id: string
          quantidade: number
          tamanho_codigo: string
          tamanho_nome: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          pedido_item_id: string
          quantidade?: number
          tamanho_codigo: string
          tamanho_nome: string
        }
        Update: {
          created_at?: string | null
          id?: string
          pedido_item_id?: string
          quantidade?: number
          tamanho_codigo?: string
          tamanho_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_item_grades_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "pedido_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string | null
          foto_modelo_url: string | null
          id: string
          observacoes: string | null
          pedido_id: string
          produto_id: string
          quantidade: number
          tipo_estampa_id: string | null
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          created_at?: string | null
          foto_modelo_url?: string | null
          id?: string
          observacoes?: string | null
          pedido_id: string
          produto_id: string
          quantidade: number
          tipo_estampa_id?: string | null
          valor_total?: number | null
          valor_unitario: number
        }
        Update: {
          created_at?: string | null
          foto_modelo_url?: string | null
          id?: string
          observacoes?: string | null
          pedido_id?: string
          produto_id?: string
          quantidade?: number
          tipo_estampa_id?: string | null
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_tipo_estampa_id_fkey"
            columns: ["tipo_estampa_id"]
            isOneToOne: false
            referencedRelation: "tipo_estampa"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_tags: {
        Row: {
          cor: string
          created_at: string | null
          id: string
          nome: string
          pedido_id: string
        }
        Insert: {
          cor?: string
          created_at?: string | null
          id?: string
          nome: string
          pedido_id: string
        }
        Update: {
          cor?: string
          created_at?: string | null
          id?: string
          nome?: string
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_tags_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          caminho_arquivos: string | null
          cliente_id: string
          created_at: string | null
          desconto_aguardando_aprovacao: boolean | null
          desconto_percentual: number | null
          data_entrega: string | null
          data_fim_producao: string | null
          data_inicio_producao: string | null
          data_pedido: string
          etapa_producao_id: string | null
          id: string
          imagem_aprovacao_url: string | null
          imagem_aprovada: boolean | null
          numero_pedido: number
          observacao: string | null
          origem: string | null
          requer_aprovacao_preco: boolean | null
          status: Database["public"]["Enums"]["status_pedido"]
          status_pagamento: Database["public"]["Enums"]["status_pagamento"]
          updated_at: string | null
          valor_total: number
          vendedor_id: string
        }
        Insert: {
          caminho_arquivos?: string | null
          cliente_id: string
          created_at?: string | null
          desconto_aguardando_aprovacao?: boolean | null
          desconto_percentual?: number | null
          data_entrega?: string | null
          data_fim_producao?: string | null
          data_inicio_producao?: string | null
          data_pedido?: string
          etapa_producao_id?: string | null
          id?: string
          imagem_aprovacao_url?: string | null
          imagem_aprovada?: boolean | null
          numero_pedido?: number
          observacao?: string | null
          origem?: string | null
          requer_aprovacao_preco?: boolean | null
          status?: Database["public"]["Enums"]["status_pedido"]
          status_pagamento?: Database["public"]["Enums"]["status_pagamento"]
          updated_at?: string | null
          valor_total?: number
          vendedor_id: string
        }
        Update: {
          caminho_arquivos?: string | null
          cliente_id?: string
          created_at?: string | null
          desconto_aguardando_aprovacao?: boolean | null
          desconto_percentual?: number | null
          data_entrega?: string | null
          data_fim_producao?: string | null
          data_inicio_producao?: string | null
          data_pedido?: string
          etapa_producao_id?: string | null
          id?: string
          imagem_aprovacao_url?: string | null
          imagem_aprovada?: boolean | null
          numero_pedido?: number
          observacao?: string | null
          origem?: string | null
          requer_aprovacao_preco?: boolean | null
          status?: Database["public"]["Enums"]["status_pedido"]
          status_pagamento?: Database["public"]["Enums"]["status_pagamento"]
          updated_at?: string | null
          valor_total?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_etapa_producao_id_fkey"
            columns: ["etapa_producao_id"]
            isOneToOne: false
            referencedRelation: "etapa_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_aprovacao: {
        Row: {
          analisado_por: string | null
          created_at: string | null
          data_analise: string | null
          data_solicitacao: string | null
          id: string
          motivo_solicitacao: string
          observacao_admin: string | null
          observacao_vendedor: string | null
          pedido_id: string
          solicitado_por: string
          status: string
          updated_at: string | null
        }
        Insert: {
          analisado_por?: string | null
          created_at?: string | null
          data_analise?: string | null
          data_solicitacao?: string | null
          id?: string
          motivo_solicitacao: string
          observacao_admin?: string | null
          observacao_vendedor?: string | null
          pedido_id: string
          solicitado_por: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          analisado_por?: string | null
          created_at?: string | null
          data_analise?: string | null
          data_solicitacao?: string | null
          id?: string
          motivo_solicitacao?: string
          observacao_admin?: string | null
          observacao_vendedor?: string | null
          pedido_id?: string
          solicitado_por?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_aprovacao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_historico: {
        Row: {
          campo_alterado: string | null
          created_at: string | null
          descricao: string
          id: string
          pedido_id: string
          tipo_alteracao: string
          usuario_id: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          pedido_id: string
          tipo_alteracao: string
          usuario_id: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          pedido_id?: string
          tipo_alteracao?: string
          usuario_id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_historico_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          acao: string
          categoria: string | null
          created_at: string | null
          descricao: string
          id: string
          modulo: string
        }
        Insert: {
          acao: string
          categoria?: string | null
          created_at?: string | null
          descricao: string
          id: string
          modulo: string
        }
        Update: {
          acao?: string
          categoria?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          modulo?: string
        }
        Relationships: []
      }
      problemas_pedido: {
        Row: {
          codigo_rastreio: string | null
          created_at: string | null
          created_by: string
          data_resolucao: string | null
          email_cliente: string | null
          endereco_cliente: string | null
          extravio_gerado_id: string | null
          id: string
          motivo_id: string | null
          nome_cliente: string | null
          numero_chamado: string | null
          numero_pedido: string
          observacao: string | null
          problema_outro: string | null
          status: Database["public"]["Enums"]["status_problema"] | null
          telefone_cliente: string | null
          tipo_problema: Database["public"]["Enums"]["tipo_problema_pedido"]
          transportadora: string | null
          updated_at: string | null
          valor_pedido: number | null
        }
        Insert: {
          codigo_rastreio?: string | null
          created_at?: string | null
          created_by: string
          data_resolucao?: string | null
          email_cliente?: string | null
          endereco_cliente?: string | null
          extravio_gerado_id?: string | null
          id?: string
          motivo_id?: string | null
          nome_cliente?: string | null
          numero_chamado?: string | null
          numero_pedido: string
          observacao?: string | null
          problema_outro?: string | null
          status?: Database["public"]["Enums"]["status_problema"] | null
          telefone_cliente?: string | null
          tipo_problema: Database["public"]["Enums"]["tipo_problema_pedido"]
          transportadora?: string | null
          updated_at?: string | null
          valor_pedido?: number | null
        }
        Update: {
          codigo_rastreio?: string | null
          created_at?: string | null
          created_by?: string
          data_resolucao?: string | null
          email_cliente?: string | null
          endereco_cliente?: string | null
          extravio_gerado_id?: string | null
          id?: string
          motivo_id?: string | null
          nome_cliente?: string | null
          numero_chamado?: string | null
          numero_pedido?: string
          observacao?: string | null
          problema_outro?: string | null
          status?: Database["public"]["Enums"]["status_problema"] | null
          telefone_cliente?: string | null
          tipo_problema?: Database["public"]["Enums"]["tipo_problema_pedido"]
          transportadora?: string | null
          updated_at?: string | null
          valor_pedido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "problemas_pedido_extravio_gerado_id_fkey"
            columns: ["extravio_gerado_id"]
            isOneToOne: false
            referencedRelation: "extravios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "problemas_pedido_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "motivos_troca_devolucao"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          codigo: string | null
          created_at: string | null
          created_by: string | null
          grade_tamanho_id: string | null
          id: string
          nome: string
          observacoes_padrao: string | null
          tipo: string | null
          updated_at: string | null
          valor_base: number
        }
        Insert: {
          codigo?: string | null
          created_at?: string | null
          created_by?: string | null
          grade_tamanho_id?: string | null
          id?: string
          nome: string
          observacoes_padrao?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_base?: number
        }
        Update: {
          codigo?: string | null
          created_at?: string | null
          created_by?: string | null
          grade_tamanho_id?: string | null
          id?: string
          nome?: string
          observacoes_padrao?: string | null
          tipo?: string | null
          updated_at?: string | null
          valor_base?: number
        }
        Relationships: [
          {
            foreignKeyName: "produtos_grade_tamanho_id_fkey"
            columns: ["grade_tamanho_id"]
            isOneToOne: false
            referencedRelation: "grades_tamanho"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_permissions: {
        Row: {
          created_at: string | null
          id: string
          permission_id: string | null
          profile_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          profile_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          permission_id?: string | null
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "system_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string
          id: string
          nome: string
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email: string
          id: string
          nome: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      proposta_itens: {
        Row: {
          created_at: string | null
          id: string
          observacoes: string | null
          produto_id: string
          proposta_id: string
          quantidade: number
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          observacoes?: string | null
          produto_id: string
          proposta_id: string
          quantidade: number
          valor_total?: number | null
          valor_unitario: number
        }
        Update: {
          created_at?: string | null
          id?: string
          observacoes?: string | null
          produto_id?: string
          proposta_id?: string
          quantidade?: number
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposta_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposta_itens_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      proposta_tags: {
        Row: {
          cor: string
          created_at: string | null
          id: string
          nome: string
          proposta_id: string
        }
        Insert: {
          cor?: string
          created_at?: string | null
          id?: string
          nome: string
          proposta_id: string
        }
        Update: {
          cor?: string
          created_at?: string | null
          id?: string
          nome?: string
          proposta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposta_tags_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          caminho_arquivos: string | null
          cliente_id: string
          created_at: string | null
          criar_previa: boolean | null
          data_follow_up: string | null
          desconto_aguardando_aprovacao: boolean | null
          desconto_percentual: number | null
          descricao_criacao: string | null
          etapa_aprovacao_id: string | null
          id: string
          imagem_aprovacao_url: string | null
          imagem_referencia_url: string | null
          motivo_perda: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["status_proposta"]
          updated_at: string | null
          valor_total: number
          vendedor_id: string
        }
        Insert: {
          caminho_arquivos?: string | null
          cliente_id: string
          created_at?: string | null
          criar_previa?: boolean | null
          data_follow_up?: string | null
          desconto_aguardando_aprovacao?: boolean | null
          desconto_percentual?: number | null
          descricao_criacao?: string | null
          etapa_aprovacao_id?: string | null
          id?: string
          imagem_aprovacao_url?: string | null
          imagem_referencia_url?: string | null
          motivo_perda?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_proposta"]
          updated_at?: string | null
          valor_total?: number
          vendedor_id: string
        }
        Update: {
          caminho_arquivos?: string | null
          cliente_id?: string
          created_at?: string | null
          criar_previa?: boolean | null
          data_follow_up?: string | null
          desconto_aguardando_aprovacao?: boolean | null
          desconto_percentual?: number | null
          descricao_criacao?: string | null
          etapa_aprovacao_id?: string | null
          id?: string
          imagem_aprovacao_url?: string | null
          imagem_referencia_url?: string | null
          motivo_perda?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["status_proposta"]
          updated_at?: string | null
          valor_total?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_etapa_aprovacao_id_fkey"
            columns: ["etapa_aprovacao_id"]
            isOneToOne: false
            referencedRelation: "etapa_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_historico: {
        Row: {
          campo_alterado: string | null
          created_at: string | null
          descricao: string
          id: string
          imagem_url: string | null
          proposta_id: string
          tipo_alteracao: string
          usuario_id: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          imagem_url?: string | null
          proposta_id: string
          tipo_alteracao: string
          usuario_id: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          imagem_url?: string | null
          proposta_id?: string
          tipo_alteracao?: string
          usuario_id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "propostas_historico_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_bonificacao: {
        Row: {
          aplicavel_a: string | null
          ativo: boolean
          cargo: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          setor_id: string | null
          tipo: Database["public"]["Enums"]["tipo_bonificacao"]
          updated_at: string
          valor: number
        }
        Insert: {
          aplicavel_a?: string | null
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          setor_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_bonificacao"]
          updated_at?: string
          valor: number
        }
        Update: {
          aplicavel_a?: string | null
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          setor_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_bonificacao"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "regras_bonificacao_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_comissao_vendedor: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          nome_regra: string
          observacao: string | null
          updated_at: string | null
          vendedor_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio: string
          id?: string
          nome_regra: string
          observacao?: string | null
          updated_at?: string | null
          vendedor_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          nome_regra?: string
          observacao?: string | null
          updated_at?: string | null
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_comissao_vendedor_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      segmentos: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      setores: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_config: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_secret: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_secret?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      system_profiles: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string | null
          id: string
          is_system: boolean | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          is_system?: boolean | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          is_system?: boolean | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tarefa_anexos: {
        Row: {
          created_at: string
          id: string
          nome_arquivo: string
          tamanho: number | null
          tarefa_id: string
          tipo_mime: string | null
          uploaded_by: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome_arquivo: string
          tamanho?: number | null
          tarefa_id: string
          tipo_mime?: string | null
          uploaded_by: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          nome_arquivo?: string
          tamanho?: number | null
          tarefa_id?: string
          tipo_mime?: string | null
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_anexos_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_anexos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_checklist_itens: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          created_at: string
          descricao: string
          id: string
          ordem: number
          tarefa_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          descricao: string
          id?: string
          ordem?: number
          tarefa_id: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          tarefa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_checklist_itens_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_observacoes: {
        Row: {
          created_at: string
          id: string
          lida_por: string[]
          mensagem: string
          tarefa_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida_por?: string[]
          mensagem: string
          tarefa_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida_por?: string[]
          mensagem?: string
          tarefa_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_observacoes_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefa_observacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          ativa_recorrencia: boolean
          ativo: boolean
          concluida_em: string | null
          created_at: string
          criador_id: string
          data_limite: string
          descricao: string | null
          excluida_em: string | null
          executor_id: string
          id: string
          prioridade: Database["public"]["Enums"]["tarefa_prioridade"]
          recorrente: boolean
          status: Database["public"]["Enums"]["tarefa_status"]
          tarefa_origem_id: string | null
          tipo_conteudo: Database["public"]["Enums"]["tarefa_tipo_conteudo"]
          tipo_recorrencia: string | null
          titulo: string
          updated_at: string
          validada_em: string | null
          visualizada_em: string | null
        }
        Insert: {
          ativa_recorrencia?: boolean
          ativo?: boolean
          concluida_em?: string | null
          created_at?: string
          criador_id: string
          data_limite: string
          descricao?: string | null
          excluida_em?: string | null
          executor_id: string
          id?: string
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          recorrente?: boolean
          status?: Database["public"]["Enums"]["tarefa_status"]
          tarefa_origem_id?: string | null
          tipo_conteudo?: Database["public"]["Enums"]["tarefa_tipo_conteudo"]
          tipo_recorrencia?: string | null
          titulo: string
          updated_at?: string
          validada_em?: string | null
          visualizada_em?: string | null
        }
        Update: {
          ativa_recorrencia?: boolean
          ativo?: boolean
          concluida_em?: string | null
          created_at?: string
          criador_id?: string
          data_limite?: string
          descricao?: string | null
          excluida_em?: string | null
          executor_id?: string
          id?: string
          prioridade?: Database["public"]["Enums"]["tarefa_prioridade"]
          recorrente?: boolean
          status?: Database["public"]["Enums"]["tarefa_status"]
          tarefa_origem_id?: string | null
          tipo_conteudo?: Database["public"]["Enums"]["tarefa_tipo_conteudo"]
          tipo_recorrencia?: string | null
          titulo?: string
          updated_at?: string
          validada_em?: string | null
          visualizada_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_criador_id_fkey"
            columns: ["criador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_executor_id_fkey"
            columns: ["executor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_tarefa_origem_id_fkey"
            columns: ["tarefa_origem_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      tipo_estampa: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          maquina_padrao_id: string | null
          nome_tipo_estampa: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          maquina_padrao_id?: string | null
          nome_tipo_estampa: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          maquina_padrao_id?: string | null
          nome_tipo_estampa?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipo_estampa_maquina_padrao_id_fkey"
            columns: ["maquina_padrao_id"]
            isOneToOne: false
            referencedRelation: "maquina_impressao"
            referencedColumns: ["id"]
          },
        ]
      }
      tipo_falha: {
        Row: {
          ativa: boolean | null
          categoria_falha_id: string
          created_at: string | null
          descricao: string | null
          id: string
          nome_falha: string
          updated_at: string | null
        }
        Insert: {
          ativa?: boolean | null
          categoria_falha_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_falha: string
          updated_at?: string | null
        }
        Update: {
          ativa?: boolean | null
          categoria_falha_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome_falha?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipo_falha_categoria_falha_id_fkey"
            columns: ["categoria_falha_id"]
            isOneToOne: false
            referencedRelation: "categoria_falha"
            referencedColumns: ["id"]
          },
        ]
      }
      trocas: {
        Row: {
          created_at: string | null
          created_by: string
          data_pedido_original: string | null
          email_cliente: string | null
          id: string
          motivo_id: string | null
          motivo_outro: string | null
          nome_cliente: string
          numero_pedido: string
          observacao: string | null
          telefone_cliente: string | null
          transportadora: string | null
          updated_at: string | null
          valor_pedido: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          data_pedido_original?: string | null
          email_cliente?: string | null
          id?: string
          motivo_id?: string | null
          motivo_outro?: string | null
          nome_cliente: string
          numero_pedido: string
          observacao?: string | null
          telefone_cliente?: string | null
          transportadora?: string | null
          updated_at?: string | null
          valor_pedido?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          data_pedido_original?: string | null
          email_cliente?: string | null
          id?: string
          motivo_id?: string | null
          motivo_outro?: string | null
          nome_cliente?: string
          numero_pedido?: string
          observacao?: string | null
          telefone_cliente?: string | null
          transportadora?: string | null
          updated_at?: string | null
          valor_pedido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trocas_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "motivos_troca_devolucao"
            referencedColumns: ["id"]
          },
        ]
      }
      trocas_devolucoes_historico: {
        Row: {
          campo_alterado: string | null
          created_at: string | null
          descricao: string
          id: string
          registro_id: string
          tipo_alteracao: string
          tipo_registro: string
          usuario_id: string
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado?: string | null
          created_at?: string | null
          descricao: string
          id?: string
          registro_id: string
          tipo_alteracao: string
          tipo_registro: string
          usuario_id: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string | null
          created_at?: string | null
          descricao?: string
          id?: string
          registro_id?: string
          tipo_alteracao?: string
          tipo_registro?: string
          usuario_id?: string
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          id: string
          profile_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "system_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quick_access: {
        Row: {
          created_at: string
          icon: string
          id: string
          position: number
          title: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon: string
          id?: string
          position?: number
          title: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          position?: number
          title?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          ai_context: Json | null
          ai_enabled: boolean | null
          assigned_to: string | null
          cliente_id: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_photo_url: string | null
          created_at: string | null
          finished_by: string | null
          group_name: string | null
          group_photo_url: string | null
          id: string
          instance_id: string | null
          internal_notes: string | null
          is_group: boolean | null
          last_customer_message_at: string | null
          last_message_at: string | null
          last_message_preview: string | null
          remote_jid: string
          status: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          ai_context?: Json | null
          ai_enabled?: boolean | null
          assigned_to?: string | null
          cliente_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_photo_url?: string | null
          created_at?: string | null
          finished_by?: string | null
          group_name?: string | null
          group_photo_url?: string | null
          id?: string
          instance_id?: string | null
          internal_notes?: string | null
          is_group?: boolean | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          remote_jid: string
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_context?: Json | null
          ai_enabled?: boolean | null
          assigned_to?: string | null
          cliente_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_photo_url?: string | null
          created_at?: string | null
          finished_by?: string | null
          group_name?: string | null
          group_photo_url?: string | null
          id?: string
          instance_id?: string | null
          internal_notes?: string | null
          is_group?: boolean | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          remote_jid?: string
          status?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_finished_by_fkey"
            columns: ["finished_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instance_users: {
        Row: {
          created_at: string
          id: string
          instance_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instance_users_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_instance_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          api_type: string
          created_at: string | null
          foto_url: string | null
          id: string
          import_history_days: number
          import_history_enabled: boolean
          instance_name: string
          is_active: boolean | null
          meta_account_name: string | null
          meta_business_account_id: string | null
          meta_display_phone_number: string | null
          meta_phone_number_id: string | null
          meta_waba_id: string | null
          nome: string
          numero_whatsapp: string | null
          ordem: number | null
          status: string | null
          uazapi_instance_external_id: string | null
          uazapi_instance_token: string | null
          updated_at: string | null
          webhook_configured: boolean | null
        }
        Insert: {
          api_type?: string
          created_at?: string | null
          foto_url?: string | null
          id?: string
          import_history_days?: number
          import_history_enabled?: boolean
          instance_name: string
          is_active?: boolean | null
          meta_account_name?: string | null
          meta_business_account_id?: string | null
          meta_display_phone_number?: string | null
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          nome: string
          numero_whatsapp?: string | null
          ordem?: number | null
          status?: string | null
          uazapi_instance_external_id?: string | null
          uazapi_instance_token?: string | null
          updated_at?: string | null
          webhook_configured?: boolean | null
        }
        Update: {
          api_type?: string
          created_at?: string | null
          foto_url?: string | null
          id?: string
          import_history_days?: number
          import_history_enabled?: boolean
          instance_name?: string
          is_active?: boolean | null
          meta_account_name?: string | null
          meta_business_account_id?: string | null
          meta_display_phone_number?: string | null
          meta_phone_number_id?: string | null
          meta_waba_id?: string | null
          nome?: string
          numero_whatsapp?: string | null
          ordem?: number | null
          status?: string | null
          uazapi_instance_external_id?: string | null
          uazapi_instance_token?: string | null
          updated_at?: string | null
          webhook_configured?: boolean | null
        }
        Relationships: []
      }
      whatsapp_message_queue: {
        Row: {
          attempts: number | null
          content: string
          conversation_id: string | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          instance_id: string
          media_base64: string | null
          media_url: string | null
          message_type: string | null
          processed_at: string | null
          quoted_message_id: string | null
          remote_jid: string
          status: string | null
        }
        Insert: {
          attempts?: number | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          instance_id: string
          media_base64?: string | null
          media_url?: string | null
          message_type?: string | null
          processed_at?: string | null
          quoted_message_id?: string | null
          remote_jid: string
          status?: string | null
        }
        Update: {
          attempts?: number | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          instance_id?: string
          media_base64?: string | null
          media_url?: string | null
          message_type?: string | null
          processed_at?: string | null
          quoted_message_id?: string | null
          remote_jid?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_queue_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_queue_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_message_queue_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_message_templates: {
        Row: {
          category: string | null
          components: Json | null
          created_at: string
          id: string
          instance_id: string | null
          language: string
          meta_template_id: string | null
          status: string
          template_name: string
          updated_at: string
          waba_id: string | null
        }
        Insert: {
          category?: string | null
          components?: Json | null
          created_at?: string
          id?: string
          instance_id?: string | null
          language?: string
          meta_template_id?: string | null
          status?: string
          template_name: string
          updated_at?: string
          waba_id?: string | null
        }
        Update: {
          category?: string | null
          components?: Json | null
          created_at?: string
          id?: string
          instance_id?: string | null
          language?: string
          meta_template_id?: string | null
          status?: string
          template_name?: string
          updated_at?: string
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_message_templates_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          error_message: string | null
          from_me: boolean | null
          id: string
          instance_id: string | null
          media_base64: string | null
          media_filename: string | null
          media_mime_type: string | null
          media_url: string | null
          message_id_external: string | null
          message_type: string | null
          quoted_content: string | null
          quoted_message_id: string | null
          quoted_sender: string | null
          reactions: Json | null
          sender_name: string | null
          sender_phone: string | null
          status: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          error_message?: string | null
          from_me?: boolean | null
          id?: string
          instance_id?: string | null
          media_base64?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_id_external?: string | null
          message_type?: string | null
          quoted_content?: string | null
          quoted_message_id?: string | null
          quoted_sender?: string | null
          reactions?: Json | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          error_message?: string | null
          from_me?: boolean | null
          id?: string
          instance_id?: string | null
          media_base64?: string | null
          media_filename?: string | null
          media_mime_type?: string | null
          media_url?: string | null
          message_id_external?: string | null
          message_type?: string | null
          quoted_content?: string | null
          quoted_message_id?: string | null
          quoted_sender?: string | null
          reactions?: Json | null
          sender_name?: string | null
          sender_phone?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_quoted_message_id_fkey"
            columns: ["quoted_message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_quick_replies: {
        Row: {
          atalho: string | null
          ativo: boolean | null
          conteudo: string
          created_at: string | null
          created_by: string | null
          id: string
          mostrar_botao: boolean
          ordem: number | null
          titulo: string
          updated_at: string | null
          variaveis: Json | null
        }
        Insert: {
          atalho?: string | null
          ativo?: boolean | null
          conteudo: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          mostrar_botao?: boolean
          ordem?: number | null
          titulo: string
          updated_at?: string | null
          variaveis?: Json | null
        }
        Update: {
          atalho?: string | null
          ativo?: boolean | null
          conteudo?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          mostrar_botao?: boolean
          ordem?: number | null
          titulo?: string
          updated_at?: string | null
          variaveis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_quick_replies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      buscar_faixa_preco: {
        Args: { p_produto_id: string; p_quantidade: number }
        Returns: {
          id: string
          preco_maximo: number
          preco_minimo: number
          quantidade_maxima: number
          quantidade_minima: number
        }[]
      }
      calcular_dias_uteis: { Args: { data_inicio: string }; Returns: number }
      calcular_percentual_comissao: {
        Args: { p_mes_pedido: string; p_vendedor_id: string }
        Returns: number
      }
      find_cliente_by_phone: { Args: { phone: string }; Returns: string }
      format_cpf_cnpj: { Args: { doc: string }; Returns: string }
      format_phone_br: { Args: { phone: string }; Returns: string }
      get_avg_response_time_by_user: {
        Args: never
        Returns: {
          assigned_to: string
          avg_minutes: number
        }[]
      }
      get_user_permissions: {
        Args: { _user_id: string }
        Returns: {
          category: string
          permission_code: string
          permission_description: string
          permission_id: string
        }[]
      }
      has_permission: {
        Args: { _permission_id: string; _user_id: string }
        Returns: boolean
      }
      has_profile: {
        Args: { _profile_codigo: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_tarefa_access: {
        Args: { _tarefa_id: string; _user_id: string }
        Returns: boolean
      }
      has_whatsapp_access: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_atendente: { Args: { _user_id: string }; Returns: boolean }
      is_financeiro: { Args: { _user_id: string }; Returns: boolean }
      is_pcp: { Args: { _user_id: string }; Returns: boolean }
      is_rh: { Args: { _user_id: string }; Returns: boolean }
      is_vendedor: { Args: { _user_id: string }; Returns: boolean }
      normalize_phone: { Args: { phone: string }; Returns: string }
      pode_editar_pedido: {
        Args: { p_pedido_id: string; p_usuario_id: string }
        Returns: boolean
      }
      search_abandoned_carts_by_phone: {
        Args: { phone_suffix: string }
        Returns: {
          abandoned_at: string
          customer_name: string
          customer_phone: string
          id: string
          items: Json
          recovery_url: string
          status: string
          store_cor: string
          store_nome: string
          total: number
        }[]
      }
      search_orders_by_phone: {
        Args: { phone_suffix: string }
        Returns: {
          created_at: string
          customer_phone: string
          delivery_estimate: string
          id: string
          order_number: string
          status: Database["public"]["Enums"]["order_status"]
          total: number
          wbuy_status_code: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "vendedor" | "financeiro" | "atendente"
      automation_execution_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "paused"
        | "cancelled"
      automation_node_type: "trigger" | "condition" | "action" | "control"
      automation_workflow_type:
        | "ecommerce"
        | "leads"
        | "whatsapp"
        | "comercial"
        | "geral"
      forma_pagamento: "pix" | "cartao" | "boleto" | "dinheiro"
      order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "payment_denied"
      status_emprestimo_grade:
        | "emprestado"
        | "devolvido"
        | "devolvido_parcial"
        | "nao_devolvido"
      status_envio:
        | "aguardando_despacho"
        | "despachado"
        | "reprocessado"
        | "cancelado"
      status_fechamento: "rascunho" | "fechado"
      status_ferias: "agendada" | "em_gozo" | "concluida" | "cancelada"
      status_pagamento: "aguardando" | "parcial" | "quitado"
      status_pedido:
        | "rascunho"
        | "em_producao"
        | "pronto"
        | "entregue"
        | "cancelado"
      status_problema: "pendente" | "resolvido" | "nao_resolvido"
      status_proposta:
        | "pendente"
        | "enviada"
        | "follow_up"
        | "ganha"
        | "perdida"
      status_ressarcimento: "pendente" | "aprovado" | "negado"
      tarefa_prioridade: "baixa" | "media" | "alta"
      tarefa_status:
        | "pendente"
        | "em_andamento"
        | "aguardando_validacao"
        | "concluida"
        | "reaberta"
      tarefa_tipo_conteudo: "texto" | "checklist"
      tipo_bonificacao: "fixo" | "percentual"
      tipo_conta_bancaria: "corrente" | "poupanca" | "salario"
      tipo_contrato: "clt" | "pj" | "estagio" | "temporario" | "aprendiz"
      tipo_data_comemorativa: "feriado" | "evento" | "comemoracao"
      tipo_ferias: "normal" | "fracionada"
      tipo_ocasiao: "fixa" | "personalizada"
      tipo_problema_pedido:
        | "atraso_entrega"
        | "sem_tentativa_entrega"
        | "entregue_nao_recebido"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "vendedor", "financeiro", "atendente"],
      automation_execution_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "paused",
        "cancelled",
      ],
      automation_node_type: ["trigger", "condition", "action", "control"],
      automation_workflow_type: [
        "ecommerce",
        "leads",
        "whatsapp",
        "comercial",
        "geral",
      ],
      forma_pagamento: ["pix", "cartao", "boleto", "dinheiro"],
      order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "payment_denied",
      ],
      status_emprestimo_grade: [
        "emprestado",
        "devolvido",
        "devolvido_parcial",
        "nao_devolvido",
      ],
      status_envio: [
        "aguardando_despacho",
        "despachado",
        "reprocessado",
        "cancelado",
      ],
      status_fechamento: ["rascunho", "fechado"],
      status_ferias: ["agendada", "em_gozo", "concluida", "cancelada"],
      status_pagamento: ["aguardando", "parcial", "quitado"],
      status_pedido: [
        "rascunho",
        "em_producao",
        "pronto",
        "entregue",
        "cancelado",
      ],
      status_problema: ["pendente", "resolvido", "nao_resolvido"],
      status_proposta: ["pendente", "enviada", "follow_up", "ganha", "perdida"],
      status_ressarcimento: ["pendente", "aprovado", "negado"],
      tarefa_prioridade: ["baixa", "media", "alta"],
      tarefa_status: [
        "pendente",
        "em_andamento",
        "aguardando_validacao",
        "concluida",
        "reaberta",
      ],
      tarefa_tipo_conteudo: ["texto", "checklist"],
      tipo_bonificacao: ["fixo", "percentual"],
      tipo_conta_bancaria: ["corrente", "poupanca", "salario"],
      tipo_contrato: ["clt", "pj", "estagio", "temporario", "aprendiz"],
      tipo_data_comemorativa: ["feriado", "evento", "comemoracao"],
      tipo_ferias: ["normal", "fracionada"],
      tipo_ocasiao: ["fixa", "personalizada"],
      tipo_problema_pedido: [
        "atraso_entrega",
        "sem_tentativa_entrega",
        "entregue_nao_recebido",
        "outro",
      ],
    },
  },
} as const
