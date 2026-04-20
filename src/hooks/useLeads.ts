import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { sanitizeError } from '@/lib/errorHandling';
import { useAuth } from './useAuth';

export interface Lead {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cpf_cnpj?: string;
  endereco?: string;
  segmento_id?: string;
  status: 'novo' | 'contatando' | 'qualificado' | 'nao_qualificado' | 'convertido' | 'perdido';
  vendedor_id?: string;
  observacao?: string;
  origem?: string;
  data_retorno?: string;
  lembrete_enviado?: boolean;
  cliente_id?: string;
  data_conversao?: string;
  created_at: string;
  updated_at: string;
  segmento?: { nome: string; cor?: string; icone?: string; };
  vendedor?: { nome: string; };
}

interface LeadsFilters {
  status?: string;
  segmento_id?: string;
  vendedor_id?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export function useLeads(filters?: LeadsFilters & { incluirInativos?: boolean }) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      const page = filters?.page || 0;
      const pageSize = filters?.pageSize || 20;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('leads' as any)
        .select(`
          *,
          segmento:segmentos(nome, cor, icone),
          vendedor:profiles!leads_vendedor_id_fkey(nome)
        `, { count: 'exact' });
      
      // Filtrar apenas leads ativos por padrão
      if (!filters?.incluirInativos) {
        query = query.neq('ativo', false);
      }
      
      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.segmento_id && filters.segmento_id !== 'todos') {
        query = query.eq('segmento_id', filters.segmento_id);
      }
      
      if (filters?.vendedor_id && filters.vendedor_id !== 'todos') {
        query = query.eq('vendedor_id', filters.vendedor_id);
      }
      
      if (filters?.search) {
        query = query.or(`nome.ilike.%${filters.search}%,email.ilike.%${filters.search}%,telefone.ilike.%${filters.search}%,whatsapp.ilike.%${filters.search}%`);
      }
      
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      return {
        data: (data as any as Lead[]) || [],
        totalCount: count || 0
      };
    },
  });
}

export function useLead(id?: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('leads' as any)
        .select(`
          *,
          segmento:segmentos(*),
          vendedor:profiles!leads_vendedor_id_fkey(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

export function useSaveLead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      if (lead.id) {
        const { data, error } = await supabase
          .from('leads' as any)
          .update({ ...lead, updated_at: new Date().toISOString() })
          .eq('id', lead.id)
          .select()
          .single();
        
        if (error) throw error;
        return data as any;
      } else {
        const { data, error } = await supabase
          .from('leads' as any)
          .insert({
            ...lead,
            created_by: user?.id,
            vendedor_id: lead.vendedor_id || user?.id,
          } as any)
          .select()
          .single();
        
        if (error) throw error;
        return data as any;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Sucesso',
        description: 'Lead salvo com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao salvar lead',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useImportarLeads() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { leads: Partial<Lead>[]; origem: string }) => {
      const { leads, origem } = params;
      
      const leadsComMetadata = leads.map(lead => ({
        ...lead,
        created_by: user?.id,
        // Mantém vendedor_id somente se explicitamente passado; caso contrário fica null (em aberto)
        vendedor_id: lead.vendedor_id || null,
        origem,
        status: lead.status || 'novo',
      }));

      const { data, error } = await supabase
        .from('leads' as any)
        .insert(leadsComMetadata as any)
        .select();
      
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Importação concluída',
        description: `${data.length} leads importados com sucesso.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro na importação',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useConverterLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { data: lead, error: leadError } = await supabase
        .from('leads' as any)
        .select('*')
        .eq('id', leadId)
        .single();
      
      if (leadError) throw leadError;

      const { data: cliente, error: clienteError } = await supabase
        .from('clientes')
        .insert({
          nome_razao_social: (lead as any).nome,
          email: (lead as any).email,
          telefone: (lead as any).telefone,
          whatsapp: (lead as any).whatsapp,
          cpf_cnpj: (lead as any).cpf_cnpj,
          endereco: (lead as any).endereco,
          segmento_id: (lead as any).segmento_id,
          observacao: (lead as any).observacao,
          created_by: (lead as any).created_by,
        })
        .select()
        .single();
      
      if (clienteError) throw clienteError;

      const { error: updateError } = await supabase
        .from('leads' as any)
        .update({
          status: 'convertido',
          cliente_id: cliente.id,
          data_conversao: new Date().toISOString(),
        })
        .eq('id', leadId);
      
      if (updateError) throw updateError;

      return cliente;
    },
    onSuccess: (cliente) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast({
        title: 'Lead convertido!',
        description: `Cliente "${cliente.nome_razao_social}" criado com sucesso.`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao converter lead',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads' as any)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Sucesso',
        description: 'Lead excluído com sucesso.',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erro ao excluir lead',
        description: sanitizeError(error),
        variant: 'destructive',
      });
    },
  });
}
