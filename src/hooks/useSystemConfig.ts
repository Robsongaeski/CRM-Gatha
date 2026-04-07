import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemConfig {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  is_secret: boolean;
  updated_at: string;
}

export function useSystemConfig() {
  const queryClient = useQueryClient();

  // Buscar todas as configurações
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('key');
      
      if (error) throw error;
      return data as SystemConfig[];
    },
  });

  // Obter valor de uma configuração específica
  const getConfig = (key: string): string | null => {
    const config = configs.find(c => c.key === key);
    return config?.value || null;
  };

  // Obter valor mascarado para secrets
  const getMaskedValue = (key: string): string => {
    const config = configs.find(c => c.key === key);
    if (!config?.value) return '';
    
    if (config.is_secret) {
      // Mostrar apenas os últimos 4 caracteres
      const value = config.value;
      if (value.length <= 4) return '****';
      return '*'.repeat(value.length - 4) + value.slice(-4);
    }
    
    return config.value;
  };

  // Verificar se uma config é secret
  const isSecret = (key: string): boolean => {
    const config = configs.find(c => c.key === key);
    return config?.is_secret || false;
  };

  // Mutation para atualizar configuração
  const updateConfigMutation = useMutation({
    mutationFn: async ({ key, value, is_secret }: { key: string; value: string; is_secret?: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('system_config')
        .upsert({ 
          key,
          value, 
          ...(typeof is_secret === 'boolean' ? { is_secret } : {}),
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuração atualizada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração: ' + error.message);
    },
  });

  // Mutation para criar nova configuração
  const createConfigMutation = useMutation({
    mutationFn: async ({ key, value, description, is_secret }: { 
      key: string; 
      value: string; 
      description?: string;
      is_secret?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('system_config')
        .insert({ 
          key, 
          value, 
          description,
          is_secret: is_secret || false,
          updated_by: user?.id 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuração criada com sucesso!');
    },
    onError: (error: any) => {
      console.error('Erro ao criar configuração:', error);
      toast.error('Erro ao criar configuração: ' + error.message);
    },
  });

  return {
    configs,
    isLoading,
    getConfig,
    getMaskedValue,
    isSecret,
    updateConfig: updateConfigMutation.mutate,
    createConfig: createConfigMutation.mutate,
    isUpdating: updateConfigMutation.isPending,
    isCreating: createConfigMutation.isPending,
  };
}
