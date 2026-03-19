import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();

  // Buscar roles do sistema ANTIGO (user_roles)
  const { data: oldRoles = [], isLoading: loadingOldRoles } = useQuery({
    queryKey: ['user-roles-old', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data.map(r => r.role);
    },
    enabled: !!user?.id,
  });

  // Buscar perfis do sistema NOVO (user_profiles + system_profiles)
  const { data: newProfiles = [], isLoading: loadingNewProfiles } = useQuery({
    queryKey: ['user-profiles-new', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          profile_id,
          system_profiles!inner (
            codigo,
            ativo
          )
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Retornar códigos dos perfis ativos
      return data
        .filter((p: any) => p.system_profiles?.ativo)
        .map((p: any) => p.system_profiles?.codigo);
    },
    enabled: !!user?.id,
  });

  // Combinar ambos os sistemas
  const allRoles = [...new Set([...oldRoles, ...newProfiles])];
  // CRÍTICO: Incluir authLoading para evitar race condition em links diretos
  const isLoading = authLoading || loadingOldRoles || loadingNewProfiles;

  // Verificações de role que funcionam com ambos os sistemas
  const isAdmin = allRoles.includes('admin') || allRoles.includes('administrador');
  const isVendedor = allRoles.includes('vendedor');
  const isFinanceiro = allRoles.includes('financeiro');
  const isAtendente = allRoles.includes('atendente');
  const isPcp = allRoles.includes('pcp') || allRoles.includes('producao');
  const isRH = allRoles.includes('rh');

  const hasRole = (role: string): boolean => {
    if (role === 'admin') return isAdmin;
    return allRoles.includes(role);
  };

  return {
    roles: allRoles,
    isLoading,
    isAdmin,
    isVendedor,
    isFinanceiro,
    isAtendente,
    isPcp,
    isRH,
    hasRole,
  };
}
