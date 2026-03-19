import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { sanitizeError } from '@/lib/errorHandling';

export type StatusProposta = 'pendente' | 'enviada' | 'follow_up' | 'ganha' | 'perdida';

export interface PropostaItem {
  id?: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  observacoes?: string | null;
}

export interface PropostaFormData {
  cliente_id: string;
  status: StatusProposta;
  observacoes?: string | null;
  data_follow_up?: Date | null;
  motivo_perda?: string | null;
  criar_previa?: boolean;
  caminho_arquivos?: string | null;
  descricao_criacao?: string | null;
  etapa_aprovacao_id?: string | null;
  imagem_referencia_url?: string | null;
  vendedor_id?: string | null;
  created_at?: Date | null;
  itens: PropostaItem[];
}

export function usePropostas(filters?: {
  status?: StatusProposta;
  clienteId?: string;
  vendedorId?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['propostas', filters],
    queryFn: async () => {
      let query = supabase
        .from('propostas')
        .select(`
          *,
          cliente:clientes(id, nome_razao_social, telefone, email),
          vendedor:profiles(nome, email, whatsapp)
        `)
        .order('created_at', { ascending: false });
      
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.clienteId) query = query.eq('cliente_id', filters.clienteId);
      if (filters?.vendedorId) query = query.eq('vendedor_id', filters.vendedorId);
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useProposta(id?: string) {
  return useQuery({
    queryKey: ['proposta', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('propostas')
        .select(`
          *,
          cliente:clientes(*),
          vendedor:profiles(nome, email, whatsapp),
          itens:proposta_itens(
            *,
            produto:produtos(*)
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProposta() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: PropostaFormData) => {
      if (!user) throw new Error('Usuário não autenticado');

      // Criar proposta
      const insertData: Record<string, any> = {
        cliente_id: data.cliente_id,
        vendedor_id: data.vendedor_id || user.id,
        status: data.status,
        observacoes: data.observacoes || null,
        data_follow_up: data.data_follow_up ? data.data_follow_up.toISOString() : null,
        motivo_perda: data.motivo_perda || null,
        criar_previa: data.criar_previa || false,
        caminho_arquivos: data.caminho_arquivos || null,
        descricao_criacao: data.descricao_criacao || null,
        etapa_aprovacao_id: data.etapa_aprovacao_id || null,
        imagem_referencia_url: data.imagem_referencia_url || null,
      };

      // Se data foi especificada, incluir created_at
      if (data.created_at) {
        insertData.created_at = data.created_at.toISOString();
      }

      const { data: proposta, error: propostaError } = await supabase
        .from('propostas')
        .insert(insertData as any)
        .select()
        .single();

      if (propostaError) throw propostaError;

      // Criar itens
      if (data.itens.length > 0) {
        const itens = data.itens.map(item => ({
          proposta_id: proposta.id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          observacoes: item.observacoes || null,
        }));

        const { error: itensError } = await supabase
          .from('proposta_itens')
          .insert(itens);

        if (itensError) throw itensError;
      }

      return proposta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
      toast({
        title: 'Sucesso',
        description: 'Proposta criada com sucesso',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao criar proposta',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProposta(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PropostaFormData) => {
      // Atualizar proposta
      const updateData: Record<string, any> = {
        cliente_id: data.cliente_id,
        status: data.status,
        observacoes: data.observacoes || null,
        data_follow_up: data.data_follow_up ? data.data_follow_up.toISOString() : null,
        motivo_perda: data.motivo_perda || null,
        criar_previa: data.criar_previa || false,
        caminho_arquivos: data.caminho_arquivos || null,
        descricao_criacao: data.descricao_criacao || null,
        etapa_aprovacao_id: data.etapa_aprovacao_id || null,
        imagem_referencia_url: data.imagem_referencia_url || null,
      };

      // Incluir vendedor_id se foi especificado
      if (data.vendedor_id) {
        updateData.vendedor_id = data.vendedor_id;
      }

      const { error: propostaError } = await supabase
        .from('propostas')
        .update(updateData)
        .eq('id', id);

      if (propostaError) throw propostaError;

      // Deletar itens existentes
      const { error: deleteError } = await supabase
        .from('proposta_itens')
        .delete()
        .eq('proposta_id', id);

      if (deleteError) throw deleteError;

      // Criar novos itens
      if (data.itens.length > 0) {
        const itens = data.itens.map(item => ({
          proposta_id: id,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          observacoes: item.observacoes || null,
        }));

        const { error: itensError } = await supabase
          .from('proposta_itens')
          .insert(itens);

        if (itensError) throw itensError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
      queryClient.invalidateQueries({ queryKey: ['proposta', id] });
      toast({
        title: 'Sucesso',
        description: 'Proposta atualizada com sucesso',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao atualizar proposta',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProposta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('propostas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['propostas'] });
      toast({
        title: 'Sucesso',
        description: 'Proposta excluída com sucesso',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao excluir proposta',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}
