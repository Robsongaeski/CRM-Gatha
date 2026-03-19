import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UserPermission {
  permission_id: string;
  permission_code: string;
  permission_description: string;
  category: string;
}

export function usePermissions() {
  const { user, loading: authLoading } = useAuth();

  const { data: permissions = [], isLoading: queryLoading } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase.rpc('get_user_permissions', {
        _user_id: user.id,
      });
      
      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!user?.id,
  });

  const permissionCodes = permissions.map(p => p.permission_code);
  
  // CRÍTICO: Incluir authLoading para evitar race condition em links diretos
  const isLoading = authLoading || queryLoading;

  // Verifica se o usuário tem uma permissão específica
  const can = (permissionCode: string): boolean => {
    return permissionCodes.includes(permissionCode);
  };

  // Verifica se o usuário tem qualquer uma das permissões listadas
  const canAny = (...permissionCodes: string[]): boolean => {
    return permissionCodes.some(code => can(code));
  };

  // Verifica se o usuário tem todas as permissões listadas
  const canAll = (...permissionCodes: string[]): boolean => {
    return permissionCodes.every(code => can(code));
  };

  // Helpers de compatibilidade com sistema antigo (baseado em roles)
  const isAdmin = can('usuarios.visualizar') && can('usuarios.editar');
  const isVendedor = can('pedidos.criar') || can('propostas.criar');
  const isFinanceiro = can('pagamentos.aprovar') || can('pagamentos.visualizar');
  const isAtendente = can('atendimento.registrar_pedido');

  return {
    permissions,
    isLoading,
    can,
    canAny,
    canAll,
    // Compatibilidade
    isAdmin,
    isVendedor,
    isFinanceiro,
    isAtendente,
  };
}
