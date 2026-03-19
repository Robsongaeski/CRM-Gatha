import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EcommerceStore {
  id: string;
  codigo: string;
  nome: string;
  plataforma: string;
  cor: string;
  icone: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  wbuy_api_user: string | null;
  wbuy_api_password: string | null;
}

export interface CreateStoreInput {
  codigo: string;
  nome: string;
  plataforma?: string;
  cor?: string;
  icone?: string;
}

export interface UpdateStoreInput {
  nome?: string;
  cor?: string;
  icone?: string;
  ativo?: boolean;
  wbuy_api_user?: string;
  wbuy_api_password?: string;
}

// URL base do webhook
const SUPABASE_PROJECT_ID = 'lyjzutjrmvgoeibaoizz';
const WEBHOOK_BASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/wbuy-webhook`;

export function getWebhookUrl(storeCode: string): string {
  return `${WEBHOOK_BASE_URL}?store=${storeCode}`;
}

export function useEcommerceStores() {
  const queryClient = useQueryClient();

  // Buscar todas as lojas
  const { data: stores = [], isLoading, error } = useQuery({
    queryKey: ['ecommerce-stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_stores')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as EcommerceStore[];
    },
  });

  // Buscar contagem de pedidos por loja
  const { data: orderCounts = {} } = useQuery({
    queryKey: ['ecommerce-stores-order-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('store_code');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(order => {
        const code = order.store_code || 'update';
        counts[code] = (counts[code] || 0) + 1;
      });
      
      return counts;
    },
  });

  // Criar nova loja
  const createStoreMutation = useMutation({
    mutationFn: async (input: CreateStoreInput) => {
      const { data, error } = await supabase
        .from('ecommerce_stores')
        .insert({
          codigo: input.codigo.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          nome: input.nome,
          plataforma: input.plataforma || 'wbuy',
          cor: input.cor || '#3B82F6',
          icone: input.icone || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce-stores'] });
      toast.success('Loja criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar loja:', error);
      if (error.code === '23505') {
        toast.error('Já existe uma loja com este código');
      } else {
        toast.error('Erro ao criar loja: ' + error.message);
      }
    },
  });

  // Atualizar loja
  const updateStoreMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateStoreInput & { id: string }) => {
      const { data, error } = await supabase
        .from('ecommerce_stores')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce-stores'] });
      toast.success('Loja atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar loja:', error);
      toast.error('Erro ao atualizar loja: ' + error.message);
    },
  });

  // Desativar/Ativar loja
  const toggleStoreMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from('ecommerce_stores')
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce-stores'] });
      toast.success(data.ativo ? 'Loja ativada!' : 'Loja desativada!');
    },
    onError: (error: any) => {
      console.error('Erro ao alterar status da loja:', error);
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });

  return {
    stores,
    isLoading,
    error,
    orderCounts,
    createStore: createStoreMutation.mutate,
    updateStore: updateStoreMutation.mutate,
    toggleStore: toggleStoreMutation.mutate,
    isCreating: createStoreMutation.isPending,
    isUpdating: updateStoreMutation.isPending,
    getWebhookUrl,
  };
}

// Hook simples para buscar lojas ativas (para uso em filtros)
export function useActiveStores() {
  return useQuery({
    queryKey: ['ecommerce-stores-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecommerce_stores')
        .select('id, codigo, nome, cor')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as Pick<EcommerceStore, 'id' | 'codigo' | 'nome' | 'cor'>[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
