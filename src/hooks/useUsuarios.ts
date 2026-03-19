import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  whatsapp?: string;
  ativo: boolean;
  roles: string[];
  profiles: Array<{ id: string; nome: string; codigo: string }>;
}

export function useUsuarios() {
  return useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nome');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Buscar perfis RBAC (novo sistema)
      const { data: userProfiles, error: userProfilesError } = await supabase
        .from('user_profiles')
        .select('user_id, profile_id, system_profiles:profile_id(id, nome, codigo)');

      if (userProfilesError) throw userProfilesError;

      const rolesByUser = roles.reduce((acc, { user_id, role }) => {
        if (!acc[user_id]) acc[user_id] = [];
        acc[user_id].push(role);
        return acc;
      }, {} as Record<string, string[]>);

      const profilesByUser = userProfiles.reduce((acc, item) => {
        if (!acc[item.user_id]) acc[item.user_id] = [];
        if (item.system_profiles) {
          acc[item.user_id].push(item.system_profiles);
        }
        return acc;
      }, {} as Record<string, any[]>);

      return profiles.map((profile) => ({
        ...profile,
        roles: rolesByUser[profile.id] || [],
        profiles: profilesByUser[profile.id] || [],
        ativo: profile.ativo ?? true,
      })) as Usuario[];
    },
  });
}

export function useToggleUsuarioStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, ativo }: { userId: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Sucesso',
        description: 'Status do usuário atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Erro ao atualizar status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      // Primeiro, remover as roles do usuário
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      // Então, deletar o perfil (o CASCADE irá cuidar do resto)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) throw profileError;
      
      // Nota: O usuário da tabela auth.users não pode ser deletado pelo cliente
      // pois requer privilégios de admin. O perfil foi removido com sucesso.
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast({
        title: 'Sucesso',
        description: 'Usuário excluído com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Erro ao excluir usuário: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
