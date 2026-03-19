import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { WhatsappInstance } from './useWhatsappInstances';

export interface InstanceUser {
  id: string;
  instance_id: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    nome: string;
    email: string;
  };
}

// Buscar usuários vinculados a uma instância
export function useInstanceUsers(instanceId: string | null) {
  return useQuery({
    queryKey: ['whatsapp-instance-users', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_instance_users')
        .select(`
          *,
          user:profiles!user_id(id, nome, email)
        `)
        .eq('instance_id', instanceId);
      
      if (error) throw error;
      return data as InstanceUser[];
    },
    enabled: !!instanceId
  });
}

// Buscar instâncias que o usuário atual tem acesso
export function useUserInstances() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['whatsapp-user-instances', user?.id],
    queryFn: async (): Promise<WhatsappInstance[]> => {
      if (!user) return [];
      
      // Primeiro verificar se é admin
      const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
      
      if (isAdmin) {
        // Admin vê todas as instâncias (incluindo desconectadas, mas não deletadas)
        const { data, error } = await supabase
          .from('whatsapp_instances')
          .select('*')
          .order('ordem');
        
        if (error) throw error;
        return (data || []) as WhatsappInstance[];
      }
      
      // Usuário comum - buscar vínculos (inclui desconectadas, só exclui deletadas)
      const { data: userInstances, error } = await supabase
        .from('whatsapp_instance_users')
        .select(`
          instance:whatsapp_instances(*)
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Retorna todas as instâncias vinculadas (conectadas ou não)
      return (userInstances || [])
        .map(ui => ui.instance as WhatsappInstance)
        .filter((inst): inst is WhatsappInstance => inst !== null);
    },
    enabled: !!user
  });
}

// Adicionar usuário a uma instância
export function useAddUserToInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instanceId, userId }: { instanceId: string; userId: string }) => {
      const { data, error } = await supabase
        .from('whatsapp_instance_users')
        .insert({ instance_id: instanceId, user_id: userId })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Este usuário já está vinculado a esta instância');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance-users', variables.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-user-instances'] });
      toast.success('Usuário vinculado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });
}

// Remover usuário de uma instância
export function useRemoveUserFromInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instanceId, userId }: { instanceId: string; userId: string }) => {
      const { error } = await supabase
        .from('whatsapp_instance_users')
        .delete()
        .eq('instance_id', instanceId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instance-users', variables.instanceId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-user-instances'] });
      toast.success('Vínculo removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover vínculo: ${error.message}`);
    }
  });
}
