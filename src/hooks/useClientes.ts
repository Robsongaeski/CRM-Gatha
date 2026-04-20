import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/errorHandling';

export interface Cliente {
  id: string;
  nome_razao_social: string;
  responsavel?: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  cpf_cnpj?: string;
  endereco?: string;
  segmento_id?: string;
  observacao?: string;
  created_at: string;
  updated_at: string;
  segmento?: { nome: string; cor?: string; icone?: string; };
}

interface ClientesFilters {
  search?: string;
  segmentoId?: string;
  page?: number;
  pageSize?: number;
}

export function useClientes(filters?: ClientesFilters) {
  return useQuery({
    queryKey: ['clientes', filters],
    queryFn: async () => {
      const page = filters?.page || 0;
      const pageSize = filters?.pageSize || 20;
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('clientes')
        .select(`
          *,
          segmento:segmentos(nome, cor, icone)
        `, { count: 'exact' });

      if (filters?.segmentoId && filters.segmentoId !== 'todos') {
        query = query.eq('segmento_id', filters.segmentoId);
      }

      if (filters?.search) {
        const search = filters.search.trim();
        query = query.or(`nome_razao_social.ilike.%${search}%,responsavel.ilike.%${search}%,cpf_cnpj.ilike.%${search}%,email.ilike.%${search}%,telefone.ilike.%${search}%,whatsapp.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return {
        data: (data as any as Cliente[]) || [],
        totalCount: count || 0
      };
    },
  });
}

export function useCliente(id?: string) {
  return useQuery({
    queryKey: ['clientes', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('clientes')
        .select(`
          *,
          segmento:segmentos(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Cliente;
    },
    enabled: !!id,
  });
}

export function useSaveCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cliente: Partial<Cliente>) => {
      if (cliente.id) {
        const { data, error } = await supabase
          .from('clientes')
          .update({ ...cliente, updated_at: new Date().toISOString() })
          .eq('id', cliente.id)
          .select()
          .single();
        
        if (error) throw error;
        return data as Cliente;
      } else {
        const { data, error } = await supabase
          .from('clientes')
          .insert([cliente] as any)
          .select()
          .single();
        
        if (error) throw error;
        return data as Cliente;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente salvo com sucesso');
    },
    onError: (error: unknown) => {
      toast.error(`Erro ao salvar cliente: ${sanitizeError(error)}`);
    },
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente excluído com sucesso');
    },
    onError: (error: unknown) => {
      toast.error(`Erro ao excluir cliente: ${sanitizeError(error)}`);
    },
  });
}
