import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from './use-toast';

export interface SystemProfile {
  id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  ativo: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  modulo: string;
  acao: string;
  descricao: string;
  categoria: string;
  created_at: string;
}

export interface ProfileWithPermissions extends SystemProfile {
  permissions: string[];
}

export function useSystemProfiles() {
  const queryClient = useQueryClient();

  // Buscar todos os perfis
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['system-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_profiles')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      return data as SystemProfile[];
    },
  });

  // Buscar todas as permissões disponíveis
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('categoria, descricao');
      
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Buscar perfil com permissões
  const getProfileWithPermissions = async (profileId: string): Promise<ProfileWithPermissions | null> => {
    const { data: profile, error: profileError } = await supabase
      .from('system_profiles')
      .select('*')
      .eq('id', profileId)
      .single();
    
    if (profileError) throw profileError;

    const { data: profilePermissions, error: permissionsError } = await supabase
      .from('profile_permissions')
      .select('permission_id')
      .eq('profile_id', profileId);
    
    if (permissionsError) throw permissionsError;

    return {
      ...profile,
      permissions: profilePermissions.map(p => p.permission_id),
    };
  };

  // Salvar perfil (criar ou atualizar)
  const saveProfileMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      nome: string;
      codigo: string;
      descricao?: string;
      ativo: boolean;
      permissions: string[];
    }) => {
      if (data.id) {
        // Atualizar perfil existente
        const { error: updateError } = await supabase
          .from('system_profiles')
          .update({
            nome: data.nome,
            descricao: data.descricao || null,
            ativo: data.ativo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.id);
        
        if (updateError) throw updateError;

        // ===== ESTRATÉGIA UPSERT SEGURA =====
        // Buscar permissões atuais do perfil
        const { data: currentPermissions, error: fetchError } = await supabase
          .from('profile_permissions')
          .select('permission_id')
          .eq('profile_id', data.id);
        
        if (fetchError) throw fetchError;

        const currentPermissionIds = currentPermissions?.map(p => p.permission_id) || [];
        const newPermissionIds = data.permissions;

        // Calcular diferenças
        const toRemove = currentPermissionIds.filter(id => !newPermissionIds.includes(id));
        const toAdd = newPermissionIds.filter(id => !currentPermissionIds.includes(id));

        // Remover apenas permissões desmarcadas
        if (toRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from('profile_permissions')
            .delete()
            .eq('profile_id', data.id)
            .in('permission_id', toRemove);
          
          if (deleteError) throw deleteError;
        }

        // Adicionar apenas permissões novas
        if (toAdd.length > 0) {
          const permissionsToInsert = toAdd.map(permissionId => ({
            profile_id: data.id!,
            permission_id: permissionId,
          }));

          const { error: insertError } = await supabase
            .from('profile_permissions')
            .insert(permissionsToInsert);
          
          if (insertError) throw insertError;
        }
      } else {
        // Criar novo perfil
        const { data: newProfile, error: insertError } = await supabase
          .from('system_profiles')
          .insert({
            nome: data.nome,
            codigo: data.codigo,
            descricao: data.descricao || null,
            ativo: data.ativo,
            is_system: false,
          })
          .select()
          .single();
        
        if (insertError) throw insertError;

        // Inserir permissões
        if (data.permissions.length > 0) {
          const permissionsToInsert = data.permissions.map(permissionId => ({
            profile_id: newProfile.id,
            permission_id: permissionId,
          }));

          const { error: permError } = await supabase
            .from('profile_permissions')
            .insert(permissionsToInsert);
          
          if (permError) throw permError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-profiles'] });
      toast({
        title: 'Sucesso',
        description: 'Perfil salvo com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar perfil: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  // Excluir perfil customizado
  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      // Verificar se é perfil customizado
      const { data: profile } = await supabase
        .from('system_profiles')
        .select('is_system')
        .eq('id', profileId)
        .single();
      
      if (profile?.is_system) {
        throw new Error('Não é possível excluir perfis do sistema');
      }

      // Deletar permissões primeiro (cascade)
      const { error: permError } = await supabase
        .from('profile_permissions')
        .delete()
        .eq('profile_id', profileId);
      
      if (permError) throw permError;

      // Deletar perfil
      const { error } = await supabase
        .from('system_profiles')
        .delete()
        .eq('id', profileId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-profiles'] });
      toast({
        title: 'Sucesso',
        description: 'Perfil excluído com sucesso!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir perfil: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    profiles,
    permissions,
    isLoading: profilesLoading || permissionsLoading,
    getProfileWithPermissions,
    saveProfile: saveProfileMutation.mutate,
    deleteProfile: deleteProfileMutation.mutate,
    isSaving: saveProfileMutation.isPending,
    isDeleting: deleteProfileMutation.isPending,
  };
}
